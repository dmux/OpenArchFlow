import { AWSContextProvider } from '../src/lib/mcp/aws-client';

async function main() {
    console.log("Testing AWS MCP Integration...");
    const provider = AWSContextProvider.getInstance();

    try {
        const query = "AWS Lambda limits";
        console.log(`Querying: "${query}"...`);
        const context = await provider.getContext(query);

        if (context) {
            console.log("✅ Success! Context received:");
            console.log(context.substring(0, 500) + "..."); // Print first 500 chars
        } else {
            console.error("❌ Failed: No context returned.");
        }
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
