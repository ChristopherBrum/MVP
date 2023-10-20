"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express = require('express');
const app = express();
const cors = require('cors');
const httpServer = (0, http_1.createServer)(app);
require("dotenv").config();
const { sessionIdMiddleware, handleConnection } = require('./services/socketServices');
const { homeRoute, mongoPostmanRoute, mongoPostmanRoomsRoute, dynamoPostmanRoute } = require('./services/expressServices');
// Express Middleware
app.use(cors({
    origin: 'http://localhost:3002', // Replace with your client's origin
}));
app.use(express.json());
const PORT = process.env.ENV_PORT || 3001; // this is updated but no ENV_PORT at the moment
// instantiating new WS server
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: 'http://localhost:3002',
        methods: ['GET', 'POST'],
    },
});
// WS Server Logic
exports.io.use(sessionIdMiddleware);
exports.io.on("connection", handleConnection);
// Backend API
app.get('/', homeRoute);
app.put('/api/postman', mongoPostmanRoute);
app.put('/api/postman/rooms', mongoPostmanRoomsRoute);
app.post('/api/postman/dynamo', dynamoPostmanRoute);
// listening on port 3001
httpServer.listen(PORT, () => {
    console.log('listening on port', PORT);
});
