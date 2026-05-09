"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Play, Loader2, Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MiniStackConfig } from "@/lib/ministack/types";
import {
  apiGatewayGetResources, apiGatewayAddRoute, apiGatewayInvoke,
  type APIResource, type APIStage,
} from "@/lib/ministack/browser-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function APIGatewayConsole({
  config,
  resourceId,
  endpoint,
}: {
  config: MiniStackConfig;
  resourceId: string;
  endpoint?: string;
}) {
  const baseUrl = endpoint ?? `${config.endpoint}/restapis/${resourceId}`;
  const [resources, setResources] = useState<APIResource[]>([]);
  const [stages, setStages] = useState<APIStage[]>([]);
  const [loading, setLoading] = useState(false);

  const [newMethod, setNewMethod] = useState("GET");
  const [newPath, setNewPath] = useState("/");
  const [newLambda, setNewLambda] = useState("");
  const [creating, setCreating] = useState(false);

  const [testMethod, setTestMethod] = useState("GET");
  const [testPath, setTestPath] = useState("/");
  const [testBody, setTestBody] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: number; body: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGatewayGetResources(config, resourceId);
      setResources(data.resources);
      setStages(data.stages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load API");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId]);

  useEffect(() => { load(); }, [load]);

  const handleCreateRoute = async () => {
    const path = newPath.startsWith("/") ? newPath : `/${newPath}`;
    if (!path || path === "/") {
      toast.error("Enter a valid path, e.g. /users");
      return;
    }
    setCreating(true);
    try {
      await apiGatewayAddRoute(config, resourceId, newMethod, path, newLambda.trim() || undefined);
      toast.success(`Route ${newMethod} ${path} created`);
      setNewPath("/");
      setNewLambda("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create route");
    } finally {
      setCreating(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let invokeBody: unknown;
      try { invokeBody = testBody ? JSON.parse(testBody) : undefined; } catch { invokeBody = testBody || undefined; }
      const data = await apiGatewayInvoke(config, resourceId, testMethod, testPath, invokeBody);
      setTestResult({ status: data.status, body: typeof data.body === "string" ? data.body : JSON.stringify(data.body, null, 2) });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setTestResult({ status: 0, body: message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-mono text-muted-foreground truncate">{baseUrl}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs shrink-0">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Routes</p>
          <ScrollArea className="h-28 rounded-lg border border-border">
            <div className="p-1 space-y-0.5">
              {resources.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">None yet</p>
              )}
              {resources.map((r) => (
                <div key={r.id} className="px-2 py-1 rounded hover:bg-accent/50">
                  <p className="text-[10px] font-mono">{r.path}</p>
                  <p className="text-[9px] text-muted-foreground">{r.methods.join(", ") || "—"}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stages</p>
          <ScrollArea className="h-28 rounded-lg border border-border">
            <div className="p-1 space-y-0.5">
              {stages.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">None</p>
              )}
              {stages.map((s) => (
                <div key={s.name} className="px-2 py-1 rounded hover:bg-accent/50">
                  <p className="text-[10px] font-mono">{s.name}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="border border-border rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium">Add route</p>
        <div className="flex gap-2">
          <select
            value={newMethod}
            onChange={(e) => setNewMethod(e.target.value)}
            className="text-xs h-7 px-2 rounded border border-border bg-background w-20 shrink-0"
          >
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <Input
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="/path"
            className="text-xs h-7 flex-1"
          />
        </div>
        <Input
          value={newLambda}
          onChange={(e) => setNewLambda(e.target.value)}
          placeholder="Lambda function name (optional)"
          className="text-xs h-7"
        />
        <Button size="sm" onClick={handleCreateRoute} disabled={creating} className="gap-1.5 text-xs h-7">
          {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Create
        </Button>
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium">Test endpoint</p>
        <div className="flex gap-2">
          <select
            value={testMethod}
            onChange={(e) => setTestMethod(e.target.value)}
            className="text-xs h-7 px-2 rounded border border-border bg-background w-20 shrink-0"
          >
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <Input
            value={testPath}
            onChange={(e) => setTestPath(e.target.value)}
            placeholder="/path"
            className="text-xs h-7 flex-1"
          />
        </div>
        {testMethod !== "GET" && (
          <textarea
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="w-full text-xs h-12 p-2 rounded border border-border bg-background resize-none font-mono"
          />
        )}
        <Button size="sm" onClick={handleTest} disabled={testing} className="gap-1.5 text-xs h-7">
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Test
        </Button>
        {testResult && (
          <div className={cn("rounded border p-2 text-xs font-mono",
            testResult.status >= 200 && testResult.status < 300
              ? "border-green-500/30 bg-green-500/5"
              : "border-destructive/30 bg-destructive/5"
          )}>
            <p className="text-muted-foreground mb-1">HTTP {testResult.status || "—"}</p>
            <pre className="whitespace-pre-wrap break-all text-[10px] line-clamp-8">{testResult.body}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
