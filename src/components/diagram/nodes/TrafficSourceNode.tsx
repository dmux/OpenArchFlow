"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiagramStore, type AppNodeData } from "@/lib/store";
import { prettyPayload } from "@/lib/format-payload";

const TrafficSourceNode = ({ id, data, selected }: NodeProps<AppNodeData>) => {
  const isPlaying = useDiagramStore((s) => s.isPlaying);
  const mock = data.mock as { requestsPerSecond?: number; httpMethod?: string; httpPath?: string; _lastFireResult?: { ok: boolean; response: unknown } } | undefined;
  const rps    = mock?.requestsPerSecond ?? 0;
  const method = mock?.httpMethod ?? "POST";
  const path   = mock?.httpPath ?? "/";
  const lastFire = mock?._lastFireResult;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 transition-all duration-200 select-none min-w-[110px]",
        selected
          ? "border-violet-500 shadow-lg shadow-violet-500/20 bg-violet-950"
          : "border-violet-700 bg-violet-950 hover:border-violet-500",
        isPlaying && rps > 0 && "ring-2 ring-violet-400/40 ring-offset-1 ring-offset-transparent",
      )}
    >
      {/* Pulsing glow when simulation is running */}
      {isPlaying && rps > 0 && (
        <span className="absolute inset-0 rounded-2xl bg-violet-500/10 animate-pulse pointer-events-none" />
      )}

      {/* Icon */}
      <div className="relative flex items-center gap-1.5">
        <Users className="w-5 h-5 text-violet-300" />
        {isPlaying && rps > 0 && (
          <Zap className="w-3 h-3 text-yellow-400 animate-bounce absolute -top-1 -right-2" />
        )}
      </div>

      {/* Label */}
      <span className="text-[11px] font-semibold text-violet-100 text-center leading-tight max-w-[100px] truncate">
        {data.label || "Traffic Source"}
      </span>

      {/* RPS badge */}
      <span
        className={cn(
          "text-[9px] font-mono px-1.5 py-0.5 rounded-full border",
          rps > 0
            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
            : "bg-muted/30 border-border text-muted-foreground",
        )}
      >
        {rps > 0 ? `${rps} req/s` : "0 req/s"}
      </span>

      {/* Method + path */}
      <span className="text-[9px] font-mono text-violet-400/70 max-w-[120px] truncate">
        {method} {path}
      </span>

      {/* Last fire result */}
      {lastFire && (
        <div className={cn(
          "w-full rounded-lg border px-1.5 py-1 text-[9px] font-mono max-h-20 overflow-auto",
          lastFire.ok
            ? "border-green-500/30 bg-green-500/10 text-green-300"
            : "border-red-500/30 bg-red-500/10 text-red-300",
        )}>
          <pre className="whitespace-pre-wrap break-all leading-tight">
            {prettyPayload(lastFire.response)}
          </pre>
        </div>
      )}

      {/* Source handle only — traffic source generates, doesn't receive */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-violet-400 !border-2 !border-violet-600"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-violet-400 !border-2 !border-violet-600"
      />
    </div>
  );
};

export default memo(TrafficSourceNode);
