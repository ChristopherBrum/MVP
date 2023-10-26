import { v4 as uuid4 } from 'uuid';
import { Socket } from "socket.io";
import { setSessionTime, redisMissedMessages, addRoomToSession, checkSessionTimestamp, redisSubscribedRooms, processSubscribedRooms } from '../db/redisService.js';
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

const resubscribe = (socket: CustomSocket, rooms: object) => {
  for (let room in rooms) {
    socket.join(room);
  }
}

// also have this in redisService; repeated
interface RedisMessage {
  [key: string]: string[];
}

const parseMessages = (messagesArr: string[]) => {
  return messagesArr.map(jsonString => {
    let jsonObj = JSON.parse(jsonString);
    return jsonObj["message"];
  })
}

const emitShortTermReconnectionStateRecovery = async (socket: CustomSocket, timestamp: number, rooms: string[]) => {
  // messagesObj: { roomA:[msg1, msg2,] roomB:[msg1, msg2] }
  console.log('#### Redis Emit');
  let messagesObj = await redisMissedMessages(timestamp, rooms) as RedisMessage;
  for (let room in messagesObj) {
    // emit all messages from all subscribed rooms in which there were missed messages
    let message = parseMessages(messagesObj[room]);
    console.log("Message", message);
    socket.emit("redismessage", [message, room]);
  }
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
  socket.on('sessionId', async (localStorageSessionId) => {
    // if it is truthy, this is a reconnection
    // (if twineSessionId is in their local storage, it should also be in Redis)
    if (localStorageSessionId) {
      console.log('#### Reconnection');
      socket.sessionId = localStorageSessionId;

      // fetch session info from redis
      let sessionTimestamp = await checkSessionTimestamp(localStorageSessionId)

      // if there is no session info in redis (last disconnect > 24 hrs ago)
      if (!sessionTimestamp) {
        // add session info to redis and return
        setSessionTime(localStorageSessionId);
        return;
      }

      let subscribedRooms: string[] = await redisSubscribedRooms(localStorageSessionId)

      // re-subscribe to all rooms they were subscribed to before disconnect
      resubscribe(socket, subscribedRooms);
      const timeSinceLastDisconnect = Date.now() - sessionTimestamp;

      console.log("timeSinceLastDisconnect: ", timeSinceLastDisconnect);

      // timeSinceLastDisconnect <= SHORT_TERM_RECOVERY_TIME_MAX
      if (true) { // less than 2 mins (milliseconds)
        emitShortTermReconnectionStateRecovery(socket, sessionTimestamp, subscribedRooms);
      } else if (timeSinceLastDisconnect <= LONG_TERM_RECOVERY_TIME_MAX) { // less than 24 hrs (milliseconds)
        // pull messages from dynamoDB for all subscribed rooms and emit
        console.log('long term state recovery branch executed')
        emitLongTermReconnectionStateRecovery(socket, subscribedRooms, sessionTimestamp);
      }

      // update session info
      // set timestamp to Date.now()


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
