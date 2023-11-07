var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import RedisHandler from '../db/redisService.js';
import DynamoHandler from "../db/dynamoService.js";
import { currentTimeStamp } from "../utils/helpers.js";
import { parse } from "cookie";
const SHORT_TERM_RECOVERY_TIME_MAX = 120000;
const LONG_TERM_RECOVERY_TIME_MAX = 86400000;
;
;
;
const resubscribe = (socket, rooms) => {
    const roomNames = Object.keys(rooms);
    for (let room of roomNames) {
        socket.join(room);
        socket.emit('roomJoined', `You have joined room: ${room}`);
    }
};
;
;
const parseRedisMessages = (messagesArr) => {
    return messagesArr.map(jsonString => {
        let jsonObj = JSON.parse(jsonString);
        return jsonObj["payload"];
    });
};
// rooms is now { roomA: joinTime, roomB: joinTime, etc }
const emitShortTermReconnectionStateRecovery = (socket, timestamp, rooms) => __awaiter(void 0, void 0, void 0, function* () {
    let messagesObj = yield RedisHandler.redisMissedMessages(timestamp, rooms);
    for (let room in messagesObj) {
        let messages = parseRedisMessages(messagesObj[room]);
        emitMessages(socket, messages, room);
    }
});
const parseDynamoMessages = (dynamomessages) => {
    return dynamomessages.map(dynamoobj => {
        let jsonObj = JSON.parse(dynamoobj["payload"]);
        return jsonObj;
    });
};
const emitLongTermReconnectionStateRecovery = (socket, timestamp, rooms) => __awaiter(void 0, void 0, void 0, function* () {
    let messages;
    for (let room in rooms) {
        let joinTime = Number(rooms[room]);
        if (timestamp > joinTime) {
            console.log('twineTS is greater');
            messages = (yield DynamoHandler.readPreviousMessagesByRoom(room, timestamp + 1));
        }
        else {
            console.log('joinTime is greater');
            messages = (yield DynamoHandler.readPreviousMessagesByRoom(room, joinTime + 1));
        }
        let parsedMessages = parseDynamoMessages(messages);
        emitMessages(socket, parsedMessages, room);
    }
});
const emitMessages = (socket, messages, room_id) => {
    const time = currentTimeStamp();
    messages.forEach(message => {
        message["timestamp"] = time;
        message["room"] = room_id;
        socket.emit("message", message);
    });
};
// called when io.on(connect)
// should always be a twineID and twineTS available at this point, whether reconnect or first time
export const handleConnection = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    socket.twineID = '';
    if (socket.handshake.headers.cookie) {
        const cookiesData = socket.handshake.headers.cookie;
        const parsedCookies = parse(cookiesData);
        socket.twineID = parsedCookies.twineid;
    }
    socket.twineTS = yield RedisHandler.checkSessionTimeStamp(socket.twineID);
    if (socket.twineTS) {
        // re-subscribe to all rooms they were subscribed to before disconnect
        let subscribedRooms = yield RedisHandler.redisSubscribedRooms(socket.twineID);
        resubscribe(socket, subscribedRooms);
        const timeSinceLastTimestamp = (currentTimeStamp() - socket.twineTS);
        // executes short-term or long-term state recovery based on `timeSinceLastTimestamp`
        if (timeSinceLastTimestamp <= SHORT_TERM_RECOVERY_TIME_MAX) {
            emitShortTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
        }
        else if (timeSinceLastTimestamp <= LONG_TERM_RECOVERY_TIME_MAX) {
            emitLongTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
        }
    }
    socket.on('subscribe', (roomName) => __awaiter(void 0, void 0, void 0, function* () {
        socket.join(roomName);
        socket.emit('roomJoined', `You have joined room: ${roomName}`);
        let sessionId = socket.twineID || '';
        yield RedisHandler.addRoomToSession(sessionId, roomName);
    }));
    socket.on('unsubscribe', (roomName) => __awaiter(void 0, void 0, void 0, function* () {
        socket.leave(roomName);
        socket.emit('roomLeft', `You have left room: ${roomName}`);
        let sessionId = socket.twineID || '';
        yield RedisHandler.removeRoomFromSession(sessionId, roomName);
    }));
    socket.on('updateSessionTS', (newTime) => {
        let session = socket.twineID || '';
        RedisHandler.setSessionTime(session);
    });
});
