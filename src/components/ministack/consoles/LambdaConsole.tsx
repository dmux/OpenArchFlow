"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, RefreshCw, Loader2, Terminal, Code2, Upload, Rocket, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { MiniStackConfig } from "@/lib/ministack/types";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectRuntime(raw?: string): string {
  if (!raw) return DEFAULT_RUNTIME;
  const normalized = raw.toLowerCase();
  return RUNTIME_KEYS.find((k) => k === normalized) ?? DEFAULT_RUNTIME;
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

  // — Overview state —
  const [fnConfig, setFnConfig] = useState<FnConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState('{"key": "value"}');
  const [invoking, setInvoking] = useState(false);
  const [response, setResponse] = useState<{ statusCode?: number; error?: string; payload?: string } | null>(null);

  // — Config edit state —
  const [editMemory, setEditMemory] = useState<number>(128);
  const [editTimeout, setEditTimeout] = useState<number>(3);
  const [editEnv, setEditEnv] = useState<{ key: string; value: string }[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // — Code editor state —
  const [runtime, setRuntime] = useState(DEFAULT_RUNTIME);
  const [code, setCode] = useState(RUNTIMES[DEFAULT_RUNTIME].defaultCode);
  const [deploying, setDeploying] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track whether the code has been user-edited (so we can replace default on runtime switch)
  const codeIsDefault = useRef(true);

  // — Logs state —
  const [logs, setLogs] = useState<{ timestamp?: number; message?: string }[]>([]);
  const [streamLogs, setStreamLogs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ministack/resource/lambda?config=${encodeURIComponent(JSON.stringify(config))}&resourceId=${encodeURIComponent(resourceId)}`,
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFnConfig(data.config);
      const detected = detectRuntime(data.config?.runtime);
      setRuntime(detected);
      if (data.config?.memorySize) setEditMemory(data.config.memorySize);
      if (data.config?.timeout)    setEditTimeout(data.config.timeout);
      setEditEnv(Object.entries(data.config?.environment ?? {}).map(([key, value]) => ({ key, value: String(value) })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load function");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId]);

  useEffect(() => { load(); }, [load]);

  // SSE log streaming
  useEffect(() => {
    if (!streamLogs) return;
    const params = new URLSearchParams({
      config: JSON.stringify(config),
      action: "events",
      stream: "true",
      logGroupName: `/aws/lambda/${resourceId}`,
    });
    const es = new EventSource(`/api/ministack/logs?${params}`);
    es.onmessage = (e) => {
      try {
        const events = JSON.parse(e.data);
        setLogs((prev) => [...prev, ...events].slice(-200));
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [streamLogs, config, resourceId]);

  const handleRuntimeChange = (newRuntime: string) => {
    setRuntime(newRuntime);
    // Replace code with the new default only if user hasn't edited it
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
      const res = await fetch("/api/ministack/resource/lambda-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, functionName: resourceId, memorySize: editMemory, timeout: editTimeout, environment }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
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
    setResponse(null);
    try {
      const res = await fetch("/api/ministack/resource/lambda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, functionName: resourceId, payload }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResponse(data);
      toast.success(`Invoked — status ${data.statusCode}`);
      setActiveTab("logs");
      setLogs([]);
      setStreamLogs(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invoke failed");
    } finally {
      setInvoking(false);
    }
  };

  const handleDeployCode = async () => {
    setDeploying(true);
    const def = RUNTIMES[runtime];
    try {
      // 1. Update runtime + handler config in LocalStack
      const cfgRes = await fetch("/api/ministack/resource/lambda-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, functionName: resourceId, runtime, handler: def.handler }),
      });
      const cfgData = await cfgRes.json();
      if (cfgData.error) throw new Error(cfgData.error);

      // 2. Package code with the correct filename and upload
      const { zipSync, strToU8 } = await import("fflate");
      const zipped = zipSync({ [def.fileName]: [strToU8(code), { level: 6 }] });
      let binary = "";
      for (let i = 0; i < zipped.length; i++) binary += String.fromCharCode(zipped[i]);
      const zipBase64 = btoa(binary);

      const codeRes = await fetch("/api/ministack/resource/lambda-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, functionName: resourceId, zipBase64 }),
      });
      const codeData = await codeRes.json();
      if (codeData.error) throw new Error(codeData.error);

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

      const res = await fetch("/api/ministack/resource/lambda-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, functionName: resourceId, zipBase64 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
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

          {/* ── Editable config ── */}
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

            {/* Environment variables */}
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

          {response && (
            <div className={cn("rounded-lg border p-3 text-xs font-mono shrink-0",
              response.error ? "border-destructive/40 bg-destructive/5" : "border-green-500/40 bg-green-500/5",
            )}>
              <p className="text-muted-foreground mb-1">Status: {response.statusCode}</p>
              {response.error && <p className="text-destructive mb-1">Error: {response.error}</p>}
              <pre className="whitespace-pre-wrap break-all text-[10px] line-clamp-6">{response.payload}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── Code Editor ── */}
      {activeTab === "code" && (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {/* Runtime selector + deploy button */}
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

          {/* Runtime info pill */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground">
              File: <code className="font-mono">{def.fileName}</code>
              {" · "}Handler: <code className="font-mono">{def.handler}</code>
            </span>
          </div>

          {/* Monaco editor */}
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

          {/* Upload zip fallback */}
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
