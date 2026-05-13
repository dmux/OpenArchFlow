"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, ExternalLink, Check, ChevronRight, RotateCcw } from "lucide-react";
import { useDiagramStore, type BedrockConfig } from "@/lib/store";
import { toast } from "sonner";

type AuthStep =
  | "entering-url"
  | "registering"
  | "pending-approval"
  | "selecting-account"
  | "fetching-models"
  | "selecting-model";

interface AccountWithRoles {
  accountId: string;
  accountName: string;
  roles: { roleName: string }[];
}

interface BedrockModel {
  modelId: string;
  modelName: string;
  providerName: string;
}

interface BedrockAuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PROVIDER_ORDER = ["Anthropic", "Meta", "Amazon", "Mistral AI", "Cohere", "AI21 Labs"];

function sortedByProvider(models: BedrockModel[]) {
  const groups: Record<string, BedrockModel[]> = {};
  for (const m of models) {
    const p = m.providerName ?? "Other";
    if (!groups[p]) groups[p] = [];
    groups[p].push(m);
  }
  const ordered: [string, BedrockModel[]][] = [];
  for (const p of PROVIDER_ORDER) {
    if (groups[p]) ordered.push([p, groups[p]]);
  }
  for (const [p, ms] of Object.entries(groups)) {
    if (!PROVIDER_ORDER.includes(p)) ordered.push([p, ms]);
  }
  return ordered;
}

