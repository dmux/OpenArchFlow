// All AWS SDK v3 operations — browser-compatible (no Node.js Buffer/fs/stream APIs).
// MiniStack supports CORS; import freely from any "use client" component.

import {
  getS3Client, getSQSClient, getDynamoDBClient, getLambdaClient,
  getSNSClient, getEventBridgeClient, getAPIGatewayClient,
  getKinesisClient, getIAMClient, getSecretsManagerClient,
  getSSMClient, getKMSClient, getCloudWatchLogsClient,
} from "./client";
import { getDeployDef, sanitizeResourceName } from "./service-map";
import type { MiniStackConfig, MiniStackDeployResult, MiniStackNodeState } from "./types";

// S3
import {
  CreateBucketCommand, HeadBucketCommand,
  ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand,
  DeleteBucketCommand, DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
// SQS
import {
  CreateQueueCommand, GetQueueAttributesCommand,
  SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, DeleteQueueCommand,
} from "@aws-sdk/client-sqs";
// DynamoDB
import {
  CreateTableCommand, DescribeTableCommand, ScanCommand,
  PutItemCommand, DeleteItemCommand, DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
// Lambda
import {
  CreateFunctionCommand, GetFunctionCommand, InvokeCommand,
  UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand, DeleteFunctionCommand,
} from "@aws-sdk/client-lambda";
// SNS
import {
  CreateTopicCommand, GetTopicAttributesCommand,
  ListSubscriptionsByTopicCommand, PublishCommand, SubscribeCommand, DeleteTopicCommand,
} from "@aws-sdk/client-sns";
// EventBridge
import {
  CreateEventBusCommand, DescribeEventBusCommand,
  ListRulesCommand, PutEventsCommand, DeleteEventBusCommand,
} from "@aws-sdk/client-eventbridge";
// API Gateway
import {
  GetRestApisCommand, CreateRestApiCommand, GetResourcesCommand, CreateResourceCommand,
  PutMethodCommand, PutIntegrationCommand, PutMethodResponseCommand, PutIntegrationResponseCommand,
  CreateDeploymentCommand, GetStagesCommand, DeleteRestApiCommand,
  GetIntegrationCommand, type GetIntegrationCommandOutput,
} from "@aws-sdk/client-api-gateway";
// Kinesis
import {
  CreateStreamCommand, DescribeStreamSummaryCommand, DeleteStreamCommand,
} from "@aws-sdk/client-kinesis";
// IAM
import { CreateRoleCommand, GetRoleCommand, DeleteRoleCommand } from "@aws-sdk/client-iam";
// Secrets Manager
import {
  CreateSecretCommand, DescribeSecretCommand, DeleteSecretCommand,
} from "@aws-sdk/client-secrets-manager";
// SSM
import { PutParameterCommand, GetParameterCommand, DeleteParameterCommand } from "@aws-sdk/client-ssm";
// KMS
import { CreateKeyCommand, ScheduleKeyDeletionCommand } from "@aws-sdk/client-kms";
// CloudWatch Logs
import {
  DescribeLogGroupsCommand, DescribeLogStreamsCommand, FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

// ── Browser-safe helpers ──────────────────────────────────────────────────────

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function payloadToString(payload: unknown): string | null {
  if (!payload) return null;
  if (payload instanceof Uint8Array) return new TextDecoder().decode(payload);
  if (typeof payload === "string") return payload;
  return null;
}

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkHealth(endpoint: string): Promise<{ connected: boolean; error?: string }> {
  try {
    const res = await fetch(`${endpoint}/_ministack/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : "Connection refused" };
  }
}

// ── Deploy ────────────────────────────────────────────────────────────────────

const LAMBDA_STUB_ZIP_BASE64 =
  "UEsDBBQAAAAIAINwqFxyjoS+hwAAAJQAAAAJABwAaW5kZXgubWpzVVQJAAOGF/5phhf+aXV4CwABBPUBAAAEFAAAAB3NwQqCQBRG4b1P8e9UkJCWhkEULYJy4RNMMzcdsjsyc7MG8d2TtocPDn1H5wXacRD0is1AHjVUiKyR0UQsOeo9sjkBgih5h6MzVGFblsWa7s7ECpe2uW2CeMudfcRsxotCUN3K0hONg4tkMFmFZiQ+eN2fB/fB1bJtRelnWuA/wpIXyZLvflBLAQIeAxQAAAAIAINwqFxyjoS+hwAAAJQAAAAJABgAAAAAAAEAAACkgQAAAABpbmRleC5tanNVVAUAA4YX/ml1eAsAAQT1AQAABBQAAABQSwUGAAAAAAEAAQBPAAAAygAAAAAA";

const LAMBDA_ROLE_NAME = "openarchflow-lambda-role";

export interface DeployNodeInput {
  nodeId: string;
  service: string;
  label: string;
  nodeConfig?: Record<string, unknown>;
  mockEndpoints?: {
    id: string;
    method: string;
    path: string;
    status: number;
    targetNodeId?: string;
    targetResourceId?: string;
  }[];
}

async function ensureLambdaRole(config: MiniStackConfig): Promise<string> {
  const iam = getIAMClient(config);
  const arn = `arn:aws:iam::${config.accountId}:role/${LAMBDA_ROLE_NAME}`;
  try {
    await iam.send(new GetRoleCommand({ RoleName: LAMBDA_ROLE_NAME }));
    return arn;
  } catch { /* create below */ }
  await iam.send(new CreateRoleCommand({
    RoleName: LAMBDA_ROLE_NAME,
    AssumeRolePolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" }],
    }),
  }));
  return arn;
}

// ── API Gateway CORS helper ───────────────────────────────────────────────────

async function addCorsToResource(
  gw: ReturnType<typeof getAPIGatewayClient>,
  restApiId: string,
  resourceId: string,
): Promise<void> {
  try { await gw.send(new PutMethodCommand({ restApiId, resourceId, httpMethod: "OPTIONS", authorizationType: "NONE" })); } catch { /* exists */ }
  try {
    await gw.send(new PutIntegrationCommand({
      restApiId, resourceId, httpMethod: "OPTIONS", type: "MOCK",
      requestTemplates: { "application/json": '{"statusCode": 200}' },
    }));
  } catch { /* exists */ }
  try {
    await gw.send(new PutMethodResponseCommand({
      restApiId, resourceId, httpMethod: "OPTIONS", statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Headers": true,
        "method.response.header.Access-Control-Allow-Methods": true,
      },
    }));
  } catch { /* exists */ }
  try {
    await gw.send(new PutIntegrationResponseCommand({
      restApiId, resourceId, httpMethod: "OPTIONS", statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": "'*'",
        "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
        "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET,POST,PUT,PATCH,DELETE'",
      },
      responseTemplates: { "application/json": "" },
    }));
  } catch { /* exists */ }
}

async function deployOne(
  node: DeployNodeInput,
  config: MiniStackConfig,
  lambdaRoleArn: string | null,
): Promise<MiniStackDeployResult> {
  const { nodeId, service, label } = node;
  const def = getDeployDef(service);
  if (!def.supported) return { nodeId, status: "not_supported" };

  const nameOverride = node.nodeConfig?.resourceNameOverride as string | undefined;
  const name = nameOverride
    ? nameOverride.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 63)
    : sanitizeResourceName(label, nodeId);

  try {
    switch (def.sdkService) {
      case "s3": {
        const s3 = getS3Client(config);
        try { await s3.send(new HeadBucketCommand({ Bucket: name })); } catch {
          await s3.send(new CreateBucketCommand({ Bucket: name }));
        }
        return { nodeId, status: "deployed", resourceId: name, resourceArn: `arn:aws:s3:::${name}` };
      }

      case "sqs": {
        const sqs = getSQSClient(config);
        const res = await sqs.send(new CreateQueueCommand({ QueueName: name }));
        const queueUrl = res.QueueUrl ?? `${config.endpoint}/000000000000/${name}`;
        const arnRes = await sqs.send(new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["QueueArn"] })).catch(() => null);
        const arn = arnRes?.Attributes?.QueueArn ?? `arn:aws:sqs:${config.region}:${config.accountId}:${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: arn, endpoint: queueUrl };
      }

      case "dynamodb": {
        const db = getDynamoDBClient(config);
        try {
          const desc = await db.send(new DescribeTableCommand({ TableName: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: desc.Table?.TableArn };
        } catch { /* create below */ }
        const res = await db.send(new CreateTableCommand({
          TableName: name,
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          BillingMode: "PAY_PER_REQUEST",
        }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.TableDescription?.TableArn };
      }

      case "lambda": {
        const lambda = getLambdaClient(config);
        const roleArn = lambdaRoleArn ?? `arn:aws:iam::${config.accountId}:role/${LAMBDA_ROLE_NAME}`;
        try {
          const existing = await lambda.send(new GetFunctionCommand({ FunctionName: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: existing.Configuration?.FunctionArn };
        } catch { /* create below */ }
        const res = await lambda.send(new CreateFunctionCommand({
          FunctionName: name,
          Runtime: "nodejs20.x",
          Handler: "index.handler",
          Role: roleArn,
          Code: { ZipFile: base64ToBytes(LAMBDA_STUB_ZIP_BASE64) },
        }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.FunctionArn };
      }

      case "sns": {
        const sns = getSNSClient(config);
        const res = await sns.send(new CreateTopicCommand({ Name: name }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.TopicArn };
      }

      case "eventbridge": {
        const eb = getEventBridgeClient(config);
        try {
          const desc = await eb.send(new DescribeEventBusCommand({ Name: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: desc.Arn };
        } catch { /* create below */ }
        const res = await eb.send(new CreateEventBusCommand({ Name: name }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.EventBusArn };
      }

      case "kinesis": {
        const kinesis = getKinesisClient(config);
        try {
          const desc = await kinesis.send(new DescribeStreamSummaryCommand({ StreamName: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: desc.StreamDescriptionSummary?.StreamARN };
        } catch { /* create below */ }
        await kinesis.send(new CreateStreamCommand({ StreamName: name, ShardCount: 1 }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: `arn:aws:kinesis:${config.region}:${config.accountId}:stream/${name}` };
      }

      case "iam": {
        const iam = getIAMClient(config);
        try {
          const existing = await iam.send(new GetRoleCommand({ RoleName: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: existing.Role?.Arn };
        } catch { /* create below */ }
        const res = await iam.send(new CreateRoleCommand({
          RoleName: name,
          AssumeRolePolicyDocument: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{ Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" }],
          }),
        }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.Role?.Arn };
      }

      case "secretsmanager": {
        const sm = getSecretsManagerClient(config);
        try {
          const desc = await sm.send(new DescribeSecretCommand({ SecretId: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: desc.ARN };
        } catch { /* create below */ }
        const res = await sm.send(new CreateSecretCommand({ Name: name, SecretString: JSON.stringify({ placeholder: "replace-me" }) }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.ARN };
      }

      case "ssm": {
        const ssm = getSSMClient(config);
        const paramName = `/${name}`;
        try { await ssm.send(new GetParameterCommand({ Name: paramName })); } catch {
          await ssm.send(new PutParameterCommand({ Name: paramName, Value: "placeholder", Type: "String", Overwrite: false }));
        }
        return { nodeId, status: "deployed", resourceId: paramName, resourceArn: `arn:aws:ssm:${config.region}:${config.accountId}:parameter${paramName}` };
      }

      case "kms": {
        const kms = getKMSClient(config);
        const res = await kms.send(new CreateKeyCommand({ Description: `OpenArchFlow managed key for ${name}`, KeyUsage: "ENCRYPT_DECRYPT" }));
        return { nodeId, status: "deployed", resourceId: res.KeyMetadata?.KeyId ?? name, resourceArn: res.KeyMetadata?.Arn ?? "" };
      }

      case "apigateway": {
        const gw = getAPIGatewayClient(config);
        let apiId: string;
        const existingApis = await gw.send(new GetRestApisCommand({ limit: 500 }));
        const existingApi = (existingApis.items ?? []).find((a) => a.name === name);
        if (existingApi?.id) {
          apiId = existingApi.id;
        } else {
          const apiRes = await gw.send(new CreateRestApiCommand({ name }));
          apiId = apiRes.id ?? name;
        }
        const resourcesRes = await gw.send(new GetResourcesCommand({ restApiId: apiId }));
        const rootResource = (resourcesRes.items ?? []).find((r) => r.path === "/");
        const rootId = rootResource?.id ?? "";
        if (rootId) {
          await addCorsToResource(gw, apiId, rootId);
          // When no mock endpoints are configured, add a default GET MOCK so there is always one invocable route
          if ((node.mockEndpoints ?? []).length === 0) {
            try { await gw.send(new PutMethodCommand({ restApiId: apiId, resourceId: rootId, httpMethod: "GET", authorizationType: "NONE" })); } catch { /* exists */ }
            try { await gw.send(new PutIntegrationCommand({ restApiId: apiId, resourceId: rootId, httpMethod: "GET", type: "MOCK", requestTemplates: { "application/json": '{"statusCode": 200}' } })); } catch { /* exists */ }
          }
        }
        for (const ep of node.mockEndpoints ?? []) {
          const epPath = ep.path.startsWith("/") ? ep.path.slice(1) : ep.path;
          let resourceId: string;
          if (!epPath) {
            resourceId = rootId;
          } else {
            try {
              const created = await gw.send(new CreateResourceCommand({ restApiId: apiId, parentId: rootId, pathPart: epPath }));
              resourceId = created.id ?? "";
            } catch {
              const existing = (resourcesRes.items ?? []).find((r) => r.pathPart === epPath);
              resourceId = existing?.id ?? "";
            }
          }
          if (!resourceId) continue;
          try {
            await gw.send(new PutMethodCommand({ restApiId: apiId, resourceId, httpMethod: ep.method.toUpperCase(), authorizationType: "NONE" }));
          } catch { /* already exists */ }
          const functionName = ep.targetResourceId;
          if (functionName) {
            const lambdaArn = `arn:aws:lambda:${config.region}:${config.accountId}:function:${functionName}`;
            const uri = `arn:aws:apigateway:${config.region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
            try { await gw.send(new PutIntegrationCommand({ restApiId: apiId, resourceId, httpMethod: ep.method.toUpperCase(), type: "AWS_PROXY", integrationHttpMethod: "POST", uri })); } catch { /* already exists */ }
          } else {
            try { await gw.send(new PutIntegrationCommand({ restApiId: apiId, resourceId, httpMethod: ep.method.toUpperCase(), type: "MOCK", requestTemplates: { "application/json": `{"statusCode": ${ep.status ?? 200}}` } })); } catch { /* already exists */ }
          }
          await addCorsToResource(gw, apiId, resourceId);
        }
        try { await gw.send(new CreateDeploymentCommand({ restApiId: apiId, stageName: "test" })); } catch { /* already deployed */ }
        return { nodeId, status: "deployed", resourceId: apiId, resourceArn: `arn:aws:apigateway:${config.region}::/restapis/${apiId}`, endpoint: `${config.endpoint}/restapis/${apiId}` };
      }

      default:
        return { nodeId, status: "not_supported" };
    }
  } catch (err) {
    return { nodeId, status: "error", errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

export async function deployNodes(
  nodes: DeployNodeInput[],
  config: MiniStackConfig,
  onProgress: (result: MiniStackDeployResult) => void,
): Promise<void> {
  const hasLambda = nodes.some((n) => {
    const def = getDeployDef(n.service);
    return def.supported && def.requiresIAMRole;
  });
  let lambdaRoleArn: string | null = null;
  if (hasLambda) {
    try { lambdaRoleArn = await ensureLambdaRole(config); } catch { /* proceed without role */ }
  }
  for (const node of nodes) {
    const result = await deployOne(node, config, lambdaRoleArn);
    onProgress(result);
  }
}

// ── Teardown ──────────────────────────────────────────────────────────────────

export interface TeardownNodeInput {
  nodeId: string;
  service: string;
  ministack: MiniStackNodeState;
}

export interface TeardownResult {
  nodeId: string;
  resourceId: string;
  ok: boolean;
  error?: string;
}

async function teardownOne(node: TeardownNodeInput, config: MiniStackConfig): Promise<TeardownResult> {
  const { nodeId, service, ministack } = node;
  const resourceId = ministack.resourceId ?? "";
  if (!resourceId) return { nodeId, resourceId: "", ok: true };
  const svc = service.toLowerCase().replace(/_/g, "-");
  try {
    switch (svc) {
      case "s3": {
        const s3 = getS3Client(config);
        const listed = await s3.send(new ListObjectsV2Command({ Bucket: resourceId }));
        if (listed.Contents && listed.Contents.length > 0) {
          await s3.send(new DeleteObjectsCommand({ Bucket: resourceId, Delete: { Objects: listed.Contents.map((o) => ({ Key: o.Key! })) } }));
        }
        await s3.send(new DeleteBucketCommand({ Bucket: resourceId }));
        break;
      }
      case "sqs": {
        const sqs = getSQSClient(config);
        const queueUrl = ministack.endpoint ?? `${config.endpoint}/000000000000/${resourceId}`;
        await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
        break;
      }
      case "dynamodb": {
        await getDynamoDBClient(config).send(new DeleteTableCommand({ TableName: resourceId }));
        break;
      }
      case "lambda": {
        await getLambdaClient(config).send(new DeleteFunctionCommand({ FunctionName: resourceId }));
        break;
      }
      case "sns": {
        const topicArn = ministack.resourceArn ?? `arn:aws:sns:${config.region}:${config.accountId}:${resourceId}`;
        await getSNSClient(config).send(new DeleteTopicCommand({ TopicArn: topicArn }));
        break;
      }
      case "eventbridge": {
        await getEventBridgeClient(config).send(new DeleteEventBusCommand({ Name: resourceId }));
        break;
      }
      case "kinesis": {
        await getKinesisClient(config).send(new DeleteStreamCommand({ StreamName: resourceId }));
        break;
      }
      case "iam": {
        await getIAMClient(config).send(new DeleteRoleCommand({ RoleName: resourceId }));
        break;
      }
      case "secrets-manager":
      case "secretsmanager": {
        await getSecretsManagerClient(config).send(new DeleteSecretCommand({ SecretId: ministack.resourceArn ?? resourceId, ForceDeleteWithoutRecovery: true }));
        break;
      }
      case "ssm": {
        await getSSMClient(config).send(new DeleteParameterCommand({ Name: resourceId }));
        break;
      }
      case "kms": {
        await getKMSClient(config).send(new ScheduleKeyDeletionCommand({ KeyId: resourceId, PendingWindowInDays: 7 }));
        break;
      }
      case "apigateway":
      case "api-gateway": {
        await getAPIGatewayClient(config).send(new DeleteRestApiCommand({ restApiId: resourceId }));
        break;
      }
    }
    return { nodeId, resourceId, ok: true };
  } catch (err) {
    return { nodeId, resourceId, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function teardownNodes(nodes: TeardownNodeInput[], config: MiniStackConfig): Promise<TeardownResult[]> {
  const deployed = nodes.filter((n) => n.ministack?.status === "deployed" && n.ministack?.resourceId);
  const results: TeardownResult[] = [];
  for (const node of deployed) {
    results.push(await teardownOne(node, config));
  }
  return results;
}

// ── S3 ────────────────────────────────────────────────────────────────────────

export interface S3Object { key: string; size: number; lastModified: string }

export async function s3ListObjects(config: MiniStackConfig, bucket: string): Promise<{ objects: S3Object[]; count: number }> {
  const s3 = getS3Client(config);
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 200 }));
  return {
    objects: (res.Contents ?? []).map((o) => ({ key: o.Key ?? "", size: o.Size ?? 0, lastModified: o.LastModified?.toISOString() ?? "" })),
    count: res.KeyCount ?? 0,
  };
}

export async function s3PutObject(config: MiniStackConfig, bucket: string, key: string, content: string): Promise<void> {
  await getS3Client(config).send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: content }));
}

export async function s3DeleteObject(config: MiniStackConfig, bucket: string, key: string): Promise<void> {
  await getS3Client(config).send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// ── SQS ───────────────────────────────────────────────────────────────────────

export interface SQSQueueInfo {
  attributes: Record<string, string>;
  messages: { messageId: string; body: string; receiptHandle: string }[];
}

export async function sqsGetQueue(config: MiniStackConfig, resourceId: string, queueUrl: string): Promise<SQSQueueInfo> {
  const sqs = getSQSClient(config);
  const [attrs, msgs] = await Promise.all([
    sqs.send(new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible", "QueueArn", "VisibilityTimeout"] })),
    sqs.send(new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 10, VisibilityTimeout: 0, WaitTimeSeconds: 0 })),
  ]);
  return {
    attributes: attrs.Attributes ?? {},
    messages: (msgs.Messages ?? []).map((m) => ({ messageId: m.MessageId ?? "", body: m.Body ?? "", receiptHandle: m.ReceiptHandle ?? "" })),
  };
}

export async function sqsSendMessage(config: MiniStackConfig, queueUrl: string, messageBody: string): Promise<string | undefined> {
  const res = await getSQSClient(config).send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: messageBody }));
  return res.MessageId;
}

export async function sqsDeleteMessage(config: MiniStackConfig, queueUrl: string, receiptHandle: string): Promise<void> {
  await getSQSClient(config).send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }));
}

// ── DynamoDB ──────────────────────────────────────────────────────────────────

export interface DynamoTableInfo {
  itemCount: number;
  keySchema: { AttributeName: string; KeyType: string }[];
  billingMode: string;
  status?: string;
}

export async function dynamoScan(config: MiniStackConfig, tableName: string): Promise<{ table: DynamoTableInfo; items: Record<string, unknown>[]; count: number }> {
  const db = getDynamoDBClient(config);
  const [desc, scan] = await Promise.all([
    db.send(new DescribeTableCommand({ TableName: tableName })),
    db.send(new ScanCommand({ TableName: tableName, Limit: 50 })),
  ]);
  return {
    table: {
      itemCount: desc.Table?.ItemCount ?? 0,
      keySchema: (desc.Table?.KeySchema ?? []).map((k) => ({ AttributeName: k.AttributeName ?? "", KeyType: k.KeyType ?? "" })),
      billingMode: desc.Table?.BillingModeSummary?.BillingMode ?? "PROVISIONED",
      status: desc.Table?.TableStatus as string | undefined,
    },
    items: (scan.Items ?? []) as Record<string, unknown>[],
    count: scan.Count ?? 0,
  };
}

export async function dynamoPutItem(config: MiniStackConfig, tableName: string, item: Record<string, unknown>): Promise<void> {
  await getDynamoDBClient(config).send(new PutItemCommand({ TableName: tableName, Item: item as any }));
}

// ── Lambda ────────────────────────────────────────────────────────────────────

export interface LambdaFnConfig {
  runtime?: string;
  handler?: string;
  memorySize?: number;
  timeout?: number;
  codeSize?: number;
  lastModified?: string;
  state?: string;
  environment?: Record<string, string>;
}

export async function lambdaGetConfig(config: MiniStackConfig, functionName: string): Promise<LambdaFnConfig> {
  const fn = await getLambdaClient(config).send(new GetFunctionCommand({ FunctionName: functionName }));
  return {
    runtime: fn.Configuration?.Runtime as string | undefined,
    handler: fn.Configuration?.Handler,
    memorySize: fn.Configuration?.MemorySize,
    timeout: fn.Configuration?.Timeout,
    codeSize: fn.Configuration?.CodeSize,
    lastModified: fn.Configuration?.LastModified,
    state: fn.Configuration?.State as string | undefined,
    environment: fn.Configuration?.Environment?.Variables ?? {},
  };
}

export async function lambdaInvoke(config: MiniStackConfig, functionName: string, payload: string): Promise<unknown> {
  const res = await getLambdaClient(config).send(new InvokeCommand({
    FunctionName: functionName,
    Payload: new TextEncoder().encode(payload || "{}"),
  }));
  const raw = payloadToString(res.Payload);
  if (res.FunctionError) {
    throw new Error(raw ?? res.FunctionError);
  }
  if (!raw) return { statusCode: res.StatusCode };
  try { return JSON.parse(raw); } catch { return raw; }
}

export async function lambdaUpdateConfig(config: MiniStackConfig, functionName: string, opts: {
  runtime?: string;
  handler?: string;
  memorySize?: number;
  timeout?: number;
  environment?: Record<string, string>;
}): Promise<void> {
  await getLambdaClient(config).send(new UpdateFunctionConfigurationCommand({
    FunctionName: functionName,
    ...(opts.runtime     && { Runtime: opts.runtime as any }),
    ...(opts.handler     && { Handler: opts.handler }),
    ...(opts.memorySize !== undefined && { MemorySize: opts.memorySize }),
    ...(opts.timeout    !== undefined && { Timeout: opts.timeout }),
    ...(opts.environment !== undefined && { Environment: { Variables: opts.environment } }),
  }));
}

export async function lambdaUploadCode(config: MiniStackConfig, functionName: string, zipBase64: string): Promise<void> {
  await getLambdaClient(config).send(new UpdateFunctionCodeCommand({
    FunctionName: functionName,
    ZipFile: base64ToBytes(zipBase64),
  }));
}

// ── SNS ───────────────────────────────────────────────────────────────────────

export interface SNSSubscription { protocol: string; endpoint: string; arn: string }

export async function snsGetTopic(config: MiniStackConfig, resourceId: string, topicArn: string): Promise<{ attributes: Record<string, string>; subscriptions: SNSSubscription[] }> {
  const sns = getSNSClient(config);
  const [attrs, subs] = await Promise.all([
    sns.send(new GetTopicAttributesCommand({ TopicArn: topicArn })),
    sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })),
  ]);
  return {
    attributes: attrs.Attributes ?? {},
    subscriptions: (subs.Subscriptions ?? []).map((s) => ({ protocol: s.Protocol ?? "", endpoint: s.Endpoint ?? "", arn: s.SubscriptionArn ?? "" })),
  };
}

export async function snsPublish(config: MiniStackConfig, topicArn: string, message: string, subject?: string): Promise<string | undefined> {
  const res = await getSNSClient(config).send(new PublishCommand({ TopicArn: topicArn, Message: message, Subject: subject }));
  return res.MessageId;
}

export async function snsSubscribe(config: MiniStackConfig, topicArn: string, protocol: string, endpoint: string): Promise<string | undefined> {
  const res = await getSNSClient(config).send(new SubscribeCommand({ TopicArn: topicArn, Protocol: protocol, Endpoint: endpoint }));
  return res.SubscriptionArn;
}

// ── EventBridge ───────────────────────────────────────────────────────────────

export interface EBRule { name?: string; state?: string; pattern?: string; scheduleExpression?: string }

export async function eventBridgeGetBus(config: MiniStackConfig, busName: string): Promise<{ bus: { name?: string; arn?: string }; rules: EBRule[] }> {
  const eb = getEventBridgeClient(config);
  const [desc, rules] = await Promise.all([
    eb.send(new DescribeEventBusCommand({ Name: busName })),
    eb.send(new ListRulesCommand({ EventBusName: busName, Limit: 20 })),
  ]);
  return {
    bus: { name: desc.Name, arn: desc.Arn },
    rules: (rules.Rules ?? []).map((r) => ({ name: r.Name, state: r.State as string | undefined, pattern: r.EventPattern, scheduleExpression: r.ScheduleExpression })),
  };
}

export async function eventBridgePutEvents(config: MiniStackConfig, busName: string, source: string, detailType: string, detail: string): Promise<{ failedCount: number }> {
  const res = await getEventBridgeClient(config).send(new PutEventsCommand({
    Entries: [{ EventBusName: busName, Source: source, DetailType: detailType, Detail: detail }],
  }));
  return { failedCount: res.FailedEntryCount ?? 0 };
}

// ── API Gateway ───────────────────────────────────────────────────────────────

export interface APIResource { id: string; path: string; methods: string[] }
export interface APIStage { name: string; deploymentId?: string }

export async function apiGatewayGetResources(config: MiniStackConfig, restApiId: string): Promise<{ resources: APIResource[]; stages: APIStage[] }> {
  const gw = getAPIGatewayClient(config);
  const [resources, stages] = await Promise.all([
    gw.send(new GetResourcesCommand({ restApiId })),
    gw.send(new GetStagesCommand({ restApiId })),
  ]);
  return {
    resources: (resources.items ?? []).map((r) => ({ id: r.id ?? "", path: r.path ?? "", methods: Object.keys(r.resourceMethods ?? {}) })),
    stages: (stages.item ?? []).map((s) => ({ name: s.stageName ?? "", deploymentId: s.deploymentId })),
  };
}

export async function apiGatewayAddRoute(config: MiniStackConfig, restApiId: string, method: string, path: string, lambdaFunctionName?: string): Promise<{ resourceId: string }> {
  const gw = getAPIGatewayClient(config);
  const existing = await gw.send(new GetResourcesCommand({ restApiId }));
  const root = (existing.items ?? []).find((r) => r.path === "/");
  if (!root?.id) throw new Error("Root resource not found");
  const pathPart = (path.startsWith("/") ? path.slice(1) : path) || "";
  let resourceId: string;
  if (!pathPart) {
    resourceId = root.id;
  } else {
    const existingResource = (existing.items ?? []).find((r) => r.pathPart === pathPart);
    if (existingResource?.id) {
      resourceId = existingResource.id;
    } else {
      const created = await gw.send(new CreateResourceCommand({ restApiId, parentId: root.id, pathPart }));
      resourceId = created.id ?? "";
    }
  }
  try { await gw.send(new PutMethodCommand({ restApiId, resourceId, httpMethod: method.toUpperCase(), authorizationType: "NONE" })); } catch { /* already exists */ }
  if (lambdaFunctionName) {
    const lambdaArn = `arn:aws:lambda:${config.region}:${config.accountId}:function:${lambdaFunctionName}`;
    const uri = `arn:aws:apigateway:${config.region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
    await gw.send(new PutIntegrationCommand({ restApiId, resourceId, httpMethod: method.toUpperCase(), type: "AWS_PROXY", integrationHttpMethod: "POST", uri }));
  } else {
    await gw.send(new PutIntegrationCommand({ restApiId, resourceId, httpMethod: method.toUpperCase(), type: "MOCK", requestTemplates: { "application/json": '{"statusCode": 200}' } }));
  }
  await addCorsToResource(gw, restApiId, resourceId);
  await gw.send(new CreateDeploymentCommand({ restApiId, stageName: "test" }));
  return { resourceId };
}

export async function apiGatewayInvoke(config: MiniStackConfig, restApiId: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
  const gw = getAPIGatewayClient(config);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const httpMethod = (method ?? "GET").toUpperCase();

  // Find the resource matching the path (fall back to root)
  const resources = await gw.send(new GetResourcesCommand({ restApiId }));
  const resource =
    (resources.items ?? []).find((r) => r.path === normalizedPath) ??
    (resources.items ?? []).find((r) => r.path === "/");
  if (!resource?.id) throw new Error(`No resource found for path ${normalizedPath}`);

  // Get the integration (MOCK vs Lambda) — all SDK calls, no direct HTTP fetch needed
  let integration: GetIntegrationCommandOutput | null = null;
  try {
    integration = await gw.send(new GetIntegrationCommand({ restApiId, resourceId: resource.id, httpMethod }));
  } catch { /* no integration — return empty 200 */ }

  if (!integration) return { status: 200, body: { message: "No integration configured" } };

  if (integration.type === "AWS_PROXY" || integration.type === "AWS") {
    // Lambda proxy — extract function name and invoke directly via SDK
    const uri = integration.uri ?? "";
    const fnMatch = uri.match(/function:([^/]+)\/invocations/);
    const functionName = fnMatch?.[1];
    if (functionName) {
      const event = { httpMethod, path: normalizedPath, body: body !== undefined ? JSON.stringify(body) : null, headers: {}, queryStringParameters: null };
      const lambdaRes = await getLambdaClient(config).send(new InvokeCommand({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(JSON.stringify(event)),
      }));
      const raw = payloadToString(lambdaRes.Payload);
      if (!raw) return { status: 200, body: {} };
      try {
        const parsed = JSON.parse(raw) as { statusCode?: number; body?: string };
        const innerBody = typeof parsed.body === "string" ? (() => { try { return JSON.parse(parsed.body!); } catch { return parsed.body; } })() : (parsed.body ?? parsed);
        return { status: parsed.statusCode ?? 200, body: innerBody };
      } catch { return { status: 200, body: raw }; }
    }
  }

  // MOCK integration — parse configured statusCode from requestTemplates
  const tpl = integration.requestTemplates?.["application/json"] ?? '{"statusCode":200}';
  const statusCode = (() => { try { return (JSON.parse(tpl) as { statusCode?: number }).statusCode ?? 200; } catch { return 200; } })();
  return { status: statusCode, body: { message: "MOCK response", path: normalizedPath, method: httpMethod } };
}

// ── CloudWatch Logs ───────────────────────────────────────────────────────────

export interface CwlLogGroup { name: string; storedBytes: number; retentionDays?: number }
export interface CwlLogStream { name: string; lastEventTime?: number }
export interface CwlLogEvent { timestamp?: number; message?: string }

export async function cwlListGroups(config: MiniStackConfig, prefix?: string): Promise<{ groups: CwlLogGroup[] }> {
  const res = await getCloudWatchLogsClient(config).send(new DescribeLogGroupsCommand({ logGroupNamePrefix: prefix, limit: 50 }));
  return { groups: (res.logGroups ?? []).map((g) => ({ name: g.logGroupName ?? "", storedBytes: g.storedBytes ?? 0, retentionDays: g.retentionInDays })) };
}

export async function cwlListStreams(config: MiniStackConfig, logGroupName: string): Promise<{ streams: CwlLogStream[] }> {
  const res = await getCloudWatchLogsClient(config).send(new DescribeLogStreamsCommand({ logGroupName, orderBy: "LastEventTime", descending: true, limit: 20 }));
  return { streams: (res.logStreams ?? []).map((s) => ({ name: s.logStreamName ?? "", lastEventTime: s.lastEventTimestamp })) };
}

export function cwlStreamEvents(
  config: MiniStackConfig,
  logGroupName: string,
  logStreamName: string | undefined,
  onBatch: (events: CwlLogEvent[]) => void,
): () => void {
  const cwl = getCloudWatchLogsClient(config);
  let lastEventTime = Date.now() - 2 * 60 * 1000;

  const poll = async () => {
    let pageToken: string | undefined;
    const batch: CwlLogEvent[] = [];
    do {
      const res = await cwl.send(new FilterLogEventsCommand({
        logGroupName,
        logStreamNames: logStreamName ? [logStreamName] : undefined,
        startTime: lastEventTime,
        nextToken: pageToken,
        limit: 100,
      }));
      for (const e of res.events ?? []) {
        batch.push({ timestamp: e.timestamp, message: e.message });
        if (e.timestamp !== undefined && e.timestamp >= lastEventTime) {
          lastEventTime = e.timestamp + 1;
        }
      }
      pageToken = res.nextToken;
    } while (pageToken);
    if (batch.length > 0) onBatch(batch);
  };

  poll().catch(() => {});
  const id = setInterval(() => poll().catch(() => {}), 2000);
  return () => clearInterval(id);
}
