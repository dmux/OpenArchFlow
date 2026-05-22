import { NextRequest, NextResponse } from "next/server";
import { discoverInfrastructure, type DiscoveryConfig } from "@/lib/aws/discovery";
import { DEFAULT_MINISTACK_CONFIG } from "@/lib/ministack/types";

export const runtime = "nodejs";

interface DiscoverRequest {
  source: "ministack" | "aws";
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

export async function POST(req: NextRequest) {
  let body: DiscoverRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source, endpoint, credentials } = body;

  if (source !== "ministack" && source !== "aws") {
    return NextResponse.json(
      { error: 'source must be "ministack" or "aws"' },
      { status: 400 }
    );
  }

  if (source === "aws" && !credentials) {
    return NextResponse.json(
      { error: "credentials required for AWS source" },
      { status: 400 }
    );
  }

  const region = body.region ?? DEFAULT_MINISTACK_CONFIG.region;

  const cfg: DiscoveryConfig =
    source === "ministack"
      ? {
          source: "ministack",
          endpoint: endpoint ?? DEFAULT_MINISTACK_CONFIG.endpoint,
          region,
          accessKeyId: credentials?.accessKeyId ?? DEFAULT_MINISTACK_CONFIG.accessKeyId,
          secretAccessKey: credentials?.secretAccessKey ?? DEFAULT_MINISTACK_CONFIG.secretAccessKey,
        }
      : {
          source: "aws",
          region,
          accessKeyId: credentials!.accessKeyId,
          secretAccessKey: credentials!.secretAccessKey,
          sessionToken: credentials!.sessionToken,
        };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const { services, edges } = await discoverInfrastructure(cfg, controller.signal);
    return NextResponse.json({ services, edges, discoveredAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
