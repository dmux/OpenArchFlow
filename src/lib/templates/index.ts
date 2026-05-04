import type { AppNode, AppEdge } from '@/lib/store';

export interface DiagramTemplate {
    id: string;
    name: string;
    description: string;
    category: 'AWS' | 'Azure' | 'Generic';
    nodes: AppNode[];
    edges: AppEdge[];
}

function n(id: string, label: string, service: string, type: string, x: number, y: number, provider = 'aws'): AppNode {
    return { id, type: 'aws-compute', position: { x, y }, data: { label, service, type, provider } } as AppNode;
}

function e(id: string, source: string, target: string, label = ''): AppEdge {
    return { id, source, target, label: label || undefined, type: 'smoothstep' } as AppEdge;
}

// ── AWS Templates ─────────────────────────────────────────────────────────────

const threeTier: DiagramTemplate = {
    id: 'aws-three-tier',
    name: 'AWS Three-Tier Web App',
    description: 'Classic presentation, application, and data tiers on AWS.',
    category: 'AWS',
    nodes: [
        n('cf', 'CloudFront CDN', 'CloudFront', 'aws-network', 300, 0),
        n('alb', 'Load Balancer', 'ALB', 'aws-network', 300, 120),
        n('ec2a', 'Web Server A', 'EC2', 'aws-compute', 100, 280),
        n('ec2b', 'Web Server B', 'EC2', 'aws-compute', 500, 280),
        n('rds', 'RDS MySQL', 'RDS', 'aws-database', 300, 440),
        n('s3', 'Static Assets', 'S3', 'aws-storage', 600, 0),
    ],
    edges: [
        e('e1', 'cf', 'alb'), e('e2', 'cf', 's3'),
        e('e3', 'alb', 'ec2a'), e('e4', 'alb', 'ec2b'),
        e('e5', 'ec2a', 'rds'), e('e6', 'ec2b', 'rds'),
    ],
};

const serverlessApi: DiagramTemplate = {
    id: 'aws-serverless-api',
    name: 'AWS Serverless API',
    description: 'API Gateway + Lambda + DynamoDB serverless backend.',
    category: 'AWS',
    nodes: [
        n('client', 'Client App', 'Client', 'client', 300, 0),
        n('apigw', 'API Gateway', 'API Gateway', 'aws-network', 300, 140),
        n('auth', 'Cognito Auth', 'Cognito', 'aws-security', 0, 140),
        n('lambda', 'Handler Lambda', 'Lambda', 'aws-compute', 300, 280),
        n('dynamo', 'DynamoDB', 'DynamoDB', 'aws-database', 300, 420),
        n('s3', 'File Storage', 'S3', 'aws-storage', 600, 280),
    ],
    edges: [
        e('e1', 'client', 'apigw'), e('e2', 'auth', 'apigw', 'authorizer'),
        e('e3', 'apigw', 'lambda'), e('e4', 'lambda', 'dynamo'),
        e('e5', 'lambda', 's3'),
    ],
};

const eventDriven: DiagramTemplate = {
    id: 'aws-event-driven',
    name: 'AWS Event-Driven Architecture',
    description: 'SQS/SNS fan-out with Lambda processors and DLQ.',
    category: 'AWS',
    nodes: [
        n('producer', 'Event Producer', 'Lambda', 'aws-compute', 0, 140),
        n('sns', 'SNS Topic', 'SNS', 'aws-integration', 220, 140),
        n('sqsA', 'Orders Queue', 'SQS', 'aws-integration', 420, 0),
        n('sqsB', 'Notifications Queue', 'SQS', 'aws-integration', 420, 280),
        n('dlq', 'Dead Letter Queue', 'SQS', 'aws-integration', 660, 140),
        n('procA', 'Order Processor', 'Lambda', 'aws-compute', 640, 0),
        n('procB', 'Notification Sender', 'Lambda', 'aws-compute', 640, 280),
    ],
    edges: [
        e('e1', 'producer', 'sns'), e('e2', 'sns', 'sqsA'), e('e3', 'sns', 'sqsB'),
        e('e4', 'sqsA', 'procA'), e('e5', 'sqsB', 'procB'),
        e('e6', 'procA', 'dlq', 'on failure'), e('e7', 'procB', 'dlq', 'on failure'),
    ],
};

const microservices: DiagramTemplate = {
    id: 'aws-microservices',
    name: 'AWS Microservices',
    description: 'ECS-based microservices with service discovery and RDS.',
    category: 'AWS',
    nodes: [
        n('alb', 'Application LB', 'ALB', 'aws-network', 250, 0),
        n('svcA', 'Users Service', 'ECS', 'aws-containers', 0, 160),
        n('svcB', 'Orders Service', 'ECS', 'aws-containers', 250, 160),
        n('svcC', 'Payment Service', 'ECS', 'aws-containers', 500, 160),
        n('dbA', 'Users DB', 'RDS', 'aws-database', 0, 340),
        n('dbB', 'Orders DB', 'RDS', 'aws-database', 250, 340),
        n('cache', 'ElastiCache', 'ElastiCache', 'aws-database', 500, 340),
    ],
    edges: [
        e('e1', 'alb', 'svcA'), e('e2', 'alb', 'svcB'), e('e3', 'alb', 'svcC'),
        e('e4', 'svcA', 'dbA'), e('e5', 'svcB', 'dbB'), e('e6', 'svcC', 'cache'),
        e('e7', 'svcB', 'svcC', 'charge'),
    ],
};

