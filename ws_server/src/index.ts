import { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
const express = require('express');
const app = express();
const cors = require('cors');
const httpServer = createServer(app);
const { connect } = require("mongoose");
require("dotenv").config();

const MgRequest = require('./models/request')

const connectionState = false;

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
  // check to see if this session_id was recently active 
  // and if their previous disconnection was intentional

  socket.join("room 1");
  
  socket.on("disconnecting", (reason) => {
    console.log(socket.rooms); // Set { ... }
    console.log(reason);

    if (reason === "client namespace disconnect") {
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
  // .find().sort({_id: -1}).limit(5)
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
