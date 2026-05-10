"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Download,
  Users,
  HardDriveUpload,
  Rocket,
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Pen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "@/lib/store";

interface TourStep {
  target?: string;
  openDropdown?: string; // fires "tour:open-dropdown" with this id before querying target
  fallbackCentered?: boolean;
  title: string;
  description: string;
  icon?: React.ReactNode;
  accent?: string;
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to OpenArchFlow",
    description:
      "Let's take a quick tour of all the main features. It only takes a couple of minutes.",
    icon: <Sparkles className="h-10 w-10 text-indigo-500" />,
  },
  {
    target: "ai-generate",
    title: "AI Diagram Generation",
    description:
      "Describe your cloud architecture in plain English and AI builds the diagram instantly. Supports Gemini API or local WebLLM for complete privacy.",
    icon: <Sparkles className="h-5 w-5 text-indigo-500" />,
    accent: "indigo",
  },
  {
    target: "panels-menu",
    openDropdown: "panels",
    title: "Panels Menu",
    description:
      "Access all workspace panels here: Diagrams (manage multiple diagrams), Add Component (drag-and-drop library with 100+ AWS & Azure services), AI Chat, Layers, and Templates.",
    icon: <Plus className="h-5 w-5 text-emerald-500" />,
    accent: "emerald",
  },
  {
    target: "laser",
    title: "Laser Pointer",
    description:
      "Activate the laser pointer to highlight areas of the diagram during presentations. Click once to enable, click again to return to select mode.",
    icon: <Pen className="h-5 w-5 text-red-500" />,
    accent: "red",
  },
  {
    target: "deploy-menu",
    openDropdown: "deploy",
    title: "Deploy & Simulate",
    description:
      "Three powerful deploy tools in one menu: Terraform IaC generates production-ready HCL for your infrastructure; MiniStack deploys to a local AWS emulator (no cloud costs); Simulation runs live traffic to test failure rates and latency.",
    icon: <Rocket className="h-5 w-5 text-orange-500" />,
    accent: "orange",
  },
  {
    target: "export-menu",
    openDropdown: "export",
    title: "Export Anywhere",
    description:
      "Export as PNG, SVG, PDF, SQL DDL, or Terraform HCL. Generate an AI-written technical specification or an estimated cloud cost summary — all ready for your team or CI/CD pipeline.",
    icon: <Download className="h-5 w-5 text-blue-500" />,
    accent: "blue",
  },
  {
    target: "collaborate",
    title: "Real-time Collaboration",
    description:
      "Design with teammates in real time. Fully peer-to-peer and end-to-end encrypted — no account required.",
    icon: <Users className="h-5 w-5 text-violet-500" />,
    accent: "violet",
  },
  {
    target: "google-drive-sync",
    fallbackCentered: true,
    title: "Auto-Sync to Google Drive",
    description:
      "Connect your Google account and every change is automatically backed up to your personal Drive. Your work stays safe even if the browser data is cleared.",
    icon: <HardDriveUpload className="h-5 w-5 text-sky-500" />,
    accent: "sky",
  },
  {
    title: "You're all set!",
    description:
      "Start by describing your architecture using AI, or drag components from the library. You can replay this tour anytime using the compass icon in the toolbar.",
    icon: <CheckCircle2 className="h-10 w-10 text-green-500" />,
  },
];

const PAD = 10;
const CARD_W = 292;

function resolvePosition(
  rect: DOMRect,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const sl = rect.left - PAD;
  const st = rect.top - PAD;
  const sr = rect.right + PAD;
  const sb = rect.bottom + PAD;
  const cy = (st + sb) / 2;
  const cardH = 220;

  if (sr + 16 + CARD_W < vw)
    return { left: sr + 16, top: Math.max(16, Math.min(cy - cardH / 2, vh - cardH - 16)) };
  if (sl - 16 - CARD_W > 0)
    return { left: sl - 16 - CARD_W, top: Math.max(16, Math.min(cy - cardH / 2, vh - cardH - 16)) };
  if (st - 16 - cardH > 0)
    return { top: st - 16 - cardH, left: Math.max(16, Math.min((sl + sr) / 2 - CARD_W / 2, vw - CARD_W - 16)) };
  return { top: sb + 16, left: Math.max(16, Math.min((sl + sr) / 2 - CARD_W / 2, vw - CARD_W - 16)) };
}

