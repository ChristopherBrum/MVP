import { v4 as uuid4 } from 'uuid';
import { Socket } from "socket.io";
import { setSessionTime, allSubscribedMessages, addRoomToSession } from '../db/redisService.js';
import { readPreviousMessagesByRoom } from '../db/dynamoService.js'; 

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
  let messageArr = await readPreviousMessagesByRoom('C', socket.handshake.auth.offset) as DynamoMessage[];
      
  messageArr.forEach(message => {
    let msg = message.payload
    let timestamp = message.time_created
    socket.emit("message", [msg, timestamp]);
  });
}

/*
when a client reconnects, we check the rooms they were subscribed to
then we automatically (no user action needed) emit the missing messages from those rooms
to the client directly (not to the overall room)
(how the devs display those messages in the UI is not our concern)
*/

// sessionId key should be in Redis for 24hrs
// check the Redis timestamp for that sessionId
// compare that to the current time
// if the difference is greater than 2 minutes
  // messages should not have expired from cache
  // set property on socket object of reconnection type = short
// else
  // messages should be expired/gone from cache
  // set property on socket object of reconnection type = long
const checkReconnectionType = (sessionId: string) => {
  // const lastSessionTimestamp = checkSessionTime(sessionId);
  // if (lastSessionTimestamp > '2 Minutes!') {
  //   return 'dynamo';
  // } else {
  //   return 'redis';
  // }
  return 'redis';
}

const emitReconnectionStateRecovery = async (socket: CustomSocket, reconnectionType: string, sessionId: string) => {
  if (reconnectionType === 'redis') {
    console.log('#### Redis Reconnection')
    let messagesObj = await allSubscribedMessages(sessionId);
    console.log(messagesObj);
  } else if (reconnectionType === 'dynamo') {
    console.log('#### Dynamo Reconnection')
    dynamoFunc(socket)
  } else {
    console.log('#### Not Dynamo or Redis ??')
  }
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
      const reconnectionType: string = checkReconnectionType(localStorageSessionId);
      emitReconnectionStateRecovery(socket, reconnectionType, localStorageSessionId);
    } else {
      // create uuid; save it in Redis; send it to client to store in their local storage
      console.log('#### First Connection');
      let randomId = uuid4();
      socket.sessionId = randomId;
      setSessionTime(randomId);
      socket.emit("setSessionId", randomId);
    }
  })

  socket.on('join', (roomName) => {
    // subscribes the client to the specified room
    socket.join(roomName);
    // emits to the client that they joined the room
    socket.emit('roomJoined', `You have joined room: ${roomName}`);
    let sessionId = socket.sessionId || '';
    addRoomToSession(sessionId, roomName);
  });

  socket.on('disconnecting', () => {
    console.log('#### Disconnecting');
    // update the client's sessionId k/v pair in Redis with a new timestamp
    let sessionId = socket.sessionId || '';
    setSessionTime(sessionId);
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