"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Play, RefreshCw, Loader2, Terminal, Code2, Upload, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEFAULT_HANDLER = `export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from OpenArchFlow MiniStack",
      event,
    }),
  };
};`;

type Tab = "overview" | "code" | "logs";

interface FnConfig {
  runtime?: string;
  handler?: string;
  memorySize?: number;
  timeout?: number;
  codeSize?: number;
  state?: string;
}

export function LambdaConsole({ config, resourceId }: { config: MiniStackConfig; resourceId: string }) {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // — Overview state —
  const [fnConfig, setFnConfig] = useState<FnConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState('{"key": "value"}');
  const [invoking, setInvoking] = useState(false);
  const [response, setResponse] = useState<{ statusCode?: number; error?: string; payload?: string } | null>(null);

  // — Code editor state —
  const [code, setCode] = useState(DEFAULT_HANDLER);
  const [deploying, setDeploying] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Auto-switch to Logs and start streaming so the user sees output immediately
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
    try {
      const { zipSync, strToU8 } = await import("fflate");
      const zipped = zipSync({ "index.mjs": [strToU8(code), { level: 6 }] });
      let binary = "";
      for (let i = 0; i < zipped.length; i++) binary += String.fromCharCode(zipped[i]);
      const zipBase64 = btoa(binary);

      const res = await fetch("/api/ministack/resource/lambda-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, functionName: resourceId, zipBase64 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Code deployed to function");
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <RefreshCw className="w-3 h-3" /> },
    { id: "code", label: "Code Editor", icon: <Code2 className="w-3 h-3" /> },
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
              if (tab.id === "logs" && !streamLogs) {
                setLogs([]);
                setStreamLogs(true);
              } else if (tab.id !== "logs" && streamLogs) {
                setStreamLogs(false);
              }
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

      {/* — Overview — */}
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

      {/* — Code Editor — */}
      {activeTab === "code" && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              Edit the handler and click <span className="font-medium text-foreground">Deploy</span> to push to MiniStack.
              File is packaged as <code className="font-mono text-[10px]">index.mjs</code>.
            </p>
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

          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border">
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={(v) => setCode(v ?? "")}
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
                tabSize: 2,
              }}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <p className="text-[10px] text-muted-foreground">Or upload a pre-built .zip:</p>
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

      {/* — Logs — */}
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
