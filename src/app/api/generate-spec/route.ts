import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Input Schema Validation
const GenerateSpecRequestSchema = z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    apiKey: z.string().optional(),
    diagramName: z.string().optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    bedrockCreds: z.any().optional(),
    bedrockModel: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = GenerateSpecRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request format', details: validation.error },
                { status: 400 }
            );
        }

        const { nodes, edges, apiKey, diagramName, model, provider, bedrockCreds, bedrockModel } = validation.data;

        if (nodes.length === 0) {
            return NextResponse.json(
                { error: 'Cannot generate specification for empty diagram' },
                { status: 400 }
            );
        }

        if (provider !== "bedrock" && !apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
        }

        // Serialize diagram for AI processing
        const diagramDescription = serializeDiagram(nodes, edges, diagramName);

        const systemPrompt = `
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

        let markdownSpec: string;

        if (provider === "bedrock") {
            if (!bedrockCreds?.accessKeyId) {
                return NextResponse.json({ error: 'Bedrock credentials required' }, { status: 401 });
            }
            const { bedrockConverse } = await import('@/lib/ai/bedrock');
            markdownSpec = await bedrockConverse(
                bedrockCreds,
                bedrockModel || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
                systemPrompt,
                `Diagram to analyze:\n${diagramDescription}`,
            );
        } else {
            const genAI = new GoogleGenerativeAI(apiKey!);
            const geminiModel = genAI.getGenerativeModel({
                model: model || 'gemini-2.5-flash',
            });
            const result = await geminiModel.generateContent([
                systemPrompt,
                `\n\nDiagram to analyze:\n${diagramDescription}`
            ]);
            const response = await result.response;
            markdownSpec = response.text();
        }

        return NextResponse.json({ specification: markdownSpec });

    } catch (error) {
        console.error('Specification Generation Error:', error);
        const { bedrockErrorCode } = await import('@/lib/ai/bedrock');
        const code = bedrockErrorCode(error);
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json(
            { error: msg, ...(code && { code }) },
            { status: code === "model_not_available" ? 403 : code === "credentials_expired" ? 401 : 500 }
        );
    }
}

function serializeDiagram(nodes: any[], edges: any[], diagramName?: string): string {
    let output = '';

    if (diagramName) {
        output += `Architecture Name: ${diagramName}\n\n`;
    }

    output += '## Components:\n\n';
    nodes.forEach((node, index) => {
        output += `${index + 1}. **${node.data?.label || 'Unnamed Component'}** (${node.data?.service || 'Unknown Service'})\n`;
        output += `   - ID: ${node.id}\n`;
        output += `   - Type: ${node.type || 'default'}\n`;

        if (node.data?.metadata && Object.keys(node.data.metadata).length > 0) {
            output += `   - Metadata:\n`;
            Object.entries(node.data.metadata).forEach(([key, value]) => {
                output += `     - ${key}: ${value}\n`;
            });
        }
        output += '\n';
    });

    output += '\n## Connections:\n\n';
    edges.forEach((edge, index) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        const sourceLabel = sourceNode?.data?.label || edge.source;
        const targetLabel = targetNode?.data?.label || edge.target;

        output += `${index + 1}. **${sourceLabel}** → **${targetLabel}**`;
        if (edge.label) {
            output += ` (${edge.label})`;
        }
        output += '\n';
    });

    return output;
}
