import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

// Defines the model to use. Phi-3 is a good balance of speed and quality for this use case.
const SELECTED_MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

export class WebLLMService {
    private static instance: WebLLMService;
    private engine: MLCEngine | null = null;
    private isLoading = false;

    private constructor() { }

    public static getInstance(): WebLLMService {
        if (!WebLLMService.instance) {
            WebLLMService.instance = new WebLLMService();
        }
        return WebLLMService.instance;
    }

    public async initialize(onProgress: InitProgressCallback): Promise<void> {
        if (this.engine) return;

        this.isLoading = true;
        try {
            this.engine = await CreateMLCEngine(
                SELECTED_MODEL,
                { initProgressCallback: onProgress }
            );
        } finally {
            this.isLoading = false;
        }
    }

    public async generate(prompt: string): Promise<string> {
        if (!this.engine) {
            throw new Error("WebLLM Engine not initialized");
        }

        const systemPrompt = `
      You are an AWS Architecture Expert.
      Generate a JSON representation of an architecture.
      
      Nodes must have:
      - id: unique string
      - type: one of [aws-compute, aws-database, aws-network, aws-storage] or 'default'
      - data: { label: string, service: string (e.g. EC2, S3), metadata: {} }

      Edges:
      - id, source, target, label

      Return ONLY valid JSON matching this schema:
      { "nodes": [], "edges": [] }
    `;

        const response = await this.engine.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Low temperature for consistent JSON
        });

        return response.choices[0].message.content || "{}";
    }

    public isReady(): boolean {
        return !!this.engine;
    }
}
