import { Socket } from "socket.io";
import { redisMissedMessages, addRoomToSession, redisSubscribedRooms } from '../db/redisService.js';
import { readPreviousMessagesByRoom } from '../db/dynamoService.js';
import { newCustomStore } from '../index.js';
import { SessionData } from 'express-session';
import { currentTimeStamp } from "../utils/helpers.js";

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
  timestamp: number;
  room: string;
}

const SHORT_TERM_RECOVERY_TIME_MAX = 120000;
const LONG_TERM_RECOVERY_TIME_MAX = 86400000;

const resubscribe = (socket: CustomSocket, rooms: SubscribedRooms) => {
  const roomNames = Object.keys(rooms)
  for (let room of roomNames) {
    socket.join(room);
    socket.emit('roomJoined', `You have joined room: ${room}`);
  }
}

interface RedisMessage {
  [key: string]: string[];
}

interface SubscribedRooms {
  [key: string]: string;
}

const parseRedisMessages = (messagesArr: string[]) => {
  return messagesArr.map(jsonString => {
    let jsonObj = JSON.parse(jsonString);
    return jsonObj["payload"];
  });
}

// rooms is now { roomA: joinTime, roomB: joinTime, etc }
const emitShortTermReconnectionStateRecovery = async (socket: CustomSocket, timestamp: number, rooms: SubscribedRooms) => {
  console.log('#### Redis Emit');
  let messagesObj = await redisMissedMessages(timestamp, rooms) as RedisMessage;
  console.log("message object returned from redis", messagesObj);

  for (let room in messagesObj) {
    let messages = parseRedisMessages(messagesObj[room]);
    console.log("Messages for each room returned from redis", messages)
    emitMessages(socket, messages, room);
  }
}

const parseDynamoMessages = (dynamomessages: DynamoMessage[]) => {
  return dynamomessages.map(dynamoobj => {
    let jsonObj = JSON.parse(dynamoobj["payload"])
    return jsonObj;
  })
}

// rooms is now { roomA: joinTime, roomB: joinTime, etc }
const emitLongTermReconnectionStateRecovery = async (socket: CustomSocket, timestamp: number, rooms: SubscribedRooms) => {
  let messages: DynamoMessage[];

  for (let room in rooms) {
    let joinTime = Number(rooms[room]);
    console.log('room', room)
    if (timestamp > joinTime) { 
      console.log('twineTS is greater')
      messages = await readPreviousMessagesByRoom(room, timestamp + 1) as DynamoMessage[];
    } else {
      console.log('joinTime is greater')
      messages = await readPreviousMessagesByRoom(room, joinTime + 1) as DynamoMessage[];
    }
    console.log('retrieved long-term messages', messages)
    let parsedMessages = parseDynamoMessages(messages);
    emitMessages(socket, parsedMessages, room);
  }

}

const emitMessages = (socket: CustomSocket, messages: messageObject[], room_id: string) => {
  const time = currentTimeStamp();
  messages.forEach(message => {
    message["timestamp"] = time;
    message["room"] = room_id;
    socket.emit("message", message);
  });
}

// called when io.on(connect)
// should always be a twineID and twineTS available at this point, whether reconnect or first time
export const handleConnection = async (socket: CustomSocket) => {
  socket.twineID = (socket.request as any).session?.twineID as string;
  socket.twineTS = (socket.request as any).session?.twineTS as number;
  socket.twineRC = (socket.request as any).session?.twineRC as boolean;

  console.log('ID: ' + socket.twineID);
  console.log('TS: ' + socket.twineTS);
  console.log('RC: ' + socket.twineRC);

  // check twineRC to determine if reconnect
  if (socket.twineRC) {
    let subscribedRooms: SubscribedRooms = await redisSubscribedRooms(socket.twineID)

    // re-subscribe to all rooms they were subscribed to before disconnect
    resubscribe(socket, subscribedRooms);
    const timeSinceLastTimestamp = (currentTimeStamp() - socket.twineTS);

    console.log("timeSinceLastDisconnect: ", timeSinceLastTimestamp);

    if (timeSinceLastTimestamp <= SHORT_TERM_RECOVERY_TIME_MAX) { // less than 2 mins (milliseconds)
      console.log('short term state recovery branch executed')
      // add conditional that checks if there is a missed message? within `emitShort` before emitting?
      emitShortTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
    } else if (timeSinceLastTimestamp <= LONG_TERM_RECOVERY_TIME_MAX) { // less than 24 hrs (milliseconds)
      console.log('long term state recovery branch executed')
      // add conditional that checks if there is a missed message?  within `emitLong` before emitting?
      emitLongTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
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
  });

  socket.on('updateSessionTS', (newTime) => {
    const sessionId = socket.twineID || '';
    const newTimestamp = newTime;
    const timeSinceLastTimestamp = (currentTimeStamp() - newTimestamp);
    const now = new Date();
    let expirationDate = new Date(now.getTime() + LONG_TERM_RECOVERY_TIME_MAX);

    if (timeSinceLastTimestamp >= LONG_TERM_RECOVERY_TIME_MAX) {
      expirationDate = new Date(now.getTime());
    }

    const sessionData: SessionData & { twineID: string; twineTS: number; twineRC: boolean } = {
      twineID: sessionId,
      twineTS: newTimestamp,
      twineRC: true,
      cookie: {
        httpOnly: true,
        // expire if currentTime - newTimestamp difference >= 24hrs
        expires: expirationDate,
        originalMaxAge: null,
      },
    };

    // update the session data in your store
    newCustomStore.set(sessionId, sessionData, (err) => {
      if (err) {
        console.error('Error updating session data:', err);
      }
    });

    // might also need to update the session in the request object
    (socket.request as any).session.twineTS = newTimestamp;
    (socket.request as any).session.save((err: Error) => {
      if (err) {
        console.error('Error saving session:', err);
      }
    });
  });
}
