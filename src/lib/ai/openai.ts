import OpenAI, { APIConnectionError, APIError } from "openai";
import type { ResponseFormatTextJSONSchemaConfig } from "openai/resources/responses/responses";

const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

export type OpenAIProviderErrorCode =
  | "invalid_api_key"
  | "missing_model_read_permission"
  | "insufficient_quota"
  | "rate_limit"
  | "model_unavailable"
  | "network"
  | "invalid_response"
  | "unknown";

const OPENAI_ERROR_MESSAGES: Record<OpenAIProviderErrorCode, string> = {
  invalid_api_key: "OpenAI rejected this API key. Check it and try again.",
  missing_model_read_permission:
    "This key cannot list models. Grant it model.read permission in your OpenAI project.",
  insufficient_quota:
    "Your OpenAI account has no available API credits or has reached its spending limit.",
  rate_limit: "OpenAI is rate limiting requests. Wait a moment and try again.",
  model_unavailable:
    "The selected OpenAI model is unavailable to this key. Choose another model or check access.",
  network: "Could not reach OpenAI. Check your connection and try again.",
  invalid_response:
    "OpenAI returned a response that did not match the required format.",
  unknown: "The OpenAI request failed. Check the key and model, then try again.",
};

export class OpenAIProviderError extends Error {
  readonly code: OpenAIProviderErrorCode;

  constructor(code: OpenAIProviderErrorCode) {
    super(OPENAI_ERROR_MESSAGES[code]);
    this.name = "OpenAIProviderError";
    this.code = code;
  }
}

export function mapOpenAIError(
  error: unknown,
  context: { validatingKey?: boolean } = {},
): OpenAIProviderError {
  if (error instanceof OpenAIProviderError) return error;

  if (error instanceof APIConnectionError) {
    return new OpenAIProviderError("network");
  }

  if (error instanceof APIError) {
    const code = (error.code ?? error.type ?? "").toLowerCase();

    if (error.status === 401 || code.includes("invalid_api_key")) {
      return new OpenAIProviderError("invalid_api_key");
    }
    if (
      ["insufficient_quota", "billing_hard_limit_reached", "billing_not_active"].some(
        (quotaCode) => code.includes(quotaCode),
      )
    ) {
      return new OpenAIProviderError("insufficient_quota");
    }
    if (error.status === 429) {
      return new OpenAIProviderError("rate_limit");
    }
    if (error.status === 403 && context.validatingKey) {
      return new OpenAIProviderError("missing_model_read_permission");
    }
    if (error.status === 403 || error.status === 404 || code.includes("model_not_found")) {
      return new OpenAIProviderError("model_unavailable");
    }
  }

  return new OpenAIProviderError("unknown");
}

export interface OpenAITextRequest {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  jsonMode?: boolean;
  jsonSchema?: ResponseFormatTextJSONSchemaConfig;
}

export function createOpenAIClient(
  apiKey: string,
  fetchImplementation: typeof fetch = fetch,
): OpenAI {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error("An OpenAI API key is required.");
  }

  return new OpenAI({
    apiKey: trimmedApiKey,
    baseURL: OPENAI_API_BASE_URL,
    dangerouslyAllowBrowser: true,
    fetch: fetchImplementation,
    logLevel: "off",
    maxRetries: 0,
  });
}

export async function validateOpenAIApiKey(
  apiKey: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  const client = createOpenAIClient(apiKey, fetchImplementation);
  try {
    await client.models.list();
  } catch (error) {
    throw mapOpenAIError(error, { validatingKey: true });
  }
}

export async function requestOpenAIText(
  request: OpenAITextRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<string> {
  const client = createOpenAIClient(request.apiKey, fetchImplementation);
  const input = request.jsonMode && !/\bjson\b/i.test(request.input)
    ? `${request.input}\n\nRespond in JSON.`
    : request.input;

  try {
    const response = await client.responses.create({
      model: request.model,
      instructions: request.instructions,
      input,
      store: false,
      ...(request.jsonSchema
        ? { text: { format: request.jsonSchema } }
        : request.jsonMode
          ? { text: { format: { type: "json_object" as const } } }
          : {}),
    });

    if (!response.output_text.trim()) {
      throw new OpenAIProviderError("invalid_response");
    }
    return response.output_text;
  } catch (error) {
    throw mapOpenAIError(error);
  }
}

export function parseOpenAIJson<T>(
  text: string,
  validate: (value: unknown) => T,
): T {
  try {
    const parsed: unknown = JSON.parse(text);
    return validate(parsed);
  } catch {
    throw new OpenAIProviderError("invalid_response");
  }
}
