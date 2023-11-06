import { Socket } from "socket.io";

// index.ts
// interface messageObject {
//   message: string;
// };

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
};

interface ClientToServerEvents {
  hello: () => void;
  message: (message: messageObject) => void;
  session: (message: SessionObject) => void;
};

interface InterServerEvents {
  ping: () => void;
};

interface SocketData {
  sessionId: string;
};

interface SessionObject {
  sessionId: string;
};

// expressServices.ts
interface messageObject {
  message: string;
  timestamp: number;
  room: string;
};

interface jsonData {
  room_id: string;
  payload: messageObject;
};

// redisServices
interface SubscribedRooms {
  [key: string]: string;
};

interface SubscribedRoomMessages {
  [key: string]: string[];
};

// socketService
interface CustomSocket extends Socket {
  twineID?: string;
  twineTS?: number;
  twineRC?: boolean;
};

interface DynamoMessage {
  id: object;
  time_created: object;
  payload: string;
};

interface RedisMessage {
  [key: string]: string[];
};