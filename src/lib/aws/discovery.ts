import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import {
  SQSClient,
  ListQueuesCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import {
  DynamoDBClient,
  ListTablesCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import {
  LambdaClient,
  ListFunctionsCommand,
  ListEventSourceMappingsCommand,
} from "@aws-sdk/client-lambda";
import {
  SNSClient,
  ListTopicsCommand,
  ListSubscriptionsCommand,
} from "@aws-sdk/client-sns";
import {
  EventBridgeClient,
  ListEventBusesCommand,
  ListRulesCommand,
  ListTargetsByRuleCommand,
} from "@aws-sdk/client-eventbridge";
import { KinesisClient, ListStreamsCommand } from "@aws-sdk/client-kinesis";
import { IAMClient, ListRolesCommand } from "@aws-sdk/client-iam";
import { KMSClient, ListKeysCommand } from "@aws-sdk/client-kms";
import {
  SecretsManagerClient,
  ListSecretsCommand,
} from "@aws-sdk/client-secrets-manager";
import { SSMClient, DescribeParametersCommand } from "@aws-sdk/client-ssm";
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  APIGatewayClient,
  GetRestApisCommand,
  GetResourcesCommand,
  GetIntegrationCommand,
} from "@aws-sdk/client-api-gateway";
import { resolveEndpoint } from "@/lib/ministack/client";

export interface DiscoveryConfig {
  source: "ministack" | "aws";
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface DiscoveredResource {
  id: string;
  name: string;
  service: string;
  arn?: string;
  region: string;
  metadata?: Record<string, unknown>;
}

export interface DiscoveredService {
  service: string;
  label: string;
  resources: DiscoveredResource[];
  error?: string;
}

export interface DiscoveredEdge {
  id: string;
  sourceId: string; // DiscoveredResource.id
  targetId: string; // DiscoveredResource.id
  label?: string;
}

export interface DiscoveryResult {
  services: DiscoveredService[];
  edges: DiscoveredEdge[];
}

function buildClientConfig(cfg: DiscoveryConfig) {
  const base = {
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      ...(cfg.sessionToken ? { sessionToken: cfg.sessionToken } : {}),
    },
  };
  if (cfg.endpoint) {
    return { ...base, endpoint: resolveEndpoint(cfg.endpoint), forcePathStyle: true };
  }
  return base;
}

// Extracts the last segment of an ARN as a name
function arnToName(arn: string): string {
  return arn.split(":").pop() ?? arn;
}

async function listS3(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new S3Client(buildClientConfig(cfg));
  const res = await client.send(new ListBucketsCommand({}));
  return (res.Buckets ?? []).map((b) => ({
    id: `s3::${b.Name}`,
    name: b.Name ?? "unnamed",
    service: "s3",
    arn: `arn:aws:s3:::${b.Name}`,
    region: cfg.region,
    metadata: { creationDate: b.CreationDate?.toISOString() },
  }));
}

async function listSQS(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new SQSClient(buildClientConfig(cfg));
  const res = await client.send(new ListQueuesCommand({ MaxResults: 100 }));
  const urls = res.QueueUrls ?? [];

  const resources = await Promise.all(
    urls.map(async (url) => {
      const name = url.split("/").pop() ?? url;
      let attrs: Record<string, unknown> = { queueUrl: url };
      try {
        const attrRes = await client.send(
          new GetQueueAttributesCommand({
            QueueUrl: url,
            AttributeNames: [
              "VisibilityTimeout",
              "MessageRetentionPeriod",
              "ReceiveMessageWaitTimeSeconds",
              "RedrivePolicy",
              "QueueArn",
            ],
          })
        );
        attrs = { ...attrs, ...attrRes.Attributes };
      } catch {
        // attributes optional
      }
      return {
        id: `sqs::${name}`,
        name,
        service: "sqs",
        arn: attrs["QueueArn"] as string | undefined,
        region: cfg.region,
        metadata: attrs,
      };
    })
  );
  return resources;
}

async function listDynamoDB(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new DynamoDBClient(buildClientConfig(cfg));
  const res = await client.send(new ListTablesCommand({ Limit: 100 }));
  const accountId = cfg.source === "ministack" ? "000000000000" : "";

  const resources = await Promise.all(
    (res.TableNames ?? []).map(async (name) => {
      let metadata: Record<string, unknown> = {};
      try {
        const desc = await client.send(new DescribeTableCommand({ TableName: name }));
        const t = desc.Table;
        metadata = {
          billingMode: t?.BillingModeSummary?.BillingMode ?? "PROVISIONED",
          itemCount: t?.ItemCount,
          sizeBytes: t?.TableSizeBytes,
          keySchema: t?.KeySchema?.map((k) => `${k.AttributeName} (${k.KeyType})`).join(", "),
          streamEnabled: t?.StreamSpecification?.StreamEnabled ?? false,
          streamArn: t?.LatestStreamArn,
        };
      } catch {
        // describe optional
      }
      return {
        id: `dynamodb::${name}`,
        name,
        service: "dynamodb",
        arn: `arn:aws:dynamodb:${cfg.region}:${accountId}:table/${name}`,
        region: cfg.region,
        metadata,
      };
    })
  );
  return resources;
}

async function listLambda(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new LambdaClient(buildClientConfig(cfg));
  const res = await client.send(new ListFunctionsCommand({ MaxItems: 100 }));
  return (res.Functions ?? []).map((fn) => ({
    id: `lambda::${fn.FunctionName}`,
    name: fn.FunctionName ?? "unnamed",
    service: "lambda",
    arn: fn.FunctionArn,
    region: cfg.region,
    metadata: {
      runtime: fn.Runtime,
      handler: fn.Handler,
      memorySize: fn.MemorySize,
      timeout: fn.Timeout,
      description: fn.Description,
      lastModified: fn.LastModified,
      role: fn.Role,
    },
  }));
}

async function listSNS(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new SNSClient(buildClientConfig(cfg));
  const res = await client.send(new ListTopicsCommand({}));
  return (res.Topics ?? []).map((t) => {
    const arn = t.TopicArn ?? "";
    const name = arnToName(arn);
    return {
      id: `sns::${name}`,
      name,
      service: "sns",
      arn,
      region: cfg.region,
    };
  });
}

async function listEventBridge(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new EventBridgeClient(buildClientConfig(cfg));
  const res = await client.send(new ListEventBusesCommand({ Limit: 100 }));
  return (res.EventBuses ?? []).map((bus) => ({
    id: `eventbridge::${bus.Name}`,
    name: bus.Name ?? "unnamed",
    service: "eventbridge",
    arn: bus.Arn,
    region: cfg.region,
  }));
}

async function listKinesis(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new KinesisClient(buildClientConfig(cfg));
  const res = await client.send(new ListStreamsCommand({ Limit: 100 }));
  return (res.StreamNames ?? []).map((name) => ({
    id: `kinesis::${name}`,
    name,
    service: "kinesis",
    region: cfg.region,
  }));
}

async function listIAM(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new IAMClient(buildClientConfig(cfg));
  const res = await client.send(new ListRolesCommand({ MaxItems: 50 }));
  return (res.Roles ?? []).map((role) => ({
    id: `iam::${role.RoleName}`,
    name: role.RoleName ?? "unnamed",
    service: "iam",
    arn: role.Arn,
    region: cfg.region,
    metadata: { path: role.Path, description: role.Description },
  }));
}

async function listKMS(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new KMSClient(buildClientConfig(cfg));
  const res = await client.send(new ListKeysCommand({ Limit: 100 }));
  return (res.Keys ?? []).map((key) => ({
    id: `kms::${key.KeyId}`,
    name: key.KeyId ?? "unnamed",
    service: "kms",
    arn: key.KeyArn,
    region: cfg.region,
  }));
}

async function listSecretsManager(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new SecretsManagerClient(buildClientConfig(cfg));
  const res = await client.send(new ListSecretsCommand({ MaxResults: 100 }));
  return (res.SecretList ?? []).map((s) => ({
    id: `secretsmanager::${s.Name}`,
    name: s.Name ?? "unnamed",
    service: "secretsmanager",
    arn: s.ARN,
    region: cfg.region,
  }));
}

async function listSSM(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new SSMClient(buildClientConfig(cfg));
  const res = await client.send(new DescribeParametersCommand({ MaxResults: 20 }));
  return (res.Parameters ?? []).map((p) => ({
    id: `ssm::${p.Name}`,
    name: p.Name ?? "unnamed",
    service: "ssm",
    region: cfg.region,
    metadata: { type: p.Type, dataType: p.DataType },
  }));
}

async function listCloudWatchLogs(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new CloudWatchLogsClient(buildClientConfig(cfg));
  const res = await client.send(new DescribeLogGroupsCommand({ limit: 50 }));
  return (res.logGroups ?? []).map((lg) => ({
    id: `cloudwatch::${lg.logGroupName}`,
    name: lg.logGroupName ?? "unnamed",
    service: "cloudwatch",
    arn: lg.arn,
    region: cfg.region,
    metadata: {
      retentionDays: lg.retentionInDays,
      storedBytes: lg.storedBytes,
    },
  }));
}

async function listAPIGateway(cfg: DiscoveryConfig): Promise<DiscoveredResource[]> {
  const client = new APIGatewayClient(buildClientConfig(cfg));
  const res = await client.send(new GetRestApisCommand({ limit: 100 }));
  return (res.items ?? []).map((api) => ({
    id: `apigateway::${api.name}`,
    name: api.name ?? "unnamed",
    service: "apigateway",
    region: cfg.region,
    metadata: {
      apiId: api.id,
      description: api.description,
      endpointType: api.endpointConfiguration?.types?.join(", "),
      createdDate: api.createdDate?.toISOString(),
    },
  }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Relationship discovery
// ──────────────────────────────────────────────────────────────────────────────

// Builds a map from ARN fragment (last colon-segment) → resource ID
function buildArnIndex(services: DiscoveredService[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const svc of services) {
    for (const r of svc.resources) {
      if (r.arn) {
        index.set(r.arn, r.id);
        // Also index by last segment of ARN for partial matches
        const fragment = arnToName(r.arn);
        if (fragment !== r.arn) index.set(fragment, r.id);
      }
      // Index by name directly
      index.set(r.id, r.id);
      index.set(r.name, r.id);
    }
  }
  return index;
}

// Tries to resolve an ARN to a known resource ID via the index
function resolveArn(arn: string, index: Map<string, string>): string | null {
  if (index.has(arn)) return index.get(arn)!;
  const fragment = arnToName(arn);
  if (index.has(fragment)) return index.get(fragment)!;
  return null;
}

async function discoverLambdaEventSources(
  cfg: DiscoveryConfig,
  index: Map<string, string>
): Promise<DiscoveredEdge[]> {
  const client = new LambdaClient(buildClientConfig(cfg));
  const res = await client.send(new ListEventSourceMappingsCommand({}));
  const edges: DiscoveredEdge[] = [];

  for (const mapping of res.EventSourceMappings ?? []) {
    const functionArn = mapping.FunctionArn;
    const sourceArn = mapping.EventSourceArn;
    if (!functionArn || !sourceArn) continue;

    const targetId = resolveArn(functionArn, index);
    const sourceId = resolveArn(sourceArn, index);
    if (!sourceId || !targetId) continue;

    edges.push({
      id: `esm::${sourceId}→${targetId}`,
      sourceId,
      targetId,
      label: "triggers",
    });
  }
  return edges;
}

async function discoverSNSSubscriptions(
  cfg: DiscoveryConfig,
  index: Map<string, string>
): Promise<DiscoveredEdge[]> {
  const client = new SNSClient(buildClientConfig(cfg));
  const res = await client.send(new ListSubscriptionsCommand({}));
  const edges: DiscoveredEdge[] = [];

  for (const sub of res.Subscriptions ?? []) {
    const topicArn = sub.TopicArn;
    const endpoint = sub.Endpoint;
    const protocol = sub.Protocol;
    if (!topicArn || !endpoint || !protocol) continue;
    if (!["lambda", "sqs"].includes(protocol)) continue;

    const sourceId = resolveArn(topicArn, index);
    const targetId = resolveArn(endpoint, index);
    if (!sourceId || !targetId) continue;

    edges.push({
      id: `sns-sub::${sourceId}→${targetId}`,
      sourceId,
      targetId,
      label: protocol,
    });
  }
  return edges;
}

async function discoverEventBridgeTargets(
  cfg: DiscoveryConfig,
  services: DiscoveredService[],
  index: Map<string, string>
): Promise<DiscoveredEdge[]> {
  const client = new EventBridgeClient(buildClientConfig(cfg));
  const edges: DiscoveredEdge[] = [];

  const buses = services
    .find((s) => s.service === "eventbridge")
    ?.resources.map((r) => r.name) ?? [];

  for (const busName of buses) {
    let rulesRes;
    try {
      rulesRes = await client.send(
        new ListRulesCommand({ EventBusName: busName, Limit: 50 })
      );
    } catch {
      continue;
    }

    for (const rule of rulesRes.Rules ?? []) {
      if (!rule.Name) continue;
      const sourceId = index.get(`eventbridge::${busName}`);
      if (!sourceId) continue;

      let targetsRes;
      try {
        targetsRes = await client.send(
          new ListTargetsByRuleCommand({
            Rule: rule.Name,
            EventBusName: busName,
            Limit: 50,
          })
        );
      } catch {
        continue;
      }

      for (const target of targetsRes.Targets ?? []) {
        if (!target.Arn) continue;
        const targetId = resolveArn(target.Arn, index);
        if (!targetId) continue;

        edges.push({
          id: `eb-rule::${rule.Name}→${targetId}`,
          sourceId,
          targetId,
          label: rule.Name,
        });
      }
    }
  }
  return edges;
}

async function discoverAPIGatewayLambda(
  cfg: DiscoveryConfig,
  services: DiscoveredService[],
  index: Map<string, string>
): Promise<DiscoveredEdge[]> {
  const client = new APIGatewayClient(buildClientConfig(cfg));
  const edges: DiscoveredEdge[] = [];

  const apis = services.find((s) => s.service === "apigateway")?.resources ?? [];

  for (const api of apis) {
    const apiId = api.metadata?.apiId as string | undefined;
    if (!apiId) continue;

    let resourcesRes;
    try {
      resourcesRes = await client.send(
        new GetResourcesCommand({ restApiId: apiId, limit: 50 })
      );
    } catch {
      continue;
    }

    for (const resource of resourcesRes.items ?? []) {
      for (const method of Object.keys(resource.resourceMethods ?? {})) {
        if (method === "OPTIONS") continue;
        try {
          const integration = await client.send(
            new GetIntegrationCommand({
              restApiId: apiId,
              resourceId: resource.id!,
              httpMethod: method,
            })
          );
          const uri = integration.uri ?? "";
          // Lambda integration URIs contain the function ARN
          const arnMatch = uri.match(/arn:aws[^:]*:lambda:[^:]+:[^:]+:function:[^/]+/);
          if (!arnMatch) continue;
          const targetId = resolveArn(arnMatch[0], index);
          if (!targetId) continue;

          const edgeId = `apig::${api.id}→${targetId}`;
          if (!edges.find((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              sourceId: api.id,
              targetId,
              label: method,
            });
          }
        } catch {
          // integration fetch failed; skip
        }
      }
    }
  }
  return edges;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main exports
// ──────────────────────────────────────────────────────────────────────────────

const SERVICE_LISTERS: Array<{
  service: string;
  label: string;
  fn: (cfg: DiscoveryConfig) => Promise<DiscoveredResource[]>;
}> = [
  { service: "s3", label: "S3 Buckets", fn: listS3 },
  { service: "sqs", label: "SQS Queues", fn: listSQS },
  { service: "dynamodb", label: "DynamoDB Tables", fn: listDynamoDB },
  { service: "lambda", label: "Lambda Functions", fn: listLambda },
  { service: "sns", label: "SNS Topics", fn: listSNS },
  { service: "eventbridge", label: "EventBridge Buses", fn: listEventBridge },
  { service: "kinesis", label: "Kinesis Streams", fn: listKinesis },
  { service: "iam", label: "IAM Roles", fn: listIAM },
  { service: "kms", label: "KMS Keys", fn: listKMS },
  { service: "secretsmanager", label: "Secrets Manager", fn: listSecretsManager },
  { service: "ssm", label: "SSM Parameters", fn: listSSM },
  { service: "cloudwatch", label: "CloudWatch Log Groups", fn: listCloudWatchLogs },
  { service: "apigateway", label: "API Gateway REST APIs", fn: listAPIGateway },
];

export async function discoverInfrastructure(
  cfg: DiscoveryConfig,
  signal?: AbortSignal
): Promise<DiscoveryResult> {
  void signal;

  // Phase 1: list all resources in parallel, tolerating partial failures
  const listResults = await Promise.allSettled(
    SERVICE_LISTERS.map(async ({ service, label, fn }) => {
      try {
        const resources = await fn(cfg);
        return { service, label, resources } satisfies DiscoveredService;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { service, label, resources: [], error: message } satisfies DiscoveredService;
      }
    })
  );

  const services: DiscoveredService[] = listResults.map((result) => {
    if (result.status === "fulfilled") return result.value;
    return {
      service: "unknown",
      label: "Unknown",
      resources: [],
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  // Phase 2: discover relationships using the resource index
  const arnIndex = buildArnIndex(services);

  const edgeResults = await Promise.allSettled([
    discoverLambdaEventSources(cfg, arnIndex),
    discoverSNSSubscriptions(cfg, arnIndex),
    discoverEventBridgeTargets(cfg, services, arnIndex),
    discoverAPIGatewayLambda(cfg, services, arnIndex),
  ]);

  const edges: DiscoveredEdge[] = edgeResults
    .filter((r): r is PromiseFulfilledResult<DiscoveredEdge[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return { services, edges };
}
