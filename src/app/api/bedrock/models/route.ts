import { NextRequest, NextResponse } from "next/server";
import {
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock";

export async function POST(req: NextRequest) {
  try {
    const { region, accessKeyId, secretAccessKey, sessionToken } =
      await req.json();

    const client = new BedrockClient({
      region,
      endpoint: `https://bedrock.${region}.amazonaws.com`,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });

    const result = await client.send(
      new ListFoundationModelsCommand({
        byOutputModality: "TEXT",
      }),
    );

    console.log("[Bedrock models] region:", region, "total summaries:", result.modelSummaries?.length ?? 0);

    const models = (result.modelSummaries ?? [])
      .filter((m) => m.responseStreamingSupported !== false)
      .map((m) => ({
        modelId: m.modelId,
        modelName: m.modelName,
        providerName: m.providerName,
      }));

    return NextResponse.json({ models });
  } catch (error: any) {
    console.error("Bedrock models error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to list models", code: error.name },
      { status: 500 },
    );
  }
}
