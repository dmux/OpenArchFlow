import type { AppNode, AppEdge } from "@/lib/store";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  category: "AWS" | "Azure" | "Generic";
  /** Complexity rating: 1 = Beginner, 2 = Intermediate, 3 = Advanced */
  stars: 1 | 2 | 3;
  nodes: AppNode[];
  edges: AppEdge[];
}

function n(
  id: string,
  label: string,
  service: string,
  type: string,
  x: number,
  y: number,
  provider = "aws",
): AppNode {
  return {
    id,
    type: type as string,
    position: { x, y },
    data: { label, service, type, provider },
  } as AppNode;
}

function az(
  id: string,
  label: string,
  service: string,
  type: string,
  x: number,
  y: number,
): AppNode {
  return {
    id,
    type: type as string,
    position: { x, y },
    data: { label, service, type, provider: "azure" },
  } as AppNode;
}

function e(id: string, source: string, target: string, label = ""): AppEdge {
  return {
    id,
    source,
    target,
    label: label || undefined,
    type: "smoothstep",
  } as AppEdge;
}

// ── AWS Templates ─────────────────────────────────────────────────────────────

const threeTier: DiagramTemplate = {
  id: "aws-three-tier",
  name: "AWS Three-Tier Web App",
  description: "Classic presentation, application, and data tiers on AWS.",
  category: "AWS",
  stars: 2,
  nodes: [
    n("cf", "CloudFront CDN", "CloudFront", "aws-network", 300, 0),
    n("alb", "Load Balancer", "ALB", "aws-network", 300, 120),
    n("ec2a", "Web Server A", "EC2", "aws-compute", 100, 280),
    n("ec2b", "Web Server B", "EC2", "aws-compute", 500, 280),
    n("rds", "RDS MySQL", "RDS", "aws-database", 300, 440),
    n("s3", "Static Assets", "S3", "aws-storage", 600, 0),
  ],
  edges: [
    e("e1", "cf", "alb"),
    e("e2", "cf", "s3"),
    e("e3", "alb", "ec2a"),
    e("e4", "alb", "ec2b"),
    e("e5", "ec2a", "rds"),
    e("e6", "ec2b", "rds"),
  ],
};

const serverlessApi: DiagramTemplate = {
  id: "aws-serverless-api",
  name: "AWS Serverless API",
  description: "API Gateway + Lambda + DynamoDB serverless backend.",
  category: "AWS",
  stars: 2,
  nodes: [
    n("client", "Client App", "Client", "client", 300, 0),
    n("apigw", "API Gateway", "API Gateway", "aws-network", 300, 140),
    n("auth", "Cognito Auth", "Cognito", "aws-security", 0, 140),
    n("lambda", "Handler Lambda", "Lambda", "aws-compute", 300, 280),
    n("dynamo", "DynamoDB", "DynamoDB", "aws-database", 300, 420),
    n("s3", "File Storage", "S3", "aws-storage", 600, 280),
  ],
  edges: [
    e("e1", "client", "apigw"),
    e("e2", "auth", "apigw", "authorizer"),
    e("e3", "apigw", "lambda"),
    e("e4", "lambda", "dynamo"),
    e("e5", "lambda", "s3"),
  ],
};

const eventDriven: DiagramTemplate = {
  id: "aws-event-driven",
  name: "AWS Event-Driven Architecture",
  description: "SQS/SNS fan-out with Lambda processors and DLQ.",
  category: "AWS",
  stars: 3,
  nodes: [
    n("producer", "Event Producer", "Lambda", "aws-compute", 0, 140),
    n("sns", "SNS Topic", "SNS", "aws-integration", 220, 140),
    n("sqsA", "Orders Queue", "SQS", "aws-integration", 420, 0),
    n("sqsB", "Notifications Queue", "SQS", "aws-integration", 420, 280),
    n("dlq", "Dead Letter Queue", "SQS", "aws-integration", 660, 140),
    n("procA", "Order Processor", "Lambda", "aws-compute", 640, 0),
    n("procB", "Notification Sender", "Lambda", "aws-compute", 640, 280),
  ],
  edges: [
    e("e1", "producer", "sns"),
    e("e2", "sns", "sqsA"),
    e("e3", "sns", "sqsB"),
    e("e4", "sqsA", "procA"),
    e("e5", "sqsB", "procB"),
    e("e6", "procA", "dlq", "on failure"),
    e("e7", "procB", "dlq", "on failure"),
  ],
};

