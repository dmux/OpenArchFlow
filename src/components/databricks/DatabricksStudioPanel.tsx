"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Cog, Activity, Settings, AlertTriangle, Maximize2, Minimize2,
  Play, Plus, Trash2, Loader2, RefreshCw, Square, CheckCircle2,
} from "lucide-react";
import { AzDatabricks } from "azure-react-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDiagramStore, type AppNode, type DatabricksJobConfig } from "@/lib/store";
import {
  cancelRun, checkMinilakeHealth, getRun, getRunOutput, isTerminalRunState,
  listRuns, runStatusLabel, submitPythonRun,
} from "@/lib/minilake/databricks-actions";
import type { DatabricksRun, DatabricksRunOutput } from "@/lib/minilake/types";
import PySparkEditor from "@/components/ministack/glue/PySparkEditor";

const ACCENT = "#FF3621";
const POLL_MS = 2500;

export const DEFAULT_DATABRICKS_SCRIPT = `from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("openarchflow").getOrCreate()

df = spark.range(0, 1000).withColumn("value", F.rand())
print("rows:", df.count())
df.show(10, truncate=False)
`;

type StudioTab = "jobs" | "runs" | "settings";

interface DatabricksStudioPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: AppNode[];
}

export default function DatabricksStudioPanel({ isOpen, onClose, nodes }: DatabricksStudioPanelProps) {
  const config = useDiagramStore((s) => s.minilakeConfig);
  const setMinilakeConfig = useDiagramStore((s) => s.setMinilakeConfig);
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const setNodeDatabricksConfig = useDiagramStore((s) => s.setNodeDatabricksConfig);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>("jobs");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeJobName, setActiveJobName] = useState<string | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setReachable(null);
    checkMinilakeHealth(config).then((r) => { if (!cancelled) setReachable(r.connected); });
    return () => { cancelled = true; };
  }, [isOpen, config]);

  const dbNodes = useMemo(() => nodes.filter((n) => n.data.service === "databricks"), [nodes]);

  const activeNode = useMemo<AppNode | null>(() => {
    if (activeNodeId) return dbNodes.find((n) => n.id === activeNodeId) ?? null;
    return dbNodes.find((n) => n.id === selectedNodeId) ?? dbNodes[0] ?? null;
  }, [dbNodes, activeNodeId, selectedNodeId]);

  const jobs: DatabricksJobConfig[] = useMemo(
    () => activeNode?.data.databricksConfig?.jobs ?? [],
    [activeNode],
  );
  const activeJob = jobs.find((j) => j.name === activeJobName) ?? jobs[0] ?? null;

  const saveJobs = (next: DatabricksJobConfig[]) => {
    if (activeNode) setNodeDatabricksConfig(activeNode.id, { jobs: next });
  };

  const addJob = () => {
    let i = jobs.length + 1;
    while (jobs.some((j) => j.name === `job-${i}`)) i++;
    const job = { name: `job-${i}`, pysparkCode: DEFAULT_DATABRICKS_SCRIPT };
    saveJobs([...jobs, job]);
    setActiveJobName(job.name);
  };

  const updateJob = (patch: Partial<DatabricksJobConfig>) => {
    if (!activeJob) return;
    saveJobs(jobs.map((j) => (j.name === activeJob.name ? { ...j, ...patch } : j)));
    if (patch.name) setActiveJobName(patch.name);
  };

  const deleteJob = () => {
    if (!activeJob) return;
    saveJobs(jobs.filter((j) => j.name !== activeJob.name));
    setActiveJobName(null);
  };

  const runJob = async () => {
    if (!activeJob) return;
    setRunning(true);
    try {
      const runId = await submitPythonRun(config, activeJob.name, activeJob.pysparkCode, activeJob.parameters);
      toast.success(`Run ${runId} submitted`);
      setSelectedRunId(runId);
      setActiveTab("runs");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit run");
    } finally {
      setRunning(false);
    }
  };

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: "jobs", label: "Jobs", icon: <Cog size={14} /> },
    { id: "runs", label: "Runs", icon: <Activity size={14} /> },
    { id: "settings", label: "Settings", icon: <Settings size={14} /> },
  ];

  const panel = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={isFullscreen ? "fullscreen" : "panel"}
          initial={isFullscreen ? { opacity: 0, scale: 0.97 } : { x: "100%", opacity: 0 }}
          animate={isFullscreen ? { opacity: 1, scale: 1 } : { x: 0, opacity: 1 }}
          exit={isFullscreen ? { opacity: 0, scale: 0.97 } : { x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "fixed z-[9999] flex flex-col shadow-2xl border-border bg-background",
            isFullscreen ? "inset-0 border-0 rounded-none" : "right-0 top-0 h-full border-l",
          )}
          style={{ width: isFullscreen ? "100%" : 560 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${ACCENT}22` }}>
                <AzDatabricks className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Databricks Studio</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${ACCENT}22`, color: ACCENT }}>
                    minilake
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">PySpark jobs · {config.host}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
                onClick={() => setIsFullscreen((v) => !v)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent">
                <X size={14} />
              </button>
            </div>
          </div>

          {dbNodes.length > 1 && (
            <div className="px-4 py-2 border-b border-border shrink-0 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Databricks node</span>
              <select
                value={activeNode?.id ?? ""}
                onChange={(e) => { setActiveNodeId(e.target.value); setActiveJobName(null); }}
                className="h-7 flex-1 text-xs rounded border border-border bg-background px-2"
              >
                {dbNodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
              </select>
            </div>
          )}

          {reachable === false && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-900 shrink-0 flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>
                minilake is not reachable at {config.host}. Start it with{" "}
                <code className="font-mono">docker compose -f docker-compose.minilake.yml up</code>
                {" "}and make sure <code className="font-mono">MINILAKE_CORS_ORIGINS</code> includes this app&apos;s origin.
              </span>
            </div>
          )}

          <div className="flex border-b border-border shrink-0 px-4 pt-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors mr-1 -mb-px",
                  activeTab === tab.id ? "" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                style={activeTab === tab.id ? { borderColor: ACCENT, color: ACCENT } : {}}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden p-4">
            {activeTab === "settings" ? (
              <SettingsTab config={config} onChange={setMinilakeConfig} />
            ) : dbNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <AzDatabricks className="w-12 h-12 opacity-60" />
                <p className="text-sm font-medium">No Databricks node on the canvas</p>
                <p className="text-xs text-muted-foreground">Add a Databricks service from the Analytics category to write and run PySpark jobs here.</p>
              </div>
            ) : activeTab === "jobs" ? (
              <JobsTab
                jobs={jobs}
                activeJob={activeJob}
                running={running}
                onSelect={setActiveJobName}
                onAdd={addJob}
                onUpdate={updateJob}
                onDelete={deleteJob}
                onRun={runJob}
              />
            ) : (
              <RunsTab
                config={config}
                selectedRunId={selectedRunId}
                onSelect={setSelectedRunId}
                active={isOpen && activeTab === "runs"}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(panel, document.body);
}

function JobsTab({
  jobs, activeJob, running, onSelect, onAdd, onUpdate, onDelete, onRun,
}: {
  jobs: DatabricksJobConfig[];
  activeJob: DatabricksJobConfig | null;
  running: boolean;
  onSelect: (name: string) => void;
  onAdd: () => void;
  onUpdate: (patch: Partial<DatabricksJobConfig>) => void;
  onDelete: () => void;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={activeJob?.name ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          disabled={jobs.length === 0}
          className="h-8 flex-1 text-xs rounded border border-border bg-background px-2"
        >
          {jobs.length === 0 && <option value="">No jobs yet</option>}
          {jobs.map((j) => <option key={j.name} value={j.name}>{j.name}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={onAdd} className="h-8 text-xs gap-1">
          <Plus size={12} /> New job
        </Button>
      </div>

      {activeJob ? (
        <>
          <div className="flex items-center gap-2 shrink-0">
            <input
              value={activeJob.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="h-8 flex-1 text-xs rounded border border-border bg-background px-2 font-mono"
              aria-label="Job name"
            />
            <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 w-8 p-0" title="Delete job">
              <Trash2 size={14} />
            </Button>
            <Button size="sm" onClick={onRun} disabled={running} className="h-8 text-xs gap-1" style={{ background: ACCENT }}>
              {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Run
            </Button>
          </div>
          <div className="flex-1 min-h-0 rounded border border-border overflow-hidden">
            <PySparkEditor value={activeJob.pysparkCode} onChange={(v) => onUpdate({ pysparkCode: v })} />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          Create a job to start writing PySpark.
        </div>
      )}
    </div>
  );
}

function RunsTab({
  config, selectedRunId, onSelect, active,
}: {
  config: import("@/lib/minilake/types").MinilakeConfig;
  selectedRunId: number | null;
  onSelect: (id: number | null) => void;
  active: boolean;
}) {
  const [runs, setRuns] = useState<DatabricksRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<DatabricksRunOutput | null>(null);
  const outputFor = useRef<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRuns(await listRuns(config));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list runs");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { if (active) load(); }, [active, load]);

  const selected = runs.find((r) => r.run_id === selectedRunId) ?? null;
  const hasActive = runs.some((r) => !isTerminalRunState(r));

  // Poll non-terminal runs until they finish.
  useEffect(() => {
    if (!active || !hasActive) return;
    const id = window.setInterval(async () => {
      try {
        setRuns((cur) => cur); // keep stable reference until results arrive
        const current = await listRuns(config);
        const detailed = await Promise.all(
          current.map((r) => (isTerminalRunState(r) ? r : getRun(config, r.run_id).catch(() => r))),
        );
        setRuns(detailed);
      } catch { /* transient; next tick retries */ }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [active, hasActive, config]);

  // Fetch logs for the selected run; refresh while it is still running.
  useEffect(() => {
    if (!selected) { setOutput(null); return; }
    const key = `${selected.run_id}:${runStatusLabel(selected)}`;
    if (outputFor.current === key) return;
    outputFor.current = key;
    getRunOutput(config, selected).then(setOutput).catch(() => setOutput(null));
  }, [selected, config]);

  const cancel = async (run: DatabricksRun) => {
    try {
      await cancelRun(config, run.run_id);
      toast.success(`Run ${run.run_id} cancel requested`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel run");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">{runs.length} run(s)</span>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-7 text-xs gap-1">
          <RefreshCw size={12} className={cn(loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1 shrink-0">
        {runs.length === 0 && <p className="text-xs text-muted-foreground">No runs yet. Run a job from the Jobs tab.</p>}
        {runs.map((r) => {
          const label = runStatusLabel(r);
          const done = isTerminalRunState(r);
          return (
            <button
              key={r.run_id}
              onClick={() => { outputFor.current = ""; onSelect(r.run_id); }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded border text-left text-xs",
                r.run_id === selectedRunId ? "border-primary bg-accent" : "border-border hover:bg-accent/50",
              )}
            >
              {!done ? <Loader2 size={12} className="animate-spin shrink-0" />
                : r.state.result_state === "SUCCESS" ? <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                : <AlertTriangle size={12} className="text-red-500 shrink-0" />}
              <span className="font-mono truncate flex-1">{r.run_name ?? `run-${r.run_id}`}</span>
              <span className="text-muted-foreground">#{r.run_id}</span>
              <span className="font-medium">{label}</span>
              {!done && (
                <span
                  role="button"
                  title="Cancel run"
                  onClick={(e) => { e.stopPropagation(); cancel(r); }}
                  className="p-1 rounded hover:bg-background"
                >
                  <Square size={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 rounded border border-border bg-muted/30 overflow-auto p-2">
        {!selected ? (
          <p className="text-xs text-muted-foreground">Select a run to see its logs.</p>
        ) : (
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">
            {selected.state.state_message && `${selected.state.state_message}\n\n`}
            {output?.error && `ERROR: ${output.error}\n${output.error_trace ?? ""}\n\n`}
            {output?.logs ?? (isTerminalRunState(selected) ? "(no logs)" : "Waiting for output…")}
            {output?.logs_truncated && "\n… logs truncated"}
          </pre>
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  config, onChange,
}: {
  config: import("@/lib/minilake/types").MinilakeConfig;
  onChange: (c: Partial<import("@/lib/minilake/types").MinilakeConfig>) => void;
}) {
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  const test = async () => {
    setStatus("testing");
    const r = await checkMinilakeHealth(config);
    setStatus(r.connected ? "ok" : "fail");
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs font-medium">minilake host</span>
        <input
          value={config.host}
          onChange={(e) => { onChange({ host: e.target.value }); setStatus("idle"); }}
          className="h-8 w-full text-xs rounded border border-border bg-background px-2 font-mono"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium">Access token</span>
        <input
          type="password"
          value={config.token}
          onChange={(e) => onChange({ token: e.target.value })}
          className="h-8 w-full text-xs rounded border border-border bg-background px-2 font-mono"
        />
        <span className="text-[11px] text-muted-foreground">minilake does not enforce authentication; any value works.</span>
      </label>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={test} disabled={status === "testing"} className="h-8 text-xs gap-1">
          {status === "testing" && <Loader2 size={12} className="animate-spin" />}
          Test connection
        </Button>
        {status === "ok" && <span className="text-xs text-green-600">Connected</span>}
        {status === "fail" && (
          <span className="text-xs text-red-500">
            Not reachable. Check the host and that MINILAKE_CORS_ORIGINS allows this origin.
          </span>
        )}
      </div>
    </div>
  );
}
