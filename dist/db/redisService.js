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
import "dotenv/config";
const generateRandomStringPrefix = (payload) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    return result + payload;
};
const removeRandomStringPrefixs = (arrayOfMessages) => {
    return arrayOfMessages.map(message => message.slice(5));
};
export const storeMessageInSet = (room, payload, timestamp) => __awaiter(void 0, void 0, void 0, function* () {
    let lengthOfSet = yield redis.zcard(`${room}Set`);
    let randomizedPayload = generateRandomStringPrefix(payload);
    if (lengthOfSet >= 100) {
        console.log("Set exceeds 100 messages, please try again later");
        return;
    }
    else {
        yield redis.zadd(`${room}Set`, timestamp, randomizedPayload);
        console.log('Message stored in cache: ' + randomizedPayload);
    }
});
// currently fetches ALL messages missed in subscribed rooms (no pagination)
export const processSubscribedRooms = (timestamp, room, result) => __awaiter(void 0, void 0, void 0, function* () {
    // idk why .zrange doesn't work
    // https://redis.github.io/ioredis/classes/Redis.html#zrange
    // await redis.zrange(`${room}Set`, timestamp, '+inf', 'BYSCORE', (error, array) => {
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
// subscribed rooms is object with k: roomName v: joinTime
export const redisMissedMessages = (twineTS, subscribedRooms) => __awaiter(void 0, void 0, void 0, function* () {
    let result = {};
    // if twineTS > joinTime, then twineTS has been updated since the client joined the room
    // if twineTS < joinTime, then twineTS default value never updated (client never received message)
    for (let room in subscribedRooms) {
        let joinTime = Number(subscribedRooms[room]);
        if (twineTS > joinTime) {
            console.log('twineTS is greater');
            yield processSubscribedRooms(twineTS + 1, room, result);
        }
        else {
            console.log('joinTime is greater');
            yield processSubscribedRooms(joinTime + 1, room, result);
        }
    }
    return result;
});
export const redisSubscribedRooms = (sessionID) => __awaiter(void 0, void 0, void 0, function* () {
    const subscribedRoomKeys = yield redis.hgetall(`rooms:${sessionID}`);
    return subscribedRoomKeys;
});
export const setSessionTime = (sessionID) => __awaiter(void 0, void 0, void 0, function* () {
    const currentTime = currentTimeStamp();
    yield redis.set(sessionID, currentTime);
});
// sessionTimestamp must be converted back to number on retreival
// because redis converts it to a string
export const checkSessionTimestamp = (sessionID) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('checkSessionTimestamp executed');
    // FOUND YOU!!!!!!
    let sessionTimestamp = yield redis.get(sessionID);
    console.log('sessionTimestamp: ', sessionTimestamp);
    return Number(sessionTimestamp);
});
// if the hash exists, replaced the field/value set in the hash with the new value
// if the hash does not exist, create it and add the roomName/roomName k/v pair
export const addRoomToSession = (sessionID, roomName) => __awaiter(void 0, void 0, void 0, function* () {
    yield redis.hset(`rooms:${sessionID}`, roomName, currentTimeStamp());
});
// hdel returns 1 if the field existed and was removed
// hdel returns 0 if the field or hash does not exist
export const removeRoomFromSession = (sessionID, roomName) => __awaiter(void 0, void 0, void 0, function* () {
    yield redis.hdel(`rooms:${sessionID}`, roomName);
});
