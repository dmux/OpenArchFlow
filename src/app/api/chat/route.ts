import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { buildDiagramChatPrompt } from '@/lib/ai/prompts';

export async function POST(req: NextRequest) {
    try {
        const { prompt, apiKey, currentNodes, currentEdges, history, model, provider, bedrockCreds, bedrockModel } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const systemPrompt = buildDiagramChatPrompt({ currentNodes, currentEdges });

        let text: string;

        if (provider === "bedrock") {
            if (!bedrockCreds?.accessKeyId) {
                return NextResponse.json({ error: 'Bedrock credentials required' }, { status: 401 });
            }
            const { bedrockConverseChat } = await import('@/lib/ai/bedrock');
            text = await bedrockConverseChat(
                bedrockCreds,
                bedrockModel || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
                systemPrompt,
                history || [],
                prompt,
            );
        } else {
            if (!apiKey) {
                return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
            }
            // Initialize Google Gemini
            const genAI = new GoogleGenerativeAI(apiKey);
            const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-2.5-flash' });

            // Start chat session with history
            const chat = geminiModel.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: systemPrompt }]
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood. I will act as the AI Architecture Assistant and use the provided diagram context for my responses." }]
                    },
                    ...(history || []).map((msg: any) => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    }))
                ]
            });

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            text = response.text();
        }

        return NextResponse.json({ response: text });

    } catch (error) {
        console.error('Chat API Error:', error);
        const { bedrockErrorCode } = await import('@/lib/ai/bedrock');
        const code = bedrockErrorCode(error);
        const msg = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json(
            { error: msg, ...(code && { code }) },
            { status: code === "model_not_available" ? 403 : code === "credentials_expired" ? 401 : 500 }
        );
    }
}
