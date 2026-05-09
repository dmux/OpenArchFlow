"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Terminal, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LogGroup { name: string; storedBytes: number; retentionDays?: number }
interface LogStream { name: string; lastEventTime?: number }
interface LogEvent { timestamp?: number; message?: string }

export function CloudWatchConsole({ config }: { config: MiniStackConfig }) {
  const [groups, setGroups] = useState<LogGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [streams, setStreams] = useState<LogStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ministack/logs?config=${encodeURIComponent(JSON.stringify(config))}&action=groups`,
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGroups(data.groups ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load log groups");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const loadStreams = useCallback(async (groupName: string) => {
    try {
      const res = await fetch(
        `/api/ministack/logs?config=${encodeURIComponent(JSON.stringify(config))}&action=streams&logGroupName=${encodeURIComponent(groupName)}`,
      );
      const data = await res.json();
      setStreams(data.streams ?? []);
      setSelectedStream(data.streams?.[0]?.name ?? null);
    } catch { /* no-op */ }
  }, [config]);

  useEffect(() => {
    if (selectedGroup) loadStreams(selectedGroup);
  }, [selectedGroup, loadStreams]);

  // SSE streaming
  useEffect(() => {
    if (!streaming || !selectedGroup) return;
    setEvents([]);
    const params = new URLSearchParams({
      config: JSON.stringify(config),
      action: "events",
      stream: "true",
      logGroupName: selectedGroup,
      ...(selectedStream ? { logStreamName: selectedStream } : {}),
    });
    const es = new EventSource(`/api/ministack/logs?${params}`);
    es.onmessage = (e) => {
      try {
        const newEvents: LogEvent[] = JSON.parse(e.data);
        setEvents((prev) => [...prev, ...newEvents].slice(-500));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [streaming, config, selectedGroup, selectedStream]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Terminal className="w-3.5 h-3.5" />
          CloudWatch Logs
        </div>
        <Button size="sm" variant="ghost" onClick={loadGroups} disabled={loading} className="h-7 gap-1 text-xs">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Log Groups */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Log Groups</p>
          <ScrollArea className="h-28 rounded-lg border border-border">
            <div className="p-1 space-y-0.5">
              {groups.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">None</p>
              )}
              {groups.map((g) => (
                <button
                  key={g.name}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-[10px] font-mono truncate transition-colors",
                    selectedGroup === g.name ? "bg-primary text-primary-foreground" : "hover:bg-accent/50",
                  )}
                  onClick={() => { setSelectedGroup(g.name); setStreaming(false); }}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Log Streams */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Log Streams</p>
          <ScrollArea className="h-28 rounded-lg border border-border">
            <div className="p-1 space-y-0.5">
              {!selectedGroup && (
                <p className="text-[10px] text-muted-foreground text-center py-4">Select a group</p>
              )}
              {streams.map((s) => (
                <button
                  key={s.name}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-[10px] font-mono truncate transition-colors",
                    selectedStream === s.name ? "bg-primary text-primary-foreground" : "hover:bg-accent/50",
                  )}
                  onClick={() => setSelectedStream(s.name)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors",
            streaming ? "bg-green-500/15 text-green-600 border-green-500/30" : "border-border text-muted-foreground"
          )}
          onClick={() => setStreaming(!streaming)}
          disabled={!selectedGroup}
        >
          {streaming ? "● Live" : "▶ Start"}
        </button>
        {events.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{events.length} events</span>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 rounded-lg border border-border bg-black/5 dark:bg-white/5">
        <div className="p-2 space-y-0.5 font-mono">
          {events.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-8">
              {streaming ? "Waiting for log events…" : "Select a log group and click Start"}
            </p>
          )}
          {events.map((e, i) => (
            <div key={i} className="flex gap-2 text-[10px] hover:bg-accent/20 px-1 py-0.5 rounded">
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {e.timestamp ? new Date(e.timestamp).toISOString().slice(11, 23) : "—"}
              </span>
              <span className="break-all">{e.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
