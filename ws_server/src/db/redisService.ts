import { currentTimeStamp } from "../utils/helpers.js";
import { redis } from '../index.js';
import "dotenv/config"

const generateRandomStringPrefix = (payload: string) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }

  return result + payload;
}

const removeRandomStringPrefixs = (arrayOfMessages: string[]) => {
  return arrayOfMessages.map(message => message.slice(5));
}

export const storeMessageInSet = async (room: string, payload: string, timestamp: number) => {
  let randomizedPayload = generateRandomStringPrefix(payload);
  await redis.zadd(`${room}Set`, timestamp, randomizedPayload);
  console.log('Message stored in cache: ' + randomizedPayload);
}

interface SubscribedRoomMessages {
  [key: string]: string[];
}

// currently fetches ALL messages missed in subscribed rooms (no pagination)
export const processSubscribedRooms = async (timestamp: number, room: string, result: SubscribedRoomMessages) => {
  // idk why .zrange doesn't work
  // https://redis.github.io/ioredis/classes/Redis.html#zrange
  // await redis.zrange(`${room}Set`, timestamp, '+inf', 'BYSCORE', (error, array) => {
  await redis.zrangebyscore(`${room}Set`, timestamp, '+inf', (error, array) => {
    if (error) {
      console.error('Error reading sorted set:', error);
    } else {
      let processedMessages = removeRandomStringPrefixs(array as string[]);
      result[room] = processedMessages;
    }
  })
}

interface SubscribedRooms {
  [key: string]: string;
}

// subscribed rooms is object with k: roomName v: joinTime
export const redisMissedMessages = async (twineTS: number, subscribedRooms: SubscribedRooms) => {
  let result = {};

  // if twineTS > joinTime, then twineTS has been updated since the client joined the room
  // if twineTS < joinTime, then twineTS default value never updated (client never received message)
  for (let room in subscribedRooms) {
    let joinTime = Number(subscribedRooms[room]);
    if (twineTS > joinTime) {
      console.log('twineTS is greater')
      await processSubscribedRooms(twineTS + 1, room, result);
    } else {
      console.log('joinTime is greater')
      await processSubscribedRooms(joinTime + 1, room, result);
    }
  }

  return result;
}

export const redisSubscribedRooms = async (sessionID: string) => {
  const subscribedRoomKeys = await redis.hgetall(`rooms:${sessionID}`)
  return subscribedRoomKeys;
}

export const setSessionTime = async (sessionID: string) => {
  const currentTime = currentTimeStamp();
  await redis.set(sessionID, currentTime);
}

// sessionTimestamp must be converted back to number on retreival
// because redis converts it to a string
export const checkSessionTimestamp = async (sessionID: string) => {
  let sessionTimestamp = await redis.get(sessionID);
  return Number(sessionTimestamp);
}

// if the hash exists, replaced the field/value set in the hash with the new value
// if the hash does not exist, create it and add the roomName/roomName k/v pair
export const addRoomToSession = async (sessionID: string, roomName: string) => {
  await redis.hset(`rooms:${sessionID}`, roomName, currentTimeStamp());
}

// hdel returns 1 if the field existed and was removed
// hdel returns 0 if the field or hash does not exist
export const removeRoomFromSession = async (sessionID: string, roomName: string) => {
  await redis.hdel(`rooms:${sessionID}`, roomName);
}
