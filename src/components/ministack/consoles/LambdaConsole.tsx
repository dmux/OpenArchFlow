"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, RefreshCw, Loader2, Terminal, Code2, Upload, Rocket, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { MiniStackConfig } from "@/lib/ministack/types";
import {
  lambdaGetConfig, lambdaInvoke, lambdaUpdateConfig, lambdaUploadCode,
  cwlStreamEvents, type CwlLogEvent,
} from "@/lib/ministack/browser-actions";
import { prettyPayload } from "@/lib/format-payload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Runtime definitions ───────────────────────────────────────────────────────

interface RuntimeDef {
  label: string;
  monacoLang: string;
  fileName: string;
  handler: string;
  defaultCode: string;
}

const RUNTIMES: Record<string, RuntimeDef> = {
  "nodejs20.x": {
    label: "Node.js 20",
    monacoLang: "javascript",
    fileName: "index.mjs",
    handler: "index.handler",
    defaultCode: `export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from OpenArchFlow MiniStack",
      event,
    }),
  };
};`,
  },
  "nodejs18.x": {
    label: "Node.js 18",
    monacoLang: "javascript",
    fileName: "index.mjs",
    handler: "index.handler",
    defaultCode: `export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from OpenArchFlow MiniStack",
      event,
    }),
  };
};`,
  },
  "python3.12": {
    label: "Python 3.12",
    monacoLang: "python",
    fileName: "lambda_function.py",
    handler: "lambda_function.lambda_handler",
    defaultCode: `import json

def lambda_handler(event, context):
    print("Event:", json.dumps(event, indent=2))

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Hello from OpenArchFlow MiniStack",
            "event": event,
        }),
    }`,
  },
  "python3.11": {
    label: "Python 3.11",
    monacoLang: "python",
    fileName: "lambda_function.py",
    handler: "lambda_function.lambda_handler",
    defaultCode: `import json

def lambda_handler(event, context):
    print("Event:", json.dumps(event, indent=2))

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Hello from OpenArchFlow MiniStack",
            "event": event,
        }),
    }`,
  },
  "python3.10": {
    label: "Python 3.10",
    monacoLang: "python",
    fileName: "lambda_function.py",
    handler: "lambda_function.lambda_handler",
    defaultCode: `import json

def lambda_handler(event, context):
    print("Event:", json.dumps(event, indent=2))

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Hello from OpenArchFlow MiniStack",
            "event": event,
        }),
    }`,
  },
};

const RUNTIME_KEYS = Object.keys(RUNTIMES);
const DEFAULT_RUNTIME = "nodejs20.x";

function detectRuntime(raw?: string): string {
  if (!raw) return DEFAULT_RUNTIME;
  const normalized = raw.toLowerCase();
  return RUNTIME_KEYS.find((k) => k === normalized) ?? DEFAULT_RUNTIME;
}

type Tab = "overview" | "code" | "logs";

