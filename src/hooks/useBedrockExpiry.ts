"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useDiagramStore } from "@/lib/store";

const WARN_BEFORE_MS = 5 * 60 * 1000; // warn 5 min before STS expiry

// ─── Silent refresh ───────────────────────────────────────────────────────────
// Uses the stored SSO access token to get fresh STS credentials without user
// interaction. Returns true on success, false when the SSO token has also expired.
export async function silentRefreshBedrock(): Promise<boolean> {
  const { bedrockConfig, setBedrockConfig } = useDiagramStore.getState();
  if (!bedrockConfig) return false;

  // SSO access token must still be valid
  if (Date.now() >= bedrockConfig.accessTokenExpiration) return false;

  try {
    const res = await fetch("/api/bedrock/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "get-credentials",
        ssoRegion: bedrockConfig.ssoRegion,
        accessToken: bedrockConfig.accessToken,
        accountId: bedrockConfig.accountId,
        roleName: bedrockConfig.roleName,
      }),
    });
    if (!res.ok) return false;
    const creds = await res.json();
    if (!creds.accessKeyId) return false;

    setBedrockConfig({
      ...bedrockConfig,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        expiration: creds.expiration,
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Manual refresh (called by "Refresh credentials" button) ─────────────────
// Returns "refreshed" | "needs-reauth" so the caller decides whether to open the dialog.
export async function refreshBedrockCredentials(): Promise<"refreshed" | "needs-reauth"> {
  const { bedrockConfig } = useDiagramStore.getState();
  if (!bedrockConfig) return "needs-reauth";

  const ok = await silentRefreshBedrock();
  return ok ? "refreshed" : "needs-reauth";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBedrockExpiry() {
  // Watch only the STS expiration timestamp and provider — avoids re-running for
  // unrelated config field changes while still re-scheduling when a new login occurs.
  const stsExpiry = useDiagramStore((s) => s.bedrockConfig?.credentials.expiration ?? 0);
  const aiProvider = useDiagramStore((s) => s.aiProvider);

  useEffect(() => {
    if (aiProvider !== "bedrock" || stsExpiry === 0) return;

    const msUntilExpiry = stsExpiry - Date.now();

    async function handleExpiry() {
      // Re-read current state inside the async callback to avoid stale closures
      const { bedrockConfig, setBedrockConfig, setAiProvider, aiProvider: cur } =
        useDiagramStore.getState();
      if (!bedrockConfig || cur !== "bedrock") return;

      const refreshed = await silentRefreshBedrock();
      if (refreshed) {
        toast.success("AWS Bedrock credentials refreshed automatically.");
        return;
      }

      // SSO token also expired — full re-auth required
      setBedrockConfig(null);
      setAiProvider("offline");
      toast.error("AWS Bedrock session expired. Please sign in again.", {
        duration: 10_000,
      });
    }

    // Already expired when the effect runs (app reopened after a long pause)
    if (msUntilExpiry <= 0) {
      handleExpiry();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Warning 5 min before expiry (only schedule if that window is still ahead)
    const warnIn = msUntilExpiry - WARN_BEFORE_MS;
    if (warnIn > 0) {
      timers.push(
        setTimeout(() => {
          const cfg = useDiagramStore.getState().bedrockConfig;
          if (!cfg) return;
          const ssoOk = Date.now() < cfg.accessTokenExpiration;
          toast.warning(
            ssoOk
              ? "AWS Bedrock session expires in 5 minutes. Credentials will refresh automatically."
              : "AWS Bedrock session expires in 5 minutes. Please re-authenticate to continue.",
            { duration: 15_000 }
          );
        }, warnIn)
      );
    }

    timers.push(setTimeout(handleExpiry, msUntilExpiry));

    return () => timers.forEach(clearTimeout);
  }, [stsExpiry, aiProvider]);
}
