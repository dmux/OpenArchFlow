"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Send, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { eventBridgeGetBus, eventBridgePutEvents, type EBRule } from "@/lib/ministack/browser-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function EventBridgeConsole({
  config,
  resourceId,
}: {
  config: MiniStackConfig;
  resourceId: string;
}) {
  const [rules, setRules] = useState<EBRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("com.openarchflow");
  const [detailType, setDetailType] = useState("TestEvent");
  const [detail, setDetail] = useState('{"key": "value"}');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventBridgeGetBus(config, resourceId);
      setRules(data.rules);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load event bus");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId]);

  useEffect(() => { load(); }, [load]);

  const handlePutEvent = async () => {
    try { JSON.parse(detail); } catch { toast.error("Detail must be valid JSON"); return; }
    setPublishing(true);
    try {
      const result = await eventBridgePutEvents(config, resourceId, source, detailType, detail);
      toast.success(`Event sent (${result.failedCount === 0 ? "success" : `${result.failedCount} failed`})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Put event failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-mono">{resourceId}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium">Rules ({rules.length})</p>
        <ScrollArea className="h-28 rounded-lg border border-border">
          <div className="p-2 space-y-1">
            {rules.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-4">No rules defined</p>
            )}
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/40">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  rule.state === "ENABLED" ? "bg-green-500" : "bg-muted-foreground"
                )} />
                <span className="text-xs font-medium">{rule.name}</span>
                {rule.scheduleExpression && (
                  <span className="text-[10px] text-muted-foreground font-mono">{rule.scheduleExpression}</span>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium">Put event</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} className="text-xs h-7" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Detail Type</Label>
            <Input value={detailType} onChange={(e) => setDetailType(e.target.value)} className="text-xs h-7" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Detail (JSON)</Label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="w-full text-xs h-16 p-2 rounded border border-border bg-background resize-none font-mono"
          />
        </div>
        <Button size="sm" onClick={handlePutEvent} disabled={publishing} className="gap-1.5 text-xs">
          {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Put Event
        </Button>
      </div>
    </div>
  );
}