export function OnboardingTour() {
  const tourCompleted = useDiagramStore((s) => s.tourCompleted);
  const tourOpen = useDiagramStore((s) => s.tourOpen);
  const setTourCompleted = useDiagramStore((s) => s.setTourCompleted);
  const setTourOpen = useDiagramStore((s) => s.setTourOpen);

  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isCentered, setIsCentered] = useState(true);
  const skipRef = useRef(false);

  const isVisible = tourOpen || !tourCompleted;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const resolveStep = useCallback(
    async (s: number) => {
      const st = STEPS[s];
      if (!st.target) {
        setTargetRect(null);
        setIsCentered(true);
        return;
      }
      if (st.openDropdown) {
        window.dispatchEvent(new CustomEvent("tour:open-dropdown", { detail: { id: st.openDropdown } }));
        // Wait for Radix to render the dropdown content into the DOM
        await new Promise<void>((r) => setTimeout(r, 250));
      }
      const el = document.querySelector(`[data-tour="${st.target}"]`);
      if (!el) {
        if (st.fallbackCentered) {
          setTargetRect(null);
          setIsCentered(true);
        } else {
          // element missing — skip this step
          skipRef.current = true;
          setStep((prev) => prev + 1);
        }
        return;
      }
      setTargetRect(el.getBoundingClientRect());
      setIsCentered(false);
    },
    [],
  );

  useEffect(() => {
    if (!isVisible) return;
    skipRef.current = false;
    resolveStep(step);
  }, [step, isVisible, resolveStep]);

  // Keep spotlight in sync with scroll / resize
  useEffect(() => {
    if (!isVisible || isCentered) return;
    const current = STEPS[step];
    if (!current.target) return;

    const update = () => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, isVisible, isCentered]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight" && !isLast) setStep((s) => s + 1);
      if (e.key === "ArrowLeft" && !isFirst) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const closeDropdowns = () => window.dispatchEvent(new CustomEvent("tour:close-dropdowns"));

  const handleClose = useCallback(() => {
    closeDropdowns();
    setTourCompleted();
    setTourOpen(false);
    setStep(0);
  }, [setTourCompleted, setTourOpen]);

  const handleNext = useCallback(() => {
    closeDropdowns();
    if (isLast) handleClose();
    else setStep((s) => s + 1);
  }, [isLast, handleClose]);

  const handleBack = useCallback(() => {
    closeDropdowns();
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!isVisible) return null;

  const cardPos = targetRect && !isCentered ? resolvePosition(targetRect) : null;

  const progressDots = (
    <div className="flex items-center gap-1.5">
      {STEPS.map((_, i) => (
        <button
          key={i}
          onClick={() => setStep(i)}
          className={`transition-all duration-300 rounded-full ${
            i === step
              ? "w-4 h-1.5 bg-primary"
              : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
          }`}
        />
      ))}
    </div>
  );

  const navButtons = (
    <div className="flex items-center justify-between pt-3 border-t border-border/60">
      {progressDots}
      <div className="flex items-center gap-1.5">
        {!isFirst && (
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-7 px-2 text-xs rounded-lg">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleNext}
          className="h-7 px-3 text-xs rounded-lg gap-1"
        >
          {isLast ? "Done" : "Next"}
          {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Dark overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9980]"
            style={{ background: isCentered ? "rgba(0,0,0,0.6)" : "transparent", pointerEvents: isCentered ? "all" : "none" }}
          />

          {/* Spotlight (only for targeted steps) */}
          {targetRect && !isCentered && (
            <motion.div
              key="spotlight"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                top: targetRect.top - PAD,
                left: targetRect.left - PAD,
                width: targetRect.width + PAD * 2,
                height: targetRect.height + PAD * 2,
              }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed z-[9981] rounded-xl pointer-events-auto cursor-pointer"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px hsl(var(--primary))",
              }}
              onClick={handleNext}
              title="Click to continue"
            />
          )}

          {/* Tooltip card — spotlight steps */}
          {!isCentered && cardPos && (
            <motion.div
              key={`card-${step}`}
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="fixed z-[9990] bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
              style={{ width: CARD_W, top: cardPos.top, left: cardPos.left }}
            >
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-start gap-2.5 pr-4">
                {current.icon && (
                  <span className="mt-0.5 shrink-0">{current.icon}</span>
                )}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Step {step} of {STEPS.length - 1}
                  </p>
                  <h3 className="text-sm font-semibold leading-snug">{current.title}</h3>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {current.description}
              </p>

              {current.target === "google-drive-sync" && (
                <p className="text-[11px] text-sky-500 font-medium">
                  Click the cloud icon in the toolbar to connect your account.
                </p>
              )}

              {navButtons}
            </motion.div>
          )}

          {/* Centered modal — welcome, done, and fallback steps */}
          {isCentered && (
            <motion.div
              key={`centered-${step}`}
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className="fixed z-[9990] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
              style={{ width: 360 }}
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center gap-3">
                {current.icon}
                <div>
                  <h2 className="text-base font-semibold">{current.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
                    {current.description}
                  </p>
                  {current.target === "google-drive-sync" && (
                    <p className="text-xs text-sky-500 font-medium mt-2">
                      Enable it by setting{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
                        NEXT_PUBLIC_GOOGLE_CLIENT_ID
                      </code>{" "}
                      in your environment and connecting via the toolbar.
                    </p>
                  )}
                </div>
              </div>

              {navButtons}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
