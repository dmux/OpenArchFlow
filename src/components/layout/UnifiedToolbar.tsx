"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  Workflow,
  Plus,
  Sparkles,
  Play,
  Square,
  Settings2,
  Terminal,
  Trash2,
  Download,
  FileText,
  DollarSign,
  Pen,
  Hand,
  MousePointer2,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Check,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Undo2,
  Redo2,
  Layers,
  LayoutTemplate,
  Rocket,
  BoxSelect,
  Shapes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useDiagramStore } from "@/lib/store";
import { useMemo } from "react";
import { useStore } from "zustand";
import { exportSvg } from "@/lib/export/svg";
import { exportPdf } from "@/lib/export/pdf";
import { exportSqlDdl } from "@/lib/export/sql-ddl";
import { exportTerraform } from "@/lib/export/terraform";
import { SiTerraform } from "react-icons/si";
import { SimulationEngine } from "@/lib/simulation";
import { useReactFlow } from "reactflow";
import { getLayoutedElements } from "@/lib/layout-utils";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { WebLLMService } from "@/lib/ai/webllm";
import BillOfMaterials from "../diagram/BillOfMaterials";
import { CollaborateButton } from "./CollaborateButton";

interface UnifiedToolbarProps {
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  useLocalAI: boolean;
}

