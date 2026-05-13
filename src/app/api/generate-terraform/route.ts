import { GoogleGenerativeAI } from "@google/generative-ai";
import { TerraformContextProvider } from "@/lib/mcp/terraform-client";
import { TerraformGenerator } from "@/lib/iac/terraform";
import { getResourceDef } from "@/lib/iac/terraform/resource-map";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodes = [], edges = [], diagramName = "diagram", region = "us-east-1", providerVersion = "5.0", geminiApiKey, useAI = false, model, provider, bedrockCreds, bedrockModel } = body;

    // Always generate the static version first as fallback
    const generator = new TerraformGenerator({ region, providerVersion });
    const staticOutput = generator.generate(nodes, edges, diagramName);

    // If AI generation not requested or no credentials available, return static output
    if (!useAI || (provider !== "bedrock" && !geminiApiKey)) {
      return NextResponse.json({ ...staticOutput, source: "static" });
    }

    // Collect unique resource types from the diagram
    const awsNodes = nodes.filter((n: any) =>
      (n.type ?? "").startsWith("aws-") || (n.data?.type ?? "").startsWith("aws-"),
    );

    const resourceTypes = [...new Set(
      awsNodes
        .map((n: any) => {
          const def = getResourceDef(n.data?.service ?? "");
          return def?.resource;
        })
        .filter(Boolean),
    )] as string[];

    // Get Terraform documentation context from MCP server (optional, non-blocking)
    let terraformContext = "";
    try {
      const mcpClient = TerraformContextProvider.getInstance();
      terraformContext = await Promise.race([
        mcpClient.getEnrichedContext(resourceTypes),
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 8000)),
      ]);
    } catch (mcpError) {
      console.warn("Terraform MCP context fetch failed, proceeding without:", mcpError);
    }

    // Build a summary of the diagram for the prompt
    const diagramSummary = awsNodes
      .map((n: any) => `- ${n.data.label} (${n.data.service ?? n.type})`)
      .join("\n");

    const edgeSummary = edges
      .map((e: any) => {
        const src = nodes.find((n: any) => n.id === e.source);
        const tgt = nodes.find((n: any) => n.id === e.target);
        return `- ${src?.data?.label ?? e.source} → ${tgt?.data?.label ?? e.target}`;
      })
      .join("\n");

    const systemPrompt = `You are a HashiCorp Terraform expert and AWS Solutions Architect.
Your task is to generate production-quality Terraform HCL code for an AWS architecture diagram.

Guidelines:
- Follow Terraform best practices and the AWS Well-Architected Framework
- Use meaningful resource names based on node labels
- Add depends_on only where truly needed (inferred from diagram edges)
- Include security best practices (encryption, least-privilege IAM, private subnets)
- Generate three files: main.tf, variables.tf, outputs.tf
- Use locals for common naming patterns
- Prefer aws provider version ~> ${providerVersion}
- Target region: ${region}
- Add helpful inline comments for non-obvious configurations

Return ONLY valid JSON with this exact structure:
{
  "files": [
    { "name": "main.tf", "content": "..." },
    { "name": "variables.tf", "content": "..." },
    { "name": "outputs.tf", "content": "..." }
  ],
  "warnings": []
}`;

    const userPrompt = `Generate production-ready Terraform code for this AWS architecture: "${diagramName}"

AWS Services in the diagram:
${diagramSummary || "No AWS services found."}

Connections (edges representing data flow / dependencies):
${edgeSummary || "No connections defined."}

Static HCL baseline (enhance and improve this):
\`\`\`hcl
${staticOutput.files.map((f) => `# ${f.name}\n${f.content}`).join("\n\n")}
\`\`\`
${terraformContext ? `\nTerraform Provider Documentation Context:\n${terraformContext}` : ""}

Generate improved, production-ready HCL. Add security groups, IAM roles, and proper resource linking where applicable.`;

    let responseText: string;

    if (provider === "bedrock") {
      if (!bedrockCreds?.accessKeyId) {
        return NextResponse.json({ ...staticOutput, source: "static" });
      }
      const { bedrockConverse } = await import("@/lib/ai/bedrock");
      responseText = await bedrockConverse(
        bedrockCreds,
        bedrockModel || "anthropic.claude-3-5-sonnet-20241022-v2:0",
        systemPrompt,
        userPrompt,
      );
    } else {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const geminiModel = genAI.getGenerativeModel({
        model: model || "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      const result = await geminiModel.generateContent(systemPrompt + "\n\n" + userPrompt);
      responseText = result.response.text();
    }

    let aiOutput: { files: { name: string; content: string }[]; warnings: string[] };

    try {
      const { extractJson } = await import('@/lib/ai/bedrock');
      aiOutput = extractJson(responseText) as typeof aiOutput;
    } catch {
      // AI returned non-JSON — wrap static output
      return NextResponse.json({ ...staticOutput, source: "static", warnings: [...staticOutput.warnings, "AI response could not be parsed. Returning static generation."] });
    }

    return NextResponse.json({ ...aiOutput, source: "ai" });
  } catch (error) {
    console.error("generate-terraform route error:", error);
    const { bedrockErrorCode } = await import('@/lib/ai/bedrock');
    const code = bedrockErrorCode(error);
    const msg = error instanceof Error ? error.message : "Failed to generate Terraform code";
    return NextResponse.json(
      { error: msg, ...(code && { code }) },
      { status: code === "model_not_available" ? 403 : code === "credentials_expired" ? 401 : 500 },
    );
  }
}
