import { Request, Response, request } from "express";
import { io } from '../index.js';
import { createMessage } from "../db/dynamoService.js";
import { storeMessageInSet } from '../db/redisService.js';
import { currentTimeStamp } from '../utils/helpers.js';

type DynamoCreateResponse = {
  status_code: number | undefined,
  room_id: string,
  time_created: number,
  payload: object
}

interface messageObject {
  message: string;
  timestamp: number;
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
    const dynamoResponse: any = await createMessage(
      room_id,
      JSON.stringify(payload)
    ) //as DynamoCreateResponse;

    if (!dynamoResponse.status_code) {
      throw Error('An error occured while trying to publish your message.')
    }

    return dynamoResponse.status_code;
  } catch (error: any) {
    console.log(error)
    throw Error(error.message)
  }
}

const publishToRedis = (room: string, requestData: string, timestamp: number) => {
  storeMessageInSet(room, requestData, timestamp);
}

// will need to eventually strengthen this logic
const validate = (data: jsonData) => {
  let { room_id, payload } = data;

  if(Object.keys(data).length > 2) {
    throw Error('Malformed Request: Extra parameters were included in request.')

  } else if (!room_id || !payload) {
    throw Error('Malformed Request: One or more required parameters is missing')

  } else if(room_id 
    && (typeof payload !== 'object' 
    || !Object.keys(payload).includes('message'))) {

    throw Error('Malformed Request: One or more parameter values is of an incorrect data type.')
  }
}

export const publish = async (req: Request, res: Response) => {
  const data: jsonData = req.body
  
  const time = currentTimeStamp();

  try {
    validate(data)

    await publishToDynamo(data.room_id, data.payload)
    await publishToRedis(data.room_id, JSON.stringify(data), time)

    console.log("Data Payload Emitting", data.payload);
    data.payload["timestamp"] = time;

    io.to(data.room_id).emit("message", data.payload);
    res.status(201).send('ok');
  } catch (error: any) {
    console.log(error) // later change this to logging? console.error?
    res.status(400).send(error.message)
  }
}
