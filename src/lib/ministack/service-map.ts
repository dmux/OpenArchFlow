export type SdkService =
  | "s3"
  | "sqs"
  | "dynamodb"
  | "lambda"
  | "sns"
  | "apigateway"
  | "eventbridge"
  | "kinesis"
  | "iam"
  | "secretsmanager"
  | "ssm"
  | "kms"
  | "cloudwatchlogs";

export interface ServiceDeployDef {
  sdkService: SdkService;
  supported: boolean;
  requiresIAMRole?: boolean;
  consoleLabel?: string;
}

const supported = (
  sdkService: SdkService,
  opts?: Partial<Omit<ServiceDeployDef, "supported" | "sdkService">>,
): ServiceDeployDef => ({
  sdkService,
  supported: true,
  ...opts,
});

const unsupported = (): ServiceDeployDef => ({
  sdkService: "s3",
  supported: false,
});

export const SERVICE_DEPLOY_MAP: Record<string, ServiceDeployDef> = {
  // Storage
  s3: supported("s3", { consoleLabel: "S3 Bucket" }),
  efs: unsupported(),
  ebs: unsupported(),
  glacier: unsupported(),
  fsx: unsupported(),
  "storage-gateway": unsupported(),

  // Compute
  lambda: supported("lambda", { requiresIAMRole: true, consoleLabel: "Lambda Function" }),
  ec2: unsupported(),
  "elastic-beanstalk": unsupported(),
  "app-runner": unsupported(),
  batch: unsupported(),
  lightsail: unsupported(),
  amplify: unsupported(),

  // Containers
  ecr: unsupported(),
  ecs: unsupported(),
  eks: unsupported(),
  fargate: unsupported(),

  // Database
  dynamodb: supported("dynamodb", { consoleLabel: "DynamoDB Table" }),
  rds: unsupported(),
  aurora: unsupported(),
  elasticache: unsupported(),
  neptune: unsupported(),
  documentdb: unsupported(),
  timestream: unsupported(),
  keyspaces: unsupported(),
  memorydb: unsupported(),
  qldb: unsupported(),

  // Messaging / Integration
  sqs: supported("sqs", { consoleLabel: "SQS Queue" }),
  sns: supported("sns", { consoleLabel: "SNS Topic" }),
  eventbridge: supported("eventbridge", { consoleLabel: "EventBridge Bus" }),
  kinesis: supported("kinesis", { consoleLabel: "Kinesis Stream" }),
  "step-functions": unsupported(),
  appsync: unsupported(),
  mq: unsupported(),
  appflow: unsupported(),
  mwaa: unsupported(),
  firehose: unsupported(),

  // API
  apigateway: supported("apigateway", { consoleLabel: "API Gateway" }),
  "api-gateway": supported("apigateway", { consoleLabel: "API Gateway" }),

  // Security
  iam: supported("iam", { consoleLabel: "IAM Role" }),
  kms: supported("kms", { consoleLabel: "KMS Key" }),
  "secrets-manager": supported("secretsmanager", { consoleLabel: "Secret" }),
  secretsmanager: supported("secretsmanager", { consoleLabel: "Secret" }),
  ssm: supported("ssm", { consoleLabel: "SSM Parameter" }),
  cognito: unsupported(),
  "cognito-userpool": unsupported(),
  "cognito-user-pool": unsupported(),
  waf: unsupported(),
  guardduty: unsupported(),
  inspector: unsupported(),
  macie: unsupported(),
  "security-hub": unsupported(),
  acm: unsupported(),
  shield: unsupported(),

  // Networking
  vpc: unsupported(),
  "direct-connect": unsupported(),
  cloudfront: unsupported(),
  "route53": unsupported(),
  elb: unsupported(),
  alb: unsupported(),
  nlb: unsupported(),
  "nat-gateway": unsupported(),
  "internet-gateway": unsupported(),
  "transit-gateway": unsupported(),
  "network-firewall": unsupported(),
  privatelink: unsupported(),
  "global-accelerator": unsupported(),

  // Analytics
  glue: unsupported(),
  athena: unsupported(),
  emr: unsupported(),
  redshift: unsupported(),
  quicksight: unsupported(),
  opensearch: unsupported(),
  msk: unsupported(),
  "lake-formation": unsupported(),

  // Management
  cloudwatch: supported("cloudwatchlogs", { consoleLabel: "CloudWatch Logs" }),
  cloudformation: unsupported(),
  "systems-manager": unsupported(),
  config: unsupported(),
  cloudtrail: unsupported(),
  organizations: unsupported(),

  // AI/ML — not supported in MiniStack
  bedrock: unsupported(),
  sagemaker: unsupported(),
  rekognition: unsupported(),
  comprehend: unsupported(),
  textract: unsupported(),
  translate: unsupported(),
  transcribe: unsupported(),
  polly: unsupported(),
  lex: unsupported(),
  personalize: unsupported(),
  forecast: unsupported(),
  kendra: unsupported(),

  // Developer Tools
  codepipeline: unsupported(),
  codebuild: unsupported(),
  codecommit: unsupported(),
  codedeploy: unsupported(),
  codeartifact: unsupported(),
  "x-ray": unsupported(),

  // Simulation-only — never deployed to MiniStack
  "traffic-source": unsupported(),
};

export function getDeployDef(service: string): ServiceDeployDef {
  const normalized = service.toLowerCase().replace(/_/g, "-");
  return SERVICE_DEPLOY_MAP[normalized] ?? unsupported();
}

export function sanitizeResourceName(label: string, nodeId: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const suffix = nodeId.slice(0, 8);
  return `${base}-${suffix}`;
}
