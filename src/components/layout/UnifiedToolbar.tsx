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
  Compass,
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
import { GoogleDriveSyncButton } from "./GoogleDriveSyncButton";
import { type GoogleDriveSyncHook } from "@/hooks/useGoogleDriveSync";

interface UnifiedToolbarProps {
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  useLocalAI: boolean;
  driveSync: GoogleDriveSyncHook;
}

export function UnifiedToolbar({
  activePanel,
  setActivePanel,
  isSidebarOpen,
  setIsSidebarOpen,
  isGenerating,
  setIsGenerating,
  useLocalAI,
  driveSync,
}: UnifiedToolbarProps) {
  const { getNodes, fitView } = useReactFlow();
  const isPlaying = useDiagramStore((state) => state.isPlaying);
  const setTourOpen = useDiagramStore((s) => s.setTourOpen);
  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const nodeDisplayMode = useDiagramStore((s) => s.nodeDisplayMode);
  const setNodeDisplayMode = useDiagramStore((s) => s.setNodeDisplayMode);
  const ministackEnabled = ministackConfig?.enabled ?? false;
  const interactionMode = useDiagramStore((state) => state.interactionMode);
  const setInteractionMode = useDiagramStore((state) => state.setInteractionMode);
  const clear = useDiagramStore((state) => state.clear);
  const setNodes = useDiagramStore((state) => state.setNodes);
  const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
  const diagrams = useDiagramStore((state) => state.diagrams);
  const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
  const setGeneratedSpecification = useDiagramStore((state) => state.setGeneratedSpecification);
  const { setTheme, theme } = useTheme();

  const { undo, redo, pastStates, futureStates } = useStore(useDiagramStore.temporal);
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBOM, setShowBOM] = useState(false);

  // Controlled open state so the onboarding tour can open specific dropdowns
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const openHandler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      setPanelsOpen(id === "panels");
      setDeployOpen(id === "deploy");
      setExportOpen(id === "export");
    };
    const closeHandler = () => {
      setPanelsOpen(false);
      setDeployOpen(false);
      setExportOpen(false);
    };
    window.addEventListener("tour:open-dropdown", openHandler);
    window.addEventListener("tour:close-dropdowns", closeHandler);
    return () => {
      window.removeEventListener("tour:open-dropdown", openHandler);
      window.removeEventListener("tour:close-dropdowns", closeHandler);
    };
  }, []);

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

  const scrollUp = () => scrollRef.current?.scrollBy({ top: -80, behavior: "smooth" });
  const scrollDown = () => scrollRef.current?.scrollBy({ top: 80, behavior: "smooth" });

  const activeDiagram = activeDiagramId ? diagrams[activeDiagramId] : null;
  const nodes = activeDiagram?.nodes || [];
  const edges = activeDiagram?.edges || [];
  const activeDiagramName = activeDiagram?.name || "Architecture";

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) { toast.error("No nodes to organize"); return; }
    const layouted = getLayoutedElements(nodes, edges, "TB");
    setNodes(layouted.nodes);
    setTimeout(() => { fitView({ padding: 0.2, duration: 800 }); }, 50);
    toast.success("Layout organized automatically!");
  }, [nodes, edges, setNodes, fitView]);

  const handleExport = useCallback(async () => {
    const nodes = getNodes();
    if (nodes.length === 0) { toast.error("No diagram to export"); return; }
    const viewportElement = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!viewportElement) { toast.error("Could not find diagram viewport"); return; }
    try {
      const { getNodesBounds, getViewportForBounds } = await import("reactflow");
      const nodesBounds = getNodesBounds(nodes);
      const padding = 50;
      const imageWidth = nodesBounds.width + padding * 2;
      const imageHeight = nodesBounds.height + padding * 2;
      const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2, padding);
      const canvas = await html2canvas(viewportElement, {
        backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false,
        width: imageWidth, height: imageHeight,
        onclone: (clonedDoc) => {
          const clonedViewport = clonedDoc.querySelector(".react-flow__viewport") as HTMLElement;
          if (clonedViewport) {
            clonedViewport.style.transform = `translate(${padding - nodesBounds.x * viewport.zoom}px, ${padding - nodesBounds.y * viewport.zoom}px) scale(${viewport.zoom})`;
          }
        },
        ignoreElements: (el) =>
          el.classList?.contains("react-flow__minimap") ||
          el.classList?.contains("react-flow__controls") ||
          el.classList?.contains("react-flow__attribution") ||
          el.classList?.contains("react-flow__panel"),
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
    } catch { toast.error("Failed to export diagram."); }
  }, [getNodes]);

  const handleExportSvg = useCallback(async () => {
    const nodes = getNodes();
    if (nodes.length === 0) { toast.error("No diagram to export"); return; }
    try { await exportSvg(nodes); toast.success("SVG exported successfully!"); }
    catch { toast.error("Failed to export SVG."); }
  }, [getNodes]);

  const handleExportPdf = useCallback(async () => {
    const nodes = getNodes();
    if (nodes.length === 0) { toast.error("No diagram to export"); return; }
    try { await exportPdf(nodes); toast.success("PDF exported successfully!"); }
    catch { toast.error("Failed to export PDF."); }
  }, [getNodes]);

  const handleExportDdl = useCallback(() => {
    try { exportSqlDdl(nodes, edges, activeDiagramName); toast.success("SQL DDL exported successfully!"); }
    catch { toast.error("Failed to export SQL DDL."); }
  }, [nodes, edges, activeDiagramName]);

  const handleExportTerraform = useCallback(() => {
    try { exportTerraform(nodes, edges, activeDiagramName); toast.success("Terraform .tf exported successfully!"); }
    catch { toast.error("Failed to export Terraform."); }
  }, [nodes, edges, activeDiagramName]);

  const handleGenerateSpec = useCallback(async () => {
    if (nodes.length === 0) { toast.error("No diagram to generate specification for"); return; }
    setIsGenerating(true);
    try {
      let specification: string;
      if (useLocalAI) {
        toast.info("Generating specification with Local AI...");
        const service = WebLLMService.getInstance();
        if (!service.isReady()) throw new Error("Local model not ready yet.");
        specification = await service.generateSpecification(nodes, edges, activeDiagramName);
      } else {
        if (!geminiApiKey) throw new Error("Gemini API Key is required.");
        toast.info("Generating specification with Cloud AI...");
        const response = await fetch("/api/generate-spec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes, edges, apiKey: geminiApiKey, diagramName: activeDiagramName }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate specification");
        }
        const data = await response.json();
        specification = data.specification;
      }
      setGeneratedSpecification(specification);
      toast.success("Specification generated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate specification");
    } finally { setIsGenerating(false); }
  }, [nodes, edges, activeDiagramName, geminiApiKey, setGeneratedSpecification, setIsGenerating, useLocalAI]);

  const btnCls = "h-9 w-9 md:h-7 md:w-7 rounded-lg transition-all duration-200";
  const icoSize = "h-4 w-4 md:h-3.5 md:w-3.5";
  const sep = <div className="h-5 w-px md:h-px md:w-5 bg-border mx-0.5 md:mx-0 md:my-1 shrink-0" />;
  const ddContent = "p-1.5 rounded-xl shadow-2xl border-border bg-background/95 backdrop-blur-xl";
  const ddItem = "flex items-center gap-2 rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent";
  const ddLabel = "text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1";

  const panelActive = ["library", "chat", "layers", "templates"].includes(activePanel ?? "") || isSidebarOpen;
  const deployActive = ["terraform", "ministack", "simulation"].includes(activePanel ?? "") || isPlaying;

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
          {/* ── AI Generate ─────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activePanel === "ai" ? "default" : "ghost"}
                size="icon"
                onClick={() => setActivePanel(activePanel === "ai" ? null : "ai")}
                className={cn(btnCls, activePanel === "ai" ? "bg-primary text-primary-foreground shadow-sm scale-105" : "hover:bg-accent hover:text-accent-foreground")}
                data-tour="ai-generate"
              >
                <Sparkles className={cn(icoSize, activePanel !== "ai" && "text-indigo-500")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">AI Generate</p></TooltipContent>
          </Tooltip>

          {/* ── Panels dropdown ─────────────────────────────────────────── */}
          <DropdownMenu open={panelsOpen} onOpenChange={setPanelsOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={panelActive ? "default" : "ghost"}
                    size="icon"
                    className={cn(btnCls, panelActive ? "bg-primary text-primary-foreground shadow-sm scale-105" : "hover:bg-accent hover:text-accent-foreground")}
                    data-tour="library"
                  >
                    <LayoutGrid className={icoSize} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">Panels</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" sideOffset={15} className={cn(ddContent, "w-48")} data-tour="panels-menu">
              <DropdownMenuLabel className={ddLabel}>Panels</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Diagrams</span></div>
                {isSidebarOpen && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivePanel(activePanel === "library" ? null : "library")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><Plus className="h-4 w-4 text-emerald-500" /><span className="text-sm font-medium">Add Component</span></div>
                {activePanel === "library" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivePanel(activePanel === "chat" ? null : "chat")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-indigo-500" /><span className="text-sm font-medium">AI Chat</span></div>
                {activePanel === "chat" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivePanel(activePanel === "layers" ? null : "layers")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Layers</span></div>
                {activePanel === "layers" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivePanel(activePanel === "templates" ? null : "templates")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Templates</span></div>
                {activePanel === "templates" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {sep}

          {/* ── Select ──────────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={interactionMode === "default" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setInteractionMode("default")}
                className={cn(btnCls, interactionMode === "default" ? "bg-secondary text-secondary-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground")}
              >
                <MousePointer2 className={icoSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Select / Edit</p></TooltipContent>
          </Tooltip>

          {/* ── Pan ─────────────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={interactionMode === "pan" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setInteractionMode(interactionMode === "pan" ? "default" : "pan")}
                className={cn(btnCls, interactionMode === "pan" ? "bg-secondary text-secondary-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground")}
              >
                <Hand className={icoSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Pan / Move</p></TooltipContent>
          </Tooltip>

          {/* ── Laser Pointer ────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={interactionMode === "laser" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setInteractionMode(interactionMode === "laser" ? "default" : "laser")}
                className={cn(btnCls, interactionMode === "laser" ? "bg-secondary text-secondary-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground")}
                data-tour="laser"
              >
                <Pen className={cn(icoSize, interactionMode === "laser" ? "text-red-500" : "text-muted-foreground")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Laser Pointer</p></TooltipContent>
          </Tooltip>

          {/* ── Undo ────────────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => undo()}
                disabled={!canUndo}
                className={cn(btnCls, "hover:bg-accent hover:text-accent-foreground", !canUndo && "opacity-30 cursor-not-allowed")}
              >
                <Undo2 className={icoSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Undo (Ctrl+Z)</p></TooltipContent>
          </Tooltip>

          {/* ── Redo ────────────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => redo()}
                disabled={!canRedo}
                className={cn(btnCls, "hover:bg-accent hover:text-accent-foreground", !canRedo && "opacity-30 cursor-not-allowed")}
              >
                <Redo2 className={icoSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Redo (Ctrl+Y)</p></TooltipContent>
          </Tooltip>

          {/* ── Clear Canvas ─────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowClearConfirm(true)}
                className={cn(btnCls, "text-muted-foreground hover:text-destructive hover:bg-destructive/10")}
              >
                <Trash2 className={icoSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Clear Canvas</p></TooltipContent>
          </Tooltip>

          {sep}

          {/* ── Deploy & Simulate dropdown ──────────────────────────────── */}
          <DropdownMenu open={deployOpen} onOpenChange={setDeployOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={deployActive ? "default" : "ghost"}
                    size="icon"
                    className={cn(btnCls, "relative", deployActive ? "shadow-sm scale-105" : "hover:bg-accent hover:text-accent-foreground")}
                    data-tour="ministack"
                  >
                    <span className="relative">
                      <Rocket className={cn(icoSize, !deployActive && "text-orange-500")} />
                      {isPlaying ? (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-background animate-pulse" />
                      ) : ministackEnabled && !deployActive ? (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-background" />
                      ) : null}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">Deploy & Simulate</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" sideOffset={15} className={cn(ddContent, "w-52")} data-tour="deploy-menu">
              <DropdownMenuLabel className={ddLabel}>Deploy</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={() => setActivePanel(activePanel === "terraform" ? null : "terraform")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2">
                  <SiTerraform size={14} style={{ color: "#7B42BC" }} />
                  <span className="text-sm font-medium">Terraform IaC</span>
                </div>
                {activePanel === "terraform" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivePanel(activePanel === "ministack" ? null : "ministack")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">MiniStack Deploy</span>
                  {ministackEnabled && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                </div>
                {activePanel === "ministack" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuLabel className={ddLabel}>Simulation</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setActivePanel(activePanel === "simulation" ? null : "simulation")}
                className={cn(ddItem, "justify-between")}
                data-tour="simulation"
              >
                <div className="flex items-center gap-2"><Terminal className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Simulation Panel</span></div>
                {activePanel === "simulation" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { if (isPlaying) SimulationEngine.getInstance().stop(); else SimulationEngine.getInstance().start(); }}
                className={cn(ddItem, "justify-between", isPlaying && "text-destructive focus:text-destructive")}
              >
                <div className="flex items-center gap-2">
                  {isPlaying ? <Square className="h-4 w-4 text-destructive" /> : <Play className="h-4 w-4 text-green-500" />}
                  <span className="text-sm font-medium">{isPlaying ? "Stop Simulation" : "Start Simulation"}</span>
                </div>
                {isPlaying && <span className="text-[10px] font-medium text-destructive">Running</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ── Export dropdown ─────────────────────────────────────────── */}
          <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn(btnCls, "hover:bg-accent hover:text-accent-foreground")} data-tour="export">
                    <Download className={icoSize} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}><p className="font-medium">Export</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" sideOffset={15} className={cn(ddContent, "w-48")} data-tour="export-menu">
              <DropdownMenuLabel className={ddLabel}>Export As</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={handleExport} className={ddItem}><span className="text-sm font-medium">PNG Image</span></DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSvg} className={ddItem}><span className="text-sm font-medium">SVG Vector</span></DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf} className={ddItem}><span className="text-sm font-medium">PDF Document</span></DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDdl} className={ddItem}><span className="text-sm font-medium">SQL DDL</span></DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={handleExportTerraform} className={ddItem}>
                <SiTerraform size={13} style={{ color: "#7B42BC" }} />
                <span className="text-sm font-medium">Terraform (.tf)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={handleGenerateSpec} className={ddItem}>
                <FileText className={cn("h-4 w-4 text-muted-foreground", isGenerating && "animate-spin")} />
                <span className="text-sm font-medium">Generate Spec</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBOM(true)} className={ddItem}>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cost Summary</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {sep}

          {/* ── Collaboration ────────────────────────────────────────────── */}
          <div data-tour="collaborate">
            <CollaborateButton />
          </div>
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <div data-tour="google-drive-sync">
              <GoogleDriveSyncButton
                isConnected={driveSync.isConnected}
                isSyncing={driveSync.isSyncing}
                lastSyncedAt={driveSync.lastSyncedAt}
                syncStatus={driveSync.syncStatus}
                lastError={driveSync.lastError}
                onConnect={driveSync.connect}
                onDisconnect={driveSync.disconnect}
                onSyncNow={driveSync.syncNow}
              />
            </div>
          )}

          {sep}

          {/* ── Tour Guide ───────────────────────────────────────────────── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTourOpen(true)}
                className={cn(btnCls, "hover:bg-amber-500/10")}
              >
                <Compass className={cn(icoSize, "text-amber-500")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Tour Guide</p></TooltipContent>
          </Tooltip>

          {/* ── Settings dropdown ────────────────────────────────────────── */}
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
            <DropdownMenuContent side="right" align="end" sideOffset={15} className="w-52 p-2 rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl">
              <DropdownMenuLabel className={ddLabel}>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={() => setTheme("light")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><Sun className="h-4 w-4 text-orange-500" /><span className="text-sm font-medium">Light</span></div>
                {theme === "light" && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><Moon className="h-4 w-4 text-indigo-400" /><span className="text-sm font-medium">Dark</span></div>
                {theme === "dark" && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-sky-500" /><span className="text-sm font-medium">System</span></div>
                {theme === "system" && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem onClick={() => setNodeDisplayMode(nodeDisplayMode === "card" ? "icon" : "card")} className={cn(ddItem, "justify-between")}>
                <div className="flex items-center gap-2">
                  {nodeDisplayMode === "icon" ? <BoxSelect className="h-4 w-4 text-muted-foreground" /> : <Shapes className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium">{nodeDisplayMode === "icon" ? "Card View" : "Icon View"}</span>
                </div>
                {nodeDisplayMode === "card" && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAutoLayout} className={ddItem}>
                <Workflow className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Auto Layout</span>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
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
              This will remove all nodes and edges from the current diagram. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { clear(); setShowClearConfirm(false); toast.success("Canvas cleared"); }}
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
