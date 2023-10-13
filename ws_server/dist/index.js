"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());
const PORT = 3001;
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server();
app.get('/', (req, res) => {
    console.log("you've got mail!");
    res.send('Nice work');
});
io.on('connection', (socket) => {
    console.log('a user connected');
    // // event fored when `socket emit` is invoked in index.html
    // socket.on('chat message', (msg) => {
    // 	console.log('message:', msg);
    // 	io.emit('chat message', msg);
    // })
    // // event fired when connection is lost
    // socket.on('disconnect', () => {
    // 	console.log('a user disconnected');
    // })
});
httpServer.listen(PORT, () => {
    console.log('listening on port', PORT);
});
