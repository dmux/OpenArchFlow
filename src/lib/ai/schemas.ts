import { z } from "zod";

export const architectureSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z
        .enum(["aws-compute", "aws-database", "aws-network", "aws-storage", "default"])
        .default("default"),
      data: z.object({
        label: z.string(),
        service: z.string(),
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    }),
  ),
  recommendations: z.array(z.string()).optional(),
});

export type ArchitectureResult = z.infer<typeof architectureSchema>;

export const terraformOutputSchema = z.object({
  files: z.array(z.object({ name: z.string(), content: z.string() })),
  warnings: z.array(z.string()),
});

export type TerraformAIOutput = z.infer<typeof terraformOutputSchema>;

export const terraformResponseJsonSchema = {
  type: "object",
  properties: {
    files: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          content: { type: "string" },
        },
        required: ["name", "content"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["files", "warnings"],
  additionalProperties: false,
} satisfies Record<string, unknown>;

export function sanitizeArchitecture(architecture: ArchitectureResult): ArchitectureResult {
  const validNodeIds = new Set(architecture.nodes.map((node) => node.id));
  return {
    ...architecture,
    edges: architecture.edges.filter(
      (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target),
    ),
  };
}

