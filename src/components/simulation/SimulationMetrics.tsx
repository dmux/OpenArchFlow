"use client";

import React, { useMemo } from "react";
import { useDiagramStore, NodeSimulationStatus } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, AlertCircle, Clock, DollarSign } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatCost(usd: number): string {
  if (usd === 0) return "—";
  if (usd < 0.01) return `$${(usd * 100).toFixed(4)}¢`;
  return `$${usd.toFixed(4)}`;
}

function errPct(sim: NodeSimulationStatus): string {
  const total = sim.requestCount ?? 0;
  if (!total) return "—";
  return `${(((sim.errorCount ?? 0) / total) * 100).toFixed(1)}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SimulationMetrics() {
  const diagrams = useDiagramStore((s) => s.diagrams);
  const activeDiagramId = useDiagramStore((s) => s.activeDiagramId);
  const isPlaying = useDiagramStore((s) => s.isPlaying);

  const nodes = useMemo(() => {
    if (!activeDiagramId) return [];
    return diagrams[activeDiagramId]?.nodes ?? [];
  }, [diagrams, activeDiagramId]);

  const rows = useMemo(() => {
    return nodes
      .filter((n) => n.data.simulation?.requestCount)
      .map((n) => {
        const sim = n.data.simulation as NodeSimulationStatus;
        const sorted = [...(sim.latencies ?? [])].sort((a, b) => a - b);
        return {
          id: n.id,
          label: n.data.label,
          service: n.data.service,
          requests: sim.requestCount ?? 0,
          errors: sim.errorCount ?? 0,
          p95: percentile(sorted, 95),
          throttled: sim.throttleCount ?? 0,
          queueDepth: sim.queueDepth,
          cacheHitRate: (() => {
            const hits = sim.cacheHits ?? 0;
            const misses = sim.cacheMisses ?? 0;
            const total = hits + misses;
            return total > 0 ? ((hits / total) * 100).toFixed(0) + "%" : "—";
          })(),
          cost: sim.cumulativeCostUsd ?? 0,
        };
      })
      .sort((a, b) => b.requests - a.requests);
  }, [nodes]);

  // Aggregates
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        requests: acc.requests + r.requests,
        errors: acc.errors + r.errors,
        cost: acc.cost + r.cost,
      }),
      { requests: 0, errors: 0, cost: 0 },
    );
  }, [rows]);

  if (!isPlaying && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6 text-center text-sm">
        <TrendingUp className="w-8 h-8 opacity-30" />
        <p>Start a simulation to see live metrics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-px bg-border shrink-0">
        <div className="bg-background px-3 py-2 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">
              Total Req
            </div>
            <div className="text-sm font-semibold">
              {totals.requests.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="bg-background px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">
              Total Err
            </div>
            <div
              className={cn(
                "text-sm font-semibold",
                totals.errors > 0 && "text-destructive",
              )}
            >
              {totals.requests > 0
                ? ((totals.errors / totals.requests) * 100).toFixed(1) + "%"
                : "—"}
            </div>
          </div>
        </div>
        <div className="bg-background px-3 py-2 flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-medium">
              Est. Cost
            </div>
            <div className="text-sm font-semibold">
              {formatCost(totals.cost)}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          {isPlaying ? "Waiting for first requests…" : "No data yet."}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground">
                  Node
                </th>
                <th className="text-right p-2 font-medium text-muted-foreground">
                  Req
                </th>
                <th className="text-right p-2 font-medium text-muted-foreground">
                  Err%
                </th>
                <th className="text-right p-2 font-medium text-muted-foreground">
                  <span className="flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    p95
                  </span>
                </th>
                <th className="text-right p-2 font-medium text-muted-foreground">
                  ⚡ Thr
                </th>
                <th className="text-right p-2 font-medium text-muted-foreground">
                  Cache
                </th>
                <th className="text-right p-2 font-medium text-muted-foreground">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const errPercent =
                  row.requests > 0 ? (row.errors / row.requests) * 100 : 0;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-2 max-w-[120px]">
                      <div className="font-medium truncate" title={row.label}>
                        {row.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {row.service}
                      </div>
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {row.requests.toLocaleString()}
                    </td>
                    <td
                      className={cn(
                        "p-2 text-right tabular-nums font-medium",
                        errPercent > 5
                          ? "text-destructive"
                          : errPercent > 1
                            ? "text-yellow-500"
                            : "text-green-500",
                      )}
                    >
                      {errPct(row as unknown as NodeSimulationStatus)}
                    </td>
                    <td
                      className={cn(
                        "p-2 text-right tabular-nums",
                        row.p95 > 500 ? "text-yellow-500" : "",
                      )}
                    >
                      {row.p95 > 0 ? formatLatency(row.p95) : "—"}
                    </td>
                    <td
                      className={cn(
                        "p-2 text-right tabular-nums",
                        row.throttled > 0 ? "text-orange-500 font-medium" : "",
                      )}
                    >
                      {row.throttled > 0 ? row.throttled.toLocaleString() : "—"}
                    </td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">
                      {row.cacheHitRate}
                    </td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">
                      {formatCost(row.cost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </div>
  );
}
