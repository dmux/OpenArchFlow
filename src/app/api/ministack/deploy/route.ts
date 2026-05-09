import { NextRequest, NextResponse } from "next/server";
import {
  getS3Client,
  getSQSClient,
  getDynamoDBClient,
  getLambdaClient,
  getSNSClient,
  getEventBridgeClient,
  getKinesisClient,
  getIAMClient,
  getSecretsManagerClient,
  getSSMClient,
  getKMSClient,
  getAPIGatewayClient,
} from "@/lib/ministack/client";
import { getDeployDef, sanitizeResourceName } from "@/lib/ministack/service-map";
import type { MiniStackConfig, MiniStackDeployResult } from "@/lib/ministack/types";
import { CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { CreateQueueCommand, GetQueueAttributesCommand } from "@aws-sdk/client-sqs";
import { CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { CreateFunctionCommand, GetFunctionCommand } from "@aws-sdk/client-lambda";
import { CreateTopicCommand } from "@aws-sdk/client-sns";
import { CreateEventBusCommand, DescribeEventBusCommand } from "@aws-sdk/client-eventbridge";
import { CreateStreamCommand, DescribeStreamSummaryCommand } from "@aws-sdk/client-kinesis";
import { CreateRoleCommand, GetRoleCommand } from "@aws-sdk/client-iam";
import { CreateSecretCommand, DescribeSecretCommand } from "@aws-sdk/client-secrets-manager";
import { PutParameterCommand, GetParameterCommand } from "@aws-sdk/client-ssm";
import { CreateKeyCommand } from "@aws-sdk/client-kms";
import {
  GetRestApisCommand,
  CreateRestApiCommand,
  GetResourcesCommand,
  CreateResourceCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  CreateDeploymentCommand,
} from "@aws-sdk/client-api-gateway";

// Minimal Lambda stub (index.mjs returning 200)
const LAMBDA_STUB_ZIP_BASE64 =
  "UEsDBBQAAAAIAINwqFxyjoS+hwAAAJQAAAAJABwAaW5kZXgubWpzVVQJAAOGF/5phhf+aXV4CwABBPUBAAAEFAAAAB3NwQqCQBRG4b1P8e9UkJCWhkEULYJy4RNMMzcdsjsyc7MG8d2TtocPDn1H5wXacRD0is1AHjVUiKyR0UQsOeo9sjkBgih5h6MzVGFblsWa7s7ECpe2uW2CeMudfcRsxotCUN3K0hONg4tkMFmFZiQ+eN2fB/fB1bJtRelnWuA/wpIXyZLvflBLAQIeAxQAAAAIAINwqFxyjoS+hwAAAJQAAAAJABgAAAAAAAEAAACkgQAAAABpbmRleC5tanNVVAUAA4YX/ml1eAsAAQT1AQAABBQAAABQSwUGAAAAAAEAAQBPAAAAygAAAAAA";

const LAMBDA_ROLE_NAME = "openarchflow-lambda-role";

interface DeployEndpoint {
  id: string;
  method: string;
  path: string;
  status: number;
  targetNodeId?: string;
  targetResourceId?: string; // Lambda function name resolved at deploy time
}

interface DeployNode {
  nodeId: string;
  service: string;
  label: string;
  nodeConfig?: Record<string, unknown>;
  mockEndpoints?: DeployEndpoint[];
}

interface DeployBody {
  nodes: DeployNode[];
  config: MiniStackConfig;
}

async function ensureLambdaRole(config: MiniStackConfig): Promise<string> {
  const iam = getIAMClient(config);
  const arn = `arn:aws:iam::${config.accountId}:role/${LAMBDA_ROLE_NAME}`;
  try {
    await iam.send(new GetRoleCommand({ RoleName: LAMBDA_ROLE_NAME }));
    return arn;
  } catch {
    // Role doesn't exist — create it
  }
  await iam.send(
    new CreateRoleCommand({
      RoleName: LAMBDA_ROLE_NAME,
      AssumeRolePolicyDocument: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "lambda.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    }),
  );
  return arn;
}

async function deployNode(
  node: DeployNode,
  config: MiniStackConfig,
  lambdaRoleArn: string | null,
): Promise<MiniStackDeployResult> {
  const { nodeId, service, label } = node;
  const def = getDeployDef(service);

  if (!def.supported) {
    return { nodeId, status: "not_supported" };
  }

  const nameOverride = node.nodeConfig?.resourceNameOverride as string | undefined;
  const name = nameOverride ? nameOverride.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 63) : sanitizeResourceName(label, nodeId);

  try {
    switch (def.sdkService) {
      case "s3": {
        const s3 = getS3Client(config);
        try {
          await s3.send(new HeadBucketCommand({ Bucket: name }));
        } catch {
          await s3.send(new CreateBucketCommand({ Bucket: name }));
        }
        const arn = `arn:aws:s3:::${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
      }

      case "sqs": {
        const sqs = getSQSClient(config);
        const res = await sqs.send(new CreateQueueCommand({ QueueName: name }));
        const queueUrl = res.QueueUrl ?? `${config.endpoint}/000000000000/${name}`;
        const arnRes = await sqs.send(
          new GetQueueAttributesCommand({
            QueueUrl: queueUrl,
            AttributeNames: ["QueueArn"],
          }),
        ).catch(() => null);
        const arn = arnRes?.Attributes?.QueueArn ?? `arn:aws:sqs:${config.region}:${config.accountId}:${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: arn, endpoint: queueUrl };
      }

      case "dynamodb": {
        const db = getDynamoDBClient(config);
        try {
          const desc = await db.send(new DescribeTableCommand({ TableName: name }));
          const arn = desc.Table?.TableArn ?? `arn:aws:dynamodb:${config.region}:${config.accountId}:table/${name}`;
          return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
        } catch {
          // Table doesn't exist — create
        }
        const res = await db.send(
          new CreateTableCommand({
            TableName: name,
            AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
            KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
            BillingMode: "PAY_PER_REQUEST",
          }),
        );
        const arn = res.TableDescription?.TableArn ?? `arn:aws:dynamodb:${config.region}:${config.accountId}:table/${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
      }

      case "lambda": {
        const lambda = getLambdaClient(config);
        const roleArn = lambdaRoleArn ?? `arn:aws:iam::${config.accountId}:role/${LAMBDA_ROLE_NAME}`;
        try {
          const existing = await lambda.send(new GetFunctionCommand({ FunctionName: name }));
          const arn = existing.Configuration?.FunctionArn ?? `arn:aws:lambda:${config.region}:${config.accountId}:function:${name}`;
          return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
        } catch {
          // Function doesn't exist — create
        }
        const zipBuffer = Buffer.from(LAMBDA_STUB_ZIP_BASE64, "base64");
        const res = await lambda.send(
          new CreateFunctionCommand({
            FunctionName: name,
            Runtime: "nodejs20.x",
            Handler: "index.handler",
            Role: roleArn,
            Code: { ZipFile: zipBuffer },
          }),
        );
        const arn = res.FunctionArn ?? `arn:aws:lambda:${config.region}:${config.accountId}:function:${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
      }

      case "sns": {
        const sns = getSNSClient(config);
        const res = await sns.send(new CreateTopicCommand({ Name: name }));
        const arn = res.TopicArn ?? `arn:aws:sns:${config.region}:${config.accountId}:${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
      }

      case "eventbridge": {
        const eb = getEventBridgeClient(config);
        try {
          const desc = await eb.send(new DescribeEventBusCommand({ Name: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: desc.Arn };
        } catch {
          // Bus doesn't exist — create
        }
        const res = await eb.send(new CreateEventBusCommand({ Name: name }));
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.EventBusArn };
      }

      case "kinesis": {
        const kinesis = getKinesisClient(config);
        try {
          const desc = await kinesis.send(new DescribeStreamSummaryCommand({ StreamName: name }));
          const arn = desc.StreamDescriptionSummary?.StreamARN ?? `arn:aws:kinesis:${config.region}:${config.accountId}:stream/${name}`;
          return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
        } catch {
          // Stream doesn't exist — create
        }
        await kinesis.send(new CreateStreamCommand({ StreamName: name, ShardCount: 1 }));
        const arn = `arn:aws:kinesis:${config.region}:${config.accountId}:stream/${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
      }

      case "iam": {
        const iam = getIAMClient(config);
        try {
          const existing = await iam.send(new GetRoleCommand({ RoleName: name }));
          const arn = existing.Role?.Arn ?? `arn:aws:iam::${config.accountId}:role/${name}`;
          return { nodeId, status: "deployed", resourceId: name, resourceArn: arn };
        } catch {
          // Role doesn't exist — create
        }
        const res = await iam.send(
          new CreateRoleCommand({
            RoleName: name,
            AssumeRolePolicyDocument: JSON.stringify({
              Version: "2012-10-17",
              Statement: [{ Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" }],
            }),
          }),
        );
        const roleArn = res.Role?.Arn ?? `arn:aws:iam::${config.accountId}:role/${name}`;
        return { nodeId, status: "deployed", resourceId: name, resourceArn: roleArn };
      }

      case "secretsmanager": {
        const sm = getSecretsManagerClient(config);
        try {
          const desc = await sm.send(new DescribeSecretCommand({ SecretId: name }));
          return { nodeId, status: "deployed", resourceId: name, resourceArn: desc.ARN };
        } catch {
          // Secret doesn't exist — create
        }
        const res = await sm.send(
          new CreateSecretCommand({
            Name: name,
            SecretString: JSON.stringify({ placeholder: "replace-me" }),
          }),
        );
        return { nodeId, status: "deployed", resourceId: name, resourceArn: res.ARN };
      }

      case "ssm": {
        const ssm = getSSMClient(config);
        const paramName = `/${name}`;
        try {
          await ssm.send(new GetParameterCommand({ Name: paramName }));
        } catch {
          await ssm.send(
            new PutParameterCommand({
              Name: paramName,
              Value: "placeholder",
              Type: "String",
              Overwrite: false,
            }),
          );
        }
        const arn = `arn:aws:ssm:${config.region}:${config.accountId}:parameter${paramName}`;
        return { nodeId, status: "deployed", resourceId: paramName, resourceArn: arn };
      }

      case "kms": {
        const kms = getKMSClient(config);
        const res = await kms.send(
          new CreateKeyCommand({
            Description: `OpenArchFlow managed key for ${name}`,
            KeyUsage: "ENCRYPT_DECRYPT",
          }),
        );
        const arn = res.KeyMetadata?.Arn ?? "";
        const keyId = res.KeyMetadata?.KeyId ?? name;
        return { nodeId, status: "deployed", resourceId: keyId, resourceArn: arn };
      }

      case "apigateway": {
        const gw = getAPIGatewayClient(config);

        // Idempotency: reuse existing API with the same name
        let apiId: string;
        const existingApis = await gw.send(new GetRestApisCommand({ limit: 500 }));
        const existingApi = (existingApis.items ?? []).find((a) => a.name === name);
        if (existingApi?.id) {
          apiId = existingApi.id;
        } else {
          const apiRes = await gw.send(new CreateRestApiCommand({ name }));
          apiId = apiRes.id ?? name;
        }

        // Get root resource "/"
        const resourcesRes = await gw.send(new GetResourcesCommand({ restApiId: apiId }));
        const rootResource = (resourcesRes.items ?? []).find((r) => r.path === "/");
        const rootId = rootResource?.id ?? "";

        // Create a resource + method + integration for each configured endpoint
        const endpoints = node.mockEndpoints ?? [];
        for (const ep of endpoints) {
          const epPath = ep.path.startsWith("/") ? ep.path.slice(1) : ep.path;

          let resourceId: string;
          if (!epPath) {
            // Root path "/" — resource already exists, use rootId directly
            resourceId = rootId;
          } else {
            try {
              const created = await gw.send(new CreateResourceCommand({
                restApiId: apiId,
                parentId: rootId,
                pathPart: epPath,
              }));
              resourceId = created.id ?? "";
            } catch {
              // Resource may already exist — find it
              const existing = (resourcesRes.items ?? []).find((r) => r.pathPart === epPath);
              resourceId = existing?.id ?? "";
            }
          }

          if (!resourceId) continue;

          // Create the HTTP method (no auth)
          try {
            await gw.send(new PutMethodCommand({
              restApiId: apiId,
              resourceId,
              httpMethod: ep.method.toUpperCase(),
              authorizationType: "NONE",
            }));
          } catch { /* already exists */ }

          // Lambda proxy integration if we have a target function name
          const functionName = ep.targetResourceId;
          if (functionName) {
            const lambdaArn = `arn:aws:lambda:${config.region}:${config.accountId}:function:${functionName}`;
            const uri = `arn:aws:apigateway:${config.region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
            try {
              await gw.send(new PutIntegrationCommand({
                restApiId: apiId,
                resourceId,
                httpMethod: ep.method.toUpperCase(),
                type: "AWS_PROXY",
                integrationHttpMethod: "POST",
                uri,
              }));
            } catch { /* already exists */ }
          } else {
            // Mock integration for routes without a Lambda target
            try {
              await gw.send(new PutIntegrationCommand({
                restApiId: apiId,
                resourceId,
                httpMethod: ep.method.toUpperCase(),
                type: "MOCK",
                requestTemplates: { "application/json": `{"statusCode": ${ep.status ?? 200}}` },
              }));
            } catch { /* already exists */ }
          }
        }

        // Deploy to "test" stage so the _user_request_ URL works
        try {
          await gw.send(new CreateDeploymentCommand({ restApiId: apiId, stageName: "test" }));
        } catch { /* already deployed */ }

        const arn = `arn:aws:apigateway:${config.region}::/restapis/${apiId}`;
        const endpoint = `${config.endpoint}/restapis/${apiId}`;
        return { nodeId, status: "deployed", resourceId: apiId, resourceArn: arn, endpoint };
      }

      default:
        return { nodeId, status: "not_supported" };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { nodeId, status: "error", errorMessage };
  }
}

export async function POST(req: NextRequest) {
  const stream = req.nextUrl.searchParams.get("stream") === "true";

  let body: DeployBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { nodes, config } = body;
  if (!nodes || !config) {
    return NextResponse.json({ error: "Missing nodes or config" }, { status: 400 });
  }

  // Pre-create Lambda IAM role if any Lambda nodes need it
  let lambdaRoleArn: string | null = null;
  const hasLambda = nodes.some((n) => {
    const def = getDeployDef(n.service);
    return def.supported && def.requiresIAMRole;
  });
  if (hasLambda) {
    try {
      lambdaRoleArn = await ensureLambdaRole(config);
    } catch (err) {
      console.error("Failed to ensure Lambda role:", err instanceof Error ? err.message : err);
    }
  }

  // ── SSE streaming mode ─────────────────────────────────────────────────
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for (const node of nodes) {
          const result = await deployNode(node, config, lambdaRoleArn);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(result)}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ── Batch mode (default) ───────────────────────────────────────────────
  const results: MiniStackDeployResult[] = [];
  for (const node of nodes) {
    const result = await deployNode(node, config, lambdaRoleArn);
    results.push(result);
  }

  return NextResponse.json({ results });
}
