import { v4 as uuid4 } from 'uuid';
import { Socket } from "socket.io";
import { NextFunction } from 'express';
import { Date, Document } from 'mongoose';

const MgRequest = require('../db/mongoService');

interface SessionObject {
  sessionId: string;
}

interface RoomData {
  hi: string;
}

interface IMgRequest extends Document<any> {
  room: {
    roomName: string,
    roomData: RoomData
  },
}

let reconnect: boolean = false;

let currentSessions: SessionObject[] = []

const fetchMissedMessages = async (offset: Date) => {
  console.log('#fetchMissedMessages Offset passed', offset)
  let messageArr: IMgRequest[] = await MgRequest.find({ createdAt: { $gt: offset } });
  return messageArr;
}


export const sessionIdMiddleware = (socket: Socket, next: NextFunction) => {
  const currentSessionID = socket.handshake.auth.sessionId

  console.log('\n')
  console.log('######## NEW TEST ##########')
  console.log("Middleware executed");
  // console.log(socket.data.sessionId);
  console.log("currentSessionID:", currentSessionID);
  console.log(currentSessions);
  console.log('\n');

  if (currentSessionID) {
    const session = currentSessions.find(obj => obj.sessionId === currentSessionID);
    if (session) {
      socket.data.sessionId = session.sessionId;
      reconnect = true;
      return next();
    }
  }
  let randomID = uuid4();

  socket.data.sessionId = randomID;

  currentSessions.push({ sessionId: randomID });

  // console.log(currentSessions);
  // console.log('\n');

  next();
}

export const handleConnection = async (socket: Socket) => {
  if (reconnect) {
    console.log('A user re-connected');

    socket.join("room 1");

    let messageArr = await fetchMissedMessages(socket.handshake.auth.offset)

    messageArr.forEach(message => {
      let msg = message.room.roomData
      socket.emit("connect_message", msg);
    });

  } else {
    console.log('A user connected first time');
    socket.join("room 1");
    socket.handshake.auth.offset = undefined
    socket.emit("session", {
      sessionId: socket.data.sessionId,
    })
  }
}


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
