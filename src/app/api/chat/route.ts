import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { prompt, apiKey, currentNodes, currentEdges, history } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
        }

        // Initialize Google Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const hasExistingArchitecture = currentNodes && currentNodes.length > 0;
        let serializedCurrent = "";

        if (hasExistingArchitecture) {
            serializedCurrent = JSON.stringify({ nodes: currentNodes, edges: currentEdges }, null, 2);
        }

        const systemPrompt = `You are an AI Architecture Assistant integrated into an AWS/Cloud diagramming tool (OpenArchFlow).
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

        // Start chat session with history
        const chat = model.startChat({
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
        const text = response.text();

        return NextResponse.json({ response: text });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
