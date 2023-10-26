import { Request, Response, request } from "express";
import { io } from '../index.js';
import { createMessage } from "../db/dynamoService.js";
import { storeMessageInSet } from '../db/redisService.js';

type DynamoCreateResponse = {
  status_code: number | undefined,
  room_id: string,
  time_created: number,
  payload: object
}

interface messageObject {
  message: string;
}

interface jsonData {
  room_id: string;
  payload: messageObject;
}

export const homeRoute = (req: Request, res: Response) => {
  console.log("you've got mail!");
  res.send('Nice work')
}

const publishToDynamo = async (room_id: string, payload: object) => {
  try {
    const dynamoResponse = await createMessage(
      room_id,
      JSON.stringify(payload)
    ) as DynamoCreateResponse;

    return dynamoResponse.status_code || 404;
  } catch (error) {
    console.log(error);
  }
}

const publishToRedis = (room: string, requestData: string) => {
  storeMessageInSet(room, requestData); // going to stay red until I update redis
}

export const publish = async (req: Request, res: Response) => {
  const data: jsonData = req.body

  // wrap thesefunctions in Promise.all(?) and only emit if data has been created successfully
  publishToRedis(data.room_id, JSON.stringify(data));
  publishToDynamo(data.room_id, data.payload);

  console.log("Data Payload Emitting", data.payload);

  io.to(data.room_id).emit("message", data.payload);

  res.status(201).send('ok');
}



// export const redisPostmanRoomsRoute = async (req: Request, res: Response) => {
//   // accept postman put request
//   // publish this request.body data via websocket emit
//   interface jsonData {
//     room_id: string;
//     payload: {

//      }
//   }

//   // change room_id and payload for redis

//   const data: jsonData = req.body

//   // storeMessageInSet(data.room, data.message);
//   storeMessageInSet(data.room, data);

//   // only people in this room should receive this message event
//   io.to(`${data.room}`).emit("roomJoined", data.message);

//   res.send('ok');
// }

// export const dynamoPostmanRoute = async (req: Request, res: Response) => {
//   try {
//     const data = req.body;
//     const dynamoResponse = await createMessage(
//       data.room_id,
//       data.payload
//     ) as DynamoCreateResponse;

//     let messageData = [data.payload, dynamoResponse.time_created];

//     // console.log("data:", data);
//     // console.log('SENT POSTMAN MESSAGE:', data.payload);

//     io.to(data.room_id).emit("message", messageData);

//     if (dynamoResponse.status_code) {
//       res.status(dynamoResponse.status_code).send('ok');
//     } else {
//       res.status(404).send('bad request');
//     }
//   } catch (error) {
//     console.log(error);
//   }
// }
