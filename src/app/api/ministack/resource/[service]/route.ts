import { NextRequest, NextResponse } from "next/server";
import {
  getS3Client,
  getSQSClient,
  getDynamoDBClient,
  getLambdaClient,
  getSNSClient,
  getEventBridgeClient,
  getAPIGatewayClient,
} from "@/lib/ministack/client";
import type { MiniStackConfig } from "@/lib/ministack/types";

// ── S3 ─────────────────────────────────────────────────────────────────────
import {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// ── SQS ────────────────────────────────────────────────────────────────────
import {
  GetQueueAttributesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

// ── DynamoDB ───────────────────────────────────────────────────────────────
import {
  DescribeTableCommand,
  ScanCommand,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

// ── Lambda ─────────────────────────────────────────────────────────────────
import {
  GetFunctionCommand,
  InvokeCommand,
  ListFunctionsCommand,
  UpdateFunctionCodeCommand,
} from "@aws-sdk/client-lambda";

// ── SNS ────────────────────────────────────────────────────────────────────
import {
  GetTopicAttributesCommand,
  ListSubscriptionsByTopicCommand,
  PublishCommand,
  SubscribeCommand,
} from "@aws-sdk/client-sns";

// ── EventBridge ────────────────────────────────────────────────────────────
import {
  DescribeEventBusCommand,
  ListRulesCommand,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

// ── API Gateway ────────────────────────────────────────────────────────────
import {
  GetResourcesCommand,
  GetStagesCommand,
  CreateResourceCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  CreateDeploymentCommand,
} from "@aws-sdk/client-api-gateway";

function parseConfig(req: NextRequest): MiniStackConfig | null {
  const raw = req.nextUrl.searchParams.get("config");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ service: string }> },
) {
  const { service } = await params;
  const config = parseConfig(req);
  if (!config) return NextResponse.json({ error: "Missing config" }, { status: 400 });

  const resourceId = req.nextUrl.searchParams.get("resourceId") ?? "";

  try {
    switch (service) {
      // ── S3 ──────────────────────────────────────────────────────────────
      case "s3": {
        const s3 = getS3Client(config);
        const res = await s3.send(
          new ListObjectsV2Command({ Bucket: resourceId, MaxKeys: 200 }),
        );
        return NextResponse.json({
          objects: (res.Contents ?? []).map((o) => ({
            key: o.Key,
            size: o.Size,
            lastModified: o.LastModified,
          })),
          count: res.KeyCount ?? 0,
        });
      }

      // ── SQS ─────────────────────────────────────────────────────────────
      case "sqs": {
        const sqs = getSQSClient(config);
        const queueUrl =
          req.nextUrl.searchParams.get("endpoint") ??
          `${config.endpoint}/000000000000/${resourceId}`;
        const attrs = await sqs.send(
          new GetQueueAttributesCommand({
            QueueUrl: queueUrl,
            AttributeNames: [
              "ApproximateNumberOfMessages",
              "ApproximateNumberOfMessagesNotVisible",
              "QueueArn",
              "VisibilityTimeout",
            ],
          }),
        );
        const msgs = await sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
            VisibilityTimeout: 0,
            WaitTimeSeconds: 0,
          }),
        );
        return NextResponse.json({
          attributes: attrs.Attributes ?? {},
          messages: (msgs.Messages ?? []).map((m) => ({
            messageId: m.MessageId,
            body: m.Body,
            receiptHandle: m.ReceiptHandle,
          })),
        });
      }

      // ── DynamoDB ─────────────────────────────────────────────────────────
      case "dynamodb": {
        const db = getDynamoDBClient(config);
        const desc = await db.send(new DescribeTableCommand({ TableName: resourceId }));
        const scan = await db.send(
          new ScanCommand({ TableName: resourceId, Limit: 50 }),
        );
        return NextResponse.json({
          table: {
            itemCount: desc.Table?.ItemCount ?? 0,
            keySchema: desc.Table?.KeySchema ?? [],
            billingMode: desc.Table?.BillingModeSummary?.BillingMode ?? "PROVISIONED",
            status: desc.Table?.TableStatus,
          },
          items: scan.Items ?? [],
          count: scan.Count ?? 0,
        });
      }

      // ── Lambda ───────────────────────────────────────────────────────────
      case "lambda": {
        const lambda = getLambdaClient(config);
        const fn = await lambda.send(new GetFunctionCommand({ FunctionName: resourceId }));
        return NextResponse.json({
          config: {
            runtime: fn.Configuration?.Runtime,
            handler: fn.Configuration?.Handler,
            memorySize: fn.Configuration?.MemorySize,
            timeout: fn.Configuration?.Timeout,
            codeSize: fn.Configuration?.CodeSize,
            lastModified: fn.Configuration?.LastModified,
            state: fn.Configuration?.State,
          },
        });
      }

      // ── SNS ──────────────────────────────────────────────────────────────
      case "sns": {
        const sns = getSNSClient(config);
        const topicArn =
          req.nextUrl.searchParams.get("resourceArn") ??
          `arn:aws:sns:${config.region}:${config.accountId}:${resourceId}`;
        const [attrs, subs] = await Promise.all([
          sns.send(new GetTopicAttributesCommand({ TopicArn: topicArn })),
          sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })),
        ]);
        return NextResponse.json({
          attributes: attrs.Attributes ?? {},
          subscriptions: (subs.Subscriptions ?? []).map((s) => ({
            protocol: s.Protocol,
            endpoint: s.Endpoint,
            arn: s.SubscriptionArn,
          })),
        });
      }

      // ── EventBridge ──────────────────────────────────────────────────────
      case "eventbridge": {
        const eb = getEventBridgeClient(config);
        const [desc, rules] = await Promise.all([
          eb.send(new DescribeEventBusCommand({ Name: resourceId })),
          eb.send(new ListRulesCommand({ EventBusName: resourceId, Limit: 20 })),
        ]);
        return NextResponse.json({
          bus: { name: desc.Name, arn: desc.Arn },
          rules: (rules.Rules ?? []).map((r) => ({
            name: r.Name,
            state: r.State,
            pattern: r.EventPattern,
            scheduleExpression: r.ScheduleExpression,
          })),
        });
      }

      // ── API Gateway ──────────────────────────────────────────────────────
      case "apigateway": {
        const gw = getAPIGatewayClient(config);
        const [resources, stages] = await Promise.all([
          gw.send(new GetResourcesCommand({ restApiId: resourceId })),
          gw.send(new GetStagesCommand({ restApiId: resourceId })),
        ]);
        return NextResponse.json({
          resources: (resources.items ?? []).map((r) => ({
            id: r.id,
            path: r.path,
            methods: Object.keys(r.resourceMethods ?? {}),
          })),
          stages: (stages.item ?? []).map((s) => ({
            name: s.stageName,
            deploymentId: s.deploymentId,
          })),
        });
      }

      default:
        return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ service: string }> },
) {
  const { service } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = body.config as MiniStackConfig;
  if (!config) return NextResponse.json({ error: "Missing config" }, { status: 400 });

  try {
    switch (service) {
      // ── S3 PUT object ────────────────────────────────────────────────────
      case "s3": {
        const { bucket, key, content } = body as { bucket: string; key: string; content: string; config: MiniStackConfig };
        const s3 = getS3Client(config);
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: content }));
        return NextResponse.json({ ok: true });
      }

      // ── S3 DELETE object ─────────────────────────────────────────────────
      case "s3-delete": {
        const { bucket, key } = body as { bucket: string; key: string; config: MiniStackConfig };
        const s3 = getS3Client(config);
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        return NextResponse.json({ ok: true });
      }

      // ── SQS send message ─────────────────────────────────────────────────
      case "sqs": {
        const { queueUrl, messageBody } = body as { queueUrl: string; messageBody: string; config: MiniStackConfig };
        const sqs = getSQSClient(config);
        const res = await sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: messageBody }));
        return NextResponse.json({ messageId: res.MessageId });
      }

      // ── SQS delete message ───────────────────────────────────────────────
      case "sqs-delete": {
        const { queueUrl, receiptHandle } = body as { queueUrl: string; receiptHandle: string; config: MiniStackConfig };
        const sqs = getSQSClient(config);
        await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }));
        return NextResponse.json({ ok: true });
      }

      // ── DynamoDB put item ────────────────────────────────────────────────
      case "dynamodb": {
        const { tableName, item } = body as { tableName: string; item: Record<string, unknown>; config: MiniStackConfig };
        const db = getDynamoDBClient(config);
        await db.send(new PutItemCommand({ TableName: tableName, Item: item as any }));
        return NextResponse.json({ ok: true });
      }

      // ── DynamoDB delete item ─────────────────────────────────────────────
      case "dynamodb-delete": {
        const { tableName, key } = body as { tableName: string; key: Record<string, unknown>; config: MiniStackConfig };
        const db = getDynamoDBClient(config);
        await db.send(new DeleteItemCommand({ TableName: tableName, Key: key as any }));
        return NextResponse.json({ ok: true });
      }

      // ── Lambda invoke ────────────────────────────────────────────────────
      case "lambda": {
        const { functionName, payload } = body as { functionName: string; payload: string; config: MiniStackConfig };
        const lambda = getLambdaClient(config);
        const res = await lambda.send(
          new InvokeCommand({
            FunctionName: functionName,
            Payload: Buffer.from(payload || "{}"),
          }),
        );
        const responsePayload = res.Payload ? Buffer.from(res.Payload).toString("utf-8") : null;
        return NextResponse.json({
          statusCode: res.StatusCode,
          functionError: res.FunctionError,
          payload: responsePayload,
        });
      }

      // ── Lambda upload code ───────────────────────────────────────────────
      case "lambda-upload": {
        const { functionName, zipBase64 } = body as { functionName: string; zipBase64: string; config: MiniStackConfig };
        const lambda = getLambdaClient(config);
        const zipBuffer = Buffer.from(zipBase64, "base64");
        await lambda.send(new UpdateFunctionCodeCommand({ FunctionName: functionName, ZipFile: zipBuffer }));
        return NextResponse.json({ ok: true });
      }

      // ── SNS publish ──────────────────────────────────────────────────────
      case "sns": {
        const { topicArn, message, subject } = body as { topicArn: string; message: string; subject?: string; config: MiniStackConfig };
        const sns = getSNSClient(config);
        const res = await sns.send(new PublishCommand({ TopicArn: topicArn, Message: message, Subject: subject }));
        return NextResponse.json({ messageId: res.MessageId });
      }

      // ── SNS subscribe ────────────────────────────────────────────────────
      case "sns-subscribe": {
        const { topicArn, protocol, endpoint: ep } = body as { topicArn: string; protocol: string; endpoint: string; config: MiniStackConfig };
        const sns = getSNSClient(config);
        const res = await sns.send(new SubscribeCommand({ TopicArn: topicArn, Protocol: protocol, Endpoint: ep }));
        return NextResponse.json({ subscriptionArn: res.SubscriptionArn });
      }

      // ── EventBridge put events ───────────────────────────────────────────
      case "eventbridge": {
        const { busName, source, detailType, detail } = body as { busName: string; source: string; detailType: string; detail: string; config: MiniStackConfig };
        const eb = getEventBridgeClient(config);
        const res = await eb.send(
          new PutEventsCommand({
            Entries: [{ EventBusName: busName, Source: source, DetailType: detailType, Detail: detail }],
          }),
        );
        return NextResponse.json({ failedCount: res.FailedEntryCount, entries: res.Entries });
      }

      case "apigateway-route": {
        // Create a resource + method + integration and redeploy to "test" stage
        const { restApiId, method, path: routePath, lambdaFunctionName } = body as {
          restApiId: string;
          method: string;
          path: string;
          lambdaFunctionName?: string;
          config: MiniStackConfig;
        };
        const gw = getAPIGatewayClient(config);

        // Find root resource
        const existing = await gw.send(new GetResourcesCommand({ restApiId }));
        const root = (existing.items ?? []).find((r) => r.path === "/");
        if (!root?.id) return NextResponse.json({ error: "Root resource not found" }, { status: 400 });

        // Create path resource (root "/" reuses the existing root resource)
        const pathPart = (routePath.startsWith("/") ? routePath.slice(1) : routePath) || "";
        let resourceId: string;
        if (!pathPart) {
          resourceId = root.id;
        } else {
          const existingResource = (existing.items ?? []).find((r) => r.pathPart === pathPart);
          if (existingResource?.id) {
            resourceId = existingResource.id;
          } else {
            const created = await gw.send(new CreateResourceCommand({
              restApiId,
              parentId: root.id,
              pathPart,
            }));
            resourceId = created.id ?? "";
          }
        }

        // Create method
        try {
          await gw.send(new PutMethodCommand({
            restApiId,
            resourceId,
            httpMethod: method.toUpperCase(),
            authorizationType: "NONE",
          }));
        } catch { /* already exists */ }

        // Integration
        if (lambdaFunctionName) {
          const lambdaArn = `arn:aws:lambda:${config.region}:${config.accountId}:function:${lambdaFunctionName}`;
          const uri = `arn:aws:apigateway:${config.region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`;
          await gw.send(new PutIntegrationCommand({
            restApiId,
            resourceId,
            httpMethod: method.toUpperCase(),
            type: "AWS_PROXY",
            integrationHttpMethod: "POST",
            uri,
          }));
        } else {
          await gw.send(new PutIntegrationCommand({
            restApiId,
            resourceId,
            httpMethod: method.toUpperCase(),
            type: "MOCK",
            requestTemplates: { "application/json": '{"statusCode": 200}' },
          }));
        }

        // Redeploy to "test" stage
        await gw.send(new CreateDeploymentCommand({ restApiId, stageName: "test" }));

        return NextResponse.json({ ok: true, resourceId });
      }

      case "apigateway-invoke": {
        // Server-side proxy for API Gateway calls — browser can't call localhost:4566 directly (CORS)
        const { restApiId, method, path: invokePath, body: invokeBody } = body as {
          restApiId: string;
          method: string;
          path: string;
          body?: unknown;
          config: MiniStackConfig;
        };
        const normalizedPath = invokePath.startsWith("/") ? invokePath : `/${invokePath}`;
        const gwUrl = `${config.endpoint}/restapis/${restApiId}/test/_user_request_${normalizedPath}`;
        const httpMethod = (method ?? "GET").toUpperCase();
        const gwRes = await fetch(gwUrl, {
          method: httpMethod,
          headers: { "Content-Type": "application/json" },
          body: httpMethod !== "GET" && httpMethod !== "HEAD" && invokeBody !== undefined
            ? JSON.stringify(invokeBody)
            : undefined,
        });
        const responseText = await gwRes.text();
        let responseJson: unknown;
        try { responseJson = JSON.parse(responseText); } catch { responseJson = { body: responseText }; }
        return NextResponse.json({ status: gwRes.status, body: responseJson });
      }

      default:
        return NextResponse.json({ error: `Unknown service action: ${service}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
