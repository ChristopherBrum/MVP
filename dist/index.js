import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { handleConnection } from './services/socketServices.js';
import { homeRoute, publish } from './services/expressServices.js';
import { newUUID } from './utils/helpers.js';
import { Cluster } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
// import { Redis } from "ioredis"
import { messageCronJob } from "./db/redisCronJobs.js";
// import connectRedis from 'connect-redis';
import 'dotenv/config';
import cron from 'node-cron';
import cors from 'cors';
const corsOptions = {
    origin: true,
    credentials: true,
};
const redisEndpoints = ['micro-redis.xjdmww.clustercfg.usw1.cache.amazonaws.com:6379'];
// const redisURL = "clustercfg.twine-cache.xjdmww.usw1.cache.amazonaws.com:6379"
const nodes = redisEndpoints.map(endpoint => {
    const [host, port] = endpoint.split(':');
    return { host, port: parseInt(port, 10) };
});
export const redis = new Cluster(nodes); // Use Cluster to connect to Redis
// export const redis: Redis = new Redis(redisURL);
console.log('Connected to Redis');
// const redisSessionStore = new connectRedis({ client: redis });
const PORT = 3001;
const app = express();
app.use(cors(corsOptions));
app.set('trust proxy', 1);
app.use(express.json());
const httpServer = createServer(app);
// instantiate new WS server
export const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
// Export Express middleware to Socket middleware
// io.engine.use(sessionMiddleware);
// io.engine.use(cookieMiddleware);
// io.engine.on("initial_headers", (headers, request) => {
//  headers["set-cookie"] = serialize("twine", newUUID(), { sameSite: "none", secure: true, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
//});
// Adapter logic
const subClient = redis.duplicate();
io.adapter(createAdapter(redis, subClient));
// WS Server Logic
io.on("connection", handleConnection);
// Backend API
app.get('/', homeRoute);
app.post('/api/twine', publish);
app.get('/delete-cookie', (req, res) => {
    res.cookie('twine', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        expires: new Date(0) // Set to a past date
    });
    res.send('Cookie deleted');
});
// Frontend code now sends request to this route before establishing WebSocket connection
app.get('/set-cookie', (req, res) => {
    const cookies = req.headers.cookie || '';
    // Parse the cookies
    const cookiesObj = Object.fromEntries(cookies.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return [name, value];
    }));
    if (!cookiesObj.twinert) {
        const sessionID = newUUID();
        res.cookie('twinert', sessionID, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        console.log('First cookie set ', sessionID);
        res.send('First cookie set');
    }
    else if (!cookiesObj.twinerc) {
        res.cookie('twinerc', 'y', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        console.log('RC cookie set');
        res.send('RC cookie set');
    }
    else {
        console.log('RC cookie already set');
        res.send('RC cookie already set');
    }
});
// cron job redis
const cronSchedule = "*/3 * * * *"; // runs every 3 minutes
cron.schedule(cronSchedule, messageCronJob);
// listening on port 3001
httpServer.listen(PORT, () => {
    console.log('TwineServer listening on port', PORT);
});
// export const newCustomStore = new CustomStore(redisStore);
