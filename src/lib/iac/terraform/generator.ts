import type { AppNode, AppEdge } from "@/lib/store";
import type { IaCGenerator, IaCOutput } from "@/lib/iac/types";
import { getResourceDef, sanitizeResourceName } from "./resource-map";

interface ResourceEntry {
  resourceType: string;
  resourceName: string;
  nodeId: string;
  label: string;
  service: string;
  defaultArgs: Record<string, unknown>;
  outputs: string[];
  customArgs?: Record<string, unknown>;
}

function isAwsNode(node: AppNode): boolean {
  const t = node.type ?? "";
  return t.startsWith("aws-") || (node.data.type ?? "").startsWith("aws-");
}

function buildDependsOn(
  nodeId: string,
  edges: AppEdge[],
  resourceByNodeId: Map<string, ResourceEntry>,
): string[] {
  return edges
    .filter((e) => e.target === nodeId)
    .map((e) => resourceByNodeId.get(e.source))
    .filter((r): r is ResourceEntry => !!r)
    .map((r) => `${r.resourceType}.${r.resourceName}`);
}

function renderArgs(args: Record<string, unknown>, indent = 2): string {
  const pad = " ".repeat(indent);
  return Object.entries(args)
    .map(([k, v]) => {
      const val = String(v);
      // Already looks like HCL expression (no quotes wrapping needed)
      if (val.startsWith('"') || val === "true" || val === "false" || /^\d+$/.test(val) || val.startsWith("var.") || val.startsWith("aws_") || val.startsWith("local.") || val.startsWith("data.") || val.startsWith("{") || val.startsWith("[")) {
        return `${pad}${k} = ${val}`;
      }
      return `${pad}${k} = "${val}"`;
    })
    .join("\n");
}

function generateMainTf(
  resources: ResourceEntry[],
  edges: AppEdge[],
  resourceByNodeId: Map<string, ResourceEntry>,
  providerVersion: string,
  region: string,
): string {
  const blocks: string[] = [
    `terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> ${providerVersion}"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

locals {
  name_prefix  = "\${var.project}-\${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    GeneratedBy = "OpenArchFlow"
  }
}`,
  ];

  for (const res of resources) {
    const dependsOn = buildDependsOn(res.nodeId, edges, resourceByNodeId);
    const mergedArgs = { ...res.defaultArgs, ...res.customArgs };
    const argsHcl = renderArgs(mergedArgs);
    const dependsBlock =
      dependsOn.length > 0
        ? `\n  depends_on = [${dependsOn.join(", ")}]`
        : "";

    blocks.push(
      `resource "${res.resourceType}" "${res.resourceName}" {\n${argsHcl}${dependsBlock}\n}`,
    );
  }

  return blocks.join("\n\n");
}

function generateVariablesTf(region: string): string {
  return `variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "${region}"
}

variable "project" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "my-project"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances"
  type        = string
  default     = "ami-0c02fb55956c7d316" # Amazon Linux 2023 us-east-1
}

variable "db_username" {
  description = "Master username for managed databases"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "db_password" {
  description = "Master password for managed databases"
  type        = string
  sensitive   = true
}

variable "availability_zone" {
  description = "Primary availability zone"
  type        = string
  default     = "\${var.aws_region}a"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "example.com"
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for load balancers"
  type        = list(string)
  default     = []
}

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
  default     = []
}

variable "parameter_value" {
  description = "Value for SSM parameter"
  type        = string
  default     = ""
  sensitive   = true
}

variable "endpoint_service_name" {
  description = "VPC endpoint service name"
  type        = string
  default     = ""
}

variable "dx_location" {
  description = "AWS Direct Connect location"
  type        = string
  default     = "EqDC2"
}
`;
}

function generateOutputsTf(resources: ResourceEntry[]): string {
  const blocks: string[] = [];

  for (const res of resources) {
    for (const attr of res.outputs.slice(0, 2)) {
      const outputName = `${res.resourceName}_${attr}`;
      blocks.push(
        `output "${outputName}" {\n  description = "${res.label} ${attr}"\n  value       = ${res.resourceType}.${res.resourceName}.${attr}\n}`,
      );
    }
  }

  if (blocks.length === 0) {
    return "# No outputs defined — add AWS nodes to the diagram to generate outputs\n";
  }

  return blocks.join("\n\n") + "\n";
}

export class TerraformGenerator implements IaCGenerator {
  id = "terraform";
  name = "HashiCorp Terraform";
  fileExtension = ".tf";

  private providerVersion: string;
  private region: string;

  constructor(options?: { providerVersion?: string; region?: string }) {
    this.providerVersion = options?.providerVersion ?? "5.0";
    this.region = options?.region ?? "us-east-1";
  }

  generate(nodes: AppNode[], edges: AppEdge[], diagramName: string): IaCOutput {
    const warnings: string[] = [];
    const awsNodes = nodes.filter(isAwsNode);

    if (awsNodes.length === 0) {
      warnings.push("No AWS nodes found in diagram. Add AWS services to generate Terraform code.");
    }

    const resourceByNodeId = new Map<string, ResourceEntry>();

    // Build resource entries
    const resources: ResourceEntry[] = [];
    for (const node of awsNodes) {
      const service = node.data.service ?? "";
      const def = getResourceDef(service);

      if (!def) {
        warnings.push(`No Terraform resource mapping for service "${service}" (node: "${node.data.label}"). Skipping.`);
        continue;
      }

      const terraformConfig = node.data.iacConfig?.terraform;
      const resourceType = terraformConfig?.resourceType ?? def.resource;
      const baseLabel = node.data.label || service;
      const resourceName = terraformConfig?.resourceName
        ? sanitizeResourceName(terraformConfig.resourceName)
        : sanitizeResourceName(baseLabel);

      const entry: ResourceEntry = {
        resourceType,
        resourceName,
        nodeId: node.id,
        label: baseLabel,
        service,
        defaultArgs: def.defaultArgs,
        outputs: def.outputs,
        customArgs: terraformConfig?.customArgs as Record<string, unknown> | undefined,
      };

      // Deduplicate resource names
      const existingNames = resources.map((r) => `${r.resourceType}.${r.resourceName}`);
      const key = `${entry.resourceType}.${entry.resourceName}`;
      if (existingNames.includes(key)) {
        entry.resourceName = `${entry.resourceName}_${resources.length}`;
      }

      resources.push(entry);
      resourceByNodeId.set(node.id, entry);
    }

    const mainTf = generateMainTf(resources, edges, resourceByNodeId, this.providerVersion, this.region);
    const variablesTf = generateVariablesTf(this.region);
    const outputsTf = generateOutputsTf(resources);

    return {
      files: [
        { name: "main.tf", content: mainTf },
        { name: "variables.tf", content: variablesTf },
        { name: "outputs.tf", content: outputsTf },
      ],
      warnings,
    };
  }
}
