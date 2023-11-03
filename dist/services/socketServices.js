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
import { readPreviousMessagesByRoom } from '../db/dynamoService.js';
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
    console.log('#### Redis Emit');
    let messagesObj = yield RedisHandler.redisMissedMessages(timestamp, rooms);
    console.log("message object returned from redis", messagesObj);
    for (let room in messagesObj) {
        let messages = parseRedisMessages(messagesObj[room]);
        console.log("Messages for each room returned from redis", messages);
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
        console.log('room', room);
        if (timestamp > joinTime) {
            console.log('twineTS is greater');
            messages = (yield readPreviousMessagesByRoom(room, timestamp + 1));
        }
        else {
            console.log('joinTime is greater');
            messages = (yield readPreviousMessagesByRoom(room, joinTime + 1));
        }
        console.log('retrieved long-term messages', messages);
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
    socket.on('stateRecovery', () => __awaiter(void 0, void 0, void 0, function* () {
        const cookiesData = socket.handshake.headers.cookie;
        const parsedCookies = parse(cookiesData);
        let sessionId = parsedCookies.twinert;
        let sessionRc = parsedCookies.twinerc || false;
        if (sessionId) {
            console.log('Twine Session: ', sessionId);
        }
        else {
            console.log('No session found');
        }
        const currDate = new Date();
        currDate.setHours(currDate.getHours() - 25);
        const oldDate = currDate.getTime();
        if (sessionRc) {
            console.log('Reconnect Session');
        }
        ;
        socket.twineID = sessionId || 'a';
        let redisTS = yield RedisHandler.checkSessionTimeStamp(socket.twineID);
        console.log('AFTER REDIS TS');
        console.log(redisTS);
        RedisHandler.checkSessionTimeStamp(socket.twineID)
            .then(data => {
            redisTS = data;
        });
        socket.twineTS = redisTS || oldDate;
        console.log(redisTS);
        // check sessionRc to determine if reconnect
        console.log(sessionRc);
        if (sessionRc) {
            let subscribedRooms = yield RedisHandler.redisSubscribedRooms(socket.twineID);
            // re-subscribe to all rooms they were subscribed to before disconnect
            resubscribe(socket, subscribedRooms);
            const timeSinceLastTimestamp = (currentTimeStamp() - socket.twineTS);
            // executes short-term or long-term state recovery based on `timeSinceLastTimestamp`
            if (timeSinceLastTimestamp <= SHORT_TERM_RECOVERY_TIME_MAX) {
                console.log('short term state recovery branch executed');
                emitShortTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
            }
            else if (timeSinceLastTimestamp <= LONG_TERM_RECOVERY_TIME_MAX) {
                console.log('long term state recovery branch executed');
                emitLongTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
            }
        }
    }));
    socket.on('join', (roomName) => __awaiter(void 0, void 0, void 0, function* () {
        socket.join(roomName);
        console.log('client joined room');
        socket.emit('roomJoined', `You have joined room: ${roomName}`);
        let sessionId = socket.twineID || '';
        yield RedisHandler.addRoomToSession(sessionId, roomName);
    }));
    // disconnect vs. disconnecting difference?
    socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('#### Disconnected');
    }));
    socket.on('updateSessionTS', (newTime) => {
        let session = socket.twineID || '';
        RedisHandler.setSessionTime(session);
    });
});
