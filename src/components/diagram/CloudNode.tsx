import React, { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import { QuickAddPanel } from "./QuickAddPanel";
import { getServiceIcon, getServiceDescription } from "@/lib/registry";

import {
  AppNodeData,
  NodeSimulationStatus,
  useDiagramStore,
} from "@/lib/store";
import { Loader2, CheckCircle, XCircle, Zap, Rocket, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Metric helpers ────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function getMetricBadgeProps(
  sim: NodeSimulationStatus | undefined,
  isPlaying: boolean,
) {
  if (!isPlaying || !sim) return null;
  const {
    requestCount = 0,
    errorCount = 0,
    latencies = [],
    throttleCount = 0,
  } = sim;
  if (requestCount === 0) return null;

  const errPct = (errorCount / requestCount) * 100;
  const throttlePct = (throttleCount / requestCount) * 100;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p95 = percentile(sorted, 95);

  let color: "green" | "yellow" | "red" = "green";
  if (errPct > 5 || throttlePct > 10) color = "red";
  else if (errPct > 1 || throttlePct > 2 || p95 > 500) color = "yellow";

  const tooltip = [
    `Req: ${requestCount}`,
    `Err: ${errPct.toFixed(1)}%`,
    p95 > 0 ? `p95: ${p95}ms` : null,
    throttleCount > 0 ? `Throttled: ${throttleCount}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return { color, tooltip, errPct, p95, throttlePct };
}

type QuickAddState = { direction: "top" | "bottom" | "left" | "right"; anchorX: number; anchorY: number } | null;

const CloudNode = ({ id: nodeId, data, selected }: NodeProps<AppNodeData>) => {
  const { label, service, simulation, provider, metadata, ministack } = data as any;
  const isProcessing = simulation?.status === "processing";
  const isSuccess = simulation?.status === "success";
  const isError = simulation?.status === "error";

  const msStatus = ministack?.status;
  const msDeployed = msStatus === "deployed";
  const msDeploying = msStatus === "deploying";
  const msPending = msStatus === "pending";
  const msDeployError = msStatus === "error";

  const [quickAdd, setQuickAdd] = useState<QuickAddState>(null);

  const handlePlusClick = useCallback(
    (direction: "top" | "bottom" | "left" | "right") =>
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setQuickAdd({ direction, anchorX: e.clientX, anchorY: e.clientY });
      },
    [],
  );

  const isPlaying = useDiagramStore((s) => s.isPlaying);
  const nodeDisplayMode = useDiagramStore((s) => s.nodeDisplayMode);
  const iconMode = nodeDisplayMode === "icon";
  const metricBadge = getMetricBadgeProps(
    simulation as NodeSimulationStatus | undefined,
    isPlaying,
  );

  // Fallback to 'aws' provider for backward compatibility with existing saved layouts
  const resolvedProvider = provider || "aws";

  const styleOverrides: React.CSSProperties = {};
  if (metadata?.backgroundColor)
    styleOverrides.backgroundColor = metadata.backgroundColor;
  if (metadata?.borderColor && !isProcessing && !isSuccess && !isError)
    styleOverrides.borderColor = metadata.borderColor;
  if (metadata?.borderWidth)
    styleOverrides.borderWidth = `${metadata.borderWidth}px`;
  if (metadata?.opacity !== undefined)
    styleOverrides.opacity = metadata.opacity;

  const Icon = getServiceIcon(
    resolvedProvider,
    service || "Service",
    (data.type as string) || "",
    (data.subtype as string) || undefined,
  );

  const description = getServiceDescription(
    resolvedProvider,
    service || "",
    (data.subtype as string) || (data.type as string),
  );

  // ── Shared badges (same in both modes) ──────────────────────────────────────
  const simBadge = simulation?.status && simulation.status !== "idle" && (
    <div
      className={cn(
        "absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm",
        isProcessing && "bg-blue-500",
        isSuccess && "bg-green-500",
        isError && "bg-destructive",
      )}
    >
      {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
      {isSuccess && <CheckCircle className="w-3 h-3" />}
      {isError && <XCircle className="w-3 h-3" />}
    </div>
  );

  const metricsDot = metricBadge && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute -bottom-1.5 -right-1.5 z-10 w-4 h-4 rounded-full flex items-center justify-center shadow border border-background cursor-default",
            metricBadge.color === "green" && "bg-green-500",
            metricBadge.color === "yellow" && "bg-yellow-400",
            metricBadge.color === "red" && "bg-destructive",
          )}
        >
          <Zap className="w-2 h-2 text-white" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{metricBadge.tooltip}</TooltipContent>
    </Tooltip>
  );

  const ministackDot = msStatus && msStatus !== "idle" && msStatus !== "not_supported" && (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute -bottom-1.5 -left-1.5 z-10 w-4 h-4 rounded-full flex items-center justify-center shadow border border-background cursor-default",
            msDeployed && "bg-orange-500",
            msDeploying && "bg-blue-500",
            msPending && "bg-yellow-500",
            msDeployError && "bg-destructive",
          )}
        >
          {(msDeploying || msPending) && <Loader2 className="w-2 h-2 text-white animate-spin" />}
          {msDeployed && <Rocket className="w-2 h-2 text-white" />}
          {msDeployError && <XCircle className="w-2 h-2 text-white" />}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {msDeployed && `MiniStack: ${ministack?.resourceId ?? "deployed"}`}
        {msDeploying && "Deploying to MiniStack…"}
        {msPending && "Pending deploy"}
        {msDeployError && `Deploy error: ${ministack?.errorMessage ?? "unknown"}`}
      </TooltipContent>
    </Tooltip>
  );

  // Each handle: invisible edge-connection point at the icon boundary.
  // A visible "+" button floats further out (offsetStyle) so it doesn't
  // overlap the icon. Clicking the "+" opens QuickAddPanel; dragging
  // from it creates a free-form edge connection.
  const HANDLE_OFFSET = 18; // px outside the icon container boundary

  const handleBaseCls = cn(
    "!w-5 !h-5 !rounded-full !bg-background !border !border-primary/50",
    "opacity-0 group-hover:opacity-100 transition-all duration-150",
    "flex items-center justify-center !cursor-crosshair hover:!border-primary hover:!bg-primary/10",
  );

  type Dir = "top" | "bottom" | "left" | "right";

  const offsetStyle = (pos: Position): React.CSSProperties => {
    switch (pos) {
      case Position.Top:    return { top:    `-${HANDLE_OFFSET}px` };
      case Position.Bottom: return { bottom: `-${HANDLE_OFFSET}px` };
      case Position.Left:   return { left:   `-${HANDLE_OFFSET}px` };
      case Position.Right:  return { right:  `-${HANDLE_OFFSET}px` };
    }
  };

  const PlusHandle = ({ position }: { position: Position }) => (
    <Handle
      type="source"
      position={position}
      className={handleBaseCls}
      style={offsetStyle(position)}
      onClick={handlePlusClick(position as Dir)}
    >
      <Plus className="w-3 h-3 text-primary pointer-events-none" strokeWidth={2.5} />
    </Handle>
  );

  const handles = (
    <>
      <PlusHandle position={Position.Top}    />
      <PlusHandle position={Position.Bottom} />
      <PlusHandle position={Position.Left}   />
      <PlusHandle position={Position.Right}  />
    </>
  );

  const iconEl = (
    <Icon
      {...({ title: "" } as any)}
      size={iconMode ? 52 : 48}
      className={cn(
        "transition-colors",
        iconMode ? "w-13 h-13" : "w-12 h-12",
        data.type === "client" || data.type === "cloud-native" || !data.type || data.type === "default" || data.type === "generic"
          ? "text-blue-500"
          : "",
      )}
    />
  );

  return (
    <>
    <Tooltip>
      <TooltipTrigger asChild>
        {iconMode ? (
          // ── Icon-only mode ─────────────────────────────────────────────────
          // Outer div is tight around the icon so handles sit at the visual boundary.
          // The label is positioned absolutely below and does not expand the bounding box.
          <div
            className="relative group inline-flex cursor-pointer select-none transition-all duration-200"
            style={{ opacity: styleOverrides.opacity }}
          >
            {handles}

            {/* Icon with selection ring */}
            <div
              className={cn(
                "relative rounded-2xl p-1.5 transition-all duration-200",
                selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
                isProcessing && "ring-2 ring-blue-500 ring-offset-2 ring-offset-background",
                isSuccess   && "ring-2 ring-green-500 ring-offset-2 ring-offset-background",
                isError     && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
                !selected && !isProcessing && !isSuccess && !isError &&
                  "hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-background",
              )}
            >
              {iconEl}
              {simBadge}
              {metricsDot}
              {ministackDot}
            </div>

            {/* Label — floats below the icon, does not affect bounding box */}
            <span
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[11px] font-semibold text-foreground text-center leading-tight whitespace-nowrap max-w-[120px] truncate pointer-events-none"
              style={metadata?.textColor ? { color: metadata.textColor } : undefined}
            >
              {label}
            </span>
          </div>
        ) : (
          // ── Card mode (default) ────────────────────────────────────────────
          <div
            className={cn(
              "relative group flex flex-col items-center justify-center p-4 min-w-[120px] rounded-xl border-2 transition-all duration-200",
              selected
                ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 bg-card"
                : "border-border hover:border-primary/50 hover:shadow-lg bg-card",
              isProcessing && "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
              isSuccess    && "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]",
              isError      && "border-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]",
            )}
            style={styleOverrides}
          >
            {/* Simulation status — card size */}
            {simulation?.status && simulation.status !== "idle" && (
              <div className={cn("absolute -top-3 -right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm", isProcessing && "bg-blue-500", isSuccess && "bg-green-500", isError && "bg-destructive")}>
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSuccess && <CheckCircle className="w-3.5 h-3.5" />}
                {isError && <XCircle className="w-3.5 h-3.5" />}
              </div>
            )}
            {metricsDot}
            {ministackDot}

            {handles}

            {/* Icon circle */}
            <div className={cn("p-3 rounded-full mb-2 transition-colors", selected ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5")}>
              {iconEl}
            </div>

            {/* Labels */}
            <div className="text-center">
              <div
                className="font-semibold text-sm text-foreground leading-tight"
                style={metadata?.textColor ? { color: metadata.textColor } : undefined}
              >
                {label}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-medium bg-muted/50 px-2 py-0.5 rounded-full inline-block">
                {service}{" "}
                {resolvedProvider !== "aws" && resolvedProvider !== "generic" ? `(${resolvedProvider})` : ""}
              </div>
            </div>
          </div>
        )}
      </TooltipTrigger>
      {description && (
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-xs">{description}</p>
        </TooltipContent>
      )}
    </Tooltip>
    {quickAdd && (
      <QuickAddPanel
        sourceNodeId={nodeId}
        direction={quickAdd.direction}
        anchorX={quickAdd.anchorX}
        anchorY={quickAdd.anchorY}
        onClose={() => setQuickAdd(null)}
      />
    )}
    </>
  );
};

export default memo(CloudNode);
