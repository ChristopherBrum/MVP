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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // 4. Connect to MongoDB
        yield connect(process.env.ENV_DB);
        const mgrequest = new MgRequest({
            key: 'Bill',
            header: 'bill@initech.com',
            body: "Connected to DB babeeee!"
        });
        yield mgrequest.save();
        console.log(mgrequest.body); // "Connected to DB babeeee!"
    });
}
// app.get('/:bin_path/:mongo_id', async (request, response) => {
//   const mongoId = request.params.mongo_id
//   // we are supposed to search by key?
//   let singleRequest = await Request.find({key:`${mongoId}`}).exec();
//   console.log('### Mongo QUERIED 123');
//   console.log(mongoId)
//   console.log(singleRequest)
//   response.send(singleRequest)
// })
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
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.emit("message", "hello");
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
app.put('/api/postman', (req, res) => {
    // accept postman put request
    // publish this request.body data via websocket emit
    // const data: string = req.body
    io.emit("message", "hello");
    console.log('SENT POSTMAN MESSAGE');
    res.send('ok');
});
// io.on('connection', (socket) => {
// 	console.log('A user connected');
// 	socket.emit("message", "hello");
// });
// io.on('connect', (socket) => {
// 	const msg: string = 'YOO! a user connected';
// 	console.log(msg);
// 	socket.emit("message", "hello");
// 	// // event fored when `socket emit` is invoked in index.html
// 	// socket.on('chat message', (msg) => {
// 	// 	console.log('message:', msg);
// 	// 	io.emit('chat message', msg);
// 	// })
// 	// event fired when connection is lost
// 	socket.on('disconnect', () => {
// 		console.log('a user disconnected');
// 	})
// });
httpServer.listen(PORT, () => {
    console.log('listening on port', PORT);
});
