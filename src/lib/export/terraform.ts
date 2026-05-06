import type { AppNode, AppEdge } from "@/lib/store";
import { TerraformGenerator } from "@/lib/iac/terraform";

function sanitizeName(name: string): string {
  return name.replace(/\s+/g, "_").replace(/[^\w]/g, "") || "diagram";
}

export function exportTerraform(
  nodes: AppNode[],
  edges: AppEdge[],
  diagramName: string,
  options?: { region?: string; providerVersion?: string },
): void {
  const generator = new TerraformGenerator({
    region: options?.region ?? "us-east-1",
    providerVersion: options?.providerVersion ?? "5.0",
  });

  const output = generator.generate(nodes, edges, diagramName);
  const baseName = sanitizeName(diagramName);

  if (output.files.length === 1) {
    triggerDownload(output.files[0].content, `${baseName}.tf`, "text/plain");
    return;
  }

  // Multi-file: combine all into a single annotated file for simple download
  const combined = output.files
    .map((f) => `# ===== ${f.name} =====\n\n${f.content}`)
    .join("\n\n");

  triggerDownload(combined, `${baseName}.tf`, "text/plain");
}

export function exportTerraformZip(
  nodes: AppNode[],
  edges: AppEdge[],
  diagramName: string,
  options?: { region?: string; providerVersion?: string },
): void {
  // Without JSZip, fall back to multi-file annotated single download
  exportTerraform(nodes, edges, diagramName, options);
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
