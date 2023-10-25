import { v4 as uuid4 } from 'uuid';
import { Socket } from "socket.io";
import { createSessionHash, retrieveMsgsByRoomAndTime } from '../db/redisService.js';
import dynamoService from '../db/dynamoService.js';

// this is just to make sessionId a property of a socket object
// the purpose is so that sessionId accessible within all the socket listeners
interface CustomSocket extends Socket {
  sessionId?: string;
}

interface DynamoMessage {
  id: object;
  time_created: object;
  payload: object;
}

const dynamoFunc = async (socket: Socket) => {
  let messageArr = await dynamoService.readPreviousMessagesByRoom('C', socket.handshake.auth.offset) as DynamoMessage[];
      
  messageArr.forEach(message => {
    let msg = message.payload
    let timestamp = message.time_created
    socket.emit("message", [msg, timestamp]);
  });
}

// called when io.on(connect)
export const handleConnection = async (socket: CustomSocket) => {

  // client emits to this event as soon as they connect
  // we check if the localStorageSessionId has a value or is undefined
  socket.on('sessionId', (localStorageSessionId) => {
    // if it is truthy, this is a reconnection
    // (if twineSessionId is in their local storage, it should also be in Redis)
    if (localStorageSessionId) {
      console.log('#### Reconnection');
      socket.sessionId = localStorageSessionId;
      // logs to ws_server console; sessionId is used as a key to get the associated Redis timestamp
      retrieveMsgsByRoomAndTime('B', localStorageSessionId);
      dynamoFunc(socket)
    } else {
      // create uuid; save it in Redis; send it to client to store in their local storage
      console.log('#### First Connection');
      let randomId = uuid4();
      socket.sessionId = randomId;
      createSessionHash(randomId);
      socket.emit("setSessionId", randomId);
    }
  })

  socket.on('join', (roomName) => {
    // subscribes the client to the specified room
    socket.join(roomName);
    // emits to the client that they joined the room
    socket.emit('roomJoined', `You have joined room: ${roomName}`);
  });

  socket.on('disconnecting', () => {
    console.log('#### Disconnecting');
    // update the client's sessionId k/v pair in Redis with a new timestamp
    let sessionId = socket.sessionId || '';
    createSessionHash(sessionId);
  })

  // default always join this room, for mongoPostmanRoute
  socket.join("room 1");
}

// interface DynamoMessage {
//   id: object;
//   time_created: object;
//   payload: object;
// }

// let messageArr = await dynamoService.readPreviousMessagesByRoom('C', socket.handshake.auth.offset) as DynamoMessage[];

// messageArr.forEach(message => {
//   let msg = message.payload
//   let timestamp = message.time_created
//   socket.emit("message", [msg, timestamp]);
// });