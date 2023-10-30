import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import express, { Request, Response, NextFunction } from 'express';
import { handleConnection } from './services/socketServices.js';
import { homeRoute, publish } from './services/expressServices.js';
import { currentTimeStamp, hourExpiration, newUUID } from './utils/helpers.js';
import { Redis } from "ioredis"
import connectRedis from 'connect-redis';
import 'dotenv/config'

const redisURL = process.env.CACHE_ENDPOINT || 'redis://localhost:6379';
export const redis: Redis = new Redis(redisURL);
console.log('Connected to Redis');

const redisSessionStore = new connectRedis({ client: redis });

const PORT = process.env.ENV_PORT || 3001;

const app = express();
app.use(express.json());
const httpServer = createServer(app);

class CustomStore extends session.Store {
  redis: session.Store;
  // dynamo: session.Store;

  constructor(redis: session.Store) {
    super();
    this.redis = redis;
    // this.dynamo = dynamo;
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    this.redis.get(sid, (err, session) => {
      if (err) {
        callback(err);
      } else {
        callback(null, session ?? null);
      }
    });
    // this.dynamo.get(sid, (err, session) => {
    //   if (err) {
    //     callback(err);
    //   } else {
    //     callback(null, session ?? null);
    //   }
    // });
  }

  set(sid: string, session: session.SessionData, callback?: (err?: any) => void): void {
    this.redis.set(sid, session, callback);
    // this.dynamo.set(sid, session, callback);
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    this.redis.destroy(sid, callback);
    // this.dynamo.destroy(sid, callback);
  }
}

const redisStore: session.Store = redisSessionStore; // redis store instance
// const dynamoStore: session.Store = dynamoSessionStore // dynamo store instance
const customStore = new CustomStore(redisStore);

// Express Middleware
const sessionMiddleware = session({
  store: customStore,
  secret: process.env.SESSION_SECRET as string,
  // controls whether the session should be re-saved back to the session store
  // even if the session has not been modified during the request
  resave: true,
  // will not save the cookie if nothing is in it
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    expires: hourExpiration(),
  },
});

declare module 'express-session' {
  interface SessionData {
    twineID: string;
    twineRC: boolean;
    twineTS: number;
  }
}

const cookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.twineID) { 
    req.session.twineID = newUUID();
    // defualt twineTS must trigger difference of <2m or <24hr
    req.session.twineTS = currentTimeStamp();
  } else {
    req.session.twineRC = true;
  }
  next();
}

app.use(sessionMiddleware);

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

// instantiate new WS server
export const io = new Server<
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: 'http://localhost:3002',  // Replace with your client's origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Export Express middleware to Socket middleware
io.engine.use(sessionMiddleware);
io.engine.use(cookieMiddleware);

// WS Server Logic
io.on("connection", handleConnection);

// Backend API
app.get('/', homeRoute);
app.post('/api/twine', publish);

// listening on port 3001
httpServer.listen(PORT, () => {
  console.log('TwineServer listening on port', PORT);
});

export const newCustomStore = new CustomStore(redisStore);
