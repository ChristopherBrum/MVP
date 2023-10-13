import { Request, Response } from "express";
import {createServer} from "http";
import {Server} from "socket.io";
const express = require('express');
const app = express();
const cors = require('cors');
const httpServer = createServer(app);

// const mongoose = require("mongoose");
// require("dotenv").config();

// const Request = require('./models/request')

// mongoose.set('strictQuery', false)
// console.log('### CONNECTING TO MONGO...')
// mongoose.connect(ENV_DB)
//   .then(() => {
//     console.log('### CONNECTED TO MongoDB')
//   })
//   .catch((error) => {
//     console.log('### ERROR CONNECTING TO MongoDB:', error.message)
//   });

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
  origin: 'http://localhost:3002',  // Replace with your client's origin
}));
app.use(express.json());

const PORT = process.env.ENV_PORT || 3001; // this is updated but no ENV_PORT at the moment

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
	message: (message: string) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

const io = new Server<
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

app.get('/', (req: Request, res: Response) => {
	console.log("you've got mail!");
	res.send('Nice work')
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit("message", "hello");
	socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.put('/api/postman', (req: Request, res: Response) => {
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
})