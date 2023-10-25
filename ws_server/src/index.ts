import { createServer } from "http";
import { Server } from "socket.io";
import { Date } from 'mongoose';
import express from 'express';
import cors from 'cors';
import "dotenv/config"
const app = express();
const httpServer = createServer(app);

import { sessionIdMiddleware, handleConnection } from './services/socketServices.js';
import { homeRoute, mongoPostmanRoute, mongoPostmanRoomsRoute, dynamoPostmanRoute } from './services/expressServices.js';

// Express Middleware

app.use(cors({
  origin: 'http://localhost:3002',  // Replace with your client's origin
}));

app.use(express.json());

const PORT = process.env.ENV_PORT || 3001; // this is updated but no ENV_PORT at the moment

// TypeScript types

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface RoomData {
  message: string;
}

interface ClientToServerEvents {
  hello: () => void;
  message: (message: any[]) => void;
  roomJoined: (message: any[]) => void;
  connect_message: (message: RoomData) => void;
  session: (message: SessionObject) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
  sessionId: string;
  offset: Date; // createdAt is a Mongoose prop of type Date
}

interface SessionObject {
  sessionId: string;
}

// instantiating new WS server

export const io = new Server<
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: 'http://localhost:3002',  // Replace with your client's origin
    methods: ['GET', 'POST'],
  },
});

// WS Server Logic

io.use(sessionIdMiddleware);
io.on("connection", handleConnection);

// Backend API

app.get('/', homeRoute);
app.put('/api/postman', mongoPostmanRoute);
app.put('/api/postman/rooms', mongoPostmanRoomsRoute);
app.post('/api/postman/dynamo', dynamoPostmanRoute);

// listening on port 3001

httpServer.listen(PORT, () => {
  console.log('listening on port', PORT);
});
