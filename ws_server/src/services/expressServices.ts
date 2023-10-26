import { Request, Response } from "express";
import { io } from '../index.js';
import { createMessage } from "../db/dynamoService.js";
import { storeMessageInSet } from '../db/redisService.js';

export const homeRoute = (req: Request, res: Response) => {
  console.log("you've got mail!");
  res.send('Nice work')
}

export const redisPostmanRoomsRoute = async (req: Request, res: Response) => {
  // accept postman put request
  // publish this request.body data via websocket emit
  interface jsonData {
    room: string;
    message: string;
  }

  const data: jsonData = req.body

  storeMessageInSet(data.room, data.message);

  // only people in this room should receive this message event
  io.to(`${data.room}`).emit("roomJoined", data.message);

  res.send('ok');
}

type DynamoCreateResponse = {
  status_code: number | undefined,
  room_id: string,
  time_created: number,
  payload: object
}

export const dynamoPostmanRoute = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const dynamoResponse = await createMessage(
      data.room_id, 
      data.payload
    ) as DynamoCreateResponse;

    let messageData = [data.payload, dynamoResponse.time_created];

    // console.log("data:", data);
    // console.log('SENT POSTMAN MESSAGE:', data.payload);
    
    io.to(data.room_id).emit("message", messageData);
    
    if (dynamoResponse.status_code) {
      res.status(dynamoResponse.status_code).send('ok');
    } else {
      res.status(404).send('bad request');
    }
  } catch (error) {
    console.log(error);
  }
}
