"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WifiOff, Cloud, Laptop, Check, RefreshCw, Loader2 } from "lucide-react";
import { useDiagramStore } from "@/lib/store";
import { toast } from "sonner";
import { BedrockAuthDialog } from "./BedrockAuthDialog";
import { refreshBedrockCredentials } from "@/hooks/useBedrockExpiry";

interface AIProviderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AIProviderDialog({ open, onClose }: AIProviderDialogProps) {
  const aiProvider = useDiagramStore((s) => s.aiProvider);
  const setAiProvider = useDiagramStore((s) => s.setAiProvider);
  const geminiApiKey = useDiagramStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useDiagramStore((s) => s.setGeminiApiKey);
  const setOfflineMode = useDiagramStore((s) => s.setOfflineMode);
  const geminiModel = useDiagramStore((s) => s.geminiModel);
  const setGeminiModel = useDiagramStore((s) => s.setGeminiModel);

  const bedrockConfig = useDiagramStore((s) => s.bedrockConfig);
  const setBedrockConfig = useDiagramStore((s) => s.setBedrockConfig);
  const bedrockModel = useDiagramStore((s) => s.bedrockModel);

  const [keyInput, setKeyInput] = useState(
    geminiApiKey && geminiApiKey !== "offline" ? geminiApiKey : "",
  );
  const [showBedrockAuth, setShowBedrockAuth] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshCredentials = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshBedrockCredentials();
      if (result === "refreshed") {
        toast.success("AWS Bedrock credentials refreshed.");
      } else {
        // SSO token also expired — need full re-auth
        setShowBedrockAuth(true);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const GEMINI_MODELS = [
    { id: "gemini-2.0-flash", label: "2.0 Flash", description: "Fastest" },
    { id: "gemini-2.5-flash", label: "2.5 Flash", description: "Balanced" },
    { id: "gemini-2.5-pro", label: "2.5 Pro", description: "Most capable" },
  ];

  const handleSignOutBedrock = () => {
    setBedrockConfig(null);
    setAiProvider("offline");
    setOfflineMode(true);
    toast.success("Signed out of AWS Bedrock.");
    onClose();
  };

  const handleClearGeminiKey = () => {
    setGeminiApiKey("offline");
    setAiProvider("offline");
    setOfflineMode(true);
    setKeyInput("");
    toast.success("Gemini API key removed.");
  };

  const handleSelectOffline = () => {
    setAiProvider("offline");
    setOfflineMode(true);
    setGeminiApiKey("offline");
    onClose();
  };

  const handleSelectGemini = () => {
    if (!keyInput.trim()) {
      toast.error("Please enter a valid Gemini API Key.");
      return;
    }
    setAiProvider("gemini");
    setOfflineMode(false);
    setGeminiApiKey(keyInput.trim());
    toast.success("Gemini API Key saved.");
    onClose();
  };

  const handleSelectLocal = () => {
    setAiProvider("local");
    setOfflineMode(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Provider</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* Offline */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all hover:border-foreground/40",
              aiProvider === "offline" && "border-primary bg-primary/5",
            )}
            onClick={handleSelectOffline}
          >
            <WifiOff className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Offline</p>
                {aiProvider === "offline" && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                No AI features. Use the diagram editor manually.
              </p>
            </div>
          </div>

          {/* Gemini Cloud */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 transition-all",
              aiProvider === "gemini" && "border-sky-500 bg-sky-500/5",
            )}
          >
            <Cloud className="mt-0.5 h-5 w-5 text-sky-500 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Gemini Cloud</p>
                {aiProvider === "gemini" && (
                  <Check className="h-4 w-4 text-sky-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires a Google AI Studio API key (separate from your Google account).
              </p>
              <div className="flex gap-2">
                <Input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIza..."
                  type="password"
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && handleSelectGemini()}
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0 bg-sky-600 hover:bg-sky-700 text-white"
                  disabled={!keyInput.trim()}
                  onClick={handleSelectGemini}
                >
                  Save
                </Button>
                {aiProvider === "gemini" && geminiApiKey && geminiApiKey !== "offline" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={handleClearGeminiKey}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Model selector */}
              <div className="flex gap-1 pt-0.5">
                {GEMINI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setGeminiModel(m.id)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 py-1.5 text-center transition-all",
                      geminiModel === m.id
                        ? "border-sky-500 bg-sky-500/10 text-sky-600"
                        : "border-border hover:border-foreground/30 text-muted-foreground",
                    )}
                  >
                    <p className="text-xs font-semibold">{m.label}</p>
                    <p className="text-[10px] opacity-70">{m.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Local WebLLM */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all hover:border-foreground/40",
              aiProvider === "local" && "border-emerald-500 bg-emerald-500/5",
            )}
            onClick={handleSelectLocal}
          >
            <Laptop className="mt-0.5 h-5 w-5 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Local (WebLLM)</p>
                {aiProvider === "local" && (
                  <Check className="h-4 w-4 text-emerald-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Phi-3 mini runs entirely in your browser. No internet required.
                Downloads ~2 GB on first use.
              </p>
            </div>
          </div>

          {/* AWS Bedrock */}
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 transition-all",
              aiProvider === "bedrock" && bedrockConfig
                ? "border-orange-500 bg-orange-500/5"
                : "hover:border-foreground/40 cursor-pointer",
            )}
            onClick={() => {
              if (bedrockConfig) {
                setAiProvider("bedrock");
                setOfflineMode(false);
                onClose();
              } else {
                setShowBedrockAuth(true);
              }
            }}
          >
            <svg
              className="mt-0.5 h-5 w-5 text-orange-500 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">AWS Bedrock</p>
                {aiProvider === "bedrock" && bedrockConfig && (
                  <Check className="h-4 w-4 text-orange-500" />
                )}
              </div>
              {bedrockConfig ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {bedrockConfig.accountName} / {bedrockConfig.roleName}
                  </p>
                  <p className="text-xs text-orange-500/80">
                    Expires in {Math.max(0, Math.floor((bedrockConfig.credentials.expiration - Date.now()) / 60000))}m
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRefreshing}
                      className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshCredentials();
                      }}
                    >
                      {isRefreshing
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />}
                      {isRefreshing ? "Refreshing..." : "Refresh credentials"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRefreshing}
                      className="h-6 px-2 text-xs gap-1 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSignOutBedrock();
                      }}
                    >
                      Sign out
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use models like Claude, Llama, Mistral via AWS SSO. Login with your corporate identity.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <BedrockAuthDialog
        open={showBedrockAuth}
        onClose={() => setShowBedrockAuth(false)}
        onSuccess={() => {
          setShowBedrockAuth(false);
          onClose();
        }}
      />
    </Dialog>
  );
}
