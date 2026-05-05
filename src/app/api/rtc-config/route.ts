import { NextResponse } from "next/server";

/**
 * Returns WebRTC ICE server configuration (STUN + optional TURN).
 *
 * TURN credentials live in server-side env vars (no NEXT_PUBLIC_ prefix)
 * so they are never exposed in the client bundle or build output.
 *
 * Required env vars for TURN (all optional — STUN is always included):
 *   TURN_URLS        Comma-separated list of TURN URLs, e.g.:
 *                    turn:turn.example.com:3478,turns:turn.example.com:5349
 *   TURN_USERNAME    TURN username
 *   TURN_CREDENTIAL  TURN password / credential
 */
export async function GET() {
  const iceServers: RTCIceServer[] = [
    // Public STUN servers — free, no credentials required.
    // Multiple servers increase the chance of successful candidate gathering.
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  const turnUrls = process.env.TURN_URLS;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrls && turnUsername && turnCredential) {
    const urls = turnUrls
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      iceServers.push({
        urls,
        username: turnUsername,
        credential: turnCredential,
      });
    }
  }

  return NextResponse.json(
    { iceServers },
    {
      headers: {
        // ICE config can be safely cached — rotate TURN credentials via a new deploy if needed
        "Cache-Control": "private, max-age=3600",
      },
    },
  );
}