const microservices: DiagramTemplate = {
  id: "aws-microservices",
  name: "AWS Microservices",
  description: "ECS-based microservices with service discovery and RDS.",
  category: "AWS",
  stars: 3,
  nodes: [
    n("alb", "Application LB", "ALB", "aws-network", 250, 0),
    n("svcA", "Users Service", "ECS", "aws-containers", 0, 160),
    n("svcB", "Orders Service", "ECS", "aws-containers", 250, 160),
    n("svcC", "Payment Service", "ECS", "aws-containers", 500, 160),
    n("dbA", "Users DB", "RDS", "aws-database", 0, 340),
    n("dbB", "Orders DB", "RDS", "aws-database", 250, 340),
    n("cache", "ElastiCache", "ElastiCache", "aws-database", 500, 340),
  ],
  edges: [
    e("e1", "alb", "svcA"),
    e("e2", "alb", "svcB"),
    e("e3", "alb", "svcC"),
    e("e4", "svcA", "dbA"),
    e("e5", "svcB", "dbB"),
    e("e6", "svcC", "cache"),
    e("e7", "svcB", "svcC", "charge"),
  ],
};

const dataLake: DiagramTemplate = {
  id: "aws-data-lake",
  name: "AWS Data Lake",
  description: "S3 data lake with Glue ETL, Athena query, and QuickSight.",
  category: "AWS",
  stars: 3,
  nodes: [
    n(
      "ingestion",
      "Kinesis Firehose",
      "Kinesis Firehose",
      "aws-analytics",
      0,
      140,
    ),
    n("raw", "Raw Zone (S3)", "S3", "aws-storage", 240, 140),
    n("glue", "Glue ETL", "Glue", "aws-analytics", 480, 60),
    n("processed", "Processed Zone (S3)", "S3", "aws-storage", 480, 220),
    n("athena", "Athena", "Athena", "aws-analytics", 700, 140),
    n("qs", "QuickSight", "QuickSight", "aws-analytics", 900, 140),
  ],
  edges: [
    e("e1", "ingestion", "raw"),
    e("e2", "raw", "glue"),
    e("e3", "glue", "processed"),
    e("e4", "processed", "athena"),
    e("e5", "athena", "qs"),
  ],
};

// ── Generic Templates ─────────────────────────────────────────────────────────

