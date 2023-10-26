import { Redis } from "ioredis"
import { getCurrentTimeStamp } from "../utils/helpers.js";
import "dotenv/config"

const redisURL = process.env.CACHE_ENDPOINT || 'redis://localhost:6379';
const redis: Redis = new Redis(redisURL);
console.log('Connected to Redis');

// note: payload should probably be converted to JSON before stored, to allow storing various data types
// note: we should return 'room name < name >' does not exist error for Postman API
export const storeMessageInSet = async (room: string, payload: string) => {
  let timeCreated = getCurrentTimeStamp();
  await redis.zadd(`${room}Set`, timeCreated, payload);
  console.log('Message stored in cache: ' + payload);
}

interface SubscribedRoomMessages {
  [key: string]: string[];
}

// currently fetches ALL messages missed in subscribed rooms (no pagination)
export const processSubscribedRooms = async (timestamp: string, room: string, result: SubscribedRoomMessages) => {
  // idk why .zrange doesn't work
  // https://redis.github.io/ioredis/classes/Redis.html#zrange
  // await redis.zrange(`${room}Set`, timestamp, '+inf', 'BYSCORE', (error, array) => {
  await redis.zrangebyscore(`${room}Set`, timestamp, '+inf', (error, array) => {
    if (error) {
      console.error('Error reading sorted set:', error);
    } else {
      result[room] = array as string[];
    }
  })
}

export const allSubscribedMessages = async (sessionID: string) => {
  const redisVal = await redis.get(sessionID);
  const timestamp: string = redisVal || "";
  let result = {};

  const subscribedRoomKeys = await redis.hkeys(`rooms:${sessionID}`)
  for (let room of subscribedRoomKeys) {
    await processSubscribedRooms(timestamp, room, result);
  }

  return result;
}

export const setSessionTime = async (sessionID: string) => {
  const currentTime = getCurrentTimeStamp();
  await redis.set(sessionID, currentTime);
}

export const checkSessionTime = async (sessionID: string) => {
  let sessionTimestamp = await redis.get(sessionID);
  return sessionTimestamp;
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
