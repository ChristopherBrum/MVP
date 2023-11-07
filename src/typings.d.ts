import { Socket } from "socket.io";

// index.ts
export interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
};

export interface ClientToServerEvents {
  hello: () => void;
  message: (message: messageObject) => void;
  session: (message: SessionObject) => void;
};

export interface InterServerEvents {
  ping: () => void;
};

export interface SocketData {
  sessionId: string;
};

export interface SessionObject {
  sessionId: string;
};
  
// expressServices.ts
export interface messageObject {
  message: string;
  timestamp: number;
  room: string;
};

export interface jsonData {
  room_id: string;
  payload: messageObject;
};
  
// redisServices
export interface SubscribedRooms {
  [key: string]: string;
};

export interface SubscribedRoomMessages {
  [key: string]: string[];
};

// socketService
export interface CustomSocket extends Socket {
  twineID?: string;
  twineTS?: number;
  twineRC?: boolean;
};

export interface DynamoMessage {
  id: object;
  time_created: object;
  payload: string;
};

export interface RedisMessage {
  [key: string]: string[];
};
// }