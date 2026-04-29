export const REGION_MAPPING: Record<string, string> = {
    'us-east-1': 'US East (N. Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US West (N. California)',
    'us-west-2': 'US West (Oregon)',
    'af-south-1': 'Africa (Cape Town)',
    'ap-east-1': 'Asia Pacific (Hong Kong)',
    'ap-south-1': 'Asia Pacific (Mumbai)',
    'ap-northeast-3': 'Asia Pacific (Osaka)',
    'ap-northeast-2': 'Asia Pacific (Seoul)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    'ca-central-1': 'Canada (Central)',
    'eu-central-1': 'Europe (Frankfurt)',
    'eu-west-1': 'Europe (Ireland)',
    'eu-west-2': 'Europe (London)',
    'eu-south-1': 'Europe (Milan)',
    'eu-west-3': 'Europe (Paris)',
    'eu-north-1': 'Europe (Stockholm)',
    'me-south-1': 'Middle East (Bahrain)',
    'sa-east-1': 'South America (Sao Paulo)',
};

export const SERVICE_CODE_MAP: Record<string, string> = {
    'ec2': 'AmazonEC2',
    'lambda': 'AWSLambda',
    'rds': 'AmazonRDS',
    'dynamodb': 'AmazonDynamoDB',
    's3': 'AmazonS3',
    'sqs': 'AmazonSQS',
    'sns': 'AmazonSNS',
    'cloudfront': 'AmazonCloudFront',
    'apigateway': 'AmazonApiGateway',
    'redshift': 'AmazonRedshift',
    'elasticache': 'AmazonElastiCache',
    'efs': 'AmazonEFS',
    'ebs': 'AmazonEC2', // EBS is part of EC2 ServiceCode for pricing
};

export interface UsageField {
    key: string;
    label: string;
    unit: string;
    defaultValue: number;
}

export const USAGE_FIELDS: Record<string, UsageField> = {
    'AmazonEC2': { key: 'quantity', label: 'Instance Count', unit: 'units', defaultValue: 1 },
    'AmazonRDS': { key: 'quantity', label: 'DB Instances', unit: 'units', defaultValue: 1 },
    'AmazonS3': { key: 'storageGb', label: 'Storage', unit: 'GB', defaultValue: 100 },
    'AmazonEFS': { key: 'storageGb', label: 'Storage', unit: 'GB', defaultValue: 100 },
    'AWSLambda': { key: 'invocations', label: 'Monthly Invocations', unit: 'reqs', defaultValue: 1000000 },
    'AmazonSQS': { key: 'requests', label: 'Monthly Requests', unit: 'reqs', defaultValue: 1000000 },
};

export const COMMON_ATTRIBUTES: Record<string, string[]> = {
    'AmazonEC2': ['instanceType', 'operatingSystem', 'tenancy'],
    'AmazonRDS': ['instanceType', 'databaseEngine', 'deploymentOption'],
    'AmazonS3': ['storageClass'],
    'AmazonDynamoDB': ['group'],
    'AWSLambda': ['group'],
};

export const ATTRIBUTE_LABELS: Record<string, string> = {
    'instanceType': 'Instance Type',
    'operatingSystem': 'Operating System',
    'tenancy': 'Tenancy',
    'databaseEngine': 'Database Engine',
    'deploymentOption': 'Deployment Option',
    'storageClass': 'Storage Class',
    'group': 'Pricing Group',
};

export const ATTRIBUTE_OPTIONS: Record<string, string[]> = {
    'operatingSystem': ['Linux', 'Windows', 'RHEL', 'SUSE'],
    'tenancy': ['Shared', 'Dedicated', 'Host'],
    'databaseEngine': ['MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'Aurora MySQL', 'Aurora PostgreSQL'],
    'deploymentOption': ['Single-AZ', 'Multi-AZ'],
    'storageClass': ['General Purpose', 'Infrequent Access', 'Archive'],
    'instanceType': [
        't3.nano', 't3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 't3.2xlarge',
        't4g.nano', 't4g.micro', 't4g.small', 't4g.medium', 't4g.large', 't4g.xlarge', 't4g.2xlarge',
        'm5.large', 'm5.xlarge', 'm5.2xlarge', 'm5.4xlarge',
        'c5.large', 'c5.xlarge', 'c5.2xlarge',
        'r5.large', 'r5.xlarge', 'r5.2xlarge',
        'db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.m5.large', 'db.r5.large'
    ]
};
