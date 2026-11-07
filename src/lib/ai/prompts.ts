export interface PromptDiagramNode {
  id: string;
  type?: string;
  data?: {
    label?: string;
    service?: string;
    metadata?: Record<string, unknown>;
    type?: string;
  };
}

export interface PromptDiagramEdge {
  id?: string;
  source: string;
  target: string;
  label?: unknown;
}

export function buildArchitecturePrompt(input: {
  currentNodes?: readonly unknown[];
  currentEdges?: readonly unknown[];
  awsContext?: string;
}): string {
  const hasExistingArchitecture = Boolean(input.currentNodes?.length);
  const serializedCurrent = hasExistingArchitecture
    ? JSON.stringify({ nodes: input.currentNodes, edges: input.currentEdges })
    : "";
  const awsContext = input.awsContext ?? "";

  return `
      You are an AWS Certified Solutions Architect and DevOps Expert.
      Your goal is to design or modify a high-quality, production-ready AWS architecture based on the user's request.
      
      ${awsContext ? `\nIMPORTANT: Use the following AWS Documentation context to inform your design decisions and service selection:\n${awsContext}\n` : ""}

      Follow the **AWS Well-Architected Framework**:
      1. **Operational Excellence**: Include monitoring/logging (CloudWatch).
      2. **Security**: Use private subnets, WAF, IAM where appropriate.
      3. **Reliability**: Suggest Multi-AZ RDS, Auto Scaling Groups.
      4. **Performance**: Use caching (ElastiCache, CloudFront).
      5. **Cost Optimization**: Select appropriate instance types (e.g., t3.micro for starters).

      **Output Format**:
      Return a strictly valid JSON object.
      
      Nodes Schema:
      - id: unique string (e.g., "node-1")
      - type: "aws-compute" | "aws-database" | "aws-network" | "aws-storage" | "default"
        (IMPORTANT: You MUST use ONLY these exact values for 'type'. Do NOT invent others like 'aws-analytics' or 'aws-security'.)
      - data: { 
          label: string (e.g., "Web Server"), 
          service: string (Exact AWS Service Name, e.g., "EC2", "Lambda", "S3", "DynamoDB"), 
          metadata: { ...key-value pairs... } 
          (IMPORTANT: All metadata values MUST be strings. distinct values should be comma-joined. Do NOT use arrays or objects.)
        }

      Edges Schema:
      - id: unique string
      - source: id of source node
      - target: id of target node
      - label: description of connection (e.g., "sends logs", "queries")

      ${hasExistingArchitecture ?
                `**CRITICAL INSTRUCTION: EXISTING ARCHITECTURE**
      The user ALREADY HAS an existing architecture.
      CURRENT ARCHITECTURE JSON:
      ${serializedCurrent}
      
      Your task is to MODIFY this architecture based on the user's request.
      IMPORTANT: You MUST return the FULL updated JSON, containing EVERYTHING from the existing architecture PLUS any new nodes or edges you add or modifications you make.
      DO NOT remove existing components unless requested. Maintain existing IDs.`
                :
                `**Example**:
      If user asks for "Serverless API", include API Gateway -> Lambda -> DynamoDB, plus CloudWatch for logs.`}
    `;
}

export function buildDiagramChatPrompt(input: {
  currentNodes?: readonly unknown[];
  currentEdges?: readonly unknown[];
}): string {
  const hasExistingArchitecture = Boolean(input.currentNodes?.length);
  const serializedCurrent = hasExistingArchitecture
    ? JSON.stringify({ nodes: input.currentNodes, edges: input.currentEdges }, null, 2)
    : "";

  return `You are an AI Architecture Assistant integrated into an AWS/Cloud diagramming tool (OpenArchFlow).
Your goal is to help the user understand, improve, and discuss their current architecture diagram.

${hasExistingArchitecture ?
                (`CURRENT ARCHITECTURE JSON:
---
${serializedCurrent}
---`) :
                (`The user currently has an empty canvas.`)}

Your responses should be formatted in Markdown, be concise yet informative, and directly address the user's prompt.
When discussing specific components, refer to them by their label or service name as present in the diagram.
Do NOT generate a JSON schema of the architecture unless explicitly asked to provide JSON. Provide textual analysis, explanations, pricing estimates, or security reviews as requested.`;
}

