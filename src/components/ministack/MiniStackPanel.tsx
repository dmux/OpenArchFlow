"use client";

import React, { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Settings2,
  Rocket,
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Ban,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDiagramStore } from "@/lib/store";
import type { AppNode } from "@/lib/store";
import type { DeployStatus, MiniStackDeployResult } from "@/lib/ministack/types";
import { getDeployDef } from "@/lib/ministack/service-map";
import { MiniStackConfigDialog } from "./MiniStackConfigDialog";
import { toast } from "sonner";

interface MiniStackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: AppNode[];
}

function StatusPill({ status }: { status: DeployStatus | undefined }) {
  const base = "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border";
  switch (status) {
    case "deployed":
      return (
        <span className={cn(base, "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30")}>
          <CheckCircle className="w-3 h-3" /> Deployed
        </span>
      );
    case "deploying":
      return (
        <span className={cn(base, "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30")}>
          <Loader2 className="w-3 h-3 animate-spin" /> Deploying
        </span>
      );
    case "pending":
      return (
        <span className={cn(base, "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30")}>
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    case "error":
      return (
        <span className={cn(base, "bg-destructive/15 text-destructive border-destructive/30")}>
          <XCircle className="w-3 h-3" /> Error
        </span>
      );
    case "not_supported":
      return (
        <span className={cn(base, "bg-muted text-muted-foreground border-border")}>
          <Ban className="w-3 h-3" /> Not supported
        </span>
      );
    default:
      return (
        <span className={cn(base, "bg-transparent text-muted-foreground border-border")}>
          <Clock className="w-3 h-3" /> Idle
        </span>
      );
  }
}

function isAWSServiceNode(node: AppNode): boolean {
  const provider = (node.data as any).provider ?? "aws";
  const type = node.type ?? "";
  if (type === "traffic-source") return false;
  // Only cloud nodes (not frame, annotation, swimlane, etc.)
  return (
    type.startsWith("aws-") ||
    (provider === "aws" && !["frame", "annotation", "note", "table", "swimlane", "sequence-actor", "generic"].includes(type))
  );
}

export default function MiniStackPanel({ isOpen, onClose, nodes }: MiniStackPanelProps) {
  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const setMinistackConfig = useDiagramStore((s) => s.setMinistackConfig);
  const setNodeMinistackState = useDiagramStore((s) => s.setNodeMinistackState);
  const resetAllMinistackStates = useDiagramStore((s) => s.resetAllMinistackStates);

  const [configOpen, setConfigOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isTearingDown, setIsTearingDown] = useState(false);

  const awsNodes = nodes.filter(isAWSServiceNode);
  const deployableNodes = awsNodes.filter((n) => getDeployDef(n.data.service).supported);
  const deployedCount = awsNodes.filter((n) => n.data.ministack?.status === "deployed").length;

  const handleDeployAll = useCallback(async () => {
    if (deployableNodes.length === 0) {
      toast.error("No deployable AWS services in the diagram");
      return;
    }

    setIsDeploying(true);

    deployableNodes.forEach((n) =>
      setNodeMinistackState(n.id, { status: "pending" }),
    );

    let successCount = 0;
    let errorCount = 0;

    try {
      const res = await fetch("/api/ministack/deploy?stream=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: deployableNodes.map((n) => {
            // Resolve targetResourceId for API Gateway endpoints
            const mockEndpoints = n.data.mock?.endpoints?.map((ep) => ({
              ...ep,
              targetResourceId: ep.targetNodeId
                ? nodes.find((t) => t.id === ep.targetNodeId)?.data.ministack?.resourceId
                : undefined,
            }));
            return {
              nodeId: n.id,
              service: n.data.service,
              label: n.data.label,
              nodeConfig: n.data.ministack?.resourceNameOverride
                ? { resourceNameOverride: n.data.ministack.resourceNameOverride }
                : undefined,
              mockEndpoints: mockEndpoints?.length ? mockEndpoints : undefined,
            };
          }),
          config: ministackConfig,
        }),
      });

      if (!res.ok) {
        throw new Error(`Deploy API returned ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          const result: MiniStackDeployResult = JSON.parse(payload);

          if (result.status === "deployed") {
            successCount++;
            setNodeMinistackState(result.nodeId, {
              status: "deployed",
              resourceId: result.resourceId,
              resourceArn: result.resourceArn,
              endpoint: result.endpoint,
              deployedAt: Date.now(),
            });
          } else if (result.status === "error") {
            errorCount++;
            setNodeMinistackState(result.nodeId, {
              status: "error",
              errorMessage: result.errorMessage,
            });
          } else {
            setNodeMinistackState(result.nodeId, { status: result.status });
          }
        }
      }

      if (!ministackConfig.enabled) {
        setMinistackConfig({ enabled: true });
      }

      if (errorCount === 0) {
        toast.success(`Deployed ${successCount} service${successCount !== 1 ? "s" : ""} to MiniStack`);
      } else {
        toast.warning(`${successCount} deployed, ${errorCount} failed. Check node statuses.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deploy failed";
      toast.error(msg);
      deployableNodes.forEach((n) =>
        setNodeMinistackState(n.id, { status: "error", errorMessage: msg }),
      );
    } finally {
      setIsDeploying(false);
    }
  }, [deployableNodes, ministackConfig, setNodeMinistackState, setMinistackConfig]);

  const handleReset = useCallback(() => {
    resetAllMinistackStates();
    setMinistackConfig({ enabled: false });
    toast.info("MiniStack deployment state cleared");
  }, [resetAllMinistackStates, setMinistackConfig]);

  const handleTeardown = useCallback(async () => {
    const deployedNodes = awsNodes.filter((n) => n.data.ministack?.status === "deployed");
    if (deployedNodes.length === 0) {
      toast.error("No deployed resources to tear down");
      return;
    }

    setIsTearingDown(true);
    try {
      const res = await fetch("/api/ministack/teardown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: deployedNodes.map((n) => ({
            nodeId: n.id,
            service: n.data.service,
            ministack: n.data.ministack,
          })),
          config: ministackConfig,
        }),
      });

      if (!res.ok) throw new Error(`Teardown API returned ${res.status}`);
      const data: { results: { nodeId: string; ok: boolean; error?: string }[] } = await res.json();

      let ok = 0;
      let failed = 0;
      data.results.forEach((r) => {
        if (r.ok) {
          ok++;
          setNodeMinistackState(r.nodeId, { status: "idle" as const });
        } else {
          failed++;
          setNodeMinistackState(r.nodeId, { status: "error", errorMessage: r.error });
        }
      });

      if (failed === 0) {
        resetAllMinistackStates();
        setMinistackConfig({ enabled: false });
        toast.success(`Torn down ${ok} resource${ok !== 1 ? "s" : ""}`);
      } else {
        toast.warning(`${ok} deleted, ${failed} failed`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teardown failed");
    } finally {
      setIsTearingDown(false);
    }
  }, [awsNodes, ministackConfig, setNodeMinistackState, resetAllMinistackStates, setMinistackConfig]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ministack-panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-[380px] z-[70] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <h2 className="font-semibold text-sm leading-tight">MiniStack Deploy</h2>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {ministackConfig.endpoint}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setConfigOpen(true)}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{deployableNodes.length} deployable · {deployedCount} deployed</span>
                <span className={cn(
                  "flex items-center gap-1",
                  ministackConfig.enabled ? "text-green-500" : "text-muted-foreground",
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    ministackConfig.enabled ? "bg-green-500" : "bg-muted-foreground",
                  )} />
                  {ministackConfig.enabled ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 px-4 py-3 shrink-0">
              <Button
                size="sm"
                onClick={handleDeployAll}
                disabled={isDeploying || deployableNodes.length === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
              >
                {isDeploying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Rocket className="w-3.5 h-3.5" />
                )}
                {isDeploying ? "Deploying…" : "Deploy All"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTeardown}
                disabled={isDeploying || isTearingDown || deployedCount === 0}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {isTearingDown ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isTearingDown ? "Tearing down…" : "Teardown"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={isDeploying || isTearingDown}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>

            <Separator />

            {/* Node list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 py-3 space-y-2">
                {awsNodes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Add AWS service nodes to the canvas to deploy them.
                  </p>
                )}
                {awsNodes.map((node) => {
                  const ms = node.data.ministack;
                  const def = getDeployDef(node.data.service);
                  return (
                    <div
                      key={node.id}
                      className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-medium truncate">{node.data.label}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                            {node.data.service}
                          </span>
                        </div>
                        {ms?.resourceId && (
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            {ms.resourceId}
                          </p>
                        )}
                        {ms?.status === "error" && ms.errorMessage && (
                          <p className="text-[10px] text-destructive mt-0.5 line-clamp-2">
                            {ms.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <StatusPill status={ms?.status} />
                        {!def.supported && (
                          <span className="text-[10px] text-muted-foreground">
                            not in MiniStack
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setConfigOpen(true)}
              >
                <Settings2 className="w-3 h-3" />
                Configure MiniStack endpoint
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MiniStackConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />
    </>
  );
}
