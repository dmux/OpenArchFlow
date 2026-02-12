import { AWSContextProvider } from '../src/lib/mcp/aws-client';

async function main() {
    console.log("Testing AWS MCP Integration (Search -> Read)...");
    const provider = AWSContextProvider.getInstance();

    try {
        const query = "EC2 instance types";
        console.log(`Querying: "${query}"...`);
        const context = await provider.getContext(query);

        if (context) {
            console.log("✅ Success! Context received:");
            console.log("Length:", context.length);
            console.log("Preview:", context.substring(0, 500) + "...");

            const hasTableOrList = context.includes("|") || context.includes("- ");
            console.log("Contains structured data (markdown table/list):", hasTableOrList ? "Yes" : "No");

        } else {
            console.error("❌ Failed: No context returned.");
        }
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
