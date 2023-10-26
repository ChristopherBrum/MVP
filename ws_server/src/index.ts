import { createServer } from "http";
import { Server } from "socket.io";
import express from 'express';
import cors from 'cors';
import "dotenv/config"
const app = express();
const httpServer = createServer(app);

import { handleConnection } from './services/socketServices.js';
import { homeRoute, publish } from './services/expressServices.js';

// Express Middleware

app.use(cors({
  origin: 'http://localhost:3002',  // Replace with your client's origin
}));

app.use(express.json());

const PORT = process.env.ENV_PORT || 3001; // this is updated but no ENV_PORT at the moment

// TypeScript types

interface messageObject {
  message: string;
}

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
  message: (message: messageObject) => void;
  roomJoined: (message: string) => void;
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
io.on("connection", handleConnection);

// Backend API

app.get('/', homeRoute);
app.post('/api/twine', publish);
// app.put('/api/postman/rooms', redisPostmanRoomsRoute);
// app.post('/api/postman/dynamo', dynamoPostmanRoute);

// listening on port 3001

httpServer.listen(PORT, () => {
  console.log('TwineServer listening on port', PORT);
});
