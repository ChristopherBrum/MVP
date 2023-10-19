import { Request, Response } from "express";
import { io } from '../index';
const { connect } = require("mongoose");
const MgRequest = require('../db/mongoService');
import dynamoService from "../db/dynamoService";
import { Date } from 'mongoose';

// code from Mongoose Typescript Support
run().catch(err => console.log(err));

// Connect to MongoDB
async function run() {
  await connect(process.env.ENV_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}


export const homeRoute = (req: Request, res: Response) => {
  console.log("you've got mail!");
  res.send('Nice work')
}

export const mongoPostmanRoute = async (req: Request, res: Response) => {
  // accept postman put request
  // publish this request.body data via websocket emit
  const data: string = req.body;
  console.log(data)

  const currentRequest = new MgRequest({
    room: {
      roomName: "room 1",
      roomData: data
    },
  });

  const savedRequest = await currentRequest.save();

  const timestamp: Date = savedRequest.createdAt
  let messageData: any[] = [data, timestamp]

  io.to("room 1").emit("message", messageData);

  console.log('SENT POSTMAN MESSAGE');

  res.send('ok');
}

export const dynamoPostmanRoute = async (req: Request, res: Response) => {
  try {
    const data: any = req.body;  // specify the actual type
    const dynamoResponse: any = await dynamoService.createMessage(data.RoomId, data.Message) // specify the actual type
    console.log('SENT POSTMAN MESSAGE:', data.Message);
    io.to("room 1").emit("message", data.Message);
    res.status(dynamoResponse['$metadata']['httpStatusCode']).send('ok');
  } catch (error) {
    console.log(error);
  }
}

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
