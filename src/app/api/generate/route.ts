import { GoogleGenerativeAI } from '@google/generative-ai';
import { AWSContextProvider } from '@/lib/mcp/aws-client';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { architectureSchema } from '@/lib/ai/schemas';
import { buildArchitecturePrompt } from '@/lib/ai/prompts';

// Initialize Redis and Ratelimit
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '24 h'),
});

export async function POST(req: NextRequest) {
    try {
        // 1. Rate Limiting
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

        // Check if Upstash is configured before applying rate limit
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            try {
                const { success } = await ratelimit.limit(ip);
                if (!success) {
                    return NextResponse.json(
                        { error: 'Daily rate limit exceeded (5 requests/day). Support this project to unlock more.' },
                        { status: 429 }
                    );
                }
            } catch (redisError) {
                console.warn("Rate limit check failed, proceeding anyway:", redisError);
            }
        }

        const { prompt, apiKey, currentNodes, currentEdges, model, provider, bedrockCreds, bedrockModel } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // 2. Fetch AWS Documentation Context
        let awsContext = "";
        try {
            console.log("Fetching AWS MCP Context...");
            const awsProvider = AWSContextProvider.getInstance();
            awsContext = await awsProvider.getContext(prompt);
            console.log("AWS MCP Context fetched:", awsContext ? "Yes" : "No");
        } catch (mcpError) {
            console.error("Failed to fetch AWS context:", mcpError);
            // Continue without context
        }

        const systemPrompt = buildArchitecturePrompt({
            currentNodes,
            currentEdges,
            awsContext,
        });

        // 3. Generate via Bedrock or Gemini
        let text: string;

        if (provider === "bedrock") {
            if (!bedrockCreds?.accessKeyId) {
                return NextResponse.json({ error: 'Bedrock credentials required' }, { status: 401 });
            }
            const { bedrockConverse } = await import('@/lib/ai/bedrock');
            text = await bedrockConverse(bedrockCreds, bedrockModel || 'anthropic.claude-3-5-sonnet-20241022-v2:0', systemPrompt, prompt);
        } else {
            if (!apiKey) {
                return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
            }
            const genAI = new GoogleGenerativeAI(apiKey);
            const geminiModel = genAI.getGenerativeModel({
                model: model || 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await geminiModel.generateContent([systemPrompt, prompt]);
            const geminiResponse = await result.response;
            text = geminiResponse.text();
        }

        // 3. Validation & Sanitization
        let rawJson;
        try {
            const { extractJson } = await import('@/lib/ai/bedrock');
            rawJson = extractJson(text);
        } catch (e) {
            console.error("AI returned invalid JSON:", text);
            return NextResponse.json({ error: 'Failed to generate valid structure' }, { status: 500 });
        }

        const validation = architectureSchema.safeParse(rawJson);

        if (!validation.success) {
            console.error("Schema validation failed:", validation.error);
            return NextResponse.json({ error: 'AI generated invalid schema', details: validation.error }, { status: 422 });
        }

        const sanitizedData = validation.data;

        // Filter edges to ensure integrity (remove edges connecting to non-existent nodes)
        const validNodeIds = new Set(sanitizedData.nodes.map(n => n.id));
        sanitizedData.edges = sanitizedData.edges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));

        return NextResponse.json(sanitizedData);

    } catch (error) {
        console.error('Generation Error:', error);
        const { bedrockErrorCode } = await import('@/lib/ai/bedrock');
        const code = bedrockErrorCode(error);
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json(
            { error: msg, ...(code && { code }) },
            { status: code === "model_not_available" ? 403 : code === "credentials_expired" ? 401 : 500 }
        );
    }
}
