"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useDiagramStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface MiniStackConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

type ConnectionStatus = "idle" | "checking" | "connected" | "failed";

export function MiniStackConfigDialog({ open, onClose }: MiniStackConfigDialogProps) {
  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const setMinistackConfig = useDiagramStore((s) => s.setMinistackConfig);

  const [form, setForm] = useState(ministackConfig);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("idle");
  const [connMessage, setConnMessage] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setForm(ministackConfig);
    else onClose();
  };

  const handleSave = () => {
    setMinistackConfig(form);
    onClose();
  };

  const handleTestConnection = async () => {
    setConnStatus("checking");
    setConnMessage("");
    try {
      const res = await fetch(
        `/api/ministack/health?endpoint=${encodeURIComponent(form.endpoint)}`,
      );
      const data = await res.json();
      if (data.connected) {
        setConnStatus("connected");
        setConnMessage("MiniStack is running and reachable.");
      } else {
        setConnStatus("failed");
        setConnMessage(data.error ?? "Could not connect.");
      }
    } catch {
      setConnStatus("failed");
      setConnMessage("Network error. Is the dev server running?");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            MiniStack Connection
          </DialogTitle>
          <DialogDescription>
            Configure the local AWS emulator endpoint. MiniStack must be running
            at the specified address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ms-endpoint">Endpoint URL</Label>
            <Input
              id="ms-endpoint"
              value={form.endpoint}
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
              placeholder="http://localhost:4566"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ms-region">Region</Label>
              <Input
                id="ms-region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="us-east-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-account">Account ID</Label>
              <Input
                id="ms-account"
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                placeholder="000000000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ms-key">Access Key ID</Label>
              <Input
                id="ms-key"
                value={form.accessKeyId}
                onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })}
                placeholder="test"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-secret">Secret Access Key</Label>
              <Input
                id="ms-secret"
                type="password"
                value={form.secretAccessKey}
                onChange={(e) =>
                  setForm({ ...form, secretAccessKey: e.target.value })
                }
                placeholder="test"
              />
            </div>
          </div>

          {/* Connection test result */}
          {connStatus !== "idle" && (
            <div
              className={cn(
                "flex items-center gap-2 text-sm px-3 py-2 rounded-lg",
                connStatus === "connected" &&
                  "bg-green-500/10 text-green-600 dark:text-green-400",
                connStatus === "failed" &&
                  "bg-destructive/10 text-destructive",
                connStatus === "checking" && "text-muted-foreground",
              )}
            >
              {connStatus === "checking" && (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              )}
              {connStatus === "connected" && (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              {connStatus === "failed" && (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{connMessage || "Checking…"}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={connStatus === "checking"}
          >
            {connStatus === "checking" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Test Connection
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
