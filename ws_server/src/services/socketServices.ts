import { parse } from "cookie";
import { Socket } from "socket.io";
import { redisMissedMessages, addRoomToSession, redisSubscribedRooms } from '../db/redisService.js';
import { readPreviousMessagesByRoom } from '../db/dynamoService.js';
import { hourExpiration } from '../utils/helpers.js';
import { newCustomStore } from '../index.js';
import { SessionData } from 'express-session';

interface CustomSocket extends Socket {
  twineID?: string;
  twineTS?: number;
  twineRC?: boolean;
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

// repeated in redisService
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
// should always be a twineID and twineTS available at this point, whether reconnect or first time
export const handleConnection = async (socket: CustomSocket) => {
  socket.twineID = (socket.request as any).session?.twineID as string;
  socket.twineTS = (socket.request as any).session?.twineTS as number;
  socket.twineRC = (socket.request as any).session?.twineRC as boolean;

  console.log('$$$$$ twineID: ' + socket.twineID);
  console.log('$$$$$ twineTS: ' + socket.twineTS);
  console.log('$$$$$ twineRC: ' + socket.twineRC);

  // check twineRC to determine if reconnect
  if (socket.twineRC) {
    let subscribedRooms: string[] = await redisSubscribedRooms(socket.twineID)

    // re-subscribe to all rooms they were subscribed to before disconnect
    resubscribe(socket, subscribedRooms);
    const timeSinceLastDisconnect = Date.now() - socket.twineTS;

    console.log("timeSinceLastDisconnect: ", timeSinceLastDisconnect);

    if (timeSinceLastDisconnect <= SHORT_TERM_RECOVERY_TIME_MAX) { // less than 2 mins (milliseconds)
      console.log('short term state recovery branch executed')
      emitShortTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
    } else if (timeSinceLastDisconnect <= LONG_TERM_RECOVERY_TIME_MAX) { // less than 24 hrs (milliseconds)
      console.log('long term state recovery branch executed')
      emitLongTermReconnectionStateRecovery(socket, subscribedRooms, socket.twineTS);
    }
  }

  socket.on('join', (roomName) => {
    socket.join(roomName);
    socket.emit('roomJoined', `You have joined room: ${roomName}`);
    let sessionId = socket.twineID || '';
    addRoomToSession(sessionId, roomName);
  });

  // disconnect vs. disconnecting difference?
  socket.on('disconnect', async () => {
    console.log('#### Disconnected');

    // Update the twineTS cookie
    const sessionId = socket.twineID || '';
    const newTimestamp = Date.now();
    const sessionData: SessionData & { twineID: string; twineTS: number; twineRC: boolean } = {
      twineID: sessionId,
      twineTS: newTimestamp,
      twineRC: true,
      cookie: {
        httpOnly: true,
        expires: hourExpiration(),
        originalMaxAge: null,
      },
    };

    // Update the session data in your store
    // If you are using the `express-session` with a custom store, you can call the `set` method on the store
    newCustomStore.set(sessionId, sessionData, (err) => {
      if (err) {
        console.error('Error updating session data:', err);
      }
    });

    // If you are using `socket.io` with `express-session`, you might also need to update the session in the request object
    (socket.request as any).session.twineTS = newTimestamp;
    (socket.request as any).session.save((err: Error) => {
      if (err) {
        console.error('Error saving session:', err);
      }
    });
  });
}
