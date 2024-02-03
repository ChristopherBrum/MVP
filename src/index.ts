import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { handleConnection } from './services/socketServices.js';
import { homeRoute, publish } from './services/expressServices.js';
import { setCookie } from './services/cookieServices.js';
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
} from "./typings.js"
import CronJobHandler from "./db/redisCronJobs.js";
import 'dotenv/config';
import cron from 'node-cron';
import cors from 'cors';

const PORT = process.env.ENV_PORT || 3005;
const redisEndpoint = process.env.CACHE_ENDPOINT || 'redis://localhost:6379';
const corsOptions = {
  origin: true,
  credentials: true,
};

export const redis = new Redis(redisEndpoint);

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Error connecting to Redis', err);
});

const app = express();
app.use(cors(corsOptions));
app.set('trust proxy', 1);
app.use(express.json());

const httpServer = createServer(app);

// instantiate new WS server
export const io = new Server<
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Adapter logic
const subClient = redis.duplicate();
io.adapter(createAdapter(redis, subClient));

// WS Server Logic
io.on("connection", handleConnection);

// Backend API
app.get('/', homeRoute);
app.post('/api/twine', publish);

// Frontend code now sends request to this route before establishing WebSocket connection
app.get('/set-cookie', setCookie);

// cron job redis
const cronSchedule = "*/3 * * * *"; // runs every 3 minutes
cron.schedule(cronSchedule, CronJobHandler.messageCronJob);

// listening on port 3005
httpServer.listen(PORT, () => {
  console.log('TwineServer listening on port', PORT);
});
