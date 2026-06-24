"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Cog, Plus, RefreshCw, Loader2, Trash2, Rocket, Play, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MiniStackConfig } from "@/lib/ministack/types";
import type { AppNode, GlueJobConfig } from "@/lib/store";
import {
  glueListJobs, glueUpsertJob, glueDeleteJob, glueUploadScript, glueStartJobRun, sanitizeGlueName,
} from "@/lib/ministack/glue-actions";
import PySparkEditor, { DEFAULT_PYSPARK_SCRIPT } from "./PySparkEditor";

const GLUE_VERSIONS = ["4.0", "3.0"];
const WORKER_TYPES = ["G.1X", "G.2X"];

interface JobsTabProps {
  config: MiniStackConfig;
  node: AppNode | null;
  setNodeGlueConfig: (nodeId: string, partial: { jobs?: GlueJobConfig[] }) => void;
  onRunStarted: (jobName: string) => void;
}

function newJob(): GlueJobConfig {
  return { name: "", pysparkCode: DEFAULT_PYSPARK_SCRIPT, glueVersion: "4.0", workerType: "G.1X", numberOfWorkers: 2 };
}

export function JobsTab({ config, node, setNodeGlueConfig, onRunStarted }: JobsTabProps) {
  const localJobs = useMemo<GlueJobConfig[]>(() => node?.data.glueConfig?.jobs ?? [], [node]);
  const [remoteNames, setRemoteNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<GlueJobConfig | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const jobs = await glueListJobs(config);
      setRemoteNames(jobs.map((j) => j.name));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list jobs");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { load(); }, [load]);

  // Merge locally-designed jobs with names that only exist on MiniStack.
  const jobList = useMemo<GlueJobConfig[]>(() => {
    const byName = new Map<string, GlueJobConfig>();
    for (const j of localJobs) byName.set(j.name, j);
    for (const name of remoteNames) if (!byName.has(name)) byName.set(name, { ...newJob(), name });
    return [...byName.values()];
  }, [localJobs, remoteNames]);

  const persist = (job: GlueJobConfig) => {
    if (!node) return;
    const others = localJobs.filter((j) => j.name !== job.name);
    setNodeGlueConfig(node.id, { jobs: [...others, job] });
  };

  const handleDeploy = async () => {
    if (!editing) return;
    const name = sanitizeGlueName(editing.name);
    if (!editing.name.trim()) { toast.error("Enter a job name"); return; }
    setDeploying(true);
    try {
      const scriptLocation = await glueUploadScript(config, name, editing.pysparkCode);
      await glueUpsertJob(config, {
        name,
        scriptLocation,
        glueVersion: editing.glueVersion,
        workerType: editing.workerType,
        numberOfWorkers: editing.numberOfWorkers,
      });
      const saved = { ...editing, name };
      persist(saved);
      setEditing(saved);
      toast.success(`Job "${name}" deployed (script uploaded to S3)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleRun = async () => {
    if (!editing) return;
    const name = sanitizeGlueName(editing.name);
    setRunning(true);
    try {
      const runId = await glueStartJobRun(config, name);
      toast.success(`Run started: ${runId || name}`);
      onRunStarted(name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await glueDeleteJob(config, name);
      if (node) setNodeGlueConfig(node.id, { jobs: localJobs.filter((j) => j.name !== name) });
      toast.success(`Job "${name}" deleted`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col h-full gap-2.5">
        <div className="flex items-center justify-between shrink-0">
          <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={handleDeploy} disabled={deploying} className="h-7 gap-1.5 text-xs">
              {deploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />} Deploy
            </Button>
            <Button size="sm" onClick={handleRun} disabled={running} className="h-7 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white">
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 shrink-0">
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Job name</label>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="my_etl_job"
              className="h-7 w-full text-xs rounded border border-border bg-background px-2 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Glue ver.</label>
            <select value={editing.glueVersion} onChange={(e) => setEditing({ ...editing, glueVersion: e.target.value })} className="h-7 w-full text-xs rounded border border-border bg-background px-1">
              {GLUE_VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Worker</label>
            <select value={editing.workerType} onChange={(e) => setEditing({ ...editing, workerType: e.target.value })} className="h-7 w-full text-xs rounded border border-border bg-background px-1">
              {WORKER_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Workers</label>
          <input
            type="number" min={2} max={50}
            value={editing.numberOfWorkers}
            onChange={(e) => setEditing({ ...editing, numberOfWorkers: Math.max(2, Number(e.target.value)) })}
            className="h-7 w-20 text-xs rounded border border-border bg-background px-2"
          />
          <span className="text-[10px] text-muted-foreground">Spark runs on the amazon/aws-glue-libs image (Docker required). Iceberg: add <code className="font-mono">--datalake-formats iceberg</code>.</span>
        </div>

        <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border">
          <PySparkEditor value={editing.pysparkCode} onChange={(v) => setEditing({ ...editing, pysparkCode: v })} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs font-medium flex items-center gap-1.5"><Cog className="w-3.5 h-3.5" /> ETL Jobs (PySpark)</p>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setEditing(newJob())} className="h-7 gap-1.5 text-xs">
            <Plus className="w-3 h-3" /> New job
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0 rounded border border-border">
        <div className="p-1.5 space-y-1">
          {jobList.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-6">{loading ? "Loading…" : "No jobs yet — create one."}</p>
          )}
          {jobList.map((j) => (
            <div key={j.name} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-accent">
              <button className="min-w-0 text-left" onClick={() => setEditing(j)}>
                <p className="text-xs font-mono font-medium truncate">{j.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Glue {j.glueVersion} · {j.workerType} · {j.numberOfWorkers} workers
                  {remoteNames.includes(j.name) ? " · deployed" : " · draft"}
                </p>
              </button>
              <button onClick={() => handleDelete(j.name)} className="text-muted-foreground hover:text-destructive shrink-0 p-1" title="Delete job">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
