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
    TableName: "rooms",
    Item: {
      id: room_id,
			time_created: Date.now(),
      payload: {
				message,
			} 
    },
  });

  try {
    const response = await docClient.send(command);

		console.log('');
    console.log('pushToDynamo -----------------------------------------------');
    console.log("response:", response);
    console.log("response $metadata:", response['$metadata']);
    console.log('');

    return response;
  } catch (error) {
    console.log(error);
  }
};

const readPreviousMessagesByRoom = async (room_id: string, last_timestamp: number) => {
  try {
    const command = new ScanCommand({ 
      TableName: "rooms",
      FilterExpression: "#id = :id AND #time_created > :last_timestamp",
      ExpressionAttributeNames: {
        "#id": "id",
        '#time_created': 'time_created'
      },
      ExpressionAttributeValues: {
        ":id": { S: room_id },
        ':last_timestamp': { N: last_timestamp.toString() }
      }
    });
    
    const response = await client.send(command);
    console.log("readPreviousMessage invoked:", response.Items);
    return response;
  } catch (error) {
    console.error(error);
    return error;
  }
};

// createMessage("A", "I love Kimchi!!")
// createMessage("B", "Goldfish are delicious!")
// createMessage("C", "Oh my gorsh!")
// createMessage("D", "Beemo is cutie!")
// createMessage("A", "B for banana!")

// readPreviousMessagesByRoom('A', 1698105371700)

export default {
	createMessage,
	readPreviousMessagesByRoom
}