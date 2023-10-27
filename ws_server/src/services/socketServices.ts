import { v4 as uuid4 } from 'uuid';
import { Socket } from "socket.io";
import { setSessionTime, redisMissedMessages, addRoomToSession, checkSessionTimestamp, redisSubscribedRooms, processSubscribedRooms } from '../db/redisService.js';
import { readPreviousMessagesByRoom } from '../db/dynamoService.js';

interface CustomSocket extends Socket {
  sessionId?: string;
}

interface DynamoMessage {
  id: object;
  time_created: object;
  payload: string;
}

interface messageObject {
  message: string;
}

const SHORT_TERM_RECOVERY_TIME_MAX = 120000;
const LONG_TERM_RECOVERY_TIME_MAX = 86400000;

const resubscribe = (socket: CustomSocket, rooms: string[]) => {
  for (let room of rooms) {
    socket.join(room);
    socket.emit('roomJoined', `You have joined room: ${room}`);
  }
}

// also have this in redisService; repeated
interface RedisMessage {
  [key: string]: string[];
}

const parseRedisMessages = (messagesArr: string[]) => {
  return messagesArr.map(jsonString => {
    let jsonObj = JSON.parse(jsonString);
    return jsonObj["payload"];
  });
}

const emitShortTermReconnectionStateRecovery = async (socket: CustomSocket, timestamp: number, rooms: string[]) => {
  console.log('#### Redis Emit');
  let messagesObj = await redisMissedMessages(timestamp, rooms) as RedisMessage;
  console.log("message object returned from redis", messagesObj);

  for (let room in messagesObj) {
    let messages = parseRedisMessages(messagesObj[room]);
    console.log("Messages for each room returned from redis", messages)
    emitMessages(socket, messages);
  }
}

const parseDynamoMessages = (dynamomessages: DynamoMessage[]) => {
  return dynamomessages.map(dynamoobj => {
    let jsonObj = JSON.parse(dynamoobj["payload"])
    return jsonObj;
  })
}

const emitLongTermReconnectionStateRecovery = async (socket: CustomSocket,
  rooms: string[],
  lastDisconnect: number) => {
  for (let room of rooms) {
    let messages = await readPreviousMessagesByRoom(room, lastDisconnect) as DynamoMessage[];
    let parsedMessages = parseDynamoMessages(messages);
    emitMessages(socket, parsedMessages);
  }
}

const emitMessages = (socket: CustomSocket, messages: messageObject[]) => {
  messages.forEach(messages => {
    socket.emit("message", messages);
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

      if (timeSinceLastDisconnect <= SHORT_TERM_RECOVERY_TIME_MAX) { // less than 2 mins (milliseconds)
        console.log('short term state recovery branch executed')
        emitShortTermReconnectionStateRecovery(socket, sessionTimestamp, subscribedRooms);
      } else if (timeSinceLastDisconnect <= LONG_TERM_RECOVERY_TIME_MAX) { // less than 24 hrs (milliseconds)
        console.log('long term state recovery branch executed')
        emitLongTermReconnectionStateRecovery(socket, subscribedRooms, sessionTimestamp);
      }
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
    console.log("sessionId:", sessionId);
    setSessionTime(sessionId);
  })
}
