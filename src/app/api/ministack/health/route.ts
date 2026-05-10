import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint") ?? "http://localhost:4566";

  try {
    const res = await fetch(`${endpoint}/_ministack/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return NextResponse.json({ connected: false, error: `HTTP ${res.status}` });
    }
    let info: Record<string, unknown> = {};
    try {
      info = await res.json();
    } catch {
      // health endpoint may return non-JSON on some versions
    }
    return NextResponse.json({ connected: true, ...info });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection refused";
    return NextResponse.json({ connected: false, error: message });
  }
}
