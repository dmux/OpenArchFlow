import type { AppNode, AppEdge } from "@/lib/store";
import type { DiscoveredResource, DiscoveredEdge } from "@/lib/aws/discovery";
import {
  getResourceDef,
  sanitizeResourceName,
} from "@/lib/iac/terraform/resource-map";

const SERVICE_TO_NODE_TYPE: Record<string, string> = {
  // Compute
  lambda: "aws-compute",
  ec2: "aws-compute",
  eks: "aws-compute",
  ecs: "aws-compute",
  fargate: "aws-compute",
  apprunner: "aws-compute",
  // Storage
  s3: "aws-storage",
  efs: "aws-storage",
  ebs: "aws-storage",
  glacier: "aws-storage",
  // Database
  dynamodb: "aws-database",
  rds: "aws-database",
  aurora: "aws-database",
  elasticache: "aws-database",
  // Messaging & Events
  sqs: "aws-integration",
  sns: "aws-integration",
  eventbridge: "aws-integration",
  kinesis: "aws-integration",
  msk: "aws-integration",
  stepfunctions: "aws-integration",
  // Security & Identity
  iam: "aws-security",
  kms: "aws-security",
  secretsmanager: "aws-security",
  cognitouserpool: "aws-security",
  waf: "aws-security",
  // Management
  cloudwatch: "aws-management",
  cloudtrail: "aws-management",
  ssm: "aws-management",
  systemsmanager: "aws-management",
  // Network
  vpc: "aws-network",
  apigateway: "aws-network",
  route53: "aws-network",
  elb: "aws-network",
  alb: "aws-network",
  nlb: "aws-network",
  elbv2: "aws-network",
  cloudfront: "aws-network",
};

const BAND_ORDER = [
  "aws-compute",
  "aws-storage",
  "aws-database",
  "aws-integration",
  "aws-security",
  "aws-management",
  "aws-network",
];

const BAND_WIDTH = 320;
const NODE_HEIGHT_SLOT = 110;
const NODE_GAP = 20;

export interface ConvertResult {
  nodes: AppNode[];
  edges: AppEdge[];
}

export function convertResourcesToNodesAndEdges(
  resources: DiscoveredResource[],
  discoveredEdges: DiscoveredEdge[],
  options?: { originX?: number; originY?: number }
): ConvertResult {
  const originX = options?.originX ?? 100;
  const originY = options?.originY ?? 100;

  // Map from DiscoveredResource.id → ReactFlow node ID
  const resourceIdToNodeId = new Map<string, string>();

  const bandCounts = new Map<string, number>();

  const nodes: AppNode[] = resources.map((resource) => {
    const nodeType = SERVICE_TO_NODE_TYPE[resource.service] ?? "aws-compute";
    const bandIndex = BAND_ORDER.indexOf(nodeType);
    const xBand = bandIndex >= 0 ? bandIndex : BAND_ORDER.length;

    const countInBand = bandCounts.get(nodeType) ?? 0;
    bandCounts.set(nodeType, countInBand + 1);

    const x = originX + xBand * (BAND_WIDTH + NODE_GAP * 2);
    const y = originY + countInBand * (NODE_HEIGHT_SLOT + NODE_GAP);

    const def = getResourceDef(resource.service);
    const resourceName = sanitizeResourceName(resource.name);
    const nodeId = crypto.randomUUID();

    resourceIdToNodeId.set(resource.id, nodeId);

    const node: AppNode = {
      id: nodeId,
      type: nodeType,
      position: { x, y },
      data: {
        label: resource.name,
        service: resource.service,
        type: nodeType,
        metadata: resource.metadata
          ? { ...resource.metadata, arn: resource.arn, region: resource.region }
          : { arn: resource.arn, region: resource.region },
        iacConfig: def
          ? {
              terraform: {
                resourceType: def.resource,
                resourceName,
              },
            }
          : undefined,
      },
    };

    return node;
  });

  // Convert discovered edges to ReactFlow edges using the node ID map
  const edges: AppEdge[] = [];
  for (const de of discoveredEdges) {
    const source = resourceIdToNodeId.get(de.sourceId);
    const target = resourceIdToNodeId.get(de.targetId);
    if (!source || !target) continue;
    edges.push({
      id: crypto.randomUUID(),
      source,
      target,
      label: de.label,
      data: {},
    } as AppEdge);
  }

  return { nodes, edges };
}
