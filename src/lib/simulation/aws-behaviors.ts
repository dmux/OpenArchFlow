/**
 * AWS Service Behavior Profiles
 *
 * Each profile describes how a service routes requests, what latency
 * it introduces, and what limits/events it may trigger during simulation.
 */

export type RoutingMode =
  | "unicast" // forward to ONE next-hop (Lambda, EC2, ECS)
  | "fan-out" // forward to ALL downstream (SNS, EventBridge)
  | "queue" // accumulate; consume at a configured rate (SQS)
  | "round-robin" // cycle through targets (ALB, NLB)
  | "cache" // may short-circuit on cache-hit (CloudFront, ElastiCache)
  | "passthrough" // transparent relay (Client, Gateway mock)
  | "sink"; // terminal node — no forwarding (S3, DynamoDB write)

export interface ServiceBehaviorProfile {
  /** How the service routes to downstream nodes */
  routing: RoutingMode;
  /** Base latency range in ms [min, max] */
  latencyRange: [number, number];
  /** Whether a cold-start penalty applies (Lambda, ECS) */
  coldStart: boolean;
  /** Cold-start extra latency in ms [min, max] */
  coldStartLatency: [number, number];
  /** Max concurrent in-flight requests (undefined = unlimited) */
  concurrencyLimit?: number;
  /** Error that fires when concurrency limit is exceeded */
  throttleError?: string;
  /** Service-level cost model for live cost projection */
  cost: {
    unit:
      | "invocation"
      | "request"
      | "rcu"
      | "wcu"
      | "gb-hour"
      | "hour"
      | "none";
    pricePerUnit: number; // USD
    /** Invocations/requests per tick that count as one billable unit */
    unitsPerRequest: number;
  };
  /** Human-readable category for display */
  category:
    | "compute"
    | "network"
    | "database"
    | "storage"
    | "messaging"
    | "analytics"
    | "security"
    | "other";
}

const DEFAULT: ServiceBehaviorProfile = {
  routing: "unicast",
  latencyRange: [5, 30],
  coldStart: false,
  coldStartLatency: [0, 0],
  cost: { unit: "none", pricePerUnit: 0, unitsPerRequest: 1 },
  category: "other",
};

// ─── Service Profiles ────────────────────────────────────────────────────────

