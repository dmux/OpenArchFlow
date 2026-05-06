import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface TerraformResourceSchema {
  resource: string;
  description: string;
  arguments: Record<string, { required: boolean; type: string; description: string }>;
  attributes: Record<string, { type: string; description: string }>;
}

export class TerraformContextProvider {
  private static instance: TerraformContextProvider;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  private constructor() {}

  public static getInstance(): TerraformContextProvider {
    if (!TerraformContextProvider.instance) {
      TerraformContextProvider.instance = new TerraformContextProvider();
    }
    return TerraformContextProvider.instance;
  }

  private async connect() {
    if (this.client) return;

    this.transport = new StdioClientTransport({
      command: "docker",
      args: ["run", "-i", "--rm", "hashicorp/terraform-mcp-server"],
    });

    this.client = new Client(
      { name: "open-arch-flow-terraform-client", version: "1.0.0" },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
  }

  public async listProviderResources(provider = "hashicorp/aws"): Promise<string[]> {
    try {
      await this.connect();
      if (!this.client) return [];

      const result = await this.client.callTool({
        name: "listProviderResources",
        arguments: { provider },
      });

      if (!result?.content || !Array.isArray(result.content)) return [];

      const text = result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join("");

      const parsed = JSON.parse(text);
      return parsed.resources ?? [];
    } catch (error) {
      console.error("Terraform MCP: listProviderResources failed:", error);
      return [];
    }
  }

  public async resolveProviderDocPage(resourceType: string, provider = "hashicorp/aws"): Promise<string> {
    try {
      await this.connect();
      if (!this.client) return "";

      const result = await this.client.callTool({
        name: "resolveProviderDocPage",
        arguments: { provider, resource: resourceType },
      });

      if (!result?.content || !Array.isArray(result.content)) return "";

      const content = result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join("\n\n");

      return content.length > 15000
        ? content.substring(0, 15000) + "\n...[truncated]..."
        : content;
    } catch (error) {
      console.error("Terraform MCP: resolveProviderDocPage failed:", error);
      return "";
    }
  }

  public async searchProviderDocs(query: string, provider = "hashicorp/aws"): Promise<string> {
    try {
      await this.connect();
      if (!this.client) return "";

      const result = await this.client.callTool({
        name: "searchProviderDocs",
        arguments: { provider, query },
      });

      if (!result?.content || !Array.isArray(result.content)) return "";

      return result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join("\n\n");
    } catch (error) {
      console.error("Terraform MCP: searchProviderDocs failed:", error);
      return "";
    }
  }

  public async getEnrichedContext(resourceTypes: string[]): Promise<string> {
    const contextParts: string[] = [];

    for (const resourceType of resourceTypes.slice(0, 5)) {
      const doc = await this.resolveProviderDocPage(resourceType);
      if (doc) {
        contextParts.push(`\n--- TERRAFORM DOCS: ${resourceType} ---\n${doc}\n--- END ---`);
      }
    }

    return contextParts.join("\n\n");
  }
}
