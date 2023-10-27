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
  storeMessageInSet(room, requestData);
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