const flowchart: DiagramTemplate = {
  id: "generic-flowchart",
  name: "Basic Flowchart",
  description: "Simple start → process → decision → end flow.",
  category: "Generic",
  stars: 1,
  nodes: [
    {
      id: "start",
      type: "generic",
      position: { x: 200, y: 0 },
      data: {
        label: "Start",
        service: "Generic",
        type: "generic",
        metadata: {
          shape: "circle",
          backgroundColor: "#d1fae5",
          borderColor: "#10b981",
        },
      },
    } as AppNode,
    {
      id: "proc1",
      type: "generic",
      position: { x: 200, y: 120 },
      data: { label: "Process Data", service: "Generic", type: "generic" },
    } as AppNode,
    {
      id: "dec",
      type: "generic",
      position: { x: 200, y: 260 },
      data: {
        label: "Valid?",
        service: "Generic",
        type: "generic",
        metadata: {
          shape: "diamond",
          backgroundColor: "#fef3c7",
          borderColor: "#f59e0b",
        },
      },
    } as AppNode,
    {
      id: "ok",
      type: "generic",
      position: { x: 400, y: 380 },
      data: { label: "Save Result", service: "Generic", type: "generic" },
    } as AppNode,
    {
      id: "err",
      type: "generic",
      position: { x: 0, y: 380 },
      data: {
        label: "Handle Error",
        service: "Generic",
        type: "generic",
        metadata: { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
      },
    } as AppNode,
    {
      id: "end",
      type: "generic",
      position: { x: 200, y: 500 },
      data: {
        label: "End",
        service: "Generic",
        type: "generic",
        metadata: {
          shape: "circle",
          backgroundColor: "#dbeafe",
          borderColor: "#3b82f6",
        },
      },
    } as AppNode,
  ],
  edges: [
    e("e1", "start", "proc1"),
    e("e2", "proc1", "dec"),
    e("e3", "dec", "ok", "Yes"),
    e("e4", "dec", "err", "No"),
    e("e5", "ok", "end"),
    e("e6", "err", "end"),
  ],
};

const cicd: DiagramTemplate = {
  id: "generic-cicd",
  name: "CI/CD Pipeline",
  description: "Developer push → build → test → deploy pipeline.",
  category: "Generic",
  stars: 2,
  nodes: [
    {
      id: "dev",
      type: "generic",
      position: { x: 0, y: 80 },
      data: { label: "Developer", service: "Generic", type: "generic" },
    } as AppNode,
    {
      id: "repo",
      type: "generic",
      position: { x: 180, y: 80 },
      data: { label: "Git Repository", service: "Generic", type: "generic" },
    } as AppNode,
    {
      id: "ci",
      type: "generic",
      position: { x: 360, y: 0 },
      data: { label: "CI Build", service: "Generic", type: "generic" },
    } as AppNode,
    {
      id: "test",
      type: "generic",
      position: { x: 360, y: 160 },
      data: { label: "Test Suite", service: "Generic", type: "generic" },
    } as AppNode,
    {
      id: "reg",
      type: "generic",
      position: { x: 560, y: 80 },
      data: {
        label: "Container Registry",
        service: "Generic",
        type: "generic",
      },
    } as AppNode,
    {
      id: "staging",
      type: "generic",
      position: { x: 740, y: 0 },
      data: { label: "Staging", service: "Generic", type: "generic" },
    } as AppNode,
    {
      id: "prod",
      type: "generic",
      position: { x: 740, y: 160 },
      data: { label: "Production", service: "Generic", type: "generic" },
    } as AppNode,
  ],
  edges: [
    e("e1", "dev", "repo", "push"),
    e("e2", "repo", "ci", "trigger"),
    e("e3", "repo", "test", "trigger"),
    e("e4", "ci", "reg", "push image"),
    e("e5", "reg", "staging", "deploy"),
    e("e6", "staging", "prod", "promote"),
  ],
};

// ── AWS Additional Templates ──────────────────────────────────────────────────

const staticWebsite: DiagramTemplate = {
  id: "aws-static-website",
  name: "AWS Static Website",
  description:
    "S3 + CloudFront + Route 53 with HTTPS via ACM. Ideal first deployment.",
  category: "AWS",
  stars: 1,
  nodes: [
    n("r53", "Route 53", "Route53", "aws-network", 280, 0),
    n("acm", "ACM Certificate", "Certificate Manager", "aws-security", 0, 0),
    n("cf", "CloudFront CDN", "CloudFront", "aws-network", 280, 140),
    n("s3web", "Website Bucket", "S3", "aws-storage", 140, 300),
    n("s3logs", "Access Logs", "S3", "aws-storage", 420, 300),
  ],
  edges: [
    e("e1", "r53", "cf", "DNS"),
    e("e2", "acm", "cf", "TLS cert"),
    e("e3", "cf", "s3web", "origin"),
    e("e4", "cf", "s3logs", "logs"),
  ],
};

const ecsFargate: DiagramTemplate = {
  id: "aws-ecs-fargate",
  name: "AWS ECS Fargate App",
  description:
    "Containerised API with ALB, ECS Fargate, ECR, RDS Aurora, and Secrets Manager.",
  category: "AWS",
  stars: 2,
  nodes: [
    n("client", "Client", "Client", "client", 280, 0),
    n("alb", "Application LB", "ALB", "aws-network", 280, 130),
    n("ecs", "ECS Fargate", "ECS", "aws-containers", 280, 270),
    n("ecr", "ECR Registry", "ECR", "aws-developer", 520, 270),
    n("rds", "Aurora MySQL", "RDS", "aws-database", 140, 420),
    n(
      "secrets",
      "Secrets Manager",
      "Secrets Manager",
      "aws-security",
      420,
      420,
    ),
    n("cw", "CloudWatch", "CloudWatch", "aws-management", 0, 270),
  ],
  edges: [
    e("e1", "client", "alb"),
    e("e2", "alb", "ecs"),
    e("e3", "ecr", "ecs", "pull image"),
    e("e4", "ecs", "rds"),
    e("e5", "ecs", "secrets", "credentials"),
    e("e6", "ecs", "cw", "logs/metrics"),
  ],
};

const mlPipeline: DiagramTemplate = {
  id: "aws-ml-pipeline",
  name: "AWS ML Training Pipeline",
  description:
    "End-to-end SageMaker pipeline: data prep, training, registry, and real-time endpoint.",
  category: "AWS",
  stars: 3,
  nodes: [
    n("s3raw", "Raw Data (S3)", "S3", "aws-storage", 0, 140),
    n("glue", "Glue Processing", "Glue", "aws-analytics", 220, 140),
    n("s3feat", "Feature Store (S3)", "S3", "aws-storage", 440, 140),
    n(
      "train",
      "SageMaker Training",
      "SageMaker",
      "aws-machine-learning",
      440,
      0,
    ),
    n(
      "registry",
      "Model Registry",
      "SageMaker",
      "aws-machine-learning",
      680,
      70,
    ),
    n(
      "endpoint",
      "SageMaker Endpoint",
      "SageMaker",
      "aws-machine-learning",
      680,
      210,
    ),
    n("lambda", "Inference Lambda", "Lambda", "aws-compute", 900, 210),
  ],
  edges: [
    e("e1", "s3raw", "glue"),
    e("e2", "glue", "s3feat"),
    e("e3", "s3feat", "train", "training data"),
    e("e4", "train", "registry", "register model"),
    e("e5", "registry", "endpoint", "deploy"),
    e("e6", "endpoint", "lambda", "invoke"),
  ],
};

const multiRegionDr: DiagramTemplate = {
  id: "aws-multi-region-dr",
  name: "AWS Multi-Region DR",
  description:
    "Active-passive disaster recovery across two regions with Route 53 failover routing.",
  category: "AWS",
  stars: 3,
  nodes: [
    n("r53", "Route 53 Failover", "Route53", "aws-network", 380, 0),
    // Primary region
    n("albPri", "ALB (Primary)", "ALB", "aws-network", 120, 160),
    n("ec2Pri", "EC2 Fleet (Primary)", "EC2", "aws-compute", 120, 300),
    n("rdsPri", "RDS Primary", "RDS", "aws-database", 120, 440),
    // DR region
    n("albDr", "ALB (DR)", "ALB", "aws-network", 640, 160),
    n("ec2Dr", "EC2 Fleet (DR)", "EC2", "aws-compute", 640, 300),
    n("rdsDr", "RDS Read Replica", "RDS", "aws-database", 640, 440),
    // Shared
    n("s3", "S3 Replication", "S3", "aws-storage", 380, 440),
  ],
  edges: [
    e("e1", "r53", "albPri", "primary"),
    e("e2", "r53", "albDr", "failover"),
    e("e3", "albPri", "ec2Pri"),
    e("e4", "ec2Pri", "rdsPri"),
    e("e5", "albDr", "ec2Dr"),
    e("e6", "ec2Dr", "rdsDr"),
    e("e7", "rdsPri", "rdsDr", "replication"),
    e("e8", "rdsPri", "s3", "backup"),
  ],
};

// ── Generic Additional Templates ──────────────────────────────────────────────

const erDiagram: DiagramTemplate = {
  id: "generic-er-diagram",
  name: "ER / Database Schema",
  description:
    "Users, Orders, Products, and OrderItems tables — ready for SQL DDL export.",
  category: "Generic",
  stars: 2,
  nodes: [
    {
      id: "tbl-users",
      type: "table",
      position: { x: 0, y: 0 },
      data: {
        label: "users",
        service: "table",
        type: "table",
        provider: "generic",
        metadata: {
          columns: [
            {
              id: "u1",
              name: "id",
              type: "INTEGER",
              isPrimaryKey: true,
              nullable: false,
            },
            {
              id: "u2",
              name: "name",
              type: "VARCHAR(100)",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "u3",
              name: "email",
              type: "VARCHAR(255)",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "u4",
              name: "created_at",
              type: "TIMESTAMP",
              isPrimaryKey: false,
              nullable: true,
            },
          ],
        },
      },
    } as AppNode,
    {
      id: "tbl-orders",
      type: "table",
      position: { x: 420, y: 0 },
      data: {
        label: "orders",
        service: "table",
        type: "table",
        provider: "generic",
        metadata: {
          columns: [
            {
              id: "o1",
              name: "id",
              type: "INTEGER",
              isPrimaryKey: true,
              nullable: false,
            },
            {
              id: "o2",
              name: "user_id",
              type: "INTEGER",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "o3",
              name: "total",
              type: "DECIMAL(10,2)",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "o4",
              name: "status",
              type: "VARCHAR(50)",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "o5",
              name: "created_at",
              type: "TIMESTAMP",
              isPrimaryKey: false,
              nullable: true,
            },
          ],
        },
      },
    } as AppNode,
    {
      id: "tbl-products",
      type: "table",
      position: { x: 420, y: 360 },
      data: {
        label: "products",
        service: "table",
        type: "table",
        provider: "generic",
        metadata: {
          columns: [
            {
              id: "p1",
              name: "id",
              type: "INTEGER",
              isPrimaryKey: true,
              nullable: false,
            },
            {
              id: "p2",
              name: "name",
              type: "VARCHAR(200)",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "p3",
              name: "price",
              type: "DECIMAL(10,2)",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "p4",
              name: "stock",
              type: "INTEGER",
              isPrimaryKey: false,
              nullable: true,
            },
          ],
        },
      },
    } as AppNode,
    {
      id: "tbl-order-items",
      type: "table",
      position: { x: 860, y: 160 },
      data: {
        label: "order_items",
        service: "table",
        type: "table",
        provider: "generic",
        metadata: {
          columns: [
            {
              id: "oi1",
              name: "id",
              type: "INTEGER",
              isPrimaryKey: true,
              nullable: false,
            },
            {
              id: "oi2",
              name: "order_id",
              type: "INTEGER",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "oi3",
              name: "product_id",
              type: "INTEGER",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "oi4",
              name: "quantity",
              type: "INTEGER",
              isPrimaryKey: false,
              nullable: false,
            },
            {
              id: "oi5",
              name: "unit_price",
              type: "DECIMAL(10,2)",
              isPrimaryKey: false,
              nullable: false,
            },
          ],
        },
      },
    } as AppNode,
  ],
  edges: [
    e("e1", "tbl-users", "tbl-orders", "has many"),
    e("e2", "tbl-orders", "tbl-order-items", "contains"),
    e("e3", "tbl-products", "tbl-order-items", "referenced by"),
  ],
};

// ── Azure Templates ───────────────────────────────────────────────────────────

const azureWebApp: DiagramTemplate = {
  id: "azure-web-app",
  name: "Azure Three-Tier Web App",
  description:
    "Front Door CDN → App Service → Azure SQL + Blob Storage with Key Vault.",
  category: "Azure",
  stars: 2,
  nodes: [
    az("afd", "Azure Front Door", "FrontDoors", "azure-network", 280, 0),
    az("app", "App Service", "AppServices", "azure-compute", 280, 150),
    az("sql", "Azure SQL", "SQLDatabases", "azure-database", 100, 310),
    az("blob", "Blob Storage", "StorageAccounts", "azure-storage", 460, 310),
    az("kv", "Key Vault", "KeyVaults", "azure-compute", 280, 460),
    az("apim", "API Management", "APIManagement", "azure-network", 0, 150),
  ],
  edges: [
    e("e1", "afd", "app", "route"),
    e("e2", "apim", "app", "gateway"),
    e("e3", "app", "sql"),
    e("e4", "app", "blob", "assets"),
    e("e5", "app", "kv", "secrets"),
  ],
};

const azureServerless: DiagramTemplate = {
  id: "azure-serverless",
  name: "Azure Serverless Functions",
  description:
    "Event-driven pipeline: Event Hub → Azure Functions → Cosmos DB + Service Bus.",
  category: "Azure",
  stars: 3,
  nodes: [
    az("eh", "Event Hub", "EventHubs", "azure-network", 0, 140),
    az("fn1", "Ingest Function", "FunctionApps", "azure-compute", 240, 60),
    az("fn2", "Process Function", "FunctionApps", "azure-compute", 240, 220),
    az("cosmos", "Cosmos DB", "CosmosDB", "azure-database", 480, 60),
    az("sb", "Service Bus", "ServiceBus", "azure-network", 480, 220),
    az("fn3", "Notify Function", "FunctionApps", "azure-compute", 720, 220),
    az("logic", "Logic App", "LogicApps", "azure-compute", 720, 60),
  ],
  edges: [
    e("e1", "eh", "fn1", "trigger"),
    e("e2", "eh", "fn2", "trigger"),
    e("e3", "fn1", "cosmos", "store"),
    e("e4", "fn2", "sb", "publish"),
    e("e5", "sb", "fn3", "subscribe"),
    e("e6", "fn3", "logic", "notify"),
  ],
};

// ── Circuit Breaker Templates ─────────────────────────────────────────────────

/** Helper for nodes that need mock (simulation) data pre-configured */
function nm(
  id: string,
  label: string,
  service: string,
  type: string,
  x: number,
  y: number,
  mock: Record<string, unknown>,
  provider = "aws",
): AppNode {
  return {
    id,
    type: type as string,
    position: { x, y },
    data: { label, service, type, provider, mock },
  } as AppNode;
}

const serverlessCircuitBreaker: DiagramTemplate = {
  id: "aws-serverless-cb",
  name: "Serverless Circuit Breaker",
  description:
    "Lambda-based circuit breaker: API Gateway routes requests through a CB wrapper that checks DynamoDB for breaker state. When the downstream service error rate spikes the breaker opens and requests short-circuit to an ElastiCache fallback. CloudWatch + SNS alert on trip events.",
  category: "AWS",
  stars: 3,
  nodes: [
    // Entry
    nm("client", "Client App", "Client", "client", 340, 0, {
      enabled: true,
      requestsPerSecond: 8,
    }),
    n("apigw", "API Gateway", "API Gateway", "aws-network", 340, 130),
    // Circuit Breaker Lambda — checks breaker state before forwarding
    nm("cb", "Circuit Breaker\nLambda", "Lambda", "aws-compute", 340, 270, {
      enabled: true,
      failureRate: 0,
      latency: 20,
    }),
    // State store — tracks open/closed/half-open
    n(
      "cbstate",
      "Breaker State\n(DynamoDB)",
      "DynamoDB",
      "aws-database",
      620,
      270,
    ),
    // Primary downstream — intentionally degraded to trip the breaker
    nm(
      "primary",
      "Orders Service\n(Lambda)",
      "Lambda",
      "aws-compute",
      340,
      420,
      {
        enabled: true,
        failureRate: 65,
        latency: 900,
      },
    ),
    n("db", "Orders DB\n(DynamoDB)", "DynamoDB", "aws-database", 340, 570),
    // Fallback path when circuit is open
    n(
      "fallback",
      "Fallback Cache\n(ElastiCache)",
      "ElastiCache",
      "aws-database",
      620,
      420,
    ),
    // Observability
    n("dlq", "Failed Requests\n(SQS DLQ)", "SQS", "aws-integration", 60, 420),
    n("cw", "CloudWatch\nAlarms", "CloudWatch", "aws-management", 620, 570),
    n("sns", "CB Trip Alert\n(SNS)", "SNS", "aws-integration", 620, 130),
  ],
  edges: [
    e("e1", "client", "apigw"),
    e("e2", "apigw", "cb"),
    e("e3", "cb", "cbstate", "check state"),
    e("e4", "cb", "primary", "CLOSED → forward"),
    e("e5", "primary", "db", "read/write"),
    e("e6", "cb", "fallback", "OPEN → fallback"),
    e("e7", "primary", "dlq", "on failure"),
    e("e8", "cw", "sns", "alarm"),
    e("e9", "cb", "cw", "metrics"),
    e("e10", "sns", "cb", "reset signal"),
  ],
};

const ecsCircuitBreaker: DiagramTemplate = {
  id: "aws-ecs-cb",
  name: "ECS Microservices + Circuit Breaker",
  description:
    "App Mesh-powered circuit breaker between ECS microservices. The Orders service calls Payment through an Envoy proxy mesh. When Payment degrades, App Mesh opens the circuit and ECS retries through a fallback Payment replica. CloudWatch EMF captures breaker telemetry.",
  category: "AWS",
  stars: 3,
  nodes: [
    // Entry
    nm("client", "Client", "Client", "client", 360, 0, {
      enabled: true,
      requestsPerSecond: 10,
    }),
    n("alb", "Application LB", "ALB", "aws-network", 360, 130),
    // Orders service — healthy
    nm("orders", "Orders Service\n(ECS)", "ECS", "aws-containers", 360, 270, {
      enabled: true,
      failureRate: 0,
    }),
    // App Mesh — the circuit breaker proxy layer
    n("mesh", "App Mesh\n(Envoy Proxy)", "App Mesh", "aws-network", 360, 420),
    // Payment service — degraded, trips the circuit
    nm(
      "payment",
      "Payment Service\n(ECS — degraded)",
      "ECS",
      "aws-containers",
      160,
      570,
      {
        enabled: true,
        failureRate: 70,
        latency: 1200,
        concurrencyLimit: 3,
      },
    ),
    // Fallback replica
    nm(
      "payment_fb",
      "Payment Fallback\n(ECS replica)",
      "ECS",
      "aws-containers",
      560,
      570,
      {
        enabled: true,
        failureRate: 5,
        latency: 80,
      },
    ),
    // Shared backing stores
    n("rds", "Aurora MySQL", "RDS", "aws-database", 160, 720),
    n(
      "cache",
      "ElastiCache\n(session cache)",
      "ElastiCache",
      "aws-database",
      560,
      720,
    ),
    // Observability
    n(
      "cw",
      "CloudWatch EMF\n(breaker metrics)",
      "CloudWatch",
      "aws-management",
      760,
      420,
    ),
    n("xray", "X-Ray Traces", "X-Ray", "aws-management", 760, 270),
    n("sm", "Secrets Manager", "Secrets Manager", "aws-security", 760, 130),
  ],
  edges: [
    e("e1", "client", "alb"),
    e("e2", "alb", "orders"),
    e("e3", "orders", "mesh", "egress"),
    e("e4", "mesh", "payment", "CLOSED"),
    e("e5", "mesh", "payment_fb", "OPEN → retry"),
    e("e6", "payment", "rds", "write"),
    e("e7", "payment_fb", "cache", "read-through"),
    e("e8", "orders", "xray", "trace"),
    e("e9", "mesh", "cw", "breaker metrics"),
    e("e10", "alb", "sm", "TLS creds"),
  ],
};

export const TEMPLATES: DiagramTemplate[] = [
  // AWS
  staticWebsite,
  threeTier,
  serverlessApi,
  ecsFargate,
  eventDriven,
  microservices,
  dataLake,
  mlPipeline,
  multiRegionDr,
  serverlessCircuitBreaker,
  ecsCircuitBreaker,
  // Azure
  azureWebApp,
  azureServerless,
  // Generic
  flowchart,
  cicd,
  erDiagram,
];

export const TEMPLATE_CATEGORIES = [
  ...new Set(TEMPLATES.map((t) => t.category)),
];
