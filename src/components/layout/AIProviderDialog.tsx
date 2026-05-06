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
import { WifiOff, Cloud, Laptop, Check } from "lucide-react";
import { useDiagramStore } from "@/lib/store";
import { toast } from "sonner";

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

  const [keyInput, setKeyInput] = useState(
    geminiApiKey && geminiApiKey !== "offline" ? geminiApiKey : "",
  );

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
      <DialogContent className="sm:max-w-md">
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
                Uses Google Gemini 2.5 Flash. Requires a Google AI API key.
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