interface FnConfig {
  runtime?: string;
  handler?: string;
  memorySize?: number;
  timeout?: number;
  codeSize?: number;
  state?: string;
  environment?: Record<string, string>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LambdaConsole({ config, resourceId }: { config: MiniStackConfig; resourceId: string }) {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [fnConfig, setFnConfig] = useState<FnConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState('{"key": "value"}');
  const [invoking, setInvoking] = useState(false);
  const [invokeResult, setInvokeResult] = useState<unknown>(null);

  const [editMemory, setEditMemory] = useState<number>(128);
  const [editTimeout, setEditTimeout] = useState<number>(3);
  const [editEnv, setEditEnv] = useState<{ key: string; value: string }[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  const [runtime, setRuntime] = useState(DEFAULT_RUNTIME);
  const [code, setCode] = useState(RUNTIMES[DEFAULT_RUNTIME].defaultCode);
  const [deploying, setDeploying] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeIsDefault = useRef(true);

  const [logs, setLogs] = useState<CwlLogEvent[]>([]);
  const [streamLogs, setStreamLogs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await lambdaGetConfig(config, resourceId);
      setFnConfig(data);
      const detected = detectRuntime(data.runtime);
      setRuntime(detected);
      if (data.memorySize) setEditMemory(data.memorySize);
      if (data.timeout)    setEditTimeout(data.timeout);
      setEditEnv(Object.entries(data.environment ?? {}).map(([key, value]) => ({ key, value })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load function");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId]);

  useEffect(() => { load(); }, [load]);

  // Browser-side polling for CloudWatch logs
  useEffect(() => {
    if (!streamLogs) return;
    setLogs([]);
    const stop = cwlStreamEvents(config, `/aws/lambda/${resourceId}`, undefined, (batch) => {
      setLogs((prev) => [...prev, ...batch].slice(-200));
    });
    return stop;
  }, [streamLogs, config, resourceId]);

  const handleRuntimeChange = (newRuntime: string) => {
    setRuntime(newRuntime);
    if (codeIsDefault.current) {
      setCode(RUNTIMES[newRuntime]?.defaultCode ?? "");
    }
  };

  const handleCodeChange = (v: string | undefined) => {
    const val = v ?? "";
    setCode(val);
    codeIsDefault.current = val === RUNTIMES[runtime]?.defaultCode;
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const environment = Object.fromEntries(editEnv.filter((e) => e.key.trim()).map((e) => [e.key.trim(), e.value]));
      await lambdaUpdateConfig(config, resourceId, { memorySize: editMemory, timeout: editTimeout, environment });
      toast.success("Configuration saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleInvoke = async () => {
    try { JSON.parse(payload); } catch { toast.error("Invalid JSON payload"); return; }
    setInvoking(true);
    setInvokeResult(null);
    try {
      const result = await lambdaInvoke(config, resourceId, payload);
      setInvokeResult(result);
      toast.success("Invoked");
      setActiveTab("logs");
      setLogs([]);
      setStreamLogs(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invoke failed";
      setInvokeResult({ error: msg });
      toast.error(msg);
    } finally {
      setInvoking(false);
    }
  };

  const handleDeployCode = async () => {
    setDeploying(true);
    const def = RUNTIMES[runtime];
    try {
      await lambdaUpdateConfig(config, resourceId, { runtime, handler: def.handler });

      const { zipSync, strToU8 } = await import("fflate");
      const zipped = zipSync({ [def.fileName]: [strToU8(code), { level: 6 }] });
      let binary = "";
      for (let i = 0; i < zipped.length; i++) binary += String.fromCharCode(zipped[i]);
      const zipBase64 = btoa(binary);

      await lambdaUploadCode(config, resourceId, zipBase64);
      toast.success(`Deployed as ${runtime} (${def.fileName})`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleUploadZip = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const arrayBuffer = await uploadFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const zipBase64 = btoa(binary);

      await lambdaUploadCode(config, resourceId, zipBase64);
      toast.success("Code uploaded — function updated");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const def = RUNTIMES[runtime] ?? RUNTIMES[DEFAULT_RUNTIME];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <RefreshCw className="w-3 h-3" /> },
    { id: "code", label: "Code", icon: <Code2 className="w-3 h-3" /> },
    { id: "logs", label: "Logs", icon: <Terminal className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Tab bar */}
      <div className="flex border-b border-border mb-3 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === "logs" && !streamLogs) { setLogs([]); setStreamLogs(true); }
              else if (tab.id !== "logs" && streamLogs) setStreamLogs(false);
              setActiveTab(tab.id);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <span className="text-xs font-mono text-muted-foreground">{resourceId}</span>
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
            </Button>
          </div>

          {fnConfig && (
            <div className="grid grid-cols-4 gap-2 shrink-0">
              {[
                { label: "Runtime", value: fnConfig.runtime ?? "—" },
                { label: "Memory", value: fnConfig.memorySize ? `${fnConfig.memorySize}MB` : "—" },
                { label: "Timeout", value: fnConfig.timeout ? `${fnConfig.timeout}s` : "—" },
                { label: "State", value: fnConfig.state ?? "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-2 text-center">
                  <p className="text-xs font-bold truncate">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Editable config */}
          <div className="border border-border rounded-lg p-3 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Configuration</p>
              <Button size="sm" variant="outline" onClick={handleSaveConfig} disabled={savingConfig} className="h-6 gap-1 text-xs">
                {savingConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Memory (MB)</label>
                <select
                  value={editMemory}
                  onChange={(e) => setEditMemory(Number(e.target.value))}
                  className="w-full h-7 text-xs rounded border border-border bg-background px-2"
                >
                  {[128, 256, 512, 1024, 2048, 3008, 4096, 8192, 10240].map((m) => (
                    <option key={m} value={m}>{m} MB</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Timeout (s)</label>
                <input
                  type="number"
                  min={1}
                  max={900}
                  value={editTimeout}
                  onChange={(e) => setEditTimeout(Math.max(1, Math.min(900, Number(e.target.value))))}
                  className="w-full h-7 text-xs rounded border border-border bg-background px-2"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Environment Variables</label>
                <button
                  onClick={() => setEditEnv((prev) => [...prev, { key: "", value: "" }])}
                  className="text-[10px] text-primary hover:underline"
                >
                  + Add
                </button>
              </div>
              {editEnv.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">No variables set.</p>
              )}
              {editEnv.map((entry, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input
                    value={entry.key}
                    onChange={(e) => setEditEnv((prev) => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                    placeholder="KEY"
                    className="h-6 flex-1 text-xs rounded border border-border bg-background px-2 font-mono"
                  />
                  <input
                    value={entry.value}
                    onChange={(e) => setEditEnv((prev) => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    placeholder="value"
                    className="h-6 flex-1 text-xs rounded border border-border bg-background px-2 font-mono"
                  />
                  <button
                    onClick={() => setEditEnv((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive text-xs shrink-0 px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 shrink-0">
            <p className="text-xs font-medium">Invoke</p>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full text-xs h-16 p-2 rounded border border-border bg-background resize-none font-mono"
              placeholder='{"key": "value"}'
            />
            <Button size="sm" onClick={handleInvoke} disabled={invoking} className="gap-1.5 text-xs">
              {invoking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Invoke
            </Button>
          </div>

          {invokeResult !== null && (
            <div className={cn(
              "rounded-lg border p-3 text-xs font-mono shrink-0",
              (invokeResult as any)?.error
                ? "border-destructive/40 bg-destructive/5"
                : "border-green-500/40 bg-green-500/5",
            )}>
              <pre className="whitespace-pre-wrap break-all text-[10px] line-clamp-6">{prettyPayload(invokeResult)}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── Code Editor ── */}
      {activeTab === "code" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-2 shrink-0">
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={runtime}
              onChange={(e) => handleRuntimeChange(e.target.value)}
              className="h-7 text-xs rounded border border-border bg-background px-2 flex-1"
            >
              {RUNTIME_KEYS.map((r) => (
                <option key={r} value={r}>{RUNTIMES[r].label} — {r}</option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleDeployCode}
              disabled={deploying}
              className="h-7 gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white shrink-0"
            >
              {deploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
              Deploy
            </Button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground">
              File: <code className="font-mono">{def.fileName}</code>
              {" · "}Handler: <code className="font-mono">{def.handler}</code>
            </span>
          </div>

          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border">
            <Editor
              height="100%"
              language={def.monacoLang}
              value={code}
              onChange={handleCodeChange}
              theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8, bottom: 8 },
                overviewRulerLanes: 0,
                renderLineHighlight: "gutter",
                tabSize: def.monacoLang === "python" ? 4 : 2,
              }}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <p className="text-[10px] text-muted-foreground shrink-0">Or upload a .zip:</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="flex-1 text-xs text-muted-foreground file:mr-2 file:text-xs file:border file:border-border file:rounded file:px-2 file:py-0.5 file:bg-muted file:text-foreground"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleUploadZip}
              disabled={!uploadFile || uploading}
              className="h-7 gap-1.5 text-xs shrink-0"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Upload
            </Button>
          </div>
        </div>
      )}

      {/* ── Logs ── */}
      {activeTab === "logs" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <p className="text-xs font-medium flex items-center gap-1">
              <Terminal className="w-3 h-3" /> /aws/lambda/{resourceId}
            </p>
            <button
              className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                streamLogs ? "bg-green-500/15 text-green-600 border-green-500/30" : "border-border text-muted-foreground",
              )}
              onClick={() => { setStreamLogs(!streamLogs); if (!streamLogs) setLogs([]); }}
            >
              {streamLogs ? "● Live" : "Start"}
            </button>
          </div>
          <ScrollArea className="flex-1 min-h-0 rounded border border-border">
            <div className="p-2 space-y-0.5">
              {logs.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">
                  {streamLogs ? "Waiting for logs…" : "Click Start to stream logs"}
                </p>
              )}
              {logs.map((e, i) => (
                <div key={i} className="text-[10px] font-mono flex gap-2">
                  <span className="text-muted-foreground shrink-0">
                    {e.timestamp ? new Date(e.timestamp).toISOString().slice(11, 23) : "—"}
                  </span>
                  <span className="break-all">{e.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
