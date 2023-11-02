import {
  DynamoDBClient,
  DynamoDBClientConfig,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  DynamoDBDocumentClient
} from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { currentTimeStamp } from "../utils/helpers.js";

const clientConfig: DynamoDBClientConfig = { credentials: fromEnv() };
const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);
const TableName = 'rooms';
const KeyConditionExpression = '#id = :id AND #time_created > :last_timestamp';
const LimitPerQuery = 100; // Adjust this value based on your needs

export const createMessage = async (room_id: string, message: string) => {
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
    const response = await docClient.send(command);

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
    }
  } catch (error) {
    // console.log(error); // log error here or in #publishToDynamo?
    return error // passing error to #publishToDynamo
  }
};

export const readPreviousMessagesByRoom = async (room_id: string, last_timestamp: number) => {
  let lastEvaluatedKey = undefined;
  let responseItems: any[] = [];
  let totalItems: number = 0;
  const MAX_RETURN: number = 1000;
  // const MAX_RETURN: number = 5;

  while (totalItems < MAX_RETURN) { // retrieves at least 3 items
    const params: any = {
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
      const { Items, LastEvaluatedKey } = await client.send(command);
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
    } catch (error) {
      // console.error('Error querying DynamoDB:', error);
      console.log('Error querying DynamoDB:', error);
      return error;
    }
  }

  return responseItems.length > MAX_RETURN
    ? responseItems.slice(-MAX_RETURN)
    : responseItems;
};
