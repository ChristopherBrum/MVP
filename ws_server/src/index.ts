import { currentTimeStamp, newUUID } from './utils/helpers.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config'
import { handleConnection } from './services/socketServices.js';
import { homeRoute, redisPostmanRoute, dynamoPostmanRoute } from './services/expressServices.js';

const PORT = process.env.ENV_PORT || 3001;

const app = express();
const httpServer = createServer(app);

// Express Middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET as string,
  // controls whether the session should be re-saved back to the session store
  // even if the session has not been modified during the request
  resave: false,
  // will not save the cookie if nothing is in it
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // set to true if using https
    // secure: true
    maxAge: 3600000, // session max age in milliseconds; 3600000 is 1 hour
  },
});

declare module 'express-session' {
  interface SessionData {
    twineID: string;
    twineTimestamp: number;
  }
}

const cookieMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.twineID) { 
    console.log('$$$$$ mw cookie id: ' + req.session.twineID);
    req.session.twineID = newUUID();
    req.session.twineTimestamp = currentTimeStamp();
    // manually save the session; maybe not necessary
    req.session.save((err) => {
      if (err) {
        console.error('### Middleware: session save error:', err);
      }
    });
  }
  next();
}

app.use(sessionMiddleware);

// TypeScript types
interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
  message: (message: any[]) => void;
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
app.post('/api/postman/redis', redisPostmanRoute);
app.post('/api/postman/dynamo', dynamoPostmanRoute);

// listening on port 3001
httpServer.listen(PORT, () => {
  console.log('TwineServer listening on port', PORT);
});
