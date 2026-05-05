"use client";

import React, { useState } from "react";
import { X, LayoutTemplate, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  DiagramTemplate,
} from "@/lib/templates";
import { useDiagramStore } from "@/lib/store";
import { toast } from "sonner";

interface TemplatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  AWS: "text-orange-500 border-orange-200 bg-orange-50 dark:bg-orange-950/30",
  Azure: "text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-950/30",
  Generic: "text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-800/30",
};

const STAR_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

function StarRating({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0.5" title={STAR_LABELS[stars]}>
      {([1, 2, 3] as const).map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i <= stars
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground/25 fill-transparent",
          )}
        />
      ))}
    </div>
  );
}

export default function TemplatesDialog({
  isOpen,
  onClose,
}: TemplatesDialogProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeStars, setActiveStars] = useState<number>(0);
  const createDiagram = useDiagramStore((s) => s.createDiagram);
  const setNodes = useDiagramStore((s) => s.setNodes);
  const setEdges = useDiagramStore((s) => s.setEdges);

  if (!isOpen) return null;

  const allCategories = ["All", ...TEMPLATE_CATEGORIES];
  const filtered = TEMPLATES.filter((t) => {
    if (activeCategory !== "All" && t.category !== activeCategory) return false;
    if (activeStars !== 0 && t.stars !== activeStars) return false;
    return true;
  });

  const applyTemplate = (tpl: DiagramTemplate) => {
    createDiagram(tpl.name);
    setTimeout(() => {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      toast.success(`Template "${tpl.name}" applied`);
    }, 0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-2xl shadow-2xl w-[680px] max-w-[95vw] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            <span className="font-semibold text-base">Templates</span>
            <span className="text-xs text-muted-foreground ml-1">
              — start from a pre-built diagram
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-border shrink-0">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}

          <div className="w-px h-5 bg-border self-center mx-1" />

          {/* Star difficulty filter */}
          {([0, 1, 2, 3] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveStars(activeStars === s ? 0 : s)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border transition-colors",
                activeStars === s && s !== 0
                  ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
              title={s === 0 ? "All difficulties" : STAR_LABELS[s]}
            >
              {s === 0 ? (
                <span>All levels</span>
              ) : (
                <>
                  {([1, 2, 3] as const).map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i <= s
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground/25",
                      )}
                    />
                  ))}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl)}
                className="group text-left rounded-xl border border-border bg-card p-4 hover:border-primary/60 hover:shadow-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Mini preview: node count dots */}
                <div className="mb-3 flex flex-wrap gap-1">
                  {tpl.nodes.slice(0, 6).map((node) => (
                    <div
                      key={node.id}
                      className="h-2.5 w-2.5 rounded bg-primary/30 group-hover:bg-primary/50 transition-colors"
                    />
                  ))}
                  {tpl.nodes.length > 6 && (
                    <span className="text-[9px] text-muted-foreground self-center">
                      +{tpl.nodes.length - 6}
                    </span>
                  )}
                </div>

                <div className="font-medium text-sm leading-snug mb-1">
                  {tpl.name}
                </div>
                <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                  {tpl.description}
                </p>

                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                      CATEGORY_COLORS[tpl.category],
                    )}
                  >
                    {tpl.category}
                  </span>
                  <StarRating stars={tpl.stars} />
                  <span className="text-[10px] text-muted-foreground">
                    {STAR_LABELS[tpl.stars]}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {tpl.nodes.length}n · {tpl.edges.length}e
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
