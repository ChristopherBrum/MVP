"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConnection = exports.sessionIdMiddleware = void 0;
const uuid_1 = require("uuid");
const MgRequest = require('../db/mongoService');
let reconnect = false;
let currentSessions = [];
const fetchMissedMessages = (offset) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('#fetchMissedMessages Offset passed', offset);
    let messageArr = yield MgRequest.find({ createdAt: { $gt: offset } });
    return messageArr;
});
const sessionIdMiddleware = (socket, next) => {
    const currentSessionID = socket.handshake.auth.sessionId;
    console.log("Middleware executed");
    console.log(currentSessionID);
    console.log(currentSessions);
    if (currentSessionID) {
        const session = currentSessions.find(obj => obj.sessionId === currentSessionID);
        if (session) {
            socket.data.sessionId = session.sessionId;
            reconnect = true;
            return next();
        }
    }
    let randomID = (0, uuid_1.v4)();
    socket.data.sessionId = randomID;
    currentSessions.push({ sessionId: randomID });
    next();
};
exports.sessionIdMiddleware = sessionIdMiddleware;
const handleConnection = (socket) => __awaiter(void 0, void 0, void 0, function* () {
    if (reconnect) {
        console.log('A user re-connected');
        socket.join("room 1");
        let messageArr = yield fetchMissedMessages(socket.handshake.auth.offset);
        messageArr.forEach(message => {
            let msg = message.room.roomData;
            socket.emit("connect_message", msg);
        });
    }
    else {
        console.log('A user connected first time');
        socket.join("room 1");
        socket.handshake.auth.offset = undefined;
        socket.emit("session", {
            sessionId: socket.data.sessionId,
        });
    }
});
exports.handleConnection = handleConnection;
/// atLeastOnce server-side START ////////
// io.on("connection", async (socket) => {
//   const offset = socket.handshake.auth.offset;
//   if (offset) {
//     // this is a reconnection
//     for (const event of await fetchMissedEventsFromDatabase(offset)) {
//       socket.emit("my-event", event);
//     }
//   } else {
//     // this is a first connection
//   }
// });
/// atLeastOnce server-side END ////////
// const fetchLastFive = async (socket: Socket) => {
//   let messageArr = await fetchMessages();
//   messageArr.forEach(message => {
//     let msg = message.room.roomData
//     socket.emit("connect_message", msg);
//   });
// }
