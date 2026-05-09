import { NextRequest, NextResponse } from "next/server";
import { getCloudWatchLogsClient } from "@/lib/ministack/client";
import type { MiniStackConfig } from "@/lib/ministack/types";
import {
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

function parseConfig(raw: string | null): MiniStackConfig | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const config = parseConfig(searchParams.get("config"));
  if (!config) return NextResponse.json({ error: "Missing config" }, { status: 400 });

  const action = searchParams.get("action") ?? "groups";
  const isStream = searchParams.get("stream") === "true";

  const cwl = getCloudWatchLogsClient(config);

  // ── List log groups ────────────────────────────────────────────────────
  if (action === "groups") {
    const prefix = searchParams.get("prefix") ?? undefined;
    const res = await cwl.send(
      new DescribeLogGroupsCommand({ logGroupNamePrefix: prefix, limit: 50 }),
    );
    return NextResponse.json({
      groups: (res.logGroups ?? []).map((g) => ({
        name: g.logGroupName,
        storedBytes: g.storedBytes,
        retentionDays: g.retentionInDays,
      })),
    });
  }

  // ── List log streams ───────────────────────────────────────────────────
  if (action === "streams") {
    const logGroupName = searchParams.get("logGroupName");
    if (!logGroupName) return NextResponse.json({ error: "Missing logGroupName" }, { status: 400 });
    const res = await cwl.send(
      new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: "LastEventTime",
        descending: true,
        limit: 20,
      }),
    );
    return NextResponse.json({
      streams: (res.logStreams ?? []).map((s) => ({
        name: s.logStreamName,
        lastEventTime: s.lastEventTimestamp,
      })),
    });
  }

  // ── Stream log events via SSE ──────────────────────────────────────────
  if (action === "events" && isStream) {
    const logGroupName = searchParams.get("logGroupName");
    const logStreamName = searchParams.get("logStreamName") ?? undefined;
    if (!logGroupName) {
      return NextResponse.json({ error: "Missing logGroupName" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    // Start from 2 minutes ago so recent invocations are immediately visible.
    // lastEventTime advances with each batch so we never replay the same events.
    let lastEventTime = Date.now() - 2 * 60 * 1000;

    const stream = new ReadableStream({
      async start(controller) {
        const poll = async () => {
          try {
            // Exhaust all pages for the current time window in one poll tick
            let pageToken: string | undefined;
            const batch: { timestamp?: number; message?: string }[] = [];

            do {
              const res = await cwl.send(
                new FilterLogEventsCommand({
                  logGroupName,
                  logStreamNames: logStreamName ? [logStreamName] : undefined,
                  startTime: lastEventTime,
                  nextToken: pageToken,
                  limit: 100,
                }),
              );

              for (const e of res.events ?? []) {
                batch.push({ timestamp: e.timestamp, message: e.message });
                // Advance cursor past the last seen event
                if (e.timestamp !== undefined && e.timestamp >= lastEventTime) {
                  lastEventTime = e.timestamp + 1;
                }
              }

              pageToken = res.nextToken;
            } while (pageToken);

            if (batch.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(batch)}\n\n`));
            }
          } catch {
            // log group may not exist yet — silently retry
          }
        };

        await poll();
        const interval = setInterval(poll, 2000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ── Fetch log events (single shot) ────────────────────────────────────
  if (action === "events") {
    const logGroupName = searchParams.get("logGroupName");
    const logStreamName = searchParams.get("logStreamName") ?? undefined;
    const nextFwdToken = searchParams.get("nextToken") ?? undefined;
    if (!logGroupName) return NextResponse.json({ error: "Missing logGroupName" }, { status: 400 });
    const res = await cwl.send(
      new GetLogEventsCommand({
        logGroupName,
        logStreamName,
        nextToken: nextFwdToken,
        limit: 200,
        startFromHead: !nextFwdToken,
      }),
    );
    return NextResponse.json({
      events: (res.events ?? []).map((e) => ({
        timestamp: e.timestamp,
        message: e.message,
      })),
      nextForwardToken: res.nextForwardToken,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
