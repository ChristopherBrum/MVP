import { v4 as uuid4 } from 'uuid';
import { Socket } from "socket.io";
import { createSessionHash, retrieveMsgsByRoomAndTime, checkSessionTime } from '../db/redisService.js';
import { createMessage, readPreviousMessagesByRoom } from '../db/dynamoService.js';

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

const SHORT_TERM_RECOVERY_TIME_MAX = 120000;
const LONG_TERM_RECOVERY_TIME_MAX = 86400000;

const readRedisSessionInfo = (localStorageSessionId: number) => {
  // mocked redis session data
  return {
    timestamp: 1698278913080,
    "A": "A",
    "B": "B",
  }
}

const resubscribe = (socket: CustomSocket, rooms: object) => {
  for (let room in rooms) {
    socket.join(room);
  }
}

const emitShortTermReconnectionStateRecovery = (socket: CustomSocket, rooms: object) => {

}

const emitLongTermReconnectionStateRecovery = async (socket: CustomSocket, 
                                                     rooms: object, 
                                                     lastDisconnect: number) => {
  console.log("lastDisconnect:", lastDisconnect);  
  for (let room in rooms) {
    let messages = await readPreviousMessagesByRoom(room, lastDisconnect) as DynamoMessage[];
    emitMessages(socket, messages);
  }
}

const emitMessages = (socket: CustomSocket, messages: DynamoMessage[]) => {
  messages.forEach(message => {
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
      
      // fetch session info from redis (mocked)
      const sessionData = readRedisSessionInfo(localStorageSessionId);

      // if there is no session info in redis (last disconnect > 24 hrs ago)
      if (!sessionData) {
        // add session info to redis and return
        createSessionHash(localStorageSessionId);
        return;
      }
      
      // grab timestampo and rooms data
      let { timestamp, ...rooms } = sessionData;
      // re-subscribe to all rooms
      resubscribe(socket, rooms);

      const timeSinceLastDisconnect = Date.now() - timestamp;

      console.log("timeSinceLastDisconnect:", timeSinceLastDisconnect);

      if (false) { // replace with line below
      // if (timeSinceLastDisconnect <= SHORT_TERM_RECOVERY_TIME_MAX) { // less than 2 mins (milliseconds)
        // fetch messages from redis and emit
        // emitShortTermReconnectionStateRecovery(socket, rooms, timestamp);
      } else if (timeSinceLastDisconnect <= LONG_TERM_RECOVERY_TIME_MAX) { // less than 24 hrs (milliseconds)
        // pull messages from dynamoDB for all subscribed rooms and emit
        console.log('long term state recovery branch executed')
        emitLongTermReconnectionStateRecovery(socket, rooms, timestamp);
      }

      // update session info
      // set timestamp to Date.now()


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