import {
  DynamoDBClient,
  QueryCommand
} from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  DynamoDBDocumentClient
} from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { currentTimeStamp } from "../utils/helpers.js";

const client = new DynamoDBClient({
  region: process.env.REGION,
});

const docClient = DynamoDBDocumentClient.from(client);
const TableName = 'rooms';

class DynamoHandler {
  public static async createMessage(room_id: string, message: string) {
    const time_created = currentTimeStamp();
    const command = new PutCommand({
      TableName,
      Item: {
        id: room_id,
        time_created,
        payload: message
      },
    });

    try {
      const response = await docClient.send(command);

      return {
        status_code: response['$metadata']['httpStatusCode'],
        room_id,
        time_created,
        payload: {
          message
        }
      }
    } catch (error) {
      return error;
    }
  };

  public static async readPreviousMessagesByRoom(room_id: string, last_timestamp: number) {
    let lastEvaluatedKey = undefined;
    let responseItems: any[] = [];
    let totalItems: number = 0;
    const LimitPerQuery = 100;
    const MAX_RETURN: number = 1000;

    while (totalItems < MAX_RETURN) {
      const params: any = {
        TableName,
        KeyConditionExpression: '#id = :id AND #time_created > :last_timestamp',
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
        console.log('Error querying DynamoDB:', error);
        return error;
      }
    }

    return responseItems.length > MAX_RETURN
      ? responseItems.slice(-MAX_RETURN)
      : responseItems;
  };
}

export default DynamoHandler;
