"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, RotateCcw } from "lucide-react";
import { useDiagramStore, DEFAULT_EDGE_SETTINGS, type EdgeSettings } from "@/lib/store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Mini SVG previews for each edge type ─────────────────────────────────────

function EdgePreview({ type, strokeWidth = 2, dashed = false, color = "currentColor" }: {
  type: EdgeSettings["type"];
  strokeWidth?: number;
  dashed?: boolean;
  color?: string;
}) {
  const dash = dashed ? "6 3" : undefined;
  const common = { stroke: color, strokeWidth, fill: "none", strokeDasharray: dash };
  const size = 64;
  const h = 28;
  const midY = h / 2;

  let path = "";
  if (type === "straight") {
    path = `M4,${midY} L${size - 4},${midY}`;
  } else if (type === "bezier") {
    path = `M4,${midY} C20,${midY} ${size - 20},${midY} ${size - 4},${midY}`;
    // slight curve up/down
    path = `M4,${midY + 4} C20,${midY + 4} ${size - 20},${midY - 4} ${size - 4},${midY - 4}`;
  } else if (type === "step") {
    const mid = size / 2;
    path = `M4,${midY} L${mid},${midY} L${mid},${midY - 6} L${size - 4},${midY - 6}`;
  } else {
    // smoothstep
    const r = 8;
    const mid = size / 2;
    path = `M4,${midY} L${mid - r},${midY} Q${mid},${midY} ${mid},${midY - r} L${mid},${midY - 6 + r} Q${mid},${midY - 6} ${mid + r},${midY - 6} L${size - 4},${midY - 6}`;
  }

  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} aria-hidden>
      <defs>
        <marker id={`prev-arrow-${type}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={color} />
        </marker>
      </defs>
      <path {...common} d={path} markerEnd={`url(#prev-arrow-${type})`} />
    </svg>
  );
}

// ── Option grid helpers ───────────────────────────────────────────────────────

