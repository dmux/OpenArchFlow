import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildSpecificationPrompt, serializeDiagram } from '@/lib/ai/prompts';

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

        const systemPrompt = buildSpecificationPrompt();

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
