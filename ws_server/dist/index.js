"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const express = require('express');
const app = express();
const cors = require('cors');
const httpServer = (0, http_1.createServer)(app);
const { connect } = require("mongoose");
require("dotenv").config();
const MgRequest = require('./models/request');
// code from Mongoose Typescript Support
run().catch(err => console.log(err));
// Connect to MongoDB
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield connect(process.env.ENV_DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });
}
app.use(cors({
    origin: 'http://localhost:3002', // Replace with your client's origin
}));
app.use(express.json());
const PORT = process.env.ENV_PORT || 3001; // this is updated but no ENV_PORT at the moment
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: 'http://localhost:3002',
        methods: ['GET', 'POST'],
    },
});
app.get('/', (req, res) => {
    console.log("you've got mail!");
    res.send('Nice work');
});
let reconnect = false;
const fetchMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    let messageArr = yield MgRequest.find().sort({ _id: -1 }).limit(5);
    return messageArr;
});
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    if (reconnect) {
        console.log('A user re-connected');
        socket.join("room 1");
        let messageArr = yield fetchMessages();
        console.log(messageArr);
        messageArr.forEach(message => {
            console.log(message);
            let msg = message.room.roomData;
            socket.emit("connect_message", msg);
        });
    }
    else {
        console.log('A user connected first time');
        socket.join("room 1");
    }
    // check to see if this session_id was recently active 
    // and if their previous disconnection was intentional
    socket.on("disconnecting", (reason) => {
        console.log(socket.rooms); // Set { ... }
        console.log(reason);
        if (reason === "client namespace disconnect") {
            reconnect = true;
            // push an object with session_id and unintentionalDisconnect 
        }
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
}));
app.put('/api/postman', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // accept postman put request
    // publish this request.body data via websocket emit
    const data = req.body;
    console.log(data);
    const currentRequest = new MgRequest({
        room: {
            roomName: "room 1",
            roomData: data,
        },
    });
    const savedRequest = yield currentRequest.save();
    io.to("room 1").emit("message", data);
    console.log('SENT POSTMAN MESSAGE');
    res.send('ok');
}));
httpServer.listen(PORT, () => {
    console.log('listening on port', PORT);
});
