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

            console.log(`MCP: Searching for "${query}"...`);

            // 1. Search for documentation
            const searchResult = await this.client.callTool({
                name: "search_documentation",
                arguments: {
                    search_phrase: query,
                    limit: 1, // We only need the top result to read
                },
            });

            if (!searchResult || !searchResult.content || !Array.isArray(searchResult.content)) {
                console.warn("MCP: Invalid search result format", searchResult);
                return "";
            }

            const searchJsonString = searchResult.content
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.text)
                .join("");

            if (!searchJsonString) return "";

            let searchData: any;
            try {
                searchData = JSON.parse(searchJsonString);
            } catch (e) {
                console.warn("MCP: Failed to parse search JSON", e);
                return "";
            }

            const topResult = searchData.search_results?.[0];
            if (!topResult || !topResult.url) {
                console.warn("MCP: No valid URL found in search results");
                return "";
            }

            const targetUrl = topResult.url;
            console.log(`MCP: Found relevant page: ${targetUrl}. Fetching content...`);

            // 2. Read the full documentation page
            const readResult = await this.client.callTool({
                name: "read_documentation",
                arguments: {
                    url: targetUrl
                }
            });

            if (!readResult || !readResult.content || !Array.isArray(readResult.content)) {
                console.warn("MCP: Invalid read result format");
                return "";
            }

            const fullContent = readResult.content
                .filter((item: any) => item.type === "text")
                .map((item: any) => item.text)
                .join("\n\n");

            // Truncate if too long to avoid token limits (e.g., 20k chars)
            const truncatedContent = fullContent.length > 20000
                ? fullContent.substring(0, 20000) + "\n...[truncated]..."
                : fullContent;

            return `\n\n--- AWS DOCUMENTATION CONTEXT (${targetUrl}) ---\n${truncatedContent}\n--- END CONTEXT ---\n`;

        } catch (error) {
            console.error("MCP: Failed to fetch AWS context:", error);
            return "";
        }
    }

    // Optional: Cleanup method if we want to close connection (though for serverless route it might just die)
    // For now we'll let it be managed by the process lifecycle or re-instantiated
}