export function BedrockAuthDialog({ open, onClose, onSuccess }: BedrockAuthDialogProps) {
  const setBedrockConfig = useDiagramStore((s) => s.setBedrockConfig);
  const setBedrockModel = useDiagramStore((s) => s.setBedrockModel);
  const setAiProvider = useDiagramStore((s) => s.setAiProvider);
  const setOfflineMode = useDiagramStore((s) => s.setOfflineMode);
  const existingConfig = useDiagramStore((s) => s.bedrockConfig);
  const currentModel = useDiagramStore((s) => s.bedrockModel);

  const [step, setStep] = useState<AuthStep>("entering-url");
  const [ssoStartUrl, setSsoStartUrl] = useState(existingConfig?.ssoStartUrl ?? "");
  const [ssoRegion, setSsoRegion] = useState(existingConfig?.ssoRegion ?? "us-east-1");
  const [bedrockRegion, setBedrockRegion] = useState(existingConfig?.region ?? "us-east-1");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [userCode, setUserCode] = useState("");
  const [verificationUri, setVerificationUri] = useState("");
  const [verificationUriComplete, setVerificationUriComplete] = useState("");
  const [pollInterval, setPollInterval] = useState(5);
  const [expiresAt, setExpiresAt] = useState(0);
  const [accessToken, setAccessToken] = useState("");
  const [accessTokenExpiration, setAccessTokenExpiration] = useState(0);
  const [accounts, setAccounts] = useState<AccountWithRoles[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [models, setModels] = useState<BedrockModel[]>([]);
  const [tempCreds, setTempCreds] = useState<{ accessKeyId: string; secretAccessKey: string; sessionToken: string; expiration: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep("entering-url");
      setSsoStartUrl(existingConfig?.ssoStartUrl ?? "");
      setSsoRegion(existingConfig?.ssoRegion ?? "us-east-1");
      setBedrockRegion(existingConfig?.region ?? "us-east-1");
      setClientId("");
      setClientSecret("");
      setDeviceCode("");
      setUserCode("");
      setVerificationUri("");
      setVerificationUriComplete("");
      setAccessToken("");
      setAccounts([]);
      setSelectedAccount(null);
      setSelectedRole("");
      setModels([]);
      setTempCreds(null);
    }
  }, [open]); // intentionally omit existingConfig — only pre-fill on mount

  // Countdown timer
  useEffect(() => {
    if (step !== "pending-approval" || expiresAt === 0) return;
    const tick = setInterval(() => {
      setSecondsRemaining(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(tick);
  }, [step, expiresAt]);

  // Polling for SSO approval
  useEffect(() => {
    if (step !== "pending-approval" || !deviceCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/bedrock/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "poll", ssoRegion, clientId, clientSecret, deviceCode }),
        });
        const data = await res.json();
        if (data.pending) return;
        if (data.error === "expired") {
          clearInterval(interval);
          toast.error("Authorization code expired. Please try again.");
          setStep("entering-url");
          return;
        }
        clearInterval(interval);
        const token = data.accessToken as string;
        const tokenExpiration = Date.now() + (data.expiresIn as number) * 1000;
        setAccessToken(token);
        setAccessTokenExpiration(tokenExpiration);
        setStep("selecting-account");
        // Fetch accounts
        const accRes = await fetch("/api/bedrock/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "list-accounts", ssoRegion, accessToken: token }),
        });
        const accData = await accRes.json();
        setAccounts(accData.accounts ?? []);
      } catch {
        // silent — keep polling
      }
    }, pollInterval * 1000);
    return () => clearInterval(interval);
  }, [step, deviceCode, clientId, clientSecret, ssoRegion, pollInterval]);

  const handleConnect = useCallback(async () => {
    if (!ssoStartUrl.trim()) {
      toast.error("Please enter your SSO Start URL.");
      return;
    }
    setIsLoading(true);
    setStep("registering");
    try {
      // Register OIDC client
      const regRes = await fetch("/api/bedrock/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "register", ssoRegion }),
      });
      const reg = await regRes.json();
      if (!regRes.ok || reg.error) throw new Error(reg.error || `Register failed (${regRes.status})`);
      setClientId(reg.clientId);
      setClientSecret(reg.clientSecret);

      // Start device authorization
      const startRes = await fetch("/api/bedrock/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "start", ssoRegion, ssoStartUrl: ssoStartUrl.trim(), clientId: reg.clientId, clientSecret: reg.clientSecret }),
      });
      const start = await startRes.json();
      console.log("[Bedrock SSO] start response:", start);
      if (!startRes.ok || start.error) throw new Error(start.error || `Start failed (${startRes.status}): ${start.code ?? ""}`);
      if (!start.userCode) throw new Error(`SSO returned no user code. Check your SSO Start URL and region. (code: ${start.code ?? "unknown"})`);
      setDeviceCode(start.deviceCode);
      setUserCode(start.userCode);
      setVerificationUri(start.verificationUri ?? "");
      setVerificationUriComplete(start.verificationUriComplete ?? start.verificationUri ?? "");
      setPollInterval(start.interval ?? 5);
      setExpiresAt(Date.now() + (start.expiresIn ?? 600) * 1000);
      setSecondsRemaining(start.expiresIn ?? 600);
      setStep("pending-approval");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to start SSO flow.");
      setStep("entering-url");
    } finally {
      setIsLoading(false);
    }
  }, [ssoStartUrl, ssoRegion]);

  const handleSelectRole = useCallback(async (account: AccountWithRoles, roleName: string) => {
    setSelectedAccount(account);
    setSelectedRole(roleName);
    setIsLoading(true);
    try {
      const credsRes = await fetch("/api/bedrock/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "get-credentials", ssoRegion, accessToken, accountId: account.accountId, roleName }),
      });
      const creds = await credsRes.json();
      if (creds.error) throw new Error(creds.error);
      setTempCreds(creds);
      setStep("fetching-models");

      // Fetch models
      const modRes = await fetch("/api/bedrock/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: bedrockRegion, accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken }),
      });
      const modData = await modRes.json();
      if (modData.error) throw new Error(modData.error);
      setModels(modData.models ?? []);
      setStep("selecting-model");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to get credentials or models.");
      setStep("selecting-account");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, ssoRegion, bedrockRegion]);

  const handleSelectModel = useCallback((modelId: string) => {
    if (!tempCreds || !selectedAccount) return;
    const config: BedrockConfig = {
      region: bedrockRegion,
      credentials: {
        accessKeyId: tempCreds.accessKeyId,
        secretAccessKey: tempCreds.secretAccessKey,
        sessionToken: tempCreds.sessionToken,
        expiration: tempCreds.expiration,
      },
      accountId: selectedAccount.accountId,
      accountName: selectedAccount.accountName,
      roleName: selectedRole,
      ssoStartUrl: ssoStartUrl.trim(),
      ssoRegion,
      accessToken,
      accessTokenExpiration,
    };
    setBedrockConfig(config);
    setBedrockModel(modelId);
    setAiProvider("bedrock");
    setOfflineMode(false);
    toast.success("AWS Bedrock configured successfully!");
    onSuccess();
  }, [tempCreds, selectedAccount, selectedRole, ssoStartUrl, ssoRegion, bedrockRegion, accessToken, accessTokenExpiration, setBedrockConfig, setBedrockModel, setAiProvider, setOfflineMode, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
            AWS Bedrock — SSO Login
          </DialogTitle>
        </DialogHeader>

        {/* Step: entering-url */}
        {step === "entering-url" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enter your AWS IAM Identity Center start URL to authenticate via SSO.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-medium">SSO Start URL</label>
              <Input
                value={ssoStartUrl}
                onChange={(e) => setSsoStartUrl(e.target.value)}
                placeholder="https://myorg.awsapps.com/start"
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">SSO Region <span className="text-muted-foreground font-normal">(IAM Identity Center region)</span></label>
              <Input
                value={ssoRegion}
                onChange={(e) => setSsoRegion(e.target.value)}
                placeholder="us-east-1"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Bedrock Region <span className="text-muted-foreground font-normal">(where Bedrock models are deployed)</span></label>
              <Input
                value={bedrockRegion}
                onChange={(e) => setBedrockRegion(e.target.value)}
                placeholder="us-east-1"
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={!ssoStartUrl.trim() || isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Connect with SSO
            </Button>
          </div>
        )}

        {/* Step: registering */}
        {step === "registering" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-muted-foreground">Registering OIDC client...</p>
          </div>
        )}

        {/* Step: pending-approval */}
        {step === "pending-approval" && (
          <div className="space-y-5 py-2">
            <p className="text-sm text-muted-foreground">
              Open the approval page and enter the code below to authorize access.
            </p>
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Your code</p>
              <p className="text-3xl font-mono font-bold tracking-widest text-orange-500">{userCode}</p>
              <p className="text-xs text-muted-foreground">Expires in {secondsRemaining}s</p>
            </div>
            <Button
              onClick={() => {
                const url = verificationUriComplete || verificationUri;
                if (url) window.open(url, "_blank");
                else toast.error("Verification URL not available. Try again.");
              }}
              variant="outline"
              className="w-full gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open approval page
            </Button>
            {!verificationUriComplete && verificationUri && (
              <p className="text-xs text-muted-foreground text-center">
                Enter code <span className="font-mono font-bold">{userCode}</span> manually at the page above
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for approval...
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("entering-url")}
              className="w-full text-muted-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Start over
            </Button>
          </div>
        )}

        {/* Step: selecting-account */}
        {step === "selecting-account" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Select an account and role to use with Bedrock.</p>
            {accounts.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">No accounts found.</p>
            )}
            {accounts.map((acct) => (
              <div key={acct.accountId} className="rounded-xl border p-3 space-y-2">
                <p className="text-sm font-semibold">{acct.accountName}</p>
                <p className="text-xs text-muted-foreground">{acct.accountId}</p>
                {acct.roles.length === 0 && (
                  <p className="text-xs text-muted-foreground">No roles available</p>
                )}
                {acct.roles.map((role) => (
                  <button
                    key={role.roleName}
                    onClick={() => handleSelectRole(acct, role.roleName!)}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition-all",
                      "hover:border-orange-500/60 hover:bg-orange-500/5",
                    )}
                  >
                    <span>{role.roleName}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Step: fetching-models */}
        {step === "fetching-models" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="text-sm text-muted-foreground">Loading available Bedrock models...</p>
          </div>
        )}

        {/* Step: selecting-model */}
        {step === "selecting-model" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Choose the model to use for architecture generation and chat.</p>
            {sortedByProvider(models).map(([providerName, provModels]) => (
              <div key={providerName} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{providerName}</p>
                <div className="space-y-1">
                  {provModels.map((m) => (
                    <button
                      key={m.modelId}
                      onClick={() => handleSelectModel(m.modelId!)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition-all",
                        currentModel === m.modelId
                          ? "border-orange-500 bg-orange-500/10 text-orange-600"
                          : "hover:border-orange-500/60 hover:bg-orange-500/5",
                      )}
                    >
                      <div>
                        <p className="font-medium text-xs">{m.modelName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{m.modelId}</p>
                      </div>
                      {currentModel === m.modelId && <Check className="h-4 w-4 text-orange-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