function OptionCard({ active, onClick, children, className }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-xl border p-3 transition-all hover:border-primary/60",
        active ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {active && <Check className="absolute top-1.5 right-1.5 h-3 w-3 text-primary" />}
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{children}</p>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

export function DiagramSettingsDialog({ open, onClose }: Props) {
  const edgeSettings = useDiagramStore((s) => s.edgeSettings);
  const setEdgeSettings = useDiagramStore((s) => s.setEdgeSettings);

  const set = (patch: Partial<EdgeSettings>) => setEdgeSettings(patch);

  const handleReset = () => {
    setEdgeSettings(DEFAULT_EDGE_SETTINGS);
    toast.success("Connection style reset to defaults.");
  };

  const previewColor = edgeSettings.color || "hsl(var(--muted-foreground))";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Diagram Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-1">

          {/* ── Connection routing ───────────────────────────────────────── */}
          <div>
            <SectionLabel>Connection routing</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "smoothstep", label: "Smooth Step" },
                { value: "bezier",     label: "Bezier" },
                { value: "step",       label: "Orthogonal" },
                { value: "straight",   label: "Straight" },
              ] as const).map(({ value, label }) => (
                <OptionCard key={value} active={edgeSettings.type === value} onClick={() => set({ type: value })}>
                  <EdgePreview type={value} strokeWidth={1.5} color={edgeSettings.type === value ? "hsl(var(--primary))" : "currentColor"} />
                  <span className="text-[11px] font-medium">{label}</span>
                </OptionCard>
              ))}
            </div>
          </div>

          {/* ── Stroke width ─────────────────────────────────────────────── */}
          <div>
            <SectionLabel>Stroke width</SectionLabel>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((w) => (
                <OptionCard key={w} active={edgeSettings.strokeWidth === w} onClick={() => set({ strokeWidth: w })} className="flex-1">
                  <svg width="32" height="14" viewBox="0 0 32 14" aria-hidden>
                    <line
                      x1="2" y1="7" x2="30" y2="7"
                      stroke={edgeSettings.strokeWidth === w ? "hsl(var(--primary))" : "currentColor"}
                      strokeWidth={w}
                    />
                  </svg>
                  <span className="text-[11px] font-medium">{w}px</span>
                </OptionCard>
              ))}
            </div>
          </div>

          {/* ── Line style ───────────────────────────────────────────────── */}
          <div>
            <SectionLabel>Line style</SectionLabel>
            <div className="flex gap-2">
              <OptionCard active={!edgeSettings.dashed} onClick={() => set({ dashed: false })} className="flex-1">
                <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden>
                  <line x1="2" y1="6" x2="38" y2="6" stroke={!edgeSettings.dashed ? "hsl(var(--primary))" : "currentColor"} strokeWidth="2" />
                </svg>
                <span className="text-[11px] font-medium">Solid</span>
              </OptionCard>
              <OptionCard active={edgeSettings.dashed} onClick={() => set({ dashed: true })} className="flex-1">
                <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden>
                  <line x1="2" y1="6" x2="38" y2="6" stroke={edgeSettings.dashed ? "hsl(var(--primary))" : "currentColor"} strokeWidth="2" strokeDasharray="6 3" />
                </svg>
                <span className="text-[11px] font-medium">Dashed</span>
              </OptionCard>
              <OptionCard active={edgeSettings.animated} onClick={() => set({ animated: !edgeSettings.animated })} className="flex-1">
                <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden>
                  <line x1="2" y1="6" x2="38" y2="6" stroke={edgeSettings.animated ? "hsl(var(--primary))" : "currentColor"} strokeWidth="2" strokeDasharray="4 4" />
                </svg>
                <span className="text-[11px] font-medium">Animated</span>
              </OptionCard>
            </div>
          </div>

          {/* ── Arrow / marker ───────────────────────────────────────────── */}
          <div>
            <SectionLabel>Arrow style</SectionLabel>
            <div className="flex gap-2">
              {([
                { value: "arrowclosed", label: "Filled" },
                { value: "arrow",       label: "Open" },
                { value: "none",        label: "None" },
              ] as const).map(({ value, label }) => (
                <OptionCard key={value} active={edgeSettings.markerEnd === value} onClick={() => set({ markerEnd: value })} className="flex-1">
                  <ArrowPreview type={value} active={edgeSettings.markerEnd === value} />
                  <span className="text-[11px] font-medium">{label}</span>
                </OptionCard>
              ))}
            </div>
          </div>

          {/* ── Arrow direction ──────────────────────────────────────────── */}
          <div>
            <SectionLabel>Direction</SectionLabel>
            <div className="flex gap-2">
              <OptionCard
                active={edgeSettings.markerStart === "none"}
                onClick={() => set({ markerStart: "none" })}
                className="flex-1"
              >
                <svg width="48" height="12" viewBox="0 0 48 12" aria-hidden>
                  <defs>
                    <marker id="dir-end-fwd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill={edgeSettings.markerStart === "none" ? "hsl(var(--primary))" : "currentColor"} />
                    </marker>
                  </defs>
                  <line x1="4" y1="6" x2="40" y2="6" stroke={edgeSettings.markerStart === "none" ? "hsl(var(--primary))" : "currentColor"} strokeWidth="2" markerEnd="url(#dir-end-fwd)" />
                </svg>
                <span className="text-[11px] font-medium">Forward</span>
              </OptionCard>
              <OptionCard
                active={edgeSettings.markerStart !== "none"}
                onClick={() => set({ markerStart: "arrowclosed" })}
                className="flex-1"
              >
                <svg width="48" height="12" viewBox="0 0 48 12" aria-hidden>
                  <defs>
                    <marker id="dir-start-bi" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
                      <path d="M0,0 L0,6 L6,3 z" fill={edgeSettings.markerStart !== "none" ? "hsl(var(--primary))" : "currentColor"} />
                    </marker>
                    <marker id="dir-end-bi" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill={edgeSettings.markerStart !== "none" ? "hsl(var(--primary))" : "currentColor"} />
                    </marker>
                  </defs>
                  <line x1="8" y1="6" x2="40" y2="6" stroke={edgeSettings.markerStart !== "none" ? "hsl(var(--primary))" : "currentColor"} strokeWidth="2" markerStart="url(#dir-start-bi)" markerEnd="url(#dir-end-bi)" />
                </svg>
                <span className="text-[11px] font-medium">Bidirectional</span>
              </OptionCard>
            </div>
          </div>

          {/* ── Color ────────────────────────────────────────────────────── */}
          <div>
            <SectionLabel>Color</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "",        label: "Default", swatch: "hsl(var(--muted-foreground))" },
                { value: "#6366f1", label: "Indigo",  swatch: "#6366f1" },
                { value: "#0ea5e9", label: "Sky",     swatch: "#0ea5e9" },
                { value: "#22c55e", label: "Green",   swatch: "#22c55e" },
                { value: "#f97316", label: "Orange",  swatch: "#f97316" },
                { value: "#ef4444", label: "Red",     swatch: "#ef4444" },
                { value: "#a855f7", label: "Purple",  swatch: "#a855f7" },
                { value: "#eab308", label: "Yellow",  swatch: "#eab308" },
              ]).map(({ value, label, swatch }) => (
                <OptionCard key={label} active={edgeSettings.color === value} onClick={() => set({ color: value })} className="w-16">
                  <span className="w-5 h-5 rounded-full border border-border/50" style={{ backgroundColor: swatch }} />
                  <span className="text-[10px]">{label}</span>
                </OptionCard>
              ))}
            </div>
          </div>

          {/* ── Live preview ─────────────────────────────────────────────── */}
          <div>
            <SectionLabel>Preview</SectionLabel>
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-center">
              <EdgePreview
                type={edgeSettings.type}
                strokeWidth={edgeSettings.strokeWidth}
                dashed={edgeSettings.dashed}
                color={previewColor}
              />
            </div>
          </div>

          {/* ── Reset ────────────────────────────────────────────────────── */}
          <div className="flex justify-end border-t border-border pt-4">
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground hover:text-foreground text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArrowPreview({ type, active }: { type: "arrowclosed" | "arrow" | "none"; active: boolean }) {
  const color = active ? "hsl(var(--primary))" : "currentColor";
  if (type === "none") {
    return (
      <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden>
        <line x1="2" y1="6" x2="38" y2="6" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  if (type === "arrow") {
    return (
      <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden>
        <defs>
          <marker id={`arr-open-${active}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <polyline points="1,1 7,4 1,7" fill="none" stroke={color} strokeWidth="1.5" />
          </marker>
        </defs>
        <line x1="2" y1="6" x2="32" y2="6" stroke={color} strokeWidth="2" markerEnd={`url(#arr-open-${active})`} />
      </svg>
    );
  }
  return (
    <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden>
      <defs>
        <marker id={`arr-closed-${active}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M1,1 L7,4 L1,7 Z" fill={color} />
        </marker>
      </defs>
      <line x1="2" y1="6" x2="30" y2="6" stroke={color} strokeWidth="2" markerEnd={`url(#arr-closed-${active})`} />
    </svg>
  );
}
