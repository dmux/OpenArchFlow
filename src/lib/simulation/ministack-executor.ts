import type { AppNode, NodeMockData } from "@/lib/store";
import type { MiniStackConfig } from "@/lib/ministack/types";
import {
  lambdaInvoke,
  sqsSendMessage,
  dynamoPutItem,
  snsPublish,
  eventBridgePutEvents,
  s3PutObject,
  apiGatewayInvoke,
} from "@/lib/ministack/browser-actions";

export interface RealExecutionResult {
  latencyMs: number;
  status: "success" | "error";
  errorMessage?: string;
  responsePayload?: unknown;
}

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
    let responsePayload: unknown;

    switch (service) {
      case "lambda": {
        const p = requestPayload as Record<string, unknown> | undefined;
        const lambdaEvent = p?._body ?? p ?? {};
        responsePayload = await lambdaInvoke(config, resourceId, JSON.stringify(lambdaEvent));
        break;
      }

      case "sqs": {
        const queueUrl = ms?.endpoint ?? `${config.endpoint}/000000000000/${resourceId}`;
        const messageId = await sqsSendMessage(config, queueUrl, JSON.stringify(requestPayload ?? {}));
        responsePayload = { messageId };
        break;
      }

      case "dynamodb": {
        await dynamoPutItem(config, resourceId, {
          id: { S: crypto.randomUUID() },
          payload: { S: JSON.stringify(requestPayload ?? {}) },
          ts: { N: String(Date.now()) },
        });
        responsePayload = { ok: true };
        break;
      }

      case "sns": {
        const topicArn = ms?.resourceArn
          ?? `arn:aws:sns:${config.region}:${config.accountId}:${resourceId}`;
        const messageId = await snsPublish(config, topicArn, JSON.stringify(requestPayload ?? {}), "OpenArchFlow Simulation");
        responsePayload = { messageId };
        break;
      }

      case "eventbridge": {
        const p = requestPayload as Record<string, unknown> | undefined;
        const eventDetail = p?._body ?? p ?? {};
        responsePayload = await eventBridgePutEvents(config, resourceId, "openarchflow.simulation", "SimulatedRequest", JSON.stringify(eventDetail));
        break;
      }

      case "s3": {
        await s3PutObject(
          config,
          resourceId,
          `simulation/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.json`,
          JSON.stringify(requestPayload ?? {}),
        );
        responsePayload = { ok: true };
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
        responsePayload = await apiGatewayInvoke(config, resourceId, method, path, body);
        break;
      }

      default:
        return {
          latencyMs: Math.round(performance.now() - start) + Math.floor(1 + Math.random() * 8),
          status: "success",
        };
    }

    return { latencyMs: Math.round(performance.now() - start), status: "success", responsePayload };
  } catch (e) {
    return {
      latencyMs: Math.round(performance.now() - start),
      status: "error",
      errorMessage: e instanceof Error ? e.message : "Network error",
    };
  }
}
