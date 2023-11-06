import { currentTimeStamp } from "../utils/helpers.js";
import { redis } from '../index.js';
import { generateRandomStringPrefix, removeRandomStringPrefixs } from "./redisHelpers.js";
import { SubscribedRooms, SubscribedRoomMessages } from "src/typings.js";
import "dotenv/config";

// interface SubscribedRooms {
//   [key: string]: string;
// };

// interface SubscribedRoomMessages {
//   [key: string]: string[];
// };

class RedisHandler {

  public static async storeMessagesInSet(room: string, payload: string, timestamp: number) {
    let lengthOfSet = await redis.zcard(`${room}Set`);
    let randomizedPayload = generateRandomStringPrefix(payload);

    if (lengthOfSet >= 100) {
      console.log("Set exceeds 100 messages, please try again later");
      return;
    } else {
      await redis.zadd(`${room}Set`, timestamp, randomizedPayload);
    }
  }

  private static async processSubscribedRooms(timestamp: number, room: string, result: SubscribedRoomMessages) {
    await redis.zrangebyscore(`${room}Set`, timestamp, '+inf', (error, array) => {
      if (error) {
        console.error('Error reading sorted set:', error);
      } else {
        let processedMessages = removeRandomStringPrefixs(array as string[]);
        result[room] = processedMessages;
      }
    })
  }

  public static async redisMissedMessages(twineTS: number, subscribedRooms: SubscribedRooms) {
    let result = {};
    for (let room in subscribedRooms) {
      let joinTime = Number(subscribedRooms[room]);
      if (twineTS > joinTime) {
        await RedisHandler.processSubscribedRooms(twineTS + 1, room, result);
      } else {
        await RedisHandler.processSubscribedRooms(joinTime + 1, room, result);
      }
    }
    return result;
  }

  public static async redisSubscribedRooms(sessionID: string) {
    const subscribedRoomKeys = await redis.hgetall(`rooms:${sessionID}`);
    return subscribedRoomKeys;
  }

  public static async setSessionTime(sessionID: string) {
    const currentTime = currentTimeStamp();
    await redis.set(sessionID, currentTime, 'EX', 86400);
  }

  public static async checkSessionTimeStamp(sessionID: string) {
    let sessionTimestamp = await redis.get(sessionID);
    return Number(sessionTimestamp);
  }

  public static async addRoomToSession(sessionID: string, roomName: string) {
    await redis.hset(`rooms:${sessionID}`, roomName, currentTimeStamp());
  }

  public static async removeRoomFromSession(sessionID: string, roomName: string) {
    await redis.hdel(`rooms:${sessionID}`, roomName);
  }
}

export default RedisHandler;
