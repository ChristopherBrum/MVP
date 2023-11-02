var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { currentTimeStamp } from "../utils/helpers.js";
const clientConfig = { credentials: fromEnv() };
const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);
const TableName = 'rooms';
const KeyConditionExpression = '#id = :id AND #time_created > :last_timestamp';
const LimitPerQuery = 100; // Adjust this value based on your needs
export const createMessage = (room_id, message) => __awaiter(void 0, void 0, void 0, function* () {
    const time_created = currentTimeStamp();
    const command = new PutCommand({
        TableName: "rooms",
        Item: {
            id: room_id,
            time_created,
            payload: message
        },
    });
    try {
        const response = yield docClient.send(command);
        // console.log('');
        // console.log('pushToDynamo -----------------------------------------------');
        // console.log("response:", response);
        // console.log("response $metadata:", response['$metadata']);
        // console.log('');
        return {
            status_code: response['$metadata']['httpStatusCode'],
            room_id,
            time_created,
            payload: {
                message
            }
        };
    }
    catch (error) {
        // console.log(error); // log error here or in #publishToDynamo?
        return error; // passing error to #publishToDynamo
    }
});
export const readPreviousMessagesByRoom = (room_id, last_timestamp) => __awaiter(void 0, void 0, void 0, function* () {
    let lastEvaluatedKey = undefined;
    let responseItems = [];
    let totalItems = 0;
    const MAX_RETURN = 1000;
    // const MAX_RETURN: number = 5;
    while (totalItems < MAX_RETURN) { // retrieves at least 3 items
        const params = {
            TableName,
            KeyConditionExpression,
            ExpressionAttributeNames: {
                "#id": "id",
                '#time_created': 'time_created'
            },
            ExpressionAttributeValues: {
                ":id": { S: room_id },
                ":last_timestamp": { N: last_timestamp.toString() }
            },
            Limit: LimitPerQuery,
            ExclusiveStartKey: lastEvaluatedKey,
        };
        const command = new QueryCommand(params);
        try {
            const { Items, LastEvaluatedKey } = yield client.send(command);
            if (Items) {
                totalItems += Items.length;
                (Items || []).forEach((item) => {
                    responseItems.push(unmarshall(item));
                });
            }
            if (totalItems >= MAX_RETURN || !LastEvaluatedKey) {
                break;
            }
            if (LastEvaluatedKey) {
                lastEvaluatedKey = LastEvaluatedKey;
            }
        }
        catch (error) {
            // console.error('Error querying DynamoDB:', error);
            console.log('Error querying DynamoDB:', error);
            return error;
        }
    }
    return responseItems.length > MAX_RETURN
        ? responseItems.slice(-MAX_RETURN)
        : responseItems;
});
