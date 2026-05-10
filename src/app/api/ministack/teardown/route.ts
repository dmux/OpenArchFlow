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
import type { MiniStackConfig, MiniStackNodeState } from "@/lib/ministack/types";

import {
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { DeleteQueueCommand, GetQueueUrlCommand } from "@aws-sdk/client-sqs";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { DeleteFunctionCommand } from "@aws-sdk/client-lambda";
import { DeleteTopicCommand } from "@aws-sdk/client-sns";
import { DeleteEventBusCommand } from "@aws-sdk/client-eventbridge";
import { DeleteStreamCommand } from "@aws-sdk/client-kinesis";
import { DeleteRoleCommand } from "@aws-sdk/client-iam";
import { DeleteSecretCommand } from "@aws-sdk/client-secrets-manager";
import { DeleteParameterCommand } from "@aws-sdk/client-ssm";
import { ScheduleKeyDeletionCommand } from "@aws-sdk/client-kms";
import { DeleteRestApiCommand } from "@aws-sdk/client-api-gateway";

interface TeardownNode {
  nodeId: string;
  service: string;
  ministack: MiniStackNodeState;
}

interface TeardownBody {
  nodes: TeardownNode[];
  config: MiniStackConfig;
}

interface TeardownResult {
  nodeId: string;
  resourceId: string;
  ok: boolean;
  error?: string;
}

async function teardownNode(
  node: TeardownNode,
  config: MiniStackConfig,
): Promise<TeardownResult> {
  const { nodeId, service, ministack } = node;
  const resourceId = ministack.resourceId ?? "";

  if (!resourceId) {
    return { nodeId, resourceId: "", ok: true };
  }

  const svc = service.toLowerCase().replace(/_/g, "-");

  try {
    switch (svc) {
      case "s3": {
        const s3 = getS3Client(config);
        // Must empty bucket before deleting
        const listed = await s3.send(
          new ListObjectsV2Command({ Bucket: resourceId }),
        );
        if (listed.Contents && listed.Contents.length > 0) {
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: resourceId,
              Delete: {
                Objects: listed.Contents.map((o) => ({ Key: o.Key! })),
              },
            }),
          );
        }
        await s3.send(new DeleteBucketCommand({ Bucket: resourceId }));
        break;
      }

      case "sqs": {
        const sqs = getSQSClient(config);
        const queueUrl =
          ministack.endpoint ??
          `${config.endpoint}/000000000000/${resourceId}`;
        await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
        break;
      }

      case "dynamodb": {
        const db = getDynamoDBClient(config);
        await db.send(new DeleteTableCommand({ TableName: resourceId }));
        break;
      }

      case "lambda": {
        const lambda = getLambdaClient(config);
        await lambda.send(new DeleteFunctionCommand({ FunctionName: resourceId }));
        break;
      }

      case "sns": {
        const sns = getSNSClient(config);
        const topicArn =
          ministack.resourceArn ??
          `arn:aws:sns:${config.region}:${config.accountId}:${resourceId}`;
        await sns.send(new DeleteTopicCommand({ TopicArn: topicArn }));
        break;
      }

      case "eventbridge": {
        const eb = getEventBridgeClient(config);
        await eb.send(new DeleteEventBusCommand({ Name: resourceId }));
        break;
      }

      case "kinesis": {
        const kinesis = getKinesisClient(config);
        await kinesis.send(new DeleteStreamCommand({ StreamName: resourceId }));
        break;
      }

      case "iam": {
        const iam = getIAMClient(config);
        await iam.send(new DeleteRoleCommand({ RoleName: resourceId }));
        break;
      }

      case "secrets-manager":
      case "secretsmanager": {
        const sm = getSecretsManagerClient(config);
        await sm.send(
          new DeleteSecretCommand({
            SecretId: ministack.resourceArn ?? resourceId,
            ForceDeleteWithoutRecovery: true,
          }),
        );
        break;
      }

      case "ssm": {
        const ssm = getSSMClient(config);
        // resourceId for SSM is the parameter name (e.g. /my-param)
        await ssm.send(new DeleteParameterCommand({ Name: resourceId }));
        break;
      }

      case "kms": {
        const kms = getKMSClient(config);
        // Schedule deletion (minimum 7 days in real AWS; MiniStack deletes immediately)
        await kms.send(
          new ScheduleKeyDeletionCommand({
            KeyId: resourceId,
            PendingWindowInDays: 7,
          }),
        );
        break;
      }

      case "apigateway":
      case "api-gateway": {
        const gw = getAPIGatewayClient(config);
        await gw.send(new DeleteRestApiCommand({ restApiId: resourceId }));
        break;
      }

      default:
        return { nodeId, resourceId, ok: true };
    }

    return { nodeId, resourceId, ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { nodeId, resourceId, ok: false, error };
  }
}

export async function POST(req: NextRequest) {
  let body: TeardownBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { nodes, config } = body;
  if (!nodes || !config) {
    return NextResponse.json({ error: "Missing nodes or config" }, { status: 400 });
  }

  const deployedNodes = nodes.filter(
    (n) => n.ministack?.status === "deployed" && n.ministack?.resourceId,
  );

  const results: TeardownResult[] = [];
  for (const node of deployedNodes) {
    const result = await teardownNode(node, config);
    results.push(result);
  }

  return NextResponse.json({ results });
}
