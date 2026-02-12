import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class AWSContextProvider {
    private static instance: AWSContextProvider;
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;

    private constructor() { }

    public static getInstance(): AWSContextProvider {
        if (!AWSContextProvider.instance) {
            AWSContextProvider.instance = new AWSContextProvider();
        }
        return AWSContextProvider.instance;
    }

    private async connect() {
        if (this.client) return;

        this.transport = new StdioClientTransport({
            command: "uvx",
            args: ["awslabs.aws-documentation-mcp-server@latest"],
        });

        this.client = new Client(
            {
                name: "open-arch-flow-client",
                version: "1.0.0",
            },
            {
                capabilities: {},
            }
        );

        await this.client.connect(this.transport);
    }

    public async getContext(query: string): Promise<string> {
        try {
            await this.connect();

            if (!this.client) {
                throw new Error("MCP Client failed to initialize");
            }

            // Call the 'search_documentation' tool
            const result = await this.client.callTool({
                name: "search_documentation",
                arguments: {
                    search_phrase: query,
                    limit: 3, // Fetch top 3 relevant docs
                },
            });

            // Parse and format the result
            // The result content is typically an array of text or image content
            // We expect text content with documentation snippets
            if (!result || !result.content || !Array.isArray(result.content)) {
                console.warn("MCP: Invalid result format", result);
                return "";
            }

            const textContent = result.content
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.text)
                .join("\n\n");

            if (!textContent) {
                return "";
            }

            return `\n\n--- AWS DOCUMENTATION CONTEXT ---\n${textContent}\n--- END CONTEXT ---\n`;

        } catch (error) {
            console.error("MCP: Failed to fetch AWS context:", error);
            // Fail gracefully - don't block generation if MCP fails
            return "";
        }
    }

    // Optional: Cleanup method if we want to close connection (though for serverless route it might just die)
    // For now we'll let it be managed by the process lifecycle or re-instantiated
}