export function buildSpecificationPrompt(): string {
  return `
You are an experienced Solutions Architect and Technical Writer specializing in AWS cloud architectures.

Your task is to analyze the provided architecture diagram and generate a comprehensive, professional technical specification document in Markdown format.

The specification should include:

1. **Executive Summary**: Brief overview (2-3 sentences) of what this architecture accomplishes

2. **Architecture Overview**: High-level description of the system design and its purpose

3. **Components**: Detailed description of each component/service:
   - Purpose and responsibility
   - AWS service being used
   - Key configurations (if mentioned in metadata)
   - Why this service was chosen

4. **Data Flow**: Step-by-step description of how data/requests flow through the system

5. **Security Considerations**: Security best practices and recommendations

6. **Scalability & Performance**: How the architecture handles scale and performance requirements

7. **Cost Optimization**: Estimated cost considerations and optimization tips

8. **Deployment Recommendations**: Best practices for deploying this architecture

9. **Monitoring & Observability**: Recommended monitoring and logging strategies

**IMPORTANT FORMATTING RULES:**
- Use clear heading hierarchy (##, ###, ####)
- Add blank lines between all sections and paragraphs
- Add blank lines before and after lists
- Add blank lines before and after code blocks
- Use bullet points for lists with proper indentation
- Use tables for component comparisons when applicable
- Maintain professional, technical tone
- Ensure proper spacing for readability

**OUTPUT FORMAT:**
- Start with # title
- Add TWO blank lines after each major section (##)
- Add ONE blank line after each subsection (###)
- Add blank lines before and after all lists and code blocks

DO NOT include any preamble like "Here's the specification" - just output the markdown document directly.
        `.trim();
}

export function serializeDiagram(
  nodes: readonly PromptDiagramNode[],
  edges: readonly PromptDiagramEdge[],
  diagramName?: string,
): string {
  let output = "";

  if (diagramName) output += `Architecture Name: ${diagramName}\n\n`;

  output += "## Components:\n\n";
  nodes.forEach((node, index) => {
    output += `${index + 1}. **${node.data?.label || "Unnamed Component"}** (${node.data?.service || "Unknown Service"})\n`;
    output += `   - ID: ${node.id}\n`;
    output += `   - Type: ${node.type || "default"}\n`;

    if (node.data?.metadata && Object.keys(node.data.metadata).length > 0) {
      output += "   - Metadata:\n";
      Object.entries(node.data.metadata).forEach(([key, value]) => {
        output += `     - ${key}: ${String(value)}\n`;
      });
    }
    output += "\n";
  });

  output += "\n## Connections:\n\n";
  edges.forEach((edge, index) => {
    const sourceNode = nodes.find((node) => node.id === edge.source);
    const targetNode = nodes.find((node) => node.id === edge.target);
    const sourceLabel = sourceNode?.data?.label || edge.source;
    const targetLabel = targetNode?.data?.label || edge.target;

    output += `${index + 1}. **${sourceLabel}** → **${targetLabel}**`;
    if (edge.label) output += ` (${String(edge.label)})`;
    output += "\n";
  });

  return output;
}

export function buildTerraformPrompts(input: {
  nodes: readonly PromptDiagramNode[];
  edges: readonly PromptDiagramEdge[];
  diagramName: string;
  region: string;
  providerVersion: string;
  staticFiles: readonly { name: string; content: string }[];
  terraformContext?: string;
}): { instructions: string; input: string } {
  const awsNodes = input.nodes.filter(
    (node) =>
      (node.type ?? "").startsWith("aws-") ||
      (node.data?.type ?? "").startsWith("aws-"),
  );
  const diagramSummary = awsNodes
    .map((node) => `- ${node.data?.label} (${node.data?.service ?? node.type})`)
    .join("\n");
  const edgeSummary = input.edges
    .map((edge) => {
      const source = input.nodes.find((node) => node.id === edge.source);
      const target = input.nodes.find((node) => node.id === edge.target);
      return `- ${source?.data?.label ?? edge.source} → ${target?.data?.label ?? edge.target}`;
    })
    .join("\n");
  const instructions = `You are a HashiCorp Terraform expert and AWS Solutions Architect.
Your task is to generate production-quality Terraform HCL code for an AWS architecture diagram.

Guidelines:
- Follow Terraform best practices and the AWS Well-Architected Framework
- Use meaningful resource names based on node labels
- Add depends_on only where truly needed (inferred from diagram edges)
- Include security best practices (encryption, least-privilege IAM, private subnets)
- Generate three files: main.tf, variables.tf, outputs.tf
- Use locals for common naming patterns
- Prefer aws provider version ~> ${input.providerVersion}
- Target region: ${input.region}
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
  const prompt = `Generate production-ready Terraform code for this AWS architecture: "${input.diagramName}"

AWS Services in the diagram:
${diagramSummary || "No AWS services found."}

Connections (edges representing data flow / dependencies):
${edgeSummary || "No connections defined."}

Static HCL baseline (enhance and improve this):
\`\`\`hcl
${input.staticFiles.map((file) => `# ${file.name}\n${file.content}`).join("\n\n")}
\`\`\`
${input.terraformContext ? `\nTerraform Provider Documentation Context:\n${input.terraformContext}` : ""}

Generate improved, production-ready HCL. Add security groups, IAM roles, and proper resource linking where applicable.`;

  return { instructions, input: prompt };
}
