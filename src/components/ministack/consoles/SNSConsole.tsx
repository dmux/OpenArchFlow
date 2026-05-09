"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Send, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Subscription { protocol: string; endpoint: string; arn: string }

export function SNSConsole({
  config,
  resourceId,
  resourceArn,
}: {
  config: MiniStackConfig;
  resourceId: string;
  resourceArn?: string;
}) {
  const topicArn = resourceArn ?? `arn:aws:sns:${config.region}:${config.accountId}:${resourceId}`;
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Hello from OpenArchFlow MiniStack!");
  const [subject, setSubject] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [subProtocol, setSubProtocol] = useState("sqs");
  const [subEndpoint, setSubEndpoint] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ministack/resource/sns?config=${encodeURIComponent(JSON.stringify(config))}&resourceId=${encodeURIComponent(resourceId)}&resourceArn=${encodeURIComponent(topicArn)}`,
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubs(data.subscriptions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load topic");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId, topicArn]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/ministack/resource/sns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, topicArn, message, subject: subject || undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`Published: ${data.messageId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!subEndpoint.trim()) { toast.error("Endpoint is required"); return; }
    setSubscribing(true);
    try {
      const res = await fetch("/api/ministack/resource/sns-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, topicArn, protocol: subProtocol, endpoint: subEndpoint }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Subscribed");
      setSubEndpoint("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Subscribe failed");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground truncate">{topicArn}</span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs shrink-0">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">Subscriptions ({subs.length})</p>
        <ScrollArea className="h-28 rounded-lg border border-border">
          <div className="p-2 space-y-1">
            {subs.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-4">No subscriptions</p>
            )}
            {subs.map((sub, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/40 text-xs">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border border-border">{sub.protocol}</span>
                <span className="truncate text-muted-foreground">{sub.endpoint}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Protocol</Label>
          <select
            value={subProtocol}
            onChange={(e) => setSubProtocol(e.target.value)}
            className="w-full text-xs h-8 px-2 rounded border border-border bg-background"
          >
            {["sqs", "http", "https", "email", "lambda"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Endpoint</Label>
          <Input
            value={subEndpoint}
            onChange={(e) => setSubEndpoint(e.target.value)}
            placeholder="arn:aws:sqs:..."
            className="text-xs h-8"
          />
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={handleSubscribe} disabled={subscribing} className="gap-1.5 text-xs w-fit">
        {subscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        Subscribe
      </Button>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium">Publish message</p>
        <Input
          placeholder="Subject (optional)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="text-xs h-7"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full text-xs h-16 p-2 rounded border border-border bg-background resize-none"
        />
        <Button size="sm" onClick={handlePublish} disabled={publishing} className="gap-1.5 text-xs">
          {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Publish
        </Button>
      </div>
    </div>
  );
}
