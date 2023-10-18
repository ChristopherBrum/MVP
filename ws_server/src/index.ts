import { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Document } from 'mongoose';
import { v4 as uuid4 } from 'uuid';
const express = require('express');
const app = express();
const cors = require('cors');
const httpServer = createServer(app);
const { connect } = require("mongoose");
require("dotenv").config();

const MgRequest = require('./models/request')

// code from Mongoose Typescript Support
run().catch(err => console.log(err));

////////// DynamoDB test /////////

import { DynamoDBClient, DynamoDBClientConfig, ScanCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";

const clientConfig: DynamoDBClientConfig = { credentials: fromEnv() };
const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

const pushToDynamo = async () => {
  const command = new PutCommand({
    TableName: "Rooms",
    Item: {
      Id: "A",
      Message: "I'm sending a message to DynamoDB",
    },
  });

  try {
    const response = await docClient.send(command);
    console.log("response:", response);
    return response;
  } catch (error) {
    console.error(error);
  }
};

const readFromDynamo = async () => {
  try {
    const command = new ScanCommand({ TableName: "Rooms" });
    const response = await client.send(command);
    console.log("response.Items:", response.Items);
    return response;
  } catch (error) {
    console.error(error);
  }
};

pushToDynamo();
setTimeout(() => readFromDynamo(), 5000);

////////// DynamoDB test end //////////

// Connect to MongoDB
async function run() {
  await connect(process.env.ENV_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

// Express Middleware

app.use(cors({
  origin: 'http://localhost:3002',  // Replace with your client's origin
}));

app.use(express.json());

const PORT = process.env.ENV_PORT || 3001; // this is updated but no ENV_PORT at the moment

// TypeScript types

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
  session: (message: SessionObject) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
  sessionId: string;
}

interface SessionObject {
  sessionId: string;
}

// instantiating new WS server

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


// WS Server Logic

let reconnect: boolean = false;

let currentSessions: SessionObject[] = []

const fetchMessages = async () => {
  let messageArr: IMgRequest[] = await MgRequest.find().sort({ _id: -1 }).limit(5);
  return messageArr;
}

io.use((socket, next) => {
  const currentSessionID = socket.handshake.auth.sessionId;
  console.log("Middleware executed");
  console.log(currentSessionID);
  console.log(currentSessions);

  // if current session exists (re-connect), find that sessionId from the session
  if (currentSessionID) {
    const session = currentSessions.find(obj => obj.sessionId === currentSessionID);
    if (session) {
      socket.data.sessionId = session.sessionId;
      return next();
    }
  }
  let randomID = uuid4();

  socket.data.sessionId = randomID;

  currentSessions.push({ sessionId: randomID });

  next();
});

io.on('connection', async (socket) => {
  if (reconnect) {

    console.log('A user re-connected');

    socket.join("room 1");

    let messageArr = await fetchMessages();
    messageArr.forEach(message => {
      let msg = message.room.roomData
      socket.emit("connect_message", msg);
    });

  } else {
    console.log('A user connected first time');
    socket.join("room 1");

    socket.emit("session", {
      sessionId: socket.data.sessionId,
    })
  }


  socket.on("disconnecting", (reason) => {

    if (reason === "client namespace disconnect") {
      reconnect = true;
      // push an object with session_id and unintentionalDisconnect
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


// Backend API

app.get('/', (req: Request, res: Response) => {
  console.log("you've got mail!");
  res.send('Nice work')
});

app.put('/api/postman', async (req: Request, res: Response) => {
  // accept postman put request
  // publish this request.body data via websocket emit
  const data: string = req.body;
  console.log(data)

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
