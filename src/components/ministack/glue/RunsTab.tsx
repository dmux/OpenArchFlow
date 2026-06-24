"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Activity, RefreshCw, Loader2, Terminal, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MiniStackConfig } from "@/lib/ministack/types";
import {
  glueListJobs, glueListJobRuns, glueGetJobRun, isTerminalRunState,
  type GlueJobRunInfo, type GlueJobRunState,
} from "@/lib/ministack/glue-actions";
import { cwlStreamEvents, cwlListGroups, type CwlLogEvent } from "@/lib/ministack/browser-actions";

const STATE_STYLES: Record<string, string> = {
  SUCCEEDED: "bg-green-500/15 text-green-600 border-green-500/30",
  RUNNING: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  STARTING: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  WAITING: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  STOPPING: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  STOPPED: "bg-muted text-muted-foreground border-border",
  FAILED: "bg-red-500/15 text-red-600 border-red-500/30",
  TIMEOUT: "bg-red-500/15 text-red-600 border-red-500/30",
  ERROR: "bg-red-500/15 text-red-600 border-red-500/30",
};

interface RunsTabProps {
  config: MiniStackConfig;
  activeJob: string;
  onSelectJob: (job: string) => void;
}

export function RunsTab({ config, activeJob, onSelectJob }: RunsTabProps) {
  const [jobNames, setJobNames] = useState<string[]>([]);
  const [runs, setRuns] = useState<GlueJobRunInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<CwlLogEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [allGroups, setAllGroups] = useState<string[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>(""); // "" = all groups

  // List every CloudWatch log group so the user can see/pick where MiniStack
  // writes Glue Spark logs (the naming is not guaranteed to be /aws-glue/*).
  const loadGroups = useCallback(async () => {
    try {
      const res = await cwlListGroups(config);
      const names = res.groups.map((g) => g.name).filter(Boolean);
      setAllGroups(names);
      // Default to a glue/spark group when present, otherwise stream all.
      const preferred = names.find((n) => /glue|spark/i.test(n));
      setSelectedGroup((cur) => cur || preferred || "");
    } catch {
      setAllGroups([]);
    }
  }, [config]);

  const loadJobs = useCallback(async () => {
    try {
      const jobs = await glueListJobs(config);
      const names = jobs.map((j) => j.name);
      setJobNames(names);
      if (!activeJob && names.length > 0) onSelectJob(names[0]);
    } catch { /* surfaced by run load */ }
  }, [config, activeJob, onSelectJob]);

  const loadRuns = useCallback(async () => {
    if (!activeJob) { setRuns([]); return; }
    setLoading(true);
    try {
      setRuns(await glueListJobRuns(config, activeJob));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list runs");
    } finally {
      setLoading(false);
    }
  }, [config, activeJob]);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { loadRuns(); }, [loadRuns]);
  useEffect(() => { loadGroups(); }, [loadGroups]);

  // Poll while any run is non-terminal.
  const hasActiveRun = runs.some((r) => !isTerminalRunState(r.state));

  // Auto-start log streaming once a run is in flight.
  useEffect(() => {
    if (hasActiveRun) setStreaming(true);
  }, [hasActiveRun]);
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (!activeJob || !hasActiveRun) return;
    const tick = async () => {
      try {
        const updated = await Promise.all(
          runs.map(async (r) =>
            isTerminalRunState(r.state) ? r : (await glueGetJobRun(config, activeJob, r.id)) ?? r),
        );
        setRuns(updated);
      } catch { /* keep last known */ }
    };
    pollRef.current = window.setInterval(tick, 2500);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [activeJob, hasActiveRun, runs, config]);

  // Tail Spark logs from the selected CloudWatch group (or all discovered
  // groups). Uses a 30-minute lookback so a just-finished run is still caught.
  useEffect(() => {
    if (!streaming) return;
    setLogs([]);
    const append = (batch: CwlLogEvent[]) =>
      setLogs((prev) => [...prev, ...batch].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)).slice(-1500));

    const targets = selectedGroup
      ? [selectedGroup]
      : (allGroups && allGroups.length > 0 ? allGroups : ["/aws-glue/jobs/output", "/aws-glue/jobs/error"]);
    const stops = targets.map((g) => cwlStreamEvents(config, g, undefined, append, 30 * 60 * 1000));
    return () => stops.forEach((s) => s());
  }, [streaming, config, selectedGroup, allGroups]);

  const fmtTime = (sec?: number) => (sec === undefined ? "—" : `${sec}s`);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-3.5 h-3.5 shrink-0" />
        <select
          value={activeJob}
          onChange={(e) => onSelectJob(e.target.value)}
          className="h-7 flex-1 text-xs rounded border border-border bg-background px-2 font-mono"
        >
          {jobNames.length === 0 && <option value="">No jobs deployed</option>}
          {jobNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <Button size="sm" variant="ghost" onClick={loadRuns} disabled={loading} className="h-7 gap-1 text-xs">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="space-y-1.5 shrink-0 max-h-[40%] overflow-auto">
        {runs.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-4">{loading ? "Loading…" : "No runs yet — start one from the Jobs tab."}</p>
        )}
        {runs.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono truncate">{r.id}</span>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 flex items-center gap-1", STATE_STYLES[r.state] ?? "border-border")}>
                {!isTerminalRunState(r.state) && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                {r.state}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Exec: {fmtTime(r.executionTimeSeconds)}</span>
              {r.startedOn && <span>Started: {new Date(r.startedOn).toLocaleTimeString()}</span>}
            </div>
            {r.errorMessage && (
              <div className="rounded border border-red-500/30 bg-red-500/5 p-1.5">
                <pre className="text-[10px] text-red-500 whitespace-pre-wrap break-all max-h-40 overflow-auto">{r.errorMessage}</pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(r.errorMessage ?? ""); toast.success("Error copied"); }}
                  className="mt-1 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Copy className="w-2.5 h-2.5" /> Copy error
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between shrink-0 border-t border-border pt-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Terminal className="w-3 h-3 shrink-0" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            title="CloudWatch log group"
            className="h-6 text-[10px] rounded border border-border bg-background px-1 max-w-full min-w-0 flex-1 font-mono"
          >
            <option value="">All groups{allGroups ? ` (${allGroups.length})` : ""}</option>
            {(allGroups ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={loadGroups} title="Refresh log groups" className="text-muted-foreground hover:text-foreground shrink-0">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            disabled={logs.length === 0}
            onClick={() => {
              navigator.clipboard.writeText(logs.map((l) => l.message ?? "").join("\n"));
              toast.success("Logs copied");
            }}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-1"
          >
            <Copy className="w-2.5 h-2.5" /> Copy
          </button>
          <button
            className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors", streaming ? "bg-green-500/15 text-green-600 border-green-500/30" : "border-border text-muted-foreground")}
            onClick={() => setStreaming((s) => !s)}
          >
            {streaming ? "● Live" : "Start"}
          </button>
        </div>
      </div>
      {allGroups?.length === 0 && (
        <p className="text-[10px] text-muted-foreground shrink-0 -mt-1">
          MiniStack doesn&apos;t expose Glue Spark logs via CloudWatch. Read raw output with <code className="font-mono">docker logs &lt;container&gt;</code>, or write results to S3 / a catalog table to view them in the consoles. Run status and errors still appear on the run cards above.
        </p>
      )}
      <ScrollArea className="flex-1 min-h-0 rounded border border-border">
        <div className="p-2 space-y-0.5">
          {logs.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-4 space-y-1.5 px-3">
              <p>{streaming ? "Waiting for Spark logs…" : "Click Start to stream Spark logs"}</p>
              {allGroups !== null && (
                allGroups.length === 0 ? (
                  <p className="text-yellow-600 dark:text-yellow-500">MiniStack has no CloudWatch log groups at all — it is not shipping Spark stdout to CloudWatch Logs. Read them directly with <code className="font-mono">docker logs &lt;container&gt;</code>.</p>
                ) : (
                  <p>{allGroups.length} log group{allGroups.length !== 1 ? "s" : ""} available — pick one above if &quot;All&quot; shows nothing.</p>
                )
              )}
            </div>
          )}
          {logs.map((e, i) => (
            <div key={i} className="text-[10px] font-mono flex gap-2">
              <span className="text-muted-foreground shrink-0">{e.timestamp ? new Date(e.timestamp).toISOString().slice(11, 23) : "—"}</span>
              <span className="break-all">{e.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export type { GlueJobRunState };
