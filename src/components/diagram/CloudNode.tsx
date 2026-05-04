import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import { getServiceIcon, getServiceDescription } from "@/lib/registry";

import {
  AppNodeData,
  NodeSimulationStatus,
  useDiagramStore,
} from "@/lib/store";
import { Loader2, CheckCircle, XCircle, Zap } from "lucide-react";
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

const CloudNode = ({ data, selected }: NodeProps<AppNodeData>) => {
  const { label, service, simulation, provider, metadata } = data as any;
  const isProcessing = simulation?.status === "processing";
  const isSuccess = simulation?.status === "success";
  const isError = simulation?.status === "error";

  const isPlaying = useDiagramStore((s) => s.isPlaying);
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative group flex flex-col items-center justify-center p-4 min-w-[120px] rounded-xl border-2 transition-all duration-200",
            selected
              ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 bg-card"
              : "border-border hover:border-primary/50 hover:shadow-lg bg-card",
            isProcessing &&
              "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
            isSuccess &&
              "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]",
            isError &&
              "border-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]",
          )}
          style={styleOverrides}
        >
          {/* Simulation Status Badge */}
          {simulation?.status && simulation.status !== "idle" && (
            <div
              className={cn(
                "absolute -top-3 -right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm",
                isProcessing && "bg-blue-500",
                isSuccess && "bg-green-500",
                isError && "bg-destructive",
              )}
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSuccess && <CheckCircle className="w-3.5 h-3.5" />}
              {isError && <XCircle className="w-3.5 h-3.5" />}
            </div>
          )}

          {/* Live Metrics Badge */}
          {metricBadge && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute -bottom-2 -right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center shadow border border-background cursor-default",
                    metricBadge.color === "green" && "bg-green-500",
                    metricBadge.color === "yellow" && "bg-yellow-400",
                    metricBadge.color === "red" && "bg-destructive",
                  )}
                >
                  <Zap className="w-2.5 h-2.5 text-white" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {metricBadge.tooltip}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Input Handle */}
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary"
          />

          {/* Icon Circle */}
          <div
            className={cn(
              "p-3 rounded-full mb-2 transition-colors",
              selected ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5",
            )}
          >
            <Icon
              {...({ title: "" } as any)}
              size={48}
              className={cn(
                "w-12 h-12 transition-colors",
                data.type === "client" ||
                  data.type === "cloud-native" ||
                  !data.type ||
                  data.type === "default" ||
                  data.type === "generic"
                  ? "text-blue-500"
                  : "",
              )}
            />
          </div>

          {/* Labels */}
          <div className="text-center">
            <div
              className="font-semibold text-sm text-foreground leading-tight"
              style={
                metadata?.textColor ? { color: metadata.textColor } : undefined
              }
            >
              {label}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-medium bg-muted/50 px-2 py-0.5 rounded-full inline-block">
              {service}{" "}
              {resolvedProvider !== "aws" && resolvedProvider !== "generic"
                ? `(${resolvedProvider})`
                : ""}
            </div>
          </div>

          {/* Output Handle */}
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary"
          />
        </div>
      </TooltipTrigger>
      {description && (
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-xs">{description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};

export default memo(CloudNode);
