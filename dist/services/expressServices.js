var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { io } from '../index.js';
import RedisHandler from '../db/redisService.js';
import DynamoHandler from "../db/dynamoService.js";
import { currentTimeStamp } from '../utils/helpers.js';
import { validateApiKey } from '../utils/auth.js';

export const homeRoute = (_, res) => {
    console.log("you've got mail!");
    res.send('Nice work');
};
const publishToDynamo = (room_id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dynamoResponse = yield createMessage(room_id, JSON.stringify(payload));

        if (!dynamoResponse.status_code) {
            throw Error('An error occured while trying to publish your message.');
        }
        return dynamoResponse.status_code;
    }
    catch (error) {
        console.log(error);
        throw Error(error.message);
    }
});
const publishToRedis = (room, requestData, timestamp) => {
    RedisHandler.storeMessagesInSet(room, requestData, timestamp);
};
const validate = (data) => {
    let { room_id, payload } = data;
    if (Object.keys(data).length > 2) {
        throw Error('Malformed Request: Extra parameters were included in request.');
    }
    else if (!room_id || !payload) {
        throw Error('Malformed Request: One or more required parameters is missing');
    }
    else if (room_id && (typeof payload !== 'object')) {
        throw Error('Malformed Request: One or more parameter values is of an incorrect data type.');
    }
};
export const publish = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    const authValue = req.headers['authorization'] || "";
    const time = currentTimeStamp();
    try {
        validate(data);
        yield validateApiKey(authValue);
        yield publishToDynamo(data.room_id, data.payload);
        yield publishToRedis(data.room_id, JSON.stringify(data), time);
        console.log("Data Payload Emitting", data.payload);
        data.payload["timestamp"] = time;
        data.payload["room"] = data.room_id;
        io.to(data.room_id).emit("message", data.payload);
        res.status(201).send('ok');
    }
    catch (error) {
        console.log(error);
        res.status(400).send(error.message);
    }
});
