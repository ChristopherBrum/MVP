var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { currentTimeStamp } from "../utils/helpers.js";
import { redis } from '../index.js';
import { generateRandomStringPrefix, removeRandomStringPrefixs } from "./redisHelpers.js";
import "dotenv/config";
;
;
class RedisHandler {
    static storeMessagesInSet(room, payload, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            let lengthOfSet = yield redis.zcard(`${room}Set`);
            let randomizedPayload = generateRandomStringPrefix(payload);
            if (lengthOfSet >= 100) {
                console.log("Set exceeds 100 messages, please try again later");
                return;
            }
            else {
                yield redis.zadd(`${room}Set`, timestamp, randomizedPayload);
            }
        });
    }
    static processSubscribedRooms(timestamp, room, result) {
        return __awaiter(this, void 0, void 0, function* () {
            yield redis.zrangebyscore(`${room}Set`, timestamp, '+inf', (error, array) => {
                if (error) {
                    console.error('Error reading sorted set:', error);
                }
                else {
                    let processedMessages = removeRandomStringPrefixs(array);
                    result[room] = processedMessages;
                }
            });
        });
    }
    static redisMissedMessages(twineTS, subscribedRooms) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = {};
            for (let room in subscribedRooms) {
                let joinTime = Number(subscribedRooms[room]);
                if (twineTS > joinTime) {
                    yield RedisHandler.processSubscribedRooms(twineTS + 1, room, result);
                }
                else {
                    yield RedisHandler.processSubscribedRooms(joinTime + 1, room, result);
                }
            }
            return result;
        });
    }
    static redisSubscribedRooms(sessionID) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscribedRoomKeys = yield redis.hgetall(`rooms:${sessionID}`);
            return subscribedRoomKeys;
        });
    }
    static setSessionTime(sessionID) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentTime = currentTimeStamp();
            yield redis.set(sessionID, currentTime, 'EX', 86400);
        });
    }
    static checkSessionTimeStamp(sessionID) {
        return __awaiter(this, void 0, void 0, function* () {
            let sessionTimestamp = yield redis.get(sessionID);
            return Number(sessionTimestamp);
        });
    }
    static addRoomToSession(sessionID, roomName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield redis.hset(`rooms:${sessionID}`, roomName, currentTimeStamp());
        });
    }
    static removeRoomFromSession(sessionID, roomName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield redis.hdel(`rooms:${sessionID}`, roomName);
        });
    }
}
export default RedisHandler;
