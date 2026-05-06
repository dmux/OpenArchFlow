import type { AppNode, AppEdge } from "@/lib/store";

export interface IaCOutput {
  files: { name: string; content: string }[];
  warnings: string[];
}

export interface IaCGenerator {
  id: string;
  name: string;
  fileExtension: string;
  generate(nodes: AppNode[], edges: AppEdge[], diagramName: string): IaCOutput;
}

export interface TerraformNodeConfig {
  resourceType?: string;
  resourceName?: string;
  customArgs?: Record<string, unknown>;
}
