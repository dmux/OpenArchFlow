import { GoogleGenerativeAI } from '@google/generative-ai';
import { AWSContextProvider } from '@/lib/mcp/aws-client';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Initialize Redis and Ratelimit
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '24 h'),
});

// Architecture Schema Validation
const NodeSchema = z.object({
    id: z.string(),
    type: z.enum(['aws-compute', 'aws-database', 'aws-network', 'aws-storage', 'default']).default('default'),
    data: z.object({
        label: z.string(),
        service: z.string(),
        metadata: z.record(z.string(), z.string()).optional(),
    }),
});

const EdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
});

const ArchitectureSchema = z.object({
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
    recommendations: z.array(z.string()).optional(),
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

        const hasExistingArchitecture = currentNodes && currentNodes.length > 0;
        let serializedCurrent = "";

        if (hasExistingArchitecture) {
            serializedCurrent = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
        }

        const systemPrompt = `
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

        const validation = ArchitectureSchema.safeParse(rawJson);

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
