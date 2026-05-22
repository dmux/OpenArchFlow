import { NextRequest, NextResponse } from "next/server";

function oidcBase(region: string) {
  return `https://oidc.${region}.amazonaws.com`;
}

function ssoBase(region: string) {
  return `https://portal.sso.${region}.amazonaws.com`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step } = body;

    // ── Register OIDC client ──────────────────────────────────────────────
    if (step === "register") {
      const { ssoRegion } = body;
      console.log("[Bedrock SSO] Registering OIDC client in region:", ssoRegion);
      const res = await fetch(`${oidcBase(ssoRegion)}/client/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: "OpenArchFlow", clientType: "public" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description ?? data.error ?? `Register failed (${res.status})`);
      return NextResponse.json({ clientId: data.clientId, clientSecret: data.clientSecret });
    }

    // ── Start device authorization ────────────────────────────────────────
    if (step === "start") {
      const { ssoRegion, ssoStartUrl, clientId, clientSecret } = body;
      const res = await fetch(`${oidcBase(ssoRegion)}/device_authorization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret, startUrl: ssoStartUrl }),
      });
      const data = await res.json();
      console.log("[Bedrock SSO] StartDeviceAuthorization response:", JSON.stringify(data));
      if (!res.ok) throw new Error(data.error_description ?? data.error ?? `Start failed (${res.status})`);
      return NextResponse.json({
        deviceCode: data.deviceCode,
        userCode: data.userCode,
        verificationUri: data.verificationUri,
        verificationUriComplete: data.verificationUriComplete,
        expiresIn: data.expiresIn,
        interval: data.interval ?? 5,
      });
    }

    // ── Poll for token ────────────────────────────────────────────────────
    if (step === "poll") {
      const { ssoRegion, clientId, clientSecret, deviceCode } = body;
      const res = await fetch(`${oidcBase(ssoRegion)}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          clientSecret,
          grantType: "urn:ietf:params:oauth:grant-type:device_code",
          deviceCode,
        }),
      });
      const data = await res.json();
      if (res.status === 400 && data.error === "authorization_pending") {
        return NextResponse.json({ pending: true });
      }
      if (res.status === 400 && (data.error === "expired_token" || data.error === "slow_down")) {
        return NextResponse.json({ error: "expired" });
      }
      if (!res.ok) throw new Error(data.error_description ?? data.error ?? `Token failed (${res.status})`);
      return NextResponse.json({ accessToken: data.accessToken, expiresIn: data.expiresIn });
    }

    // ── List accounts + roles ─────────────────────────────────────────────
    if (step === "list-accounts") {
      const { ssoRegion, accessToken } = body;
      const base = ssoBase(ssoRegion);
      const headers = { "x-amz-sso_bearer_token": accessToken };

      const acctRes = await fetch(`${base}/assignment/accounts?max_result=100`, { headers });
      const acctData = await acctRes.json();
      if (!acctRes.ok) throw new Error(acctData.message ?? `ListAccounts failed (${acctRes.status})`);
      console.log("[Bedrock SSO] list-accounts count:", acctData.accountList?.length ?? 0);

      const accounts = await Promise.all(
        (acctData.accountList ?? []).map(async (acct: any) => {
          try {
            const rolesRes = await fetch(
              `${base}/assignment/roles?account_id=${acct.accountId}&max_result=100`,
              { headers },
            );
            const rolesData = await rolesRes.json();
            console.log("[Bedrock SSO] roles for", acct.accountId, "status:", rolesRes.status, "count:", rolesData.roleList?.length ?? 0);
            return {
              accountId: acct.accountId,
              accountName: acct.accountName,
              roles: (rolesData.roleList ?? []).map((r: any) => ({ roleName: r.roleName })),
            };
          } catch (e: any) {
            console.error("[Bedrock SSO] ListAccountRoles error:", e.message);
            return { accountId: acct.accountId, accountName: acct.accountName, roles: [] };
          }
        }),
      );
      return NextResponse.json({ accounts });
    }

    // ── Get role credentials ──────────────────────────────────────────────
    if (step === "get-credentials") {
      const { ssoRegion, accessToken, accountId, roleName } = body;
      const base = ssoBase(ssoRegion);
      const res = await fetch(
        `${base}/federation/credentials?role_name=${encodeURIComponent(roleName)}&account_id=${encodeURIComponent(accountId)}`,
        { headers: { "x-amz-sso_bearer_token": accessToken } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `GetRoleCredentials failed (${res.status})`);
      const c = data.roleCredentials;
      // AWS SSO Portal returns expiration as Unix seconds.
      // Guard against already-ms values (> year 2100 in seconds = 4102444800).
      const rawExp: number = c.expiration ?? 0;
      const expirationMs = rawExp > 4_102_444_800 ? rawExp : rawExp * 1000;
      return NextResponse.json({
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
        sessionToken: c.sessionToken,
        expiration: expirationMs,
      });
    }

    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  } catch (error: any) {
    const msg = error.message ?? "";
    const code = error.name ?? "UnknownError";
    console.error(`[Bedrock SSO] Error (${code}):`, msg);
    return NextResponse.json(
      { error: msg ? `${code}: ${msg}` : code, code },
      { status: 500 },
    );
  }
}
