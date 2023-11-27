import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const grabApiKey = async () => {
  const secret_name = "TwineAPI";

  const client = new SecretsManagerClient({
    region: process.env.REGION || "us-west-1",
  });

  let response;

  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
  } catch (error) {
    throw error;
  }

  const secret = response.SecretString;
  return secret;
}

export const validateApiKey = async (authValue: string) => {
  let validApiKey = await grabApiKey();
  if (authValue !== validApiKey) {
    throw Error('Invalid API Key.');
  }
}
