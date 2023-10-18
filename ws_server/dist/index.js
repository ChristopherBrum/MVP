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
const uuid_1 = require("uuid");
const express = require('express');
const app = express();
const cors = require('cors');
const httpServer = (0, http_1.createServer)(app);
const { connect } = require("mongoose");
require("dotenv").config();
const MgRequest = require('./models/request');
// code from Mongoose Typescript Support
run().catch(err => console.log(err));
////////// DynamoDB test /////////
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const clientConfig = { credentials: (0, credential_providers_1.fromEnv)() };
const client = new client_dynamodb_1.DynamoDBClient(clientConfig);
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const pushToDynamo = () => __awaiter(void 0, void 0, void 0, function* () {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: "Rooms",
        Item: {
            Id: "A",
            Message: "I'm sending a message to DynamoDB",
        },
    });
    try {
        const response = yield docClient.send(command);
        console.log("response:", response);
        return response;
    }
    catch (error) {
        console.error(error);
    }
});
const readFromDynamo = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const command = new client_dynamodb_1.ScanCommand({ TableName: "Rooms" });
        const response = yield client.send(command);
        console.log("response.Items:", response.Items);
        return response;
    }
    catch (error) {
        console.error(error);
    }
});
pushToDynamo();
setTimeout(() => readFromDynamo(), 5000);
////////// DynamoDB test end //////////
// Connect to MongoDB
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield connect(process.env.ENV_DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });
}
// Express Middleware
app.use(cors({
    origin: 'http://localhost:3002', // Replace with your client's origin
}));
app.use(express.json());
const PORT = process.env.ENV_PORT || 3001; // this is updated but no ENV_PORT at the moment
// instantiating new WS server
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: 'http://localhost:3002',
        methods: ['GET', 'POST'],
    },
});
// WS Server Logic
let reconnect = false;
let currentSessions = [];
const fetchMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    let messageArr = yield MgRequest.find().sort({ _id: -1 }).limit(5);
    return messageArr;
});
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
    let randomID = (0, uuid_1.v4)();
    socket.data.sessionId = randomID;
    currentSessions.push({ sessionId: randomID });
    next();
});
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    if (reconnect) {
        console.log('A user re-connected');
        socket.join("room 1");
        let messageArr = yield fetchMessages();
        messageArr.forEach(message => {
            let msg = message.room.roomData;
            socket.emit("connect_message", msg);
        });
    }
    else {
        console.log('A user connected first time');
        socket.join("room 1");
        socket.emit("session", {
            sessionId: socket.data.sessionId,
        });
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
}));
// Backend API
app.get('/', (req, res) => {
    console.log("you've got mail!");
    res.send('Nice work');
});
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
