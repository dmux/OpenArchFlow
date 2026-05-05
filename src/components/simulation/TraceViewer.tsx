"use client";

import React, { useMemo } from "react";
import { useDiagramStore } from "@/lib/store";
import { RequestTrace, TraceHop } from "@/lib/simulation/SimulationEngine";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  ChevronRight,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";

// ── Waterfall bar ─────────────────────────────────────────────────────────────

function WaterfallBar({
  hop,
  traceStart,
  traceDuration,
}: {
  hop: TraceHop;
  traceStart: number;
  traceDuration: number;
}) {
  const left =
    traceDuration > 0
      ? ((hop.enteredAt - traceStart) / traceDuration) * 100
      : 0;
  const width = traceDuration > 0 ? (hop.latencyMs / traceDuration) * 100 : 0;

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 h-4 rounded-sm min-w-[3px] opacity-80",
        hop.status === "success" && "bg-green-500",
        hop.status === "error" && "bg-destructive",
        hop.status === "throttled" && "bg-orange-400",
      )}
      style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
    />
  );
}

// ── Trace row ─────────────────────────────────────────────────────────────────

function TraceRow({
  trace,
  maxDuration,
}: {
  trace: RequestTrace;
  maxDuration: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const traceStart = trace.hops[0]?.enteredAt ?? trace.startedAt;
  const traceDuration = Math.max(trace.totalLatencyMs, 1);

  return (
    <>
      <tr
        className="border-t border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="p-2">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn(
                "w-3 h-3 text-muted-foreground transition-transform",
                expanded && "rotate-90",
              )}
            />
            {trace.status === "success" ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
            )}
            <span
              className="font-mono text-[10px] text-muted-foreground truncate max-w-[80px]"
              title={trace.id}
            >
              {trace.id.substring(0, 8)}
            </span>
          </div>
        </td>
        <td className="p-2 text-right tabular-nums text-xs">
          {trace.hops.length}
        </td>
        <td className="p-2 text-right tabular-nums text-xs">
          {trace.totalLatencyMs >= 1000
            ? `${(trace.totalLatencyMs / 1000).toFixed(2)}s`
            : `${trace.totalLatencyMs}ms`}
        </td>
        {/* Waterfall */}
        <td className="p-2 w-full min-w-[120px]">
          <div className="relative h-6 bg-muted/40 rounded overflow-hidden">
            {trace.hops.map((hop, i) => (
              <WaterfallBar
                key={i}
                hop={hop}
                traceStart={traceStart}
                traceDuration={maxDuration}
              />
            ))}
          </div>
        </td>
      </tr>
      {expanded &&
        trace.hops.map((hop, i) => (
          <tr key={i} className="bg-muted/10 border-t border-border/30">
            <td className="pl-8 pr-2 py-1.5" colSpan={1}>
              <div className="flex items-center gap-1 text-[11px]">
                {hop.status === "success" && (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                )}
                {hop.status === "error" && (
                  <XCircle className="w-3 h-3 text-destructive" />
                )}
                {hop.status === "throttled" && (
                  <Zap className="w-3 h-3 text-orange-400" />
                )}
                <span
                  className="font-medium truncate max-w-[120px]"
                  title={hop.nodeLabel}
                >
                  {hop.nodeLabel}
                </span>
              </div>
            </td>
            <td className="p-1.5 text-right text-[11px] tabular-nums text-muted-foreground">
              —
            </td>
            <td className="p-1.5 text-right text-[11px] tabular-nums text-muted-foreground">
              {hop.latencyMs >= 1000
                ? `${(hop.latencyMs / 1000).toFixed(2)}s`
                : `${hop.latencyMs}ms`}
            </td>
            <td className="p-1.5 pr-3">
              <div className="relative h-4 bg-muted/20 rounded overflow-hidden">
                <WaterfallBar
                  hop={hop}
                  traceStart={traceStart}
                  traceDuration={traceDuration}
                />
              </div>
              {hop.errorMessage && (
                <div className="text-[10px] text-destructive mt-0.5">
                  {hop.errorMessage}
                </div>
              )}
            </td>
          </tr>
        ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TraceViewer() {
  const traces = useDiagramStore((s) => s.simulationTraces) as RequestTrace[];
  const clearTraces = useDiagramStore((s) => s.clearSimulationTraces);

  const sorted = useMemo(() => [...traces].reverse(), [traces]);
  const maxDuration = useMemo(
    () => Math.max(...sorted.map((t) => t.totalLatencyMs), 1),
    [sorted],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6 text-center text-sm">
        <GitBranch className="w-8 h-8 opacity-30" />
        <p>No traces yet. Start a simulation to capture request traces.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50 shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          Last {sorted.length} trace(s)
        </span>
        <button
          onClick={() => clearTraces()}
          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear
        </button>
      </div>
      <ScrollArea className="flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <tr>
              <th className="text-left p-2 font-medium text-muted-foreground">
                Trace ID
              </th>
              <th className="text-right p-2 font-medium text-muted-foreground">
                Hops
              </th>
              <th className="text-right p-2 font-medium text-muted-foreground">
                Total
              </th>
              <th className="text-left p-2 font-medium text-muted-foreground">
                Waterfall
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((trace) => (
              <TraceRow
                key={trace.id}
                trace={trace}
                maxDuration={maxDuration}
              />
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
