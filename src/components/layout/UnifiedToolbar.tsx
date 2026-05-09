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

  const mainTools = [
    {
      id: "diagrams",
      icon: LayoutGrid,
      label: "Diagrams",
      onClick: () => {
        setIsSidebarOpen(!isSidebarOpen);
        if (activePanel === "diagrams") setActivePanel(null);
        else setActivePanel("diagrams");
      },
      active: isSidebarOpen,
    },
    {
      id: "library",
      icon: Plus,
      label: "Add Component",
      onClick: () =>
        setActivePanel(activePanel === "library" ? null : "library"),
      active: activePanel === "library",
    },
    {
      id: "ai",
      icon: Sparkles,
      label: "AI Generate",
      onClick: () => setActivePanel(activePanel === "ai" ? null : "ai"),
      active: activePanel === "ai",
    },
    {
      id: "chat",
      icon: MessageSquare,
      label: "Diagram Chat",
      onClick: () => setActivePanel(activePanel === "chat" ? null : "chat"),
      active: activePanel === "chat",
    },
    {
      id: "layers",
      icon: Layers,
      label: "Layers",
      onClick: () => setActivePanel(activePanel === "layers" ? null : "layers"),
      active: activePanel === "layers",
    },
    {
      id: "templates",
      icon: LayoutTemplate,
      label: "Templates",
      onClick: () =>
        setActivePanel(activePanel === "templates" ? null : "templates"),
      active: activePanel === "templates",
    },
    {
      id: "terraform",
      icon: LayoutTemplate, // placeholder — overridden in render by SiTerraform
      label: "Terraform IaC",
      onClick: () =>
        setActivePanel(activePanel === "terraform" ? null : "terraform"),
      active: activePanel === "terraform",
    },
    {
      id: "ministack",
      icon: Rocket,
      label: "MiniStack Deploy",
      onClick: () =>
        setActivePanel(activePanel === "ministack" ? null : "ministack"),
      active: activePanel === "ministack",
    },
  ];

  const actionTools = [
    {
      id: "undo",
      icon: Undo2,
      label: "Undo (Ctrl+Z)",
      onClick: () => undo(),
      active: false,
      disabled: !canUndo,
    },
    {
      id: "redo",
      icon: Redo2,
      label: "Redo (Ctrl+Y)",
      onClick: () => redo(),
      active: false,
      disabled: !canRedo,
    },
    {
      id: "layout",
      icon: Workflow,
      label: "Auto Layout",
      onClick: handleAutoLayout,
      active: false,
    },
    {
      id: "node-display",
      icon: nodeDisplayMode === "icon" ? BoxSelect : Shapes,
      label: nodeDisplayMode === "icon" ? "Card view" : "Icon view",
      onClick: () => setNodeDisplayMode(nodeDisplayMode === "card" ? "icon" : "card"),
      active: nodeDisplayMode === "icon",
    },
    {
      id: "bom",
      icon: DollarSign,
      label: "Cost Summary",
      onClick: () => setShowBOM(true),
      active: showBOM,
    },
    {
      id: "generate",
      icon: isGenerating ? Loader2 : FileText,
      label: "Generate Spec",
      onClick: handleGenerateSpec,
      active: isGenerating,
      className: isGenerating ? "animate-spin" : "",
    },
    {
      id: "select",
      icon: MousePointer2,
      label: "Select / Edit",
      onClick: () => setInteractionMode("default"),
      active: interactionMode === "default",
    },
    {
      id: "pan",
      icon: Hand,
      label: "Pan / Move Canvas",
      onClick: () =>
        setInteractionMode(interactionMode === "pan" ? "default" : "pan"),
      active: interactionMode === "pan",
    },
    {
      id: "laser",
      icon: Pen,
      label: "Laser Pointer",
      onClick: () =>
        setInteractionMode(interactionMode === "laser" ? "default" : "laser"),
      active: interactionMode === "laser",
    },
  ];

  const simulationTools = [
    {
      id: "simulation-panel",
      icon: Terminal,
      label: "Simulation Panel",
      onClick: () =>
        setActivePanel(activePanel === "simulation" ? null : "simulation"),
      active: activePanel === "simulation",
    },
    {
      id: "simulation",
      icon: isPlaying ? Square : Play,
      label: isPlaying ? "Stop Simulation" : "Start Simulation",
      onClick: () => {
        if (isPlaying) SimulationEngine.getInstance().stop();
        else SimulationEngine.getInstance().start();
      },
      active: isPlaying,
      variant: isPlaying ? "destructive" : ("default" as any),
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] flex flex-row items-center bg-background/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl transition-all duration-300 max-w-[calc(100vw-2rem)] md:left-4 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:translate-x-0 md:flex-col md:max-w-none md:max-h-[calc(100vh-2rem)]">
        {/* Seta para cima */}
        {canScrollUp && (
          <button
            onClick={scrollUp}
            className="hidden md:flex w-full justify-center py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-t-xl transition-colors shrink-0"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
        )}

        {/* Conteúdo scrollável */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex flex-row md:flex-col items-center gap-1 md:gap-2 p-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {/* Main Panels */}
          <div className="flex flex-row md:flex-col gap-1">
            {mainTools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={tool.active ? "default" : "ghost"}
                    size="icon"
                    onClick={tool.onClick}
                    className={cn(
                      "h-10 w-10 md:h-8 md:w-8 rounded-lg transition-all duration-200",
                      (tool.id === "terraform" || tool.id === "ministack") && tool.active &&
                        "shadow-lg scale-105",
                      tool.id !== "terraform" && tool.id !== "ministack" && tool.active &&
                        "bg-primary text-primary-foreground shadow-lg scale-105",
                      !tool.active &&
                        "hover:bg-accent hover:text-accent-foreground",
                    )}
                    style={
                      tool.id === "terraform" && tool.active
                        ? { background: "linear-gradient(135deg, #7B42BC, #5C2D8A)", color: "white" }
                        : tool.id === "ministack" && tool.active
                          ? { background: "linear-gradient(135deg, #f97316, #ea580c)", color: "white" }
                          : undefined
                    }
                  >
                    {tool.id === "terraform" ? (
                      <SiTerraform
                        className="h-5 w-5 md:h-4 md:w-4"
                        style={{ color: tool.active ? "white" : "#7B42BC" }}
                      />
                    ) : tool.id === "ministack" ? (
                      <span className="relative">
                        <tool.icon
                          className={cn(
                            "h-5 w-5 md:h-4 md:w-4",
                            tool.active ? "text-white" : "text-orange-500",
                          )}
                        />
                        {ministackEnabled && !tool.active && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background" />
                        )}
                      </span>
                    ) : (
                      <tool.icon
                        className={cn(
                          "h-5 w-5 md:h-4 md:w-4",
                          (tool.id === "ai" || tool.id === "chat") &&
                            !tool.active &&
                            "text-indigo-500",
                        )}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={10}>
                  <p className="font-medium">{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="h-6 w-px md:h-px md:w-4 bg-border mx-1 md:mx-0 md:my-0.5 shrink-0" />

          {/* Quick Actions */}
          <div className="flex flex-row md:flex-col gap-1">
            {actionTools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={tool.active ? "secondary" : "ghost"}
                    size="icon"
                    onClick={tool.onClick}
                    disabled={(tool as any).disabled}
                    className={cn(
                      "h-10 w-10 md:h-8 md:w-8 rounded-lg transition-all duration-200",
                      tool.active &&
                        "bg-secondary text-secondary-foreground shadow-sm",
                      !tool.active &&
                        "hover:bg-accent hover:text-accent-foreground",
                      (tool as any).disabled && "opacity-30 cursor-not-allowed",
                    )}
                  >
                    <tool.icon
                      className={cn(
                        "h-5 w-5 md:h-4 md:w-4",
                        tool.id === "laser" && tool.active && "text-red-500",
                        (tool as any).className,
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={10}>
                  <p className="font-medium">{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Export Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 md:h-8 md:w-8 rounded-lg hover:bg-accent hover:text-accent-foreground"
                    >
                      <Download className="h-5 w-5 md:h-4 md:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={10}>
                  <p className="font-medium">Export</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                side="right"
                align="start"
                sideOffset={15}
                className="w-40 p-1.5 rounded-xl shadow-2xl border-border bg-background/95 backdrop-blur-xl"
              >
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Export As
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={handleExport}
                  className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium"
                >
                  PNG Image
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportSvg}
                  className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium"
                >
                  SVG Vector
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportPdf}
                  className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium"
                >
                  PDF Document
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportDdl}
                  className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium"
                >
                  SQL DDL
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={handleExportTerraform}
                  className="rounded-lg px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent text-sm font-medium gap-2"
                >
                  <SiTerraform size={13} style={{ color: "#7B42BC" }} />
                  Terraform (.tf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-6 w-px md:h-px md:w-4 bg-border mx-1 md:mx-0 md:my-0.5 shrink-0" />

          {/* Simulation */}
          <div className="flex flex-row md:flex-col gap-1">
            {simulationTools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      tool.variant || (tool.active ? "default" : "ghost")
                    }
                    size="icon"
                    onClick={tool.onClick}
                    className={cn(
                      "h-10 w-10 md:h-8 md:w-8 rounded-lg transition-all duration-200",
                      tool.active &&
                        !tool.variant &&
                        "bg-primary text-primary-foreground shadow-lg",
                      !tool.active &&
                        "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <tool.icon className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={10}>
                  <p className="font-medium">{tool.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="h-6 w-px md:h-px md:w-4 bg-border mx-1 md:mx-0 md:my-0.5 shrink-0" />

          {/* Danger Zone / Settings / Collaboration */}
          <div className="flex flex-row md:flex-col gap-1">
            <CollaborateButton />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowClearConfirm(true)}
                  className="h-10 w-10 md:h-8 md:w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={10}>
                <p className="font-medium">Clear Canvas</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 md:h-8 md:w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <Settings2 className="h-5 w-5 md:h-4 md:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={10}>
                  <p className="font-medium">Settings</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={15}
                className="w-48 p-2 rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl"
              >
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  Theme
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Light</span>
                  </div>
                  {theme === "light" && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-medium">Dark</span>
                  </div>
                  {theme === "dark" && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-sky-500" />
                    <span className="text-sm font-medium">System</span>
                  </div>
                  {theme === "system" && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Seta para baixo */}
        {canScrollDown && (
          <button
            onClick={scrollDown}
            className="hidden md:flex w-full justify-center py-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-b-xl transition-colors shrink-0"
          >
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