export function UnifiedToolbar({
  activePanel,
  setActivePanel,
  isSidebarOpen,
  setIsSidebarOpen,
  isGenerating,
  setIsGenerating,
  useLocalAI,
}: UnifiedToolbarProps) {
  const { getNodes, fitView } = useReactFlow();
  const isPlaying = useDiagramStore((state) => state.isPlaying);
  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const nodeDisplayMode = useDiagramStore((s) => s.nodeDisplayMode);
  const setNodeDisplayMode = useDiagramStore((s) => s.setNodeDisplayMode);
  const ministackEnabled = ministackConfig?.enabled ?? false;
  const interactionMode = useDiagramStore((state) => state.interactionMode);
  const setInteractionMode = useDiagramStore(
    (state) => state.setInteractionMode,
  );
  const clear = useDiagramStore((state) => state.clear);
  const setNodes = useDiagramStore((state) => state.setNodes);
  const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
  const diagrams = useDiagramStore((state) => state.diagrams);
  const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
  const setGeneratedSpecification = useDiagramStore(
    (state) => state.setGeneratedSpecification,
  );
  const { setTheme, theme } = useTheme();

  const { undo, redo, pastStates, futureStates } = useStore(
    useDiagramStore.temporal,
  );
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBOM, setShowBOM] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  const scrollUp = () =>
    scrollRef.current?.scrollBy({ top: -80, behavior: "smooth" });
  const scrollDown = () =>
    scrollRef.current?.scrollBy({ top: 80, behavior: "smooth" });

  const activeDiagram = activeDiagramId ? diagrams[activeDiagramId] : null;
  const nodes = activeDiagram?.nodes || [];
  const edges = activeDiagram?.edges || [];
  const activeDiagramName = activeDiagram?.name || "Architecture";

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) {
      toast.error("No nodes to organize");
      return;
    }
    const layouted = getLayoutedElements(nodes, edges, "TB");
    setNodes(layouted.nodes);

    // Center the view after layout
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 50); // Small delay to ensure state update

    toast.success("Layout organized automatically!");
  }, [nodes, edges, setNodes, fitView]);

  const handleExport = useCallback(async () => {
    const nodes = getNodes();
    if (nodes.length === 0) {
      toast.error("No diagram to export");
      return;
    }

    const viewportElement = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement;
    if (!viewportElement) {
      toast.error("Could not find diagram viewport");
      return;
    }

    try {
      const { getNodesBounds, getViewportForBounds } =
        await import("reactflow");
      const nodesBounds = getNodesBounds(nodes);
      const padding = 50;
      const imageWidth = nodesBounds.width + padding * 2;
      const imageHeight = nodesBounds.height + padding * 2;

      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.5,
        2,
        padding,
      );

      const canvas = await html2canvas(viewportElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        width: imageWidth,
        height: imageHeight,
        onclone: (clonedDoc) => {
          const clonedViewport = clonedDoc.querySelector(
            ".react-flow__viewport",
          ) as HTMLElement;
          if (clonedViewport) {
            const offsetX = padding - nodesBounds.x * viewport.zoom;
            const offsetY = padding - nodesBounds.y * viewport.zoom;
            clonedViewport.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${viewport.zoom})`;
          }
        },
        ignoreElements: (element) => {
          return (
            element.classList?.contains("react-flow__minimap") ||
            element.classList?.contains("react-flow__controls") ||
            element.classList?.contains("react-flow__attribution") ||
            element.classList?.contains("react-flow__panel")
          );
        },
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = "architecture-diagram.png";
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success("Diagram exported successfully!");
        }
      });
    } catch (err) {
      toast.error("Failed to export diagram.");
    }
  }, [getNodes]);

  const handleExportSvg = useCallback(async () => {
    const nodes = getNodes();
    if (nodes.length === 0) {
      toast.error("No diagram to export");
      return;
    }
    try {
      await exportSvg(nodes);
      toast.success("SVG exported successfully!");
    } catch {
      toast.error("Failed to export SVG.");
    }
  }, [getNodes]);

  const handleExportPdf = useCallback(async () => {
    const nodes = getNodes();
    if (nodes.length === 0) {
      toast.error("No diagram to export");
      return;
    }
    try {
      await exportPdf(nodes);
      toast.success("PDF exported successfully!");
    } catch {
      toast.error("Failed to export PDF.");
    }
  }, [getNodes]);

  const handleExportDdl = useCallback(() => {
    try {
      exportSqlDdl(nodes, edges, activeDiagramName);
      toast.success("SQL DDL exported successfully!");
    } catch {
      toast.error("Failed to export SQL DDL.");
    }
  }, [nodes, edges, activeDiagramName]);

  const handleExportTerraform = useCallback(() => {
    try {
      exportTerraform(nodes, edges, activeDiagramName);
      toast.success("Terraform .tf exported successfully!");
    } catch {
      toast.error("Failed to export Terraform.");
    }
  }, [nodes, edges, activeDiagramName]);

  const handleGenerateSpec = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error("No diagram to generate specification for");
      return;
    }

    setIsGenerating(true);
    try {
      let specification: string;

      if (useLocalAI) {
        toast.info("Generating specification with Local AI...");
        const service = WebLLMService.getInstance();
        if (!service.isReady()) throw new Error("Local model not ready yet.");
        specification = await service.generateSpecification(
          nodes,
          edges,
          activeDiagramName,
        );
      } else {
        if (!geminiApiKey) throw new Error("Gemini API Key is required.");
        toast.info("Generating specification with Cloud AI...");
        const response = await fetch("/api/generate-spec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes,
            edges,
            apiKey: geminiApiKey,
            diagramName: activeDiagramName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to generate specification",
          );
        }

        const data = await response.json();
        specification = data.specification;
      }

      setGeneratedSpecification(specification);
      toast.success("Specification generated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate specification",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    nodes,
    edges,
    activeDiagramName,
    geminiApiKey,
    setGeneratedSpecification,
    setIsGenerating,
    useLocalAI,
  ]);

  // ── 5 logical groups ──────────────────────────────────────────────────────
  const panelTools = [
    { id: "diagrams",  icon: LayoutGrid,    label: "Diagrams",       onClick: () => { setIsSidebarOpen(!isSidebarOpen); setActivePanel(activePanel === "diagrams" ? null : "diagrams"); }, active: isSidebarOpen },
    { id: "library",   icon: Plus,          label: "Add Component",  onClick: () => setActivePanel(activePanel === "library"   ? null : "library"),   active: activePanel === "library" },
    { id: "ai",        icon: Sparkles,      label: "AI Generate",    onClick: () => setActivePanel(activePanel === "ai"        ? null : "ai"),        active: activePanel === "ai",        tint: "text-indigo-500" },
    { id: "chat",      icon: MessageSquare, label: "Diagram Chat",   onClick: () => setActivePanel(activePanel === "chat"      ? null : "chat"),      active: activePanel === "chat",      tint: "text-indigo-500" },
    { id: "layers",    icon: Layers,        label: "Layers",         onClick: () => setActivePanel(activePanel === "layers"    ? null : "layers"),    active: activePanel === "layers" },
    { id: "templates", icon: LayoutTemplate,label: "Templates",      onClick: () => setActivePanel(activePanel === "templates" ? null : "templates"), active: activePanel === "templates" },
  ] as const;

  const canvasTools = [
    { id: "select",       icon: MousePointer2,                         label: "Select / Edit",    onClick: () => setInteractionMode("default"),                                             active: interactionMode === "default" },
    { id: "pan",          icon: Hand,                                   label: "Pan / Move",       onClick: () => setInteractionMode(interactionMode === "pan"   ? "default" : "pan"),       active: interactionMode === "pan" },
    { id: "laser",        icon: Pen,                                    label: "Laser Pointer",    onClick: () => setInteractionMode(interactionMode === "laser" ? "default" : "laser"),     active: interactionMode === "laser",   activeTint: "text-red-500" },
    { id: "node-display", icon: nodeDisplayMode === "icon" ? BoxSelect : Shapes, label: nodeDisplayMode === "icon" ? "Card view" : "Icon view", onClick: () => setNodeDisplayMode(nodeDisplayMode === "card" ? "icon" : "card"), active: nodeDisplayMode === "icon" },
    { id: "undo",         icon: Undo2,                                  label: "Undo (Ctrl+Z)",    onClick: () => undo(),             active: false, disabled: !canUndo },
    { id: "redo",         icon: Redo2,                                  label: "Redo (Ctrl+Y)",    onClick: () => redo(),             active: false, disabled: !canRedo },
    { id: "layout",       icon: Workflow,                               label: "Auto Layout",      onClick: handleAutoLayout,         active: false },
  ];

  const simTools = [
    { id: "sim-panel", icon: Terminal,               label: "Simulation Panel",   onClick: () => setActivePanel(activePanel === "simulation" ? null : "simulation"), active: activePanel === "simulation" },
    { id: "sim-run",   icon: isPlaying ? Square : Play, label: isPlaying ? "Stop Simulation" : "Start Simulation", onClick: () => { if (isPlaying) SimulationEngine.getInstance().stop(); else SimulationEngine.getInstance().start(); }, active: isPlaying, variant: (isPlaying ? "destructive" : "default") as any },
  ];

  const sep = <div className="h-5 w-px md:h-px md:w-5 bg-border mx-0.5 md:mx-0 md:my-1 shrink-0" />;
  const btnCls = "h-9 w-9 md:h-7 md:w-7 rounded-lg transition-all duration-200";
  const icoSize = "h-4 w-4 md:h-3.5 md:w-3.5";

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] flex flex-row items-center bg-background/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl transition-all duration-300 max-w-[calc(100vw-2rem)] md:left-4 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:translate-x-0 md:flex-col md:max-w-none md:max-h-[calc(100vh-2rem)]">
        {canScrollUp && (
          <button onClick={scrollUp} className="hidden md:flex w-full justify-center py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-t-xl transition-colors shrink-0">
            <ChevronUp className="h-3 w-3" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex flex-row md:flex-col items-center gap-0.5 p-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {/* ── Group 1: Panels ─────────────────────────────────────────── */}
          <div className="flex flex-row md:flex-col gap-0.5">
            {panelTools.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Button variant={t.active ? "default" : "ghost"} size="icon" onClick={t.onClick}
                    className={cn(btnCls, t.active ? "bg-primary text-primary-foreground shadow-sm scale-105" : "hover:bg-accent hover:text-accent-foreground")}
                  >
                    <t.icon className={cn(icoSize, !t.active && (t as any).tint)} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}><p className="font-medium">{t.label}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>

          {sep}

          {/* ── Group 2: Deploy ─────────────────────────────────────────── */}
          <div className="flex flex-row md:flex-col gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={activePanel === "terraform" ? "default" : "ghost"} size="icon"
                  onClick={() => setActivePanel(activePanel === "terraform" ? null : "terraform")}
                  className={cn(btnCls, activePanel === "terraform" ? "shadow-sm scale-105" : "hover:bg-accent hover:text-accent-foreground")}
                  style={activePanel === "terraform" ? { background: "linear-gradient(135deg,#7B42BC,#5C2D8A)", color: "white" } : undefined}
                >
                  <SiTerraform className={icoSize} style={{ color: activePanel === "terraform" ? "white" : "#7B42BC" }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">Terraform IaC</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={activePanel === "ministack" ? "default" : "ghost"} size="icon"
                  onClick={() => setActivePanel(activePanel === "ministack" ? null : "ministack")}
                  className={cn(btnCls, activePanel === "ministack" ? "shadow-sm scale-105" : "hover:bg-accent hover:text-accent-foreground")}
                  style={activePanel === "ministack" ? { background: "linear-gradient(135deg,#f97316,#ea580c)", color: "white" } : undefined}
                >
                  <span className="relative">
                    <Rocket className={cn(icoSize, activePanel === "ministack" ? "text-white" : "text-orange-500")} />
                    {ministackEnabled && activePanel !== "ministack" && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-background" />
                    )}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">MiniStack Deploy</p></TooltipContent>
            </Tooltip>
          </div>

          {sep}

          {/* ── Group 3: Canvas ─────────────────────────────────────────── */}
          <div className="flex flex-row md:flex-col gap-0.5">
            {canvasTools.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Button variant={t.active ? "secondary" : "ghost"} size="icon" onClick={t.onClick}
                    disabled={(t as any).disabled}
                    className={cn(btnCls,
                      t.active ? "bg-secondary text-secondary-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground",
                      (t as any).disabled && "opacity-30 cursor-not-allowed",
                    )}
                  >
                    <t.icon className={cn(icoSize, t.active && (t as any).activeTint)} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}><p className="font-medium">{t.label}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>

          {sep}

          {/* ── Group 4: Simulation ─────────────────────────────────────── */}
          <div className="flex flex-row md:flex-col gap-0.5">
            {simTools.map((t) => (
              <Tooltip key={t.id}>
                <TooltipTrigger asChild>
                  <Button variant={(t as any).variant || (t.active ? "default" : "ghost")} size="icon" onClick={t.onClick}
                    className={cn(btnCls, t.active && !(t as any).variant && "bg-primary text-primary-foreground shadow-sm", !t.active && "hover:bg-accent hover:text-accent-foreground")}
                  >
                    <t.icon className={icoSize} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}><p className="font-medium">{t.label}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>

          {sep}

          {/* ── Group 5: Output / Settings ──────────────────────────────── */}
          <div className="flex flex-row md:flex-col gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleGenerateSpec} className={cn(btnCls, "hover:bg-accent hover:text-accent-foreground")}>
                  <FileText className={cn(icoSize, isGenerating && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">Generate Spec</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowBOM(true)} className={cn(btnCls, "hover:bg-accent hover:text-accent-foreground")}>
                  <DollarSign className={icoSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">Cost Summary</p></TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn(btnCls, "hover:bg-accent hover:text-accent-foreground")}>
                      <Download className={icoSize} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}><p className="font-medium">Export</p></TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="start" sideOffset={15} className="w-40 p-1.5 rounded-xl shadow-2xl border-border bg-background/95 backdrop-blur-xl">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">Export As</DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={handleExport}          className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium">PNG Image</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSvg}       className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium">SVG Vector</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}       className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium">PDF Document</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDdl}       className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium">SQL DDL</DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={handleExportTerraform} className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium gap-2">
                  <SiTerraform size={13} style={{ color: "#7B42BC" }} /> Terraform (.tf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CollaborateButton />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowClearConfirm(true)} className={cn(btnCls, "text-muted-foreground hover:text-destructive hover:bg-destructive/10")}>
                  <Trash2 className={icoSize} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">Clear Canvas</p></TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn(btnCls, "text-muted-foreground hover:text-foreground")}>
                      <Settings2 className={icoSize} />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}><p className="font-medium">Settings</p></TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="end" sideOffset={15} className="w-48 p-2 rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">Theme</DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem onClick={() => setTheme("light")}  className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent">
                  <div className="flex items-center gap-2"><Sun  className="h-4 w-4 text-orange-500" /><span className="text-sm font-medium">Light</span></div>
                  {theme === "light"  && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}   className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent">
                  <div className="flex items-center gap-2"><Moon    className="h-4 w-4 text-indigo-400" /><span className="text-sm font-medium">Dark</span></div>
                  {theme === "dark"   && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent">
                  <div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-sky-500" /><span className="text-sm font-medium">System</span></div>
                  {theme === "system" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {canScrollDown && (
          <button onClick={scrollDown} className="hidden md:flex w-full justify-center py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-b-xl transition-colors shrink-0">
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>

      <BillOfMaterials open={showBOM} onOpenChange={setShowBOM} />

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Canvas?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all nodes and edges from the current diagram.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clear();
                setShowClearConfirm(false);
                toast.success("Canvas cleared");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
