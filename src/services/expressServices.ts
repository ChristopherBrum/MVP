import { Request, Response } from "express";
import { io } from '../index.js';
import RedisHandler from '../db/redisService.js';
import DynamoHandler from "../db/dynamoService.js";
import { currentTimeStamp } from '../utils/helpers.js';
import { validateApiKey } from '../utils/auth.js';
import { jsonData } from "src/typings.js";

export const homeRoute = (_: Request, res: Response) => {
  res.status(201).send('ok');
};

const publishToDynamo = async (room_id: string, payload: object) => {
  try {
    const dynamoResponse: any = await DynamoHandler.createMessage(
      room_id,
      JSON.stringify(payload)
    )

    if (!dynamoResponse.status_code) {
      throw Error('An error occured while trying to publish your message.');
    }

    return dynamoResponse.status_code;
  } catch (error: any) {
    console.log(error);
    throw Error(error.message);
  }
};

const publishToRedis = (room: string, requestData: string, timestamp: number) => {
  RedisHandler.storeMessagesInSet(room, requestData, timestamp);
};

const validate = (data: jsonData) => {
  let { room_id, payload } = data;

  if (Object.keys(data).length > 2) {
    throw Error('Malformed Request: Extra parameters were included in request.');
  } else if (!room_id || !payload) {
    throw Error('Malformed Request: One or more required parameters is missing');
  } else if (room_id && (typeof payload !== 'object')) {
    throw Error('Malformed Request: One or more parameter values is of an incorrect data type.');
  }
};

export const publish = async (req: Request, res: Response) => {
  const data: jsonData = req.body;
  const authValue = req.headers['authorization'] || "";
  const time = currentTimeStamp();

  try {
    validate(data);
    await validateApiKey(authValue);

    await publishToDynamo(data.room_id, data.payload);
    await publishToRedis(data.room_id, JSON.stringify(data), time);

    console.log("Data Payload Emitting", data.payload);
    data.payload["timestamp"] = time;
    data.payload["room"] = data.room_id;

    io.to(data.room_id).emit("message", data.payload);
    res.status(201).send('ok');
  } catch (error: any) {
    console.log(error);
    res.status(400).send(error.message);
  }
};
