import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
} from "@aws-sdk/client-bedrock-runtime";

export function extractJson(text: string): unknown {
  // Direct parse (Gemini already returns clean JSON)
  try { return JSON.parse(text); } catch {}
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }
  // Last resort: grab first { ... } block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) { return JSON.parse(text.slice(start, end + 1)); }
  throw new Error("Model returned no valid JSON");
}

export function bedrockErrorCode(error: unknown): "model_not_available" | "credentials_expired" | null {
  const msg = error instanceof Error ? error.message : "";
  if (msg.includes("is not available for this account")) return "model_not_available";
  if (/ExpiredToken|InvalidSignature|credentials.*expir/i.test(msg)) return "credentials_expired";
  return null;
}

export interface BedrockCredentialInput {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

function makeClient(creds: BedrockCredentialInput): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: creds.region,
    endpoint: `https://bedrock-runtime.${creds.region}.amazonaws.com`,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
}

function extractText(blocks: ContentBlock[] | undefined): string {
  if (!blocks) return "";
  const block = blocks.find((b) => "text" in b && typeof b.text === "string");
  return block && "text" in block ? (block.text as string) : "";
}

export async function bedrockConverse(
  creds: BedrockCredentialInput,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = makeClient(creds);
  const result = await client.send(
    new ConverseCommand({
      modelId,
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userPrompt }] }],
      inferenceConfig: { temperature: 0.2, maxTokens: 8192 },
    }),
  );
  return extractText(result.output?.message?.content);
}

export async function bedrockConverseChat(
  creds: BedrockCredentialInput,
  modelId: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  newUserMessage: string,
): Promise<string> {
  const client = makeClient(creds);
  const messages: Message[] = [
    ...history.map((h) => ({
      role: (h.role === "assistant" || h.role === "model" ? "assistant" : "user") as "user" | "assistant",
      content: [{ text: h.content }] as ContentBlock[],
    })),
    { role: "user" as const, content: [{ text: newUserMessage }] },
  ];
  const result = await client.send(
    new ConverseCommand({
      modelId,
      system: [{ text: systemPrompt }],
      messages,
      inferenceConfig: { temperature: 0.7, maxTokens: 4096 },
    }),
  );
  return extractText(result.output?.message?.content);
}
