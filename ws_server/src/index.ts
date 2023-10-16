import { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Document } from 'mongoose';
const express = require('express');
const app = express();
const cors = require('cors');
const httpServer = createServer(app);
const { connect } = require("mongoose");
require("dotenv").config();

const MgRequest = require('./models/request')

// code from Mongoose Typescript Support
run().catch(err => console.log(err));

// Connect to MongoDB
async function run() {
  await connect(process.env.ENV_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

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

interface RoomData {
  hi: string;
}

interface IMgRequest extends Document<any> {
  room: {
    roomName: string,
    roomData: RoomData
  },
}

interface ClientToServerEvents {
  hello: () => void;
  message: (message: String) => void;
  connect_message: (message: RoomData) => void;
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

let reconnect: boolean = false;

const fetchMessages = async () => {
  let messageArr: IMgRequest[] = await MgRequest.find().sort({_id: -1}).limit(5);
  return messageArr;
}

io.on('connection', async (socket) => {
  if (reconnect) {
    console.log('A user re-connected');
    socket.join("room 1");
    let messageArr = await fetchMessages();
    console.log(messageArr);
    messageArr.forEach(message => {
      console.log(message)
      let msg = message.room.roomData
      socket.emit("connect_message", msg);
    });
  } else { 
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
});

app.put('/api/postman', async (req: Request, res: Response) => {
  // accept postman put request
  // publish this request.body data via websocket emit
  const data: string = req.body;
  console.log(data);

  const currentRequest = new MgRequest({
    room: {
      roomName: "room 1",
      roomData: data,
    },
  });

  const savedRequest = await currentRequest.save();

  io.to("room 1").emit("message", data);

  console.log('SENT POSTMAN MESSAGE');

  res.send('ok');
});

httpServer.listen(PORT, () => {
  console.log('listening on port', PORT);
})