const dataLake: DiagramTemplate = {
    id: 'aws-data-lake',
    name: 'AWS Data Lake',
    description: 'S3 data lake with Glue ETL, Athena query, and QuickSight.',
    category: 'AWS',
    nodes: [
        n('ingestion', 'Kinesis Firehose', 'Kinesis Firehose', 'aws-analytics', 0, 140),
        n('raw', 'Raw Zone (S3)', 'S3', 'aws-storage', 240, 140),
        n('glue', 'Glue ETL', 'Glue', 'aws-analytics', 480, 60),
        n('processed', 'Processed Zone (S3)', 'S3', 'aws-storage', 480, 220),
        n('athena', 'Athena', 'Athena', 'aws-analytics', 700, 140),
        n('qs', 'QuickSight', 'QuickSight', 'aws-analytics', 900, 140),
    ],
    edges: [
        e('e1', 'ingestion', 'raw'), e('e2', 'raw', 'glue'),
        e('e3', 'glue', 'processed'), e('e4', 'processed', 'athena'),
        e('e5', 'athena', 'qs'),
    ],
};

// ── Generic Templates ─────────────────────────────────────────────────────────

const flowchart: DiagramTemplate = {
    id: 'generic-flowchart',
    name: 'Basic Flowchart',
    description: 'Simple start → process → decision → end flow.',
    category: 'Generic',
    nodes: [
        { id: 'start', type: 'generic', position: { x: 200, y: 0 }, data: { label: 'Start', service: 'Generic', type: 'generic', metadata: { shape: 'circle', backgroundColor: '#d1fae5', borderColor: '#10b981' } } } as AppNode,
        { id: 'proc1', type: 'generic', position: { x: 200, y: 120 }, data: { label: 'Process Data', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'dec', type: 'generic', position: { x: 200, y: 260 }, data: { label: 'Valid?', service: 'Generic', type: 'generic', metadata: { shape: 'diamond', backgroundColor: '#fef3c7', borderColor: '#f59e0b' } } } as AppNode,
        { id: 'ok', type: 'generic', position: { x: 400, y: 380 }, data: { label: 'Save Result', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'err', type: 'generic', position: { x: 0, y: 380 }, data: { label: 'Handle Error', service: 'Generic', type: 'generic', metadata: { backgroundColor: '#fee2e2', borderColor: '#ef4444' } } } as AppNode,
        { id: 'end', type: 'generic', position: { x: 200, y: 500 }, data: { label: 'End', service: 'Generic', type: 'generic', metadata: { shape: 'circle', backgroundColor: '#dbeafe', borderColor: '#3b82f6' } } } as AppNode,
    ],
    edges: [
        e('e1', 'start', 'proc1'), e('e2', 'proc1', 'dec'),
        e('e3', 'dec', 'ok', 'Yes'), e('e4', 'dec', 'err', 'No'),
        e('e5', 'ok', 'end'), e('e6', 'err', 'end'),
    ],
};

const cicd: DiagramTemplate = {
    id: 'generic-cicd',
    name: 'CI/CD Pipeline',
    description: 'Developer push → build → test → deploy pipeline.',
    category: 'Generic',
    nodes: [
        { id: 'dev', type: 'generic', position: { x: 0, y: 80 }, data: { label: 'Developer', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'repo', type: 'generic', position: { x: 180, y: 80 }, data: { label: 'Git Repository', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'ci', type: 'generic', position: { x: 360, y: 0 }, data: { label: 'CI Build', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'test', type: 'generic', position: { x: 360, y: 160 }, data: { label: 'Test Suite', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'reg', type: 'generic', position: { x: 560, y: 80 }, data: { label: 'Container Registry', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'staging', type: 'generic', position: { x: 740, y: 0 }, data: { label: 'Staging', service: 'Generic', type: 'generic' } } as AppNode,
        { id: 'prod', type: 'generic', position: { x: 740, y: 160 }, data: { label: 'Production', service: 'Generic', type: 'generic' } } as AppNode,
    ],
    edges: [
        e('e1', 'dev', 'repo', 'push'), e('e2', 'repo', 'ci', 'trigger'),
        e('e3', 'repo', 'test', 'trigger'), e('e4', 'ci', 'reg', 'push image'),
        e('e5', 'reg', 'staging', 'deploy'), e('e6', 'staging', 'prod', 'promote'),
    ],
};

export const TEMPLATES: DiagramTemplate[] = [
    threeTier,
    serverlessApi,
    eventDriven,
    microservices,
    dataLake,
    flowchart,
    cicd,
];

export const TEMPLATE_CATEGORIES = [...new Set(TEMPLATES.map((t) => t.category))];
