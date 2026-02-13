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

    public async generateSpecification(nodes: any[], edges: any[], diagramName?: string): Promise<string> {
        if (!this.engine) {
            throw new Error("WebLLM Engine not initialized");
        }

        // Serialize diagram
        const diagramDescription = this.serializeDiagram(nodes, edges, diagramName);

        const systemPrompt = `
You are an AWS Solutions Architect and Technical Writer.

Analyze the architecture diagram and generate a technical specification in Markdown format.

Include these sections:

1. **Executive Summary**: Brief overview (2-3 sentences)

2. **Architecture Overview**: High-level design description

3. **Components**: Detailed component descriptions with purpose and configuration

4. **Data Flow**: How requests flow through the system step-by-step

5. **Security**: Security considerations and best practices

6. **Scalability**: Performance and scale recommendations

**FORMATTING RULES:**
- Use proper heading hierarchy (##, ###)
- Add blank lines between all sections
- Add blank lines before and after lists
- Use bullet points with proper spacing
- Ensure readability with adequate whitespace

**OUTPUT FORMAT:**
- Start with # title
- Add TWO blank lines after major sections (##)
- Add ONE blank line after subsections (###)
- Add blank lines before and after all lists

Output ONLY the markdown content, no preamble.
        `.trim();

        const response = await this.engine.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: diagramDescription }
            ],
            temperature: 0.3,
        });

        return response.choices[0].message.content || "# Error\n\nFailed to generate specification.";
    }

    private serializeDiagram(nodes: any[], edges: any[], diagramName?: string): string {
        let output = '';

        if (diagramName) {
            output += `Architecture: ${diagramName}\n\n`;
        }

        output += '## Components:\n\n';
        nodes.forEach((node, i) => {
            output += `${i + 1}. ${node.data?.label || 'Component'} (${node.data?.service || 'Service'})\n`;
        });

        output += '\n## Connections:\n\n';
        edges.forEach((edge, i) => {
            const src = nodes.find(n => n.id === edge.source)?.data?.label || edge.source;
            const tgt = nodes.find(n => n.id === edge.target)?.data?.label || edge.target;
            output += `${i + 1}. ${src} → ${tgt}${edge.label ? ` (${edge.label})` : ''}\n`;
        });

        return output;
    }

    public isReady(): boolean {
        return !!this.engine;
    }
}

