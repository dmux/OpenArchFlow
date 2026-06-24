"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Database, Table2, Cog, Activity, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import { ArchitectureServiceAWSGlue } from "aws-react-icons";
import { cn } from "@/lib/utils";
import { useDiagramStore, type AppNode, type GlueJobConfig } from "@/lib/store";
import { getDeployDef } from "@/lib/ministack/service-map";
import { checkHealth } from "@/lib/ministack/browser-actions";
import { CatalogTab } from "./glue/CatalogTab";
import { TablesTab } from "./glue/TablesTab";
import { JobsTab } from "./glue/JobsTab";
import { RunsTab } from "./glue/RunsTab";

const GLUE_ACCENT = "#8C4FFF";

type StudioTab = "catalog" | "tables" | "jobs" | "runs";

interface GlueStudioPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: AppNode[];
}

export default function GlueStudioPanel({ isOpen, onClose, nodes }: GlueStudioPanelProps) {
  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const setNodeGlueConfig = useDiagramStore((s) => s.setNodeGlueConfig);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>("catalog");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeDatabase, setActiveDatabase] = useState("");
  const [activeJob, setActiveJob] = useState("");
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => setMounted(true), []);

  // Esc key exits fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Probe the endpoint directly — connectivity is independent of the
  // `enabled` flag, which only flips after a MiniStack panel deploy.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setReachable(null);
    checkHealth(ministackConfig.endpoint).then((r) => {
      if (!cancelled) setReachable(r.connected);
    });
    return () => { cancelled = true; };
  }, [isOpen, ministackConfig.endpoint]);

  const glueNodes = useMemo(
    () => nodes.filter((n) => getDeployDef(n.data.service).sdkService === "glue"),
    [nodes],
  );

  // Pick the active Glue node: explicit selection → selected canvas node → first.
  const activeNode = useMemo<AppNode | null>(() => {
    if (activeNodeId) return glueNodes.find((n) => n.id === activeNodeId) ?? null;
    const selected = glueNodes.find((n) => n.id === selectedNodeId);
    return selected ?? glueNodes[0] ?? null;
  }, [glueNodes, activeNodeId, selectedNodeId]);

  // Default the active database to the node's deployed catalog database.
  useEffect(() => {
    if (!activeNode) return;
    const dbName = activeNode.data.ministack?.resourceId ?? activeNode.data.glueConfig?.databaseName;
    if (dbName && !activeDatabase) setActiveDatabase(dbName);
  }, [activeNode, activeDatabase]);

  const setJobsForNode = (nodeId: string, partial: { jobs?: GlueJobConfig[] }) =>
    setNodeGlueConfig(nodeId, partial);

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: "catalog", label: "Catalog", icon: <Database size={14} /> },
    { id: "tables", label: "Tables", icon: <Table2 size={14} /> },
    { id: "jobs", label: "Jobs", icon: <Cog size={14} /> },
    { id: "runs", label: "Runs", icon: <Activity size={14} /> },
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
            isFullscreen
              ? "inset-0 border-0 rounded-none"
              : "right-0 top-0 h-full border-l",
          )}
          style={{ width: isFullscreen ? "100%" : 560 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-background">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${GLUE_ACCENT}22` }}>
                <ArchitectureServiceAWSGlue className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Glue Studio</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${GLUE_ACCENT}22`, color: GLUE_ACCENT }}>
                    MiniStack
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {activeDatabase ? `Database: ${activeDatabase}` : "Data Catalog · ETL · Spark"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
                onClick={() => setIsFullscreen((v) => !v)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Node selector (when multiple Glue nodes) */}
          {glueNodes.length > 1 && (
            <div className="px-4 py-2 border-b border-border shrink-0 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Glue node</span>
              <select
                value={activeNode?.id ?? ""}
                onChange={(e) => { setActiveNodeId(e.target.value); setActiveDatabase(""); }}
                className="h-7 flex-1 text-xs rounded border border-border bg-background px-2"
              >
                {glueNodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
              </select>
            </div>
          )}

          {/* Connection warning — only when the endpoint is actually unreachable */}
          {reachable === false && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-900 shrink-0 flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>
                MiniStack is not reachable at {ministackConfig.endpoint}. Start it with{" "}
                <code className="font-mono">docker run -p 4566:4566 -v /var/run/docker.sock:/var/run/docker.sock ministackorg/ministack</code>
                {" "}(the socket mount is required for Spark job execution).
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0 px-4 pt-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors mr-1 -mb-px",
                  activeTab === tab.id ? "text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                style={activeTab === tab.id ? { borderColor: GLUE_ACCENT, color: GLUE_ACCENT } : {}}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden p-4">
            {glueNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <ArchitectureServiceAWSGlue className="w-12 h-12 opacity-60" />
                <p className="text-sm font-medium">No Glue node on the canvas</p>
                <p className="text-xs text-muted-foreground">Add an AWS Glue service to your diagram to manage its Data Catalog and PySpark jobs here.</p>
              </div>
            ) : (
              <>
                {activeTab === "catalog" && (
                  <CatalogTab config={ministackConfig} activeDatabase={activeDatabase} onSelectDatabase={setActiveDatabase} />
                )}
                {activeTab === "tables" && (
                  <TablesTab config={ministackConfig} databaseName={activeDatabase} />
                )}
                {activeTab === "jobs" && (
                  <JobsTab
                    config={ministackConfig}
                    node={activeNode}
                    setNodeGlueConfig={setJobsForNode}
                    onRunStarted={(job) => { setActiveJob(job); setActiveTab("runs"); }}
                  />
                )}
                {activeTab === "runs" && (
                  <RunsTab config={ministackConfig} activeJob={activeJob} onSelectJob={setActiveJob} />
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(panel, document.body);
}
