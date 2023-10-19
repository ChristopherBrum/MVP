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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamoPostmanRoute = exports.mongoPostmanRoute = exports.homeRoute = void 0;
const index_1 = require("../index");
const { connect } = require("mongoose");
const MgRequest = require('../db/mongoService');
const dynamoService_1 = __importDefault(require("../db/dynamoService"));
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
const homeRoute = (req, res) => {
    console.log("you've got mail!");
    res.send('Nice work');
};
exports.homeRoute = homeRoute;
const mongoPostmanRoute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // accept postman put request
    // publish this request.body data via websocket emit
    const data = req.body;
    console.log(data);
    const currentRequest = new MgRequest({
        room: {
            roomName: "room 1",
            roomData: data
        },
    });
    const savedRequest = yield currentRequest.save();
    const timestamp = savedRequest.createdAt;
    let messageData = [data, timestamp];
    index_1.io.to("room 1").emit("message", messageData);
    console.log('SENT POSTMAN MESSAGE');
    res.send('ok');
});
exports.mongoPostmanRoute = mongoPostmanRoute;
const dynamoPostmanRoute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body; // specify the actual type
        const dynamoResponse = yield dynamoService_1.default.createMessage(data.RoomId, data.Message); // specify the actual type
        console.log('SENT POSTMAN MESSAGE:', data.Message);
        index_1.io.to("room 1").emit("message", data.Message);
        res.status(dynamoResponse['$metadata']['httpStatusCode']).send('ok');
    }
    catch (error) {
        console.log(error);
    }
});
exports.dynamoPostmanRoute = dynamoPostmanRoute;
// need create an interface for the request body
// app.post('/api/postman/dynamo', async (req: Request, res: Response) => {
//   try {
//     const data: any = req.body;  // specify the actual type
//     const dynamoResponse: any = await dynamoService.createMessage(data.RoomId, data.Message) // specify the actual type
//     console.log('SENT POSTMAN MESSAGE:', data.Message);
//     io.to("room 1").emit("message", data.Message);
//     res.status(dynamoResponse['$metadata']['httpStatusCode']).send('ok');
//   } catch (error) {
//     console.log(error);
//   }
// });
