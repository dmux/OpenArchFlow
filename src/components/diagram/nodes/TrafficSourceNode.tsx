"use client";

import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Users, Zap, CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiagramStore, type AppNodeData } from "@/lib/store";
import { prettyPayload } from "@/lib/format-payload";

const TrafficSourceNode = ({ id, data, selected }: NodeProps<AppNodeData>) => {
  const isPlaying = useDiagramStore((s) => s.isPlaying);
  const mock = data.mock as { requestsPerSecond?: number; httpMethod?: string; httpPath?: string; _lastFireResult?: { ok: boolean; response: unknown } } | undefined;
  const rps      = mock?.requestsPerSecond ?? 0;
  const method   = mock?.httpMethod ?? "POST";
  const path     = mock?.httpPath ?? "/";
  const lastFire = mock?._lastFireResult;
  const [open, setOpen] = useState(false);

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

      {/* Last-fire status icon — top-right corner */}
      {lastFire && (
        <button
          className={cn(
            "nodrag absolute -top-2 -right-2 rounded-full p-0.5 border shadow-sm transition-transform hover:scale-110",
            lastFire.ok
              ? "bg-green-950 border-green-600/50 text-green-400"
              : "bg-red-950 border-red-600/50 text-red-400",
          )}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          title={lastFire.ok ? "Ver resposta" : "Ver erro"}
        >
          {lastFire.ok
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <XCircle className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Response popover — floats above the node */}
      {open && lastFire && (
        <div
          className={cn(
            "nodrag nowheel absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50",
            "w-64 rounded-xl border shadow-xl p-2",
            lastFire.ok
              ? "bg-green-950/95 border-green-600/40"
              : "bg-red-950/95 border-red-600/40",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[9px] font-semibold uppercase tracking-wider", lastFire.ok ? "text-green-400" : "text-red-400")}>
              {lastFire.ok ? "Response" : "Error"}
            </span>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <ScrollableResponse text={prettyPayload(lastFire.response)} ok={lastFire.ok} />
        </div>
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

function ScrollableResponse({ text, ok }: { text: string; ok: boolean }) {
  return (
    <pre
      className={cn(
        "text-[9px] font-mono leading-tight whitespace-pre-wrap break-all max-h-48 overflow-auto rounded-lg p-1.5",
        ok ? "text-green-200" : "text-red-200",
      )}
    >
      {text}
    </pre>
  );
}

export default memo(TrafficSourceNode);
