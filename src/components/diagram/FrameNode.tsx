import React, { memo } from "react";
import { Handle, Position, NodeProps, NodeResizer } from "reactflow";
import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppNodeData, useDiagramStore } from "@/lib/store";

const AWS_FRAME_STYLES: Record<string, { bg: string; border: string }> = {
  region: { bg: "rgba(249, 115, 22, 0.06)", border: "rgb(249, 115, 22)" },
  vpc: { bg: "rgba(59, 130, 246, 0.06)", border: "rgb(59, 130, 246)" },
  "subnet-public": {
    bg: "rgba(34, 197, 94, 0.06)",
    border: "rgb(34, 197, 94)",
  },
  "subnet-private": {
    bg: "rgba(148, 163, 184, 0.06)",
    border: "rgb(148, 163, 184)",
  },
  "availability-zone": {
    bg: "rgba(234, 179, 8, 0.06)",
    border: "rgb(234, 179, 8)",
  },
  internet: { bg: "rgba(6, 182, 212, 0.06)", border: "rgb(6, 182, 212)" },
  "on-premises": {
    bg: "rgba(107, 114, 128, 0.06)",
    border: "rgb(107, 114, 128)",
  },
  "security-zone": {
    bg: "rgba(239, 68, 68, 0.06)",
    border: "rgb(239, 68, 68)",
  },
  account: { bg: "rgba(168, 85, 247, 0.06)", border: "rgb(168, 85, 247)" },
};

const DEFAULT_FRAME_STYLE = {
  bg: "rgba(147, 197, 253, 0.1)",
  border: "rgb(147, 197, 253)",
};

const FrameNode = ({ id, data, selected }: NodeProps<AppNodeData>) => {
  const { label, metadata } = data;
  const subtype = data.subtype as string | undefined;
  const isGroupLocked = data.locked as boolean | undefined;
  const isGroup = "locked" in data; // presence of locked field means it's a group frame
  const setGroupLocked = useDiagramStore((s) => s.setGroupLocked);
  const title = metadata?.title || label || "Group";
  const description = metadata?.description || "";
  const subtypeStyle =
    (subtype && subtype !== "default" && AWS_FRAME_STYLES[subtype]) ||
    DEFAULT_FRAME_STYLE;
  const backgroundColor = metadata?.backgroundColor || subtypeStyle.bg;
  const borderColor = metadata?.borderColor || subtypeStyle.border;

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-primary"
        handleClassName="!w-3 !h-3 !bg-primary"
      />
      <div
        className={cn(
          "relative w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200 p-4",
          selected ? "shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "shadow-sm",
        )}
        style={{
          backgroundColor,
          borderColor: selected ? "hsl(var(--primary))" : borderColor,
        }}
      >
        {/* Title */}
        <div
          className="absolute -top-3 left-4 px-3 py-1 rounded-md font-semibold text-sm"
          style={{
            backgroundColor: borderColor,
            color: "white",
          }}
        >
          {title}
        </div>

        {/* Lock toggle (only for group frames) */}
        {isGroup && (
          <button
            className="absolute top-2 right-2 p-1 rounded-md bg-background/70 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors z-10"
            title={isGroupLocked ? "Desbloquear grupo" : "Bloquear grupo"}
            onClick={(e) => {
              e.stopPropagation();
              setGroupLocked(id, !isGroupLocked);
            }}
          >
            {isGroupLocked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <LockOpen className="w-3 h-3" />
            )}
          </button>
        )}

        {/* Description */}
        {description && (
          <div className="absolute top-6 left-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm p-2 rounded-md">
            {description}
          </div>
        )}

        {/* Handles - optional, frames might not need connections */}
        <Handle
          type="target"
          position={Position.Top}
          className="opacity-0"
          isConnectable={false}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="opacity-0"
          isConnectable={false}
        />
      </div>
    </>
  );
};

export default memo(FrameNode);
