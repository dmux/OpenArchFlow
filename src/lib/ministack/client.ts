import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { SNSClient } from "@aws-sdk/client-sns";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { IAMClient } from "@aws-sdk/client-iam";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SSMClient } from "@aws-sdk/client-ssm";
import { KinesisClient } from "@aws-sdk/client-kinesis";
import { KMSClient } from "@aws-sdk/client-kms";
import type { MiniStackConfig } from "./types";

function baseConfig(config: MiniStackConfig) {
  return {
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  };
}

export const getS3Client = (config: MiniStackConfig) =>
  new S3Client(baseConfig(config));

export const getSQSClient = (config: MiniStackConfig) =>
  new SQSClient(baseConfig(config));

export const getDynamoDBClient = (config: MiniStackConfig) =>
  new DynamoDBClient(baseConfig(config));

export const getLambdaClient = (config: MiniStackConfig) =>
  new LambdaClient(baseConfig(config));

export const getSNSClient = (config: MiniStackConfig) =>
  new SNSClient(baseConfig(config));

export const getCloudWatchLogsClient = (config: MiniStackConfig) =>
  new CloudWatchLogsClient(baseConfig(config));

export const getAPIGatewayClient = (config: MiniStackConfig) =>
  new APIGatewayClient(baseConfig(config));

export const getEventBridgeClient = (config: MiniStackConfig) =>
  new EventBridgeClient(baseConfig(config));

export const getIAMClient = (config: MiniStackConfig) =>
  new IAMClient(baseConfig(config));

export const getSecretsManagerClient = (config: MiniStackConfig) =>
  new SecretsManagerClient(baseConfig(config));

export const getSSMClient = (config: MiniStackConfig) =>
  new SSMClient(baseConfig(config));

export const getKinesisClient = (config: MiniStackConfig) =>
  new KinesisClient(baseConfig(config));

export const getKMSClient = (config: MiniStackConfig) =>
  new KMSClient(baseConfig(config));
