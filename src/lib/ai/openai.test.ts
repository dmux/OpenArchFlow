import assert from "node:assert/strict";
import test from "node:test";
import {
  createOpenAIClient,
  OpenAIProviderError,
  parseOpenAIJson,
  requestOpenAIText,
  validateOpenAIApiKey,
} from "./openai.ts";
import {
  architectureSchema,
  sanitizeArchitecture,
  terraformOutputSchema,
  terraformResponseJsonSchema,
} from "./schemas.ts";

function mockOpenAIError(
  status: number,
  code: string,
  message: string,
): typeof fetch {
  return async () =>
    new Response(JSON.stringify({ error: { code, message } }), {
      status,
      headers: { "content-type": "application/json" },
    });
}

test("validates a BYOK key directly against OpenAI models", async () => {
  let requestUrl = "";
  let requestMethod = "";
  let requestAuthorization: string | null = null;

  const mockFetch: typeof fetch = async (input, init) => {
    requestUrl = input instanceof Request ? input.url : input.toString();
    requestMethod = input instanceof Request ? input.method : init?.method ?? "";
    requestAuthorization = new Headers(
      input instanceof Request ? input.headers : init?.headers,
    ).get("authorization");

    return new Response(JSON.stringify({ object: "list", data: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  await validateOpenAIApiKey("sk-test-key", mockFetch);

  const request = new URL(requestUrl);
  assert.equal(request.origin, "https://api.openai.com");
  assert.equal(request.pathname, "/v1/models");
  assert.equal(requestMethod, "GET");
  assert.equal(requestAuthorization, "Bearer sk-test-key");
});

test("creates a browser-enabled client pinned to the official API host", () => {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { document: {} },
  });

  try {
    const client = createOpenAIClient("sk-test-key");
    assert.equal(client.baseURL, "https://api.openai.com/v1");
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }
});

test("maps invalid-key errors without exposing API or server error text", async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Rejected credential sk-test-key",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );

  await assert.rejects(
    validateOpenAIApiKey("sk-test-key", mockFetch),
    (error: unknown) => {
      assert.ok(error instanceof OpenAIProviderError);
      assert.equal(error.code, "invalid_api_key");
      assert.equal(error.message, "OpenAI rejected this API key. Check it and try again.");
      assert.equal(error.message.includes("sk-test-key"), false);
      return true;
    },
  );
});

test("explains when a restricted key cannot list models", async () => {
  await assert.rejects(
    validateOpenAIApiKey(
      "sk-restricted-key",
      mockOpenAIError(403, "insufficient_permissions", "Permission denied"),
    ),
    (error: unknown) => {
      assert.ok(error instanceof OpenAIProviderError);
      assert.equal(error.code, "missing_model_read_permission");
      assert.match(error.message, /model\.read/);
      assert.equal(error.message.includes("sk-restricted-key"), false);
      return true;
    },
  );
});

test("maps exhausted OpenAI credits separately from rate limiting", async () => {
  await assert.rejects(
    validateOpenAIApiKey(
      "sk-credit-limited-key",
      mockOpenAIError(429, "insufficient_quota", "Quota exceeded"),
    ),
    (error: unknown) => {
      assert.ok(error instanceof OpenAIProviderError);
      assert.equal(error.code, "insufficient_quota");
      assert.match(error.message, /credits|spending limit/);
      assert.equal(error.message.includes("sk-credit-limited-key"), false);
      return true;
    },
  );
});

test("maps exhausted credit balances to the user-facing credits message", async () => {
  await assert.rejects(
    requestOpenAIText(
      {
        apiKey: "sk-credit-balance-key",
        model: "gpt-6-luna",
        instructions: "Respond helpfully.",
        input: "Hello",
      },
      mockOpenAIError(
        429,
        "credit_balance_exhausted",
        "You have no credits remaining. Add credits to continue.",
      ),
    ),
    (error: unknown) => {
      assert.ok(error instanceof OpenAIProviderError);
      assert.equal(error.code, "insufficient_quota");
      assert.match(error.message, /no available API credits|spending limit/i);
      assert.equal(error.message.includes("sk-credit-balance-key"), false);
      assert.equal(error.message.includes("Add credits to continue"), false);
      return true;
    },
  );
});

test("maps ordinary 429 responses to a retryable rate-limit message", async () => {
  await assert.rejects(
    validateOpenAIApiKey(
      "sk-rate-limited-key",
      mockOpenAIError(429, "rate_limit_exceeded", "Too many requests"),
    ),
    (error: unknown) => {
      assert.ok(error instanceof OpenAIProviderError);
      assert.equal(error.code, "rate_limit");
      assert.match(error.message, /rate limiting/);
      assert.equal(error.message.includes("sk-rate-limited-key"), false);
      return true;
    },
  );
});

test("serializes a non-persistent JSON-mode Responses request to OpenAI", async () => {
  let requestUrl = "";
  let requestMethod = "";
  let requestBody = "";

  const mockFetch: typeof fetch = async (input, init) => {
    requestUrl = input instanceof Request ? input.url : input.toString();
    requestMethod = init?.method ?? "GET";
    if (typeof init?.body === "string") requestBody = init.body;

    return new Response(
      JSON.stringify({
        id: "resp_test",
        object: "response",
        created_at: 0,
        status: "completed",
        model: "gpt-6-luna",
        output: [
          {
            id: "msg_test",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: "{\"nodes\":[],\"edges\":[]}",
                annotations: [],
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const text = await requestOpenAIText(
    {
      apiKey: "sk-test-key",
      model: "gpt-6-luna",
      instructions: "Return a JSON object.",
      input: "Create a serverless architecture.",
      jsonMode: true,
    },
    mockFetch,
  );

  assert.equal(text, "{\"nodes\":[],\"edges\":[]}");
  assert.equal(new URL(requestUrl).origin, "https://api.openai.com");
  assert.equal(new URL(requestUrl).pathname, "/v1/responses");
  assert.equal(requestMethod, "POST");
  const parsedBody: unknown = JSON.parse(requestBody);
  assert.deepEqual(parsedBody, {
    model: "gpt-6-luna",
    instructions: "Return a JSON object.",
    input: "Create a serverless architecture.\n\nRespond in JSON.",
    store: false,
    text: { format: { type: "json_object" } },
  });
});

test("serializes strict Structured Outputs for Terraform generation", async () => {
  let requestBody = "";
  const mockFetch: typeof fetch = async (_input, init) => {
    if (typeof init?.body === "string") requestBody = init.body;
    return new Response(
      JSON.stringify({
        id: "resp_terraform",
        object: "response",
        created_at: 0,
        status: "completed",
        model: "gpt-6-luna",
        output: [
          {
            id: "msg_terraform",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text: '{"files":[],"warnings":[]}', annotations: [] }],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  await requestOpenAIText(
    {
      apiKey: "sk-test-key",
      model: "gpt-6-luna",
      instructions: "Generate Terraform JSON.",
      input: "Generate files.",
      jsonSchema: {
        type: "json_schema",
        name: "terraform_output",
        strict: true,
        schema: terraformResponseJsonSchema,
      },
    },
    mockFetch,
  );

  const body: unknown = JSON.parse(requestBody);
  assert.deepEqual(body, {
    model: "gpt-6-luna",
    instructions: "Generate Terraform JSON.",
    input: "Generate files.",
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "terraform_output",
        strict: true,
        schema: terraformResponseJsonSchema,
      },
    },
  });
});

test("maps unavailable models without exposing provider response details", async () => {
  await assert.rejects(
    requestOpenAIText(
      {
        apiKey: "sk-test-key",
        model: "unavailable-model",
        instructions: "Return text.",
        input: "Hello",
      },
      mockOpenAIError(404, "model_not_found", "Model unavailable"),
    ),
    (error: unknown) => {
      assert.ok(error instanceof OpenAIProviderError);
      assert.equal(error.code, "model_unavailable");
      assert.equal(error.message.includes("unavailable-model"), false);
      assert.equal(error.message.includes("Model unavailable"), false);
      return true;
    },
  );
});

test("maps network failures without exposing transport details", async () => {
  const networkFailure: typeof fetch = async () => {
    throw new TypeError("Network request failed for sk-secret");
  };

  await assert.rejects(
    validateOpenAIApiKey("sk-secret", networkFailure),
    (error: unknown) => {
      assert.ok(error instanceof OpenAIProviderError);
      assert.equal(error.code, "network");
      assert.equal(error.message.includes("sk-secret"), false);
      return true;
    },
  );
});

test("rejects invalid JSON and structurally invalid results before returning them", () => {
  assert.throws(
    () => parseOpenAIJson("{bad json", (value) => architectureSchema.parse(value)),
    (error: unknown) =>
      error instanceof OpenAIProviderError && error.code === "invalid_response",
  );
  assert.throws(
    () => parseOpenAIJson('{"nodes":[]}', (value) => architectureSchema.parse(value)),
    (error: unknown) =>
      error instanceof OpenAIProviderError && error.code === "invalid_response",
  );
});

test("validates architecture JSON before returning a sanitized diagram", () => {
  const diagram = parseOpenAIJson(
    JSON.stringify({
      nodes: [
        { id: "node-1", type: "aws-compute", data: { label: "API", service: "Lambda" } },
        { id: "node-2", type: "aws-database", data: { label: "Users", service: "DynamoDB" } },
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2", label: "reads" },
        { id: "edge-dangling", source: "node-1", target: "missing-node" },
      ],
    }),
    (value) => architectureSchema.parse(value),
  );

  const sanitized = sanitizeArchitecture(diagram);
  assert.equal(sanitized.nodes.length, 2);
  assert.deepEqual(sanitized.edges.map((edge) => edge.id), ["edge-1"]);
});

test("rejects structurally invalid Terraform before returning it", () => {
  assert.throws(
    () =>
      parseOpenAIJson('{"files":[{"name":"main.tf"}]}', (value) =>
        terraformOutputSchema.parse(value),
      ),
    (error: unknown) =>
      error instanceof OpenAIProviderError && error.code === "invalid_response",
  );
});

test("validates a Structured Outputs Terraform result before returning it", () => {
  const terraform = parseOpenAIJson(
    '{"files":[{"name":"main.tf","content":"resource \\"aws_s3_bucket\\" \\"site\\" {}"}],"warnings":[]}',
    (value) => terraformOutputSchema.parse(value),
  );
  assert.equal(terraform.files[0]?.name, "main.tf");
  assert.equal(terraform.warnings.length, 0);
});
