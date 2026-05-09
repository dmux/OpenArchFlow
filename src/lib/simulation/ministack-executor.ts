import type { AppNode, NodeMockData } from "@/lib/store";
import type { MiniStackConfig } from "@/lib/ministack/types";

export interface RealExecutionResult {
  latencyMs: number;
  status: "success" | "error";
  errorMessage?: string;
  responsePayload?: unknown;
}

/**
 * Executes a real MiniStack API call for a deployed node and measures wall-clock latency.
 * Returns a synthetic success for services without a direct call (pass-through, non-executable).
 */
export async function executeMiniStackNode(
  node: AppNode,
  requestPayload: unknown,
  config: MiniStackConfig,
): Promise<RealExecutionResult> {
  const start = performance.now();
  const ms = node.data.ministack as { resourceId?: string; endpoint?: string; resourceArn?: string } | undefined;
  const resourceId = ms?.resourceId;

  if (!resourceId) {
    return { latencyMs: 0, status: "error", errorMessage: "No resourceId — node not deployed" };
  }

  const service = (node.data.service ?? "").toLowerCase();

  try {
    let res: Response;

    switch (service) {
      case "lambda": {
        const p = requestPayload as Record<string, unknown> | undefined;
        // If payload carries _body from a Traffic Source, use it as the Lambda event.
        // Otherwise pass the full payload object as the event.
        const lambdaEvent = p?._body ?? p ?? {};
        res = await fetch("/api/ministack/resource/lambda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            functionName: resourceId,
            payload: JSON.stringify(lambdaEvent),
          }),
        });
        break;
      }

      case "sqs": {
        const queueUrl = ms?.endpoint ?? `${config.endpoint}/000000000000/${resourceId}`;
        res = await fetch("/api/ministack/resource/sqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, queueUrl, messageBody: JSON.stringify(requestPayload ?? {}) }),
        });
        break;
      }

      case "dynamodb": {
        res = await fetch("/api/ministack/resource/dynamodb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            tableName: resourceId,
            item: {
              id: { S: crypto.randomUUID() },
              payload: { S: JSON.stringify(requestPayload ?? {}) },
              ts: { N: String(Date.now()) },
            },
          }),
        });
        break;
      }

      case "sns": {
        const topicArn = ms?.resourceArn
          ?? `arn:aws:sns:${config.region}:${config.accountId}:${resourceId}`;
        res = await fetch("/api/ministack/resource/sns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            topicArn,
            message: JSON.stringify(requestPayload ?? {}),
            subject: "OpenArchFlow Simulation",
          }),
        });
        break;
      }

      case "eventbridge": {
        const p = requestPayload as Record<string, unknown> | undefined;
        const eventDetail = p?._body ?? p ?? {};
        res = await fetch("/api/ministack/resource/eventbridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            busName: resourceId,
            source: "openarchflow.simulation",
            detailType: "SimulatedRequest",
            detail: JSON.stringify(eventDetail),
          }),
        });
        break;
      }

      case "s3": {
        res = await fetch("/api/ministack/resource/s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            bucket: resourceId,
            key: `simulation/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.json`,
            content: JSON.stringify(requestPayload ?? {}),
          }),
        });
        break;
      }

      case "apigateway":
      case "api-gateway": {
        const p = requestPayload as Record<string, unknown> | undefined;
        const mock = node.data.mock as NodeMockData | undefined;
        const firstRoute = mock?.endpoints?.[0];

        const method = String(p?._method ?? firstRoute?.method ?? "GET").toUpperCase();
        const path   = String(p?._path   ?? firstRoute?.path   ?? "/");
        const body   = p?._body ?? (method !== "GET" && method !== "HEAD" ? p : undefined);

        // Route through Next.js proxy — browser can't call localhost:4566 directly (CORS)
        res = await fetch("/api/ministack/resource/apigateway-invoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, restApiId: resourceId, method, path, body }),
        });
        break;
      }

      default: {
        // Service has no direct call (iam, kms, ssm, etc.) — pass-through with tiny latency
        return {
          latencyMs: Math.round(performance.now() - start) + Math.floor(1 + Math.random() * 8),
          status: "success",
        };
      }
    }

    const latencyMs = Math.round(performance.now() - start);
    const data: Record<string, unknown> = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      return { latencyMs, status: "error", errorMessage: String(data.error ?? `HTTP ${res.status}`) };
    }

    return { latencyMs, status: "success", responsePayload: data };
  } catch (e) {
    return {
      latencyMs: Math.round(performance.now() - start),
      status: "error",
      errorMessage: e instanceof Error ? e.message : "Network error",
    };
  }
}
