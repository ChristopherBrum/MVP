const express = require('express');
import { Request, Response } from "express";
import {createServer} from "http";
import {Server} from "socket.io";

const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

const PORT = 3001;

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>();

app.get('/', (req: Request, res: Response) => {
	console.log("you've got mail!");
	res.send('Nice work')
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
})