import { v4 as uuid4 } from 'uuid';
import { 
	DynamoDBClient, 
	DynamoDBClientConfig,
	ScanCommand
} from "@aws-sdk/client-dynamodb";
import { 
	GetCommand,
	PutCommand, 
	DynamoDBDocumentClient 
} from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";

const clientConfig: DynamoDBClientConfig = { credentials: fromEnv() };
const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

const createMessage = async (room_id: string, message: string) => {
  const command = new PutCommand({
    TableName: "Messages",
    Item: {
      Id: uuid4(),
			TimeCreated: Date.now(),
			RoomId: room_id,
      Message: {
				hi: message
			} 
    },
  });

  try {
    const response = await docClient.send(command);

		// console.log('');
    // console.log('pushToDynamo -----------------------------------------------');
    // console.log("response httpStatusCode:", response['$metadata']['httpStatusCode']);
    // console.log('');

    return response;
  } catch (error) {
    console.error(error);
  }
};

const readPreviousMessages = async (room_id: string, messagesToFetch: number) => {
  try {
    const command = new ScanCommand({ 
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

    const response = await client.send(command);
		// console.log("readPreviousMessage invoked:", response.Items);
    return response;
  } catch (error) {
    console.error(error);
  }
};

const readMessage = async () => {
  try {
    const command = new GetCommand({ 
      Key: {
        Id: '020b582e-8d51-4039-b155-d0b13eb140a6',
				TimeCreated: 1697654497057
      },
      TableName: "Messages"
    });
    const response = await client.send(command);
		// console.log("readMessage", response.Item);
    return response;
  } catch (error) {
    console.error(error);
  }
};

// readPreviousMessages('G', 5);

export default {
	createMessage,
	readMessage,
	readPreviousMessages
}