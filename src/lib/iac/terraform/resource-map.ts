export interface TerraformResourceDef {
  resource: string;
  defaultArgs: Record<string, unknown>;
  outputs: string[];
}

const AWS_RESOURCE_MAP: Record<string, TerraformResourceDef> = {
  // Compute
  ec2: {
    resource: "aws_instance",
    defaultArgs: {
      ami: "var.ami_id",
      instance_type: "var.instance_type",
      tags: '{ Name = local.name_prefix }',
    },
    outputs: ["id", "arn", "public_ip", "private_ip", "public_dns"],
  },
  lambda: {
    resource: "aws_lambda_function",
    defaultArgs: {
      function_name: "local.name_prefix",
      role: "aws_iam_role.lambda.arn",
      handler: '"index.handler"',
      runtime: '"nodejs20.x"',
      filename: '"lambda.zip"',
    },
    outputs: ["arn", "invoke_arn", "qualified_arn"],
  },
  eks: {
    resource: "aws_eks_cluster",
    defaultArgs: {
      name: "local.name_prefix",
      role_arn: "aws_iam_role.eks.arn",
      version: '"1.29"',
    },
    outputs: ["id", "arn", "endpoint", "name"],
  },
  ecs: {
    resource: "aws_ecs_cluster",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["id", "arn", "name"],
  },
  fargate: {
    resource: "aws_ecs_task_definition",
    defaultArgs: {
      family: "local.name_prefix",
      requires_compatibilities: '["FARGATE"]',
      network_mode: '"awsvpc"',
      cpu: "256",
      memory: "512",
      container_definitions: '"[]"',
    },
    outputs: ["arn", "revision"],
  },
  apprunner: {
    resource: "aws_apprunner_service",
    defaultArgs: {
      service_name: "local.name_prefix",
    },
    outputs: ["service_arn", "service_url"],
  },
  elasticbeanstalk: {
    resource: "aws_elastic_beanstalk_application",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["arn"],
  },
  amplify: {
    resource: "aws_amplify_app",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["arn", "id", "default_domain"],
  },
  // Database
  rds: {
    resource: "aws_db_instance",
    defaultArgs: {
      identifier: "local.name_prefix",
      engine: '"mysql"',
      engine_version: '"8.0"',
      instance_class: '"db.t3.micro"',
      allocated_storage: "20",
      username: "var.db_username",
      password: "var.db_password",
      skip_final_snapshot: "true",
    },
    outputs: ["id", "arn", "endpoint", "address", "port"],
  },
  aurora: {
    resource: "aws_rds_cluster",
    defaultArgs: {
      cluster_identifier: "local.name_prefix",
      engine: '"aurora-mysql"',
      engine_version: '"8.0.mysql_aurora.3.05.2"',
      master_username: "var.db_username",
      master_password: "var.db_password",
      skip_final_snapshot: "true",
    },
    outputs: ["id", "arn", "endpoint", "reader_endpoint", "cluster_identifier"],
  },
  dynamodb: {
    resource: "aws_dynamodb_table",
    defaultArgs: {
      name: "local.name_prefix",
      billing_mode: '"PAY_PER_REQUEST"',
      hash_key: '"id"',
      attribute: '{ name = "id", type = "S" }',
    },
    outputs: ["id", "arn", "name"],
  },
  elasticache: {
    resource: "aws_elasticache_cluster",
    defaultArgs: {
      cluster_id: "local.name_prefix",
      engine: '"redis"',
      node_type: '"cache.t3.micro"',
      num_cache_nodes: "1",
      parameter_group_name: '"default.redis7"',
    },
    outputs: ["id", "arn", "cache_nodes"],
  },
  neptune: {
    resource: "aws_neptune_cluster",
    defaultArgs: {
      cluster_identifier: "local.name_prefix",
      engine: '"neptune"',
      skip_final_snapshot: "true",
      iam_database_authentication_enabled: "true",
    },
    outputs: ["id", "arn", "endpoint", "reader_endpoint"],
  },
  documentdb: {
    resource: "aws_docdb_cluster",
    defaultArgs: {
      cluster_identifier: "local.name_prefix",
      engine: '"docdb"',
      master_username: "var.db_username",
      master_password: "var.db_password",
      skip_final_snapshot: "true",
    },
    outputs: ["id", "arn", "endpoint"],
  },
  memorydb: {
    resource: "aws_memorydb_cluster",
    defaultArgs: {
      name: "local.name_prefix",
      node_type: '"db.t4g.small"',
      num_shards: "1",
    },
    outputs: ["id", "arn", "cluster_endpoint"],
  },
  // Storage
  s3: {
    resource: "aws_s3_bucket",
    defaultArgs: {
      bucket: "local.name_prefix",
      force_destroy: "true",
      tags: '{ Name = local.name_prefix }',
    },
    outputs: ["id", "arn", "bucket", "bucket_regional_domain_name"],
  },
  efs: {
    resource: "aws_efs_file_system",
    defaultArgs: {
      creation_token: "local.name_prefix",
      performance_mode: '"generalPurpose"',
      throughput_mode: '"bursting"',
      encrypted: "true",
    },
    outputs: ["id", "arn", "dns_name"],
  },
  ebs: {
    resource: "aws_ebs_volume",
    defaultArgs: {
      availability_zone: "var.availability_zone",
      size: "20",
      type: '"gp3"',
      encrypted: "true",
    },
    outputs: ["id", "arn"],
  },
  glacier: {
    resource: "aws_glacier_vault",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["id", "arn", "location"],
  },
  // Networking
  vpc: {
    resource: "aws_vpc",
    defaultArgs: {
      cidr_block: '"10.0.0.0/16"',
      enable_dns_hostnames: "true",
      enable_dns_support: "true",
      tags: '{ Name = local.name_prefix }',
    },
    outputs: ["id", "arn", "cidr_block", "default_route_table_id"],
  },
  privatesubnet: {
    resource: "aws_subnet",
    defaultArgs: {
      vpc_id: "aws_vpc.main.id",
      cidr_block: '"10.0.1.0/24"',
      map_public_ip_on_launch: "false",
      tags: '{ Name = "${local.name_prefix}-private" }',
    },
    outputs: ["id", "arn", "cidr_block"],
  },
  internetgateway: {
    resource: "aws_internet_gateway",
    defaultArgs: {
      vpc_id: "aws_vpc.main.id",
      tags: '{ Name = local.name_prefix }',
    },
    outputs: ["id", "arn"],
  },
  natgateway: {
    resource: "aws_nat_gateway",
    defaultArgs: {
      allocation_id: "aws_eip.nat.id",
      subnet_id: "aws_subnet.public.id",
      tags: '{ Name = local.name_prefix }',
    },
    outputs: ["id", "public_ip", "private_ip"],
  },
  cloudfront: {
    resource: "aws_cloudfront_distribution",
    defaultArgs: {
      enabled: "true",
      is_ipv6_enabled: "true",
      default_cache_behavior: "{}",
      restrictions: '{ geo_restriction = { restriction_type = "none" } }',
      viewer_certificate: '{ cloudfront_default_certificate = true }',
    },
    outputs: ["id", "arn", "domain_name", "hosted_zone_id"],
  },
  route53: {
    resource: "aws_route53_zone",
    defaultArgs: {
      name: "var.domain_name",
    },
    outputs: ["id", "zone_id", "name_servers"],
  },
  apigateway: {
    resource: "aws_apigatewayv2_api",
    defaultArgs: {
      name: "local.name_prefix",
      protocol_type: '"HTTP"',
      cors_configuration: "{}",
    },
    outputs: ["id", "arn", "api_endpoint"],
  },
  elb: {
    resource: "aws_lb",
    defaultArgs: {
      name: "local.name_prefix",
      internal: "false",
      load_balancer_type: '"application"',
      subnets: "var.public_subnet_ids",
    },
    outputs: ["id", "arn", "dns_name", "zone_id"],
  },
  alb: {
    resource: "aws_lb",
    defaultArgs: {
      name: "local.name_prefix",
      internal: "false",
      load_balancer_type: '"application"',
      subnets: "var.public_subnet_ids",
    },
    outputs: ["id", "arn", "dns_name", "zone_id"],
  },
  transitgateway: {
    resource: "aws_ec2_transit_gateway",
    defaultArgs: {
      description: "local.name_prefix",
    },
    outputs: ["id", "arn"],
  },
  directconnect: {
    resource: "aws_dx_connection",
    defaultArgs: {
      name: "local.name_prefix",
      bandwidth: '"1Gbps"',
      location: "var.dx_location",
    },
    outputs: ["id", "arn"],
  },
  vpcendpoint: {
    resource: "aws_vpc_endpoint",
    defaultArgs: {
      vpc_id: "aws_vpc.main.id",
      service_name: "var.endpoint_service_name",
      vpc_endpoint_type: '"Interface"',
    },
    outputs: ["id", "arn", "dns_entry"],
  },
  globalaccelerator: {
    resource: "aws_globalaccelerator_accelerator",
    defaultArgs: {
      name: "local.name_prefix",
      ip_address_type: '"IPV4"',
      enabled: "true",
    },
    outputs: ["id", "dns_name", "hosted_zone_id"],
  },
  // Containers
  ecr: {
    resource: "aws_ecr_repository",
    defaultArgs: {
      name: "local.name_prefix",
      image_tag_mutability: '"MUTABLE"',
      image_scanning_configuration: '{ scan_on_push = true }',
    },
    outputs: ["id", "arn", "repository_url"],
  },
  // AI/ML
  sagemaker: {
    resource: "aws_sagemaker_domain",
    defaultArgs: {
      domain_name: "local.name_prefix",
      auth_mode: '"IAM"',
      vpc_id: "aws_vpc.main.id",
      subnet_ids: "var.subnet_ids",
      default_user_settings: '{ execution_role = aws_iam_role.sagemaker.arn }',
    },
    outputs: ["id", "arn", "url"],
  },
  bedrock: {
    resource: "aws_bedrockagent_knowledge_base",
    defaultArgs: {
      name: "local.name_prefix",
      role_arn: "aws_iam_role.bedrock.arn",
      knowledge_base_configuration: "{}",
    },
    outputs: ["id", "arn"],
  },
  // Integration / Messaging
  sqs: {
    resource: "aws_sqs_queue",
    defaultArgs: {
      name: "local.name_prefix",
      message_retention_seconds: "86400",
      visibility_timeout_seconds: "30",
    },
    outputs: ["id", "arn", "url"],
  },
  sns: {
    resource: "aws_sns_topic",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["id", "arn", "name"],
  },
  eventbridge: {
    resource: "aws_cloudwatch_event_bus",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["id", "arn", "name"],
  },
  kinesis: {
    resource: "aws_kinesis_stream",
    defaultArgs: {
      name: "local.name_prefix",
      shard_count: "1",
      retention_period: "24",
    },
    outputs: ["id", "arn", "name"],
  },
  msk: {
    resource: "aws_msk_cluster",
    defaultArgs: {
      cluster_name: "local.name_prefix",
      kafka_version: '"3.5.1"',
      number_of_broker_nodes: "3",
      broker_node_group_info: "{}",
    },
    outputs: ["id", "arn", "bootstrap_brokers_tls"],
  },
  // Security
  iam: {
    resource: "aws_iam_role",
    defaultArgs: {
      name: "local.name_prefix",
      assume_role_policy: "data.aws_iam_policy_document.assume_role.json",
    },
    outputs: ["id", "arn", "name", "unique_id"],
  },
  kms: {
    resource: "aws_kms_key",
    defaultArgs: {
      description: "local.name_prefix",
      enable_key_rotation: "true",
      deletion_window_in_days: "7",
    },
    outputs: ["id", "arn", "key_id"],
  },
  waf: {
    resource: "aws_wafv2_web_acl",
    defaultArgs: {
      name: "local.name_prefix",
      scope: '"REGIONAL"',
      default_action: '{ allow = {} }',
      visibility_config: "{}",
    },
    outputs: ["id", "arn"],
  },
  secretsmanager: {
    resource: "aws_secretsmanager_secret",
    defaultArgs: {
      name: "local.name_prefix",
      recovery_window_in_days: "7",
    },
    outputs: ["id", "arn", "name"],
  },
  cognitouserpool: {
    resource: "aws_cognito_user_pool",
    defaultArgs: {
      name: "local.name_prefix",
      auto_verified_attributes: '["email"]',
    },
    outputs: ["id", "arn", "endpoint"],
  },
  // Developer Tools
  codecommit: {
    resource: "aws_codecommit_repository",
    defaultArgs: {
      repository_name: "local.name_prefix",
    },
    outputs: ["id", "arn", "clone_url_http"],
  },
  codebuild: {
    resource: "aws_codebuild_project",
    defaultArgs: {
      name: "local.name_prefix",
      service_role: "aws_iam_role.codebuild.arn",
      artifacts: '{ type = "NO_ARTIFACTS" }',
      environment: '{ compute_type = "BUILD_GENERAL1_SMALL", image = "aws/codebuild/standard:7.0", type = "LINUX_CONTAINER" }',
      source: '{ type = "NO_SOURCE", buildspec = "" }',
    },
    outputs: ["id", "arn", "name"],
  },
  codepipeline: {
    resource: "aws_codepipeline",
    defaultArgs: {
      name: "local.name_prefix",
      role_arn: "aws_iam_role.codepipeline.arn",
      artifact_store: "{}",
      stage: "[]",
    },
    outputs: ["id", "arn"],
  },
  // Analytics
  glue: {
    resource: "aws_glue_catalog_database",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["id", "arn"],
  },
  athena: {
    resource: "aws_athena_workgroup",
    defaultArgs: {
      name: "local.name_prefix",
    },
    outputs: ["id", "arn"],
  },
  redshift: {
    resource: "aws_redshift_cluster",
    defaultArgs: {
      cluster_identifier: "local.name_prefix",
      node_type: '"dc2.large"',
      master_username: "var.db_username",
      master_password: "var.db_password",
      number_of_nodes: "1",
      skip_final_snapshot: "true",
    },
    outputs: ["id", "arn", "endpoint", "dns_name"],
  },
  // Management
  cloudwatch: {
    resource: "aws_cloudwatch_log_group",
    defaultArgs: {
      name: "local.name_prefix",
      retention_in_days: "30",
    },
    outputs: ["id", "arn", "name"],
  },
  cloudtrail: {
    resource: "aws_cloudtrail",
    defaultArgs: {
      name: "local.name_prefix",
      s3_bucket_name: "aws_s3_bucket.trail.id",
      include_global_service_events: "true",
      is_multi_region_trail: "true",
    },
    outputs: ["id", "arn", "home_region"],
  },
  systemsmanager: {
    resource: "aws_ssm_parameter",
    defaultArgs: {
      name: "local.name_prefix",
      type: '"SecureString"',
      value: "var.parameter_value",
    },
    outputs: ["id", "arn", "name", "version"],
  },
};

export function getResourceDef(service: string): TerraformResourceDef | null {
  const key = service.toLowerCase().replace(/\s+/g, "");
  return AWS_RESOURCE_MAP[key] ?? null;
}

export function sanitizeResourceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "")
    .replace(/^(\d)/, "_$1");
}
