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

interface messageObject {
  message: string;
  timestamp: number;
}

export const storeMessageInSet = async (room: string, payload: messageObject) => {
  let timeCreated = payload.timestamp
  let randomizedPayload = generateRandomStringPrefix(payload.message);
  await redis.zadd(`${room}Set`, timeCreated, randomizedPayload);
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

export const redisMissedMessages = async (timestamp: number, subscribedRoomKeys: string[]) => {
  let result = {};

  for (let room of subscribedRoomKeys) {
    await processSubscribedRooms(timestamp, room, result);
  }

  return result;
}

export const redisSubscribedRooms = async (sessionID: string) => {
  const subscribedRoomKeys = await redis.hkeys(`rooms:${sessionID}`)
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
  await redis.hset(`rooms:${sessionID}`, roomName, roomName);
}

// hdel returns 1 if the field existed and was removed
// hdel returns 0 if the field or hash does not exist
export const removeRoomFromSession = async (sessionID: string, roomName: string) => {
  await redis.hdel(`rooms:${sessionID}`, roomName);
}
