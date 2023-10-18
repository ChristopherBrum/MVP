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
const uuid_1 = require("uuid");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const clientConfig = { credentials: (0, credential_providers_1.fromEnv)() };
const client = new client_dynamodb_1.DynamoDBClient(clientConfig);
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const createMessage = (room_id, message) => __awaiter(void 0, void 0, void 0, function* () {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: "Messages",
        Item: {
            Id: (0, uuid_1.v4)(),
            TimeCreated: Date.now(),
            RoomId: room_id,
            Message: {
                hi: message
            }
        },
    });
    try {
        const response = yield docClient.send(command);
        console.log('');
        console.log('pushToDynamo -----------------------------------------------');
        console.log("response httpStatusCode:", response['$metadata']['httpStatusCode']);
        console.log('');
        return response;
    }
    catch (error) {
        console.error(error);
    }
});
const readPreviousMessages = (room_id, messagesToFetch) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const command = new client_dynamodb_1.ScanCommand({
            TableName: "Messages",
            FilterExpression: "#RoomId = :roomId",
            ExpressionAttributeNames: {
                "#RoomId": "RoomId",
            },
            ExpressionAttributeValues: {
                ":roomId": { S: room_id },
            },
            Limit: messagesToFetch,
        });
        const response = yield client.send(command);
        console.log("readPreviousMessage invoked:", response.Items);
        return response;
    }
    catch (error) {
        console.error(error);
    }
});
const readMessage = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const command = new lib_dynamodb_1.GetCommand({
            Key: {
                Id: '020b582e-8d51-4039-b155-d0b13eb140a6',
                TimeCreated: 1697654497057
            },
            TableName: "Messages"
        });
        const response = yield client.send(command);
        console.log("readMessage", response.Item);
        return response;
    }
    catch (error) {
        console.error(error);
    }
});
readPreviousMessages('G', 5);
exports.default = {
    createMessage,
    readMessage,
    readPreviousMessages
};
