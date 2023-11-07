var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { SecretsManagerClient, GetSecretValueCommand, } from "@aws-sdk/client-secrets-manager";
const grabApiKey = () => __awaiter(void 0, void 0, void 0, function* () {
    const secret_name = "TwineAPI";
    const client = new SecretsManagerClient({
        region: process.env.REGION || "us-west-1",
    });
    let response;
    try {
        response = yield client.send(new GetSecretValueCommand({
            SecretId: secret_name,
            VersionStage: "AWSCURRENT",
        }));
    }
    catch (error) {
        throw error;
    }
    const secret = response.SecretString;
    return secret;
});
export const validateApiKey = (authValue) => __awaiter(void 0, void 0, void 0, function* () {
    let validApiObject = yield grabApiKey();
    let parsedObject = JSON.parse(validApiObject);
    let validApiKey = parsedObject.API;
    if (authValue !== validApiKey) {
        throw Error('Invalid API Key.');
    }
});
