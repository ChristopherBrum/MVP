// import { Socket } from "socket.io";
import RedisHandler from '../db/redisService.js';
import { readPreviousMessagesByRoom } from '../db/dynamoService.js';
import { currentTimeStamp } from "../utils/helpers.js";
import { parse } from "cookie";
import {
  CustomSocket,
  DynamoMessage,
  messageObject,
  RedisMessage,
  SubscribedRooms
} from "../typings.js"

const SHORT_TERM_RECOVERY_TIME_MAX = 120000;
const LONG_TERM_RECOVERY_TIME_MAX = 86400000;

// interface CustomSocket extends Socket { // any way to add to typings file?
//   twineID?: string;
//   twineTS?: number;
//   twineRC?: boolean;
// };

// interface DynamoMessage {
//   id: object;
//   time_created: object;
//   payload: string;
// };

// interface messageObject {
//   message: string;
//   timestamp: number;
//   room: string;
// };

const resubscribe = (socket: CustomSocket, rooms: SubscribedRooms) => {
  const roomNames = Object.keys(rooms)
  for (let room of roomNames) {
    socket.join(room);
    socket.emit('roomJoined', `You have joined room: ${room}`);
  }
};

// interface RedisMessage {
//   [key: string]: string[];
// };

// interface SubscribedRooms {
//   [key: string]: string;
// };

const parseRedisMessages = (messagesArr: string[]) => {
  return messagesArr.map(jsonString => {
    let jsonObj = JSON.parse(jsonString);
    return jsonObj["payload"];
  });
};

// rooms is now { roomA: joinTime, roomB: joinTime, etc }
const emitShortTermReconnectionStateRecovery = async (socket: CustomSocket, timestamp: number, rooms: SubscribedRooms) => {
  let messagesObj = await RedisHandler.redisMissedMessages(timestamp, rooms) as RedisMessage;

  for (let room in messagesObj) {
    let messages = parseRedisMessages(messagesObj[room]);
    emitMessages(socket, messages, room);
  }
}

const parseDynamoMessages = (dynamomessages: DynamoMessage[]) => {
  return dynamomessages.map(dynamoobj => {
    let jsonObj = JSON.parse(dynamoobj["payload"])
    return jsonObj;
  })
};

const emitLongTermReconnectionStateRecovery = async (socket: CustomSocket, timestamp: number, rooms: SubscribedRooms) => {
  let messages: DynamoMessage[];

  for (let room in rooms) {
    let joinTime = Number(rooms[room]);
    if (timestamp > joinTime) {
      messages = await readPreviousMessagesByRoom(room, timestamp + 1) as DynamoMessage[];
    } else {
      messages = await readPreviousMessagesByRoom(room, joinTime + 1) as DynamoMessage[];
    }
    let parsedMessages = parseDynamoMessages(messages);
    emitMessages(socket, parsedMessages, room);
  }
};

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
  socket.twineID = '';

  if (socket.handshake.headers.cookie) {
    const cookiesData = socket.handshake.headers.cookie;
    const parsedCookies = parse(cookiesData);
    socket.twineID = parsedCookies.twineid;
  }

  socket.twineTS = await RedisHandler.checkSessionTimeStamp(socket.twineID);

  if (socket.twineTS) {
    // re-subscribe to all rooms they were subscribed to before disconnect
    let subscribedRooms: SubscribedRooms = await RedisHandler.redisSubscribedRooms(socket.twineID)
    resubscribe(socket, subscribedRooms);

    const timeSinceLastTimestamp = (currentTimeStamp() - socket.twineTS);

    // executes short-term or long-term state recovery based on `timeSinceLastTimestamp`
    if (timeSinceLastTimestamp <= SHORT_TERM_RECOVERY_TIME_MAX) {
      emitShortTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
    } else if (timeSinceLastTimestamp <= LONG_TERM_RECOVERY_TIME_MAX) {
      emitLongTermReconnectionStateRecovery(socket, socket.twineTS, subscribedRooms);
    }
  }

  socket.on('subscribe', async (roomName) => {
    socket.join(roomName);
    socket.emit('roomJoined', `You have joined room: ${roomName}`);
    let sessionId = socket.twineID || '';
    await RedisHandler.addRoomToSession(sessionId, roomName);
  });

  socket.on('unsubscribe', async (roomName) => {
    socket.leave(roomName);
    socket.emit('roomLeft', `You have left room: ${roomName}`);
    let sessionId = socket.twineID || '';
    await RedisHandler.removeRoomFromSession(sessionId, roomName);
  });

  socket.on('updateSessionTS', (newTime) => {
    let session = socket.twineID || '';
    RedisHandler.setSessionTime(session);
  });
}
