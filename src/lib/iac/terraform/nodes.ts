import type { AppNode } from "@/lib/store";

type NodeLike = { type?: string; data?: { type?: unknown } };

function typeStartsWith(node: NodeLike, prefix: string): boolean {
  const t = node.type ?? "";
  const dataType = typeof node.data?.type === "string" ? node.data.type : "";
  return t.startsWith(prefix) || dataType.startsWith(prefix);
}

export function isAwsNode(node: NodeLike): boolean {
  return typeStartsWith(node, "aws-");
}

export function isDatabricksNode(node: NodeLike): boolean {
  return typeStartsWith(node, "databricks-");
}

/** Nodes the Terraform generator knows how to map (AWS and Databricks). */
export function isTerraformNode(node: AppNode | NodeLike): boolean {
  return isAwsNode(node) || isDatabricksNode(node);
}
