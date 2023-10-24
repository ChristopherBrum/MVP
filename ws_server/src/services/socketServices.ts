import { v4 as uuid4 } from 'uuid';
import { Socket } from "socket.io";
import { Date, Document } from 'mongoose';

import { MgRequest } from '../db/mongoService.js';

interface SessionObject {
  sessionId: string;
}

interface RoomData {
  message: string;
}

interface IMgRequest extends Document<any> {
  room: {
    roomName: string,
    roomData: RoomData,
  },
  createdAt: Date,
  updatedAt: Date
}

//
let currentSessions: SessionObject[] = []

const fetchMissedMessages = async (offset: Date) => {
  let messageArr: IMgRequest[] = await MgRequest.find({ createdAt: { $gt: offset } });
  return messageArr;
}

const isReconnect = (socket: Socket) => {
  const currentSessionID = socket.handshake.auth.sessionId
  return currentSessions.find(obj => obj.sessionId === currentSessionID);
}

export const sessionIdMiddleware = (socket: Socket, next: () => void) => {
  const session = isReconnect(socket);

  // console.log('\n')
  // console.log('######## NEW TEST ##########')
  // console.log("Middleware executed");
  // console.log("currentSessionId:", socket.handshake.auth.sessionId);
  // console.log(currentSessions);
  // console.log('\n');


  if (session) {
    socket.data.sessionId = session.sessionId;
    return next();
  }

  let randomID = uuid4();

  socket.data.sessionId = randomID;

  currentSessions.push({ sessionId: randomID });

  next();
}

// called when io.on(connect)
export const handleConnection = async (socket: Socket) => {

  socket.on('join', (roomName) => {
    socket.join(roomName); // Join the specified room
    console.log(`Client has joined room: ${roomName}`);

    // Emit something to the client that just joined the room
    socket.emit('roomJoined', `You have joined room: ${roomName}`);
  });

  if (isReconnect(socket)) {

    console.log('A user re-connected');

    socket.join("room 1");

    console.log('###### NEW TEST #######');
    console.log('Session Obj', isReconnect(socket));
    console.log('Offset Value', socket.handshake.auth.offset); // the timestamp of the last message saved to the database
    console.log('\n')

    let messageArr = await fetchMissedMessages(socket.handshake.auth.offset)

    messageArr.forEach(message => {
      let msg = message.room.roomData
      let timestamp = message.createdAt
      console.log([msg, timestamp]);
      socket.emit("message", [msg, timestamp]);
    });

  } else {
    console.log('A user connected first time');
    socket.join("room 1");

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