const PROFILES: Record<string, ServiceBehaviorProfile> = {
  // ── Compute ──────────────────────────────────────────────────────────────
  lambda: {
    routing: "unicast",
    latencyRange: [1, 50],
    coldStart: true,
    coldStartLatency: [100, 500],
    concurrencyLimit: 1000,
    throttleError: "TooManyRequestsException",
    cost: { unit: "invocation", pricePerUnit: 0.0000002, unitsPerRequest: 1 },
    category: "compute",
  },
  ec2: {
    routing: "unicast",
    latencyRange: [2, 20],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "hour", pricePerUnit: 0.023, unitsPerRequest: 1 },
    category: "compute",
  },
  ecs: {
    routing: "unicast",
    latencyRange: [3, 25],
    coldStart: true,
    coldStartLatency: [2000, 8000],
    concurrencyLimit: 500,
    throttleError: "ServiceUnavailableException",
    cost: { unit: "hour", pricePerUnit: 0.04048, unitsPerRequest: 1 },
    category: "compute",
  },
  fargate: {
    routing: "unicast",
    latencyRange: [3, 25],
    coldStart: true,
    coldStartLatency: [2000, 8000],
    concurrencyLimit: 500,
    throttleError: "ServiceUnavailableException",
    cost: { unit: "hour", pricePerUnit: 0.04048, unitsPerRequest: 1 },
    category: "compute",
  },

  // ── Network / Routing ─────────────────────────────────────────────────────
  "api gateway": {
    routing: "unicast",
    latencyRange: [1, 10],
    coldStart: false,
    coldStartLatency: [0, 0],
    concurrencyLimit: 10000,
    throttleError: "ThrottlingException",
    cost: { unit: "request", pricePerUnit: 0.0000035, unitsPerRequest: 1 },
    category: "network",
  },
  alb: {
    routing: "round-robin",
    latencyRange: [1, 5],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "hour", pricePerUnit: 0.008, unitsPerRequest: 1 },
    category: "network",
  },
  nlb: {
    routing: "round-robin",
    latencyRange: [0, 3],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "hour", pricePerUnit: 0.008, unitsPerRequest: 1 },
    category: "network",
  },
  cloudfront: {
    routing: "cache",
    latencyRange: [1, 15],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.0000012, unitsPerRequest: 1 },
    category: "network",
  },
  "route 53": {
    routing: "passthrough",
    latencyRange: [1, 5],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.0000004, unitsPerRequest: 1 },
    category: "network",
  },
  route53: {
    routing: "passthrough",
    latencyRange: [1, 5],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.0000004, unitsPerRequest: 1 },
    category: "network",
  },

  // ── Messaging ─────────────────────────────────────────────────────────────
  sns: {
    routing: "fan-out",
    latencyRange: [1, 10],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.0000005, unitsPerRequest: 1 },
    category: "messaging",
  },
  sqs: {
    routing: "queue",
    latencyRange: [1, 20],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.0000004, unitsPerRequest: 1 },
    category: "messaging",
  },
  eventbridge: {
    routing: "fan-out",
    latencyRange: [1, 15],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.000001, unitsPerRequest: 1 },
    category: "messaging",
  },
  kinesis: {
    routing: "queue",
    latencyRange: [5, 30],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "hour", pricePerUnit: 0.015, unitsPerRequest: 1 },
    category: "messaging",
  },
  "kinesis firehose": {
    routing: "sink",
    latencyRange: [60000, 300000], // buffering latency 1-5 min
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "gb-hour", pricePerUnit: 0.029, unitsPerRequest: 1 },
    category: "messaging",
  },

  // ── Database ──────────────────────────────────────────────────────────────
  dynamodb: {
    routing: "sink",
    latencyRange: [1, 10],
    coldStart: false,
    coldStartLatency: [0, 0],
    concurrencyLimit: 40000, // WCU default limit
    throttleError: "ProvisionedThroughputExceededException",
    cost: { unit: "wcu", pricePerUnit: 0.00000125, unitsPerRequest: 1 },
    category: "database",
  },
  rds: {
    routing: "unicast",
    latencyRange: [2, 30],
    coldStart: false,
    coldStartLatency: [0, 0],
    concurrencyLimit: 100, // typical max_connections
    throttleError: "TooManyConnectionsException",
    cost: { unit: "hour", pricePerUnit: 0.082, unitsPerRequest: 1 },
    category: "database",
  },
  aurora: {
    routing: "unicast",
    latencyRange: [1, 15],
    coldStart: true,
    coldStartLatency: [500, 2000], // Aurora Serverless cold start
    concurrencyLimit: 1000,
    throttleError: "TooManyConnectionsException",
    cost: { unit: "hour", pricePerUnit: 0.1, unitsPerRequest: 1 },
    category: "database",
  },
  elasticache: {
    routing: "cache",
    latencyRange: [0, 2],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "hour", pricePerUnit: 0.068, unitsPerRequest: 1 },
    category: "database",
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  s3: {
    routing: "sink",
    latencyRange: [10, 80],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.000005, unitsPerRequest: 1 },
    category: "storage",
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  glue: {
    routing: "unicast",
    latencyRange: [5000, 60000], // ETL job latency
    coldStart: true,
    coldStartLatency: [10000, 30000],
    cost: { unit: "hour", pricePerUnit: 0.44, unitsPerRequest: 1 },
    category: "analytics",
  },
  athena: {
    routing: "sink",
    latencyRange: [1000, 10000],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "gb-hour", pricePerUnit: 0.005, unitsPerRequest: 1 },
    category: "analytics",
  },
  quicksight: {
    routing: "sink",
    latencyRange: [200, 2000],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "none", pricePerUnit: 0, unitsPerRequest: 1 },
    category: "analytics",
  },
  sagemaker: {
    routing: "unicast",
    latencyRange: [50, 300],
    coldStart: true,
    coldStartLatency: [5000, 20000],
    concurrencyLimit: 100,
    throttleError: "ModelError",
    cost: { unit: "hour", pricePerUnit: 0.269, unitsPerRequest: 1 },
    category: "analytics",
  },

  // ── Security ──────────────────────────────────────────────────────────────
  cognito: {
    routing: "passthrough",
    latencyRange: [20, 100],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.000055, unitsPerRequest: 1 },
    category: "security",
  },
  "secrets manager": {
    routing: "passthrough",
    latencyRange: [5, 30],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "request", pricePerUnit: 0.00005, unitsPerRequest: 1 },
    category: "security",
  },
  "certificate manager": {
    routing: "passthrough",
    latencyRange: [1, 5],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "none", pricePerUnit: 0, unitsPerRequest: 1 },
    category: "security",
  },

  // ── Generic / Client ──────────────────────────────────────────────────────
  client: {
    routing: "passthrough",
    latencyRange: [0, 0],
    coldStart: false,
    coldStartLatency: [0, 0],
    cost: { unit: "none", pricePerUnit: 0, unitsPerRequest: 1 },
    category: "other",
  },
};

/**
 * Returns the behavior profile for a service name.
 * Normalises to lowercase for lookup; falls back to DEFAULT.
 */
export function getServiceBehavior(service: string): ServiceBehaviorProfile {
  const key = service?.toLowerCase().trim() ?? "";
  return PROFILES[key] ?? DEFAULT;
}

/** Sample latency in ms from [min, max] range */
export function sampleLatency(range: [number, number]): number {
  const [min, max] = range;
  return Math.floor(min + Math.random() * (max - min));
}
