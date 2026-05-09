export type DeployStatus =
  | "idle"
  | "pending"
  | "deploying"
  | "deployed"
  | "error"
  | "not_supported";

export interface MiniStackNodeState {
  status: DeployStatus;
  resourceId?: string;
  resourceArn?: string;
  endpoint?: string;
  errorMessage?: string;
  deployedAt?: number;
  resourceNameOverride?: string;
}

export interface MiniStackConfig {
  endpoint: string;
  region: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  enabled: boolean;
}

export interface MiniStackDeployRequest {
  nodeId: string;
  service: string;
  label: string;
  config: MiniStackConfig;
  nodeConfig?: Record<string, unknown>;
}

export interface MiniStackDeployResult {
  nodeId: string;
  status: DeployStatus;
  resourceId?: string;
  resourceArn?: string;
  endpoint?: string;
  errorMessage?: string;
}

export const DEFAULT_MINISTACK_CONFIG: MiniStackConfig = {
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  accountId: "000000000000",
  accessKeyId: "test",
  secretAccessKey: "test",
  enabled: false,
};
