"use client";

import React, { useState, useCallback, useEffect } from "react";
import { WifiOff, Cloud, Laptop, Github, Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiagramStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getLayoutedElements } from "@/lib/layout-utils";

// Components
import FlowCanvas from "@/components/diagram/FlowCanvas";
import { ReactFlowProvider } from "reactflow";
import ComponentPalette from "@/components/diagram/ComponentPalette";
import PropertiesPanel from "@/components/diagram/PropertiesPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import FloatingInput from "@/components/diagram/FloatingInput";
import SimulationControls from "@/components/simulation/SimulationControls";
import { PrivacyInfo } from "@/components/layout/PrivacyInfo";
import SpecificationDialog from "@/components/diagram/SpecificationDialog";
import { UnifiedToolbar } from "@/components/layout/UnifiedToolbar";
import { AIProviderDialog } from "@/components/layout/AIProviderDialog";
import DiagramChat from "@/components/diagram/DiagramChat";
import LayersPanel from "@/components/diagram/LayersPanel";
import KeyboardShortcutsDialog from "@/components/layout/KeyboardShortcutsDialog";
import TemplatesDialog from "@/components/diagram/TemplatesDialog";
import TerraformPanel from "@/components/diagram/TerraformPanel";
import MiniStackPanel from "@/components/ministack/MiniStackPanel";
import GlueStudioPanel from "@/components/ministack/GlueStudioPanel";
import { OnboardingTour } from "@/components/layout/OnboardingTour";

// Service
import { WebLLMService } from "@/lib/ai/webllm";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useGoogleDriveSync } from "@/hooks/useGoogleDriveSync";
import { useBedrockExpiry } from "@/hooks/useBedrockExpiry";

// UI Components

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-background">
      <HomeContent />
    </main>
  );
}

function HomeContent() {
  useKeyboardShortcuts();
  useBedrockExpiry();

  const setNodes = useDiagramStore((state) => state.setNodes);
  const setEdges = useDiagramStore((state) => state.setEdges);

  // Get current nodes and edges for incremental AI edits
  const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
  const diagrams = useDiagramStore((state) => state.diagrams);
  const activeDiagram = activeDiagramId ? diagrams[activeDiagramId] : null;
  const currentNodes = activeDiagram?.nodes || [];
  const currentEdges = activeDiagram?.edges || [];

  const setGeminiApiKey = useDiagramStore((state) => state.setGeminiApiKey);
  const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
  const geminiModel = useDiagramStore((state) => state.geminiModel);
  const bedrockConfig = useDiagramStore((state) => state.bedrockConfig);
  const bedrockModel = useDiagramStore((state) => state.bedrockModel);
  const generatedSpecification = useDiagramStore(
    (state) => state.generatedSpecification,
  );
  const setGeneratedSpecification = useDiagramStore(
    (state) => state.setGeneratedSpecification,
  );

  // AI States
  const aiProvider = useDiagramStore((s) => s.aiProvider);
  const setAiProvider = useDiagramStore((s) => s.setAiProvider);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Google Drive auto-sync
  const driveSync = useGoogleDriveSync();

  // UI Panel State
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    const handler = () => setShortcutsOpen(true);
    window.addEventListener("openShortcutsDialog", handler);
    return () => window.removeEventListener("openShortcutsDialog", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const panel = (e as CustomEvent<string>).detail;
      if (panel) setActivePanel(panel);
    };
    window.addEventListener("openarchflow:open-panel", handler);
    return () => window.removeEventListener("openarchflow:open-panel", handler);
  }, []);

  // Initialize Local AI model if needed
  useEffect(() => {
    if (aiProvider === "local") {
      const initModel = async () => {
        setIsModelLoading(true);
        try {
          const service = WebLLMService.getInstance();
          if (!service.isReady()) {
            toast.info(
              "Loading AI model locally in your browser. This may take a minute...",
              {
                duration: 5000,
              },
            );
            await service.initialize((status: any) => {
              console.log("Model init progress:", status.text);
            });
            toast.success("Local AI model ready!");
          }
        } catch (error) {
          console.error("Failed to initialize local model:", error);
          toast.error("Failed to load local AI model. Switching to Offline.");
          setAiProvider("offline");
        } finally {
          setIsModelLoading(false);
        }
      };
      initModel();
    }
  }, [aiProvider, setAiProvider]);

  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      setIsLoading(true);
      try {
        let result;
        if (aiProvider === "local") {
          const service = WebLLMService.getInstance();
          if (!service.isReady()) throw new Error("Local model not ready yet.");

          const rawJson = await service.generate(
            prompt,
            currentNodes,
            currentEdges,
          );
          try {
            result = JSON.parse(rawJson);
          } catch (e) {
            throw new Error(
              "Local AI generated invalid JSON. Please try again.",
            );
          }
        } else if (aiProvider === "bedrock") {
          if (!bedrockConfig) {
            setIsAIDialogOpen(true);
            throw new Error("Please configure AWS Bedrock first.");
          }
          if (Date.now() > bedrockConfig.credentials.expiration) {
            setIsAIDialogOpen(true);
            throw new Error("Bedrock credentials expired. Please re-authenticate.");
          }
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              provider: "bedrock",
              bedrockCreds: {
                region: bedrockConfig.region,
                accessKeyId: bedrockConfig.credentials.accessKeyId,
                secretAccessKey: bedrockConfig.credentials.secretAccessKey,
                sessionToken: bedrockConfig.credentials.sessionToken,
              },
              bedrockModel,
              currentNodes: currentNodes,
              currentEdges: currentEdges,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === "credentials_expired") setIsAIDialogOpen(true);
            if (errorData.code === "model_not_available") {
              setIsAIDialogOpen(true);
              throw new Error("This model is not enabled for your AWS account. Select a different model.");
            }
            throw new Error(errorData.error || "Failed to generate architecture");
          }

          result = await response.json();
        } else {
          if (!geminiApiKey || geminiApiKey === "offline") {
            setIsAIDialogOpen(true);
            throw new Error("Please configure an AI provider first.");
          }
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              apiKey: geminiApiKey,
              model: geminiModel,
              currentNodes: currentNodes,
              currentEdges: currentEdges,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || "Failed to generate architecture",
            );
          }

          result = await response.json();
        }

        if (result && result.nodes && result.edges) {
          const layouted = getLayoutedElements(result.nodes, result.edges);
          setNodes(layouted.nodes);
          setEdges(layouted.edges);
          toast.success("Architecture generated successfully!");
          setActivePanel(null); // Close AI panel on success
        }
      } catch (error) {
        console.error("Generation error:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate architecture";
        const isApiKeyError =
          /api key/i.test(message) || message.includes("API_KEY_INVALID");
        if (isApiKeyError) {
          setIsAIDialogOpen(true);
        } else {
          toast.error(message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      geminiApiKey,
      setGeminiApiKey,
      setNodes,
      setEdges,
      aiProvider,
      currentNodes,
      currentEdges,
      setIsAIDialogOpen,
      bedrockConfig,
      bedrockModel,
      geminiModel,
    ],
  );

  return (
    <>
    <ReactFlowProvider>
      <div className="flex h-full w-full relative">
        {/* Unified Toolbar */}
        <UnifiedToolbar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          useLocalAI={aiProvider === "local"}
          driveSync={driveSync}
        />

        {/* Main Content Area */}
        <div className="flex-1 relative h-full overflow-hidden flex flex-col">
          {/* Minimal Top Header */}
          <div className="absolute top-4 left-4 md:left-20 right-4 z-50 flex items-center justify-between pointer-events-none">
            <div className="flex items-center space-x-4 pointer-events-auto">
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tighter text-foreground/80 hidden md:flex select-none">
                <Layers className="h-5 w-5 text-orange-500" />
                OpenArchFlow
              </h1>
            </div>

            <div className="flex items-center space-x-3 pointer-events-auto">
              {/* AI Provider selector */}
              <div className="relative">
                {/* Importance ring */}
                <span
                  className={cn(
                    "absolute inset-0 rounded-2xl pointer-events-none",
                    aiProvider === "offline" && "animate-ping bg-foreground/10",
                    aiProvider === "gemini" &&
                      "animate-pulse bg-sky-500/20 shadow-[0_0_12px_4px_rgb(14_165_233_/_0.35)]",
                    aiProvider === "local" &&
                      "animate-pulse bg-emerald-500/20 shadow-[0_0_12px_4px_rgb(16_185_129_/_0.35)]",
                    aiProvider === "bedrock" &&
                      "animate-pulse bg-orange-500/20 shadow-[0_0_12px_4px_rgb(249_115_22_/_0.35)]",
                  )}
                />
                <button
                  onClick={() => setIsAIDialogOpen(true)}
                  disabled={isLoading || isModelLoading}
                  title={
                    aiProvider === "offline"
                      ? "Nenhuma IA configurada — clique para configurar"
                      : aiProvider === "gemini"
                        ? "Gemini Cloud AI ativo — clique para alterar"
                        : aiProvider === "bedrock"
                          ? "AWS Bedrock ativo — clique para alterar"
                          : "Local AI (WebLLM) ativo — clique para alterar"
                  }
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-2xl bg-background/80 backdrop-blur-xl border shadow-xl hover:bg-background/100 transition-all hover:scale-110 disabled:opacity-50 disabled:pointer-events-none",
                    aiProvider === "offline" && "border-border",
                    aiProvider === "gemini" && "border-sky-500/60",
                    aiProvider === "local" && "border-emerald-500/60",
                    aiProvider === "bedrock" && "border-orange-500/60",
                  )}
                >
                  {aiProvider === "offline" && (
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  {aiProvider === "gemini" && (
                    <Cloud className="w-4 h-4 text-sky-500" />
                  )}
                  {aiProvider === "local" && (
                    <Laptop className="w-4 h-4 text-emerald-500" />
                  )}
                  {aiProvider === "bedrock" && (
                    <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                </button>
              </div>

              <PrivacyInfo />

              <a
                href="https://github.com/dmux/OpenArchFlow"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-2xl bg-background/80 backdrop-blur-xl border border-border shadow-xl hover:bg-background/100 transition-all hover:scale-110 group"
                title="View on GitHub"
              >
                <Github className="w-5 h-5 text-foreground fill-current group-hover:text-primary transition-colors" />
              </a>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 w-full h-full relative">
            <FlowCanvas />
            {isLoading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-300">
                <div className="flex flex-col items-center space-y-4 p-8 rounded-2xl bg-card border shadow-2xl">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-medium text-muted-foreground animate-pulse">
                    Generating Architecture...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Overlays */}
          <FloatingInput
            isOpen={activePanel === "ai"}
            onSubmit={handlePromptSubmit}
            isLoading={isLoading}
            disabled={isModelLoading}
            placeholder={
              aiProvider === "local"
                ? "Describe using Local AI..."
                : "Describe architecture (Gemini)..."
            }
          />

          <SimulationControls isOpen={activePanel === "simulation"} />
        </div>

        {/* Right Side Panels */}
        <ComponentPalette
          isOpen={activePanel === "library"}
          onOpenChange={(open: boolean) =>
            setActivePanel(open ? "library" : null)
          }
        />

        <DiagramChat
          isOpen={activePanel === "chat"}
          onClose={() => setActivePanel(null)}
          currentNodes={currentNodes}
          currentEdges={currentEdges}
          geminiApiKey={geminiApiKey}
        />

        <LayersPanel
          isOpen={activePanel === "layers"}
          onClose={() => setActivePanel(null)}
        />

        <TerraformPanel
          isOpen={activePanel === "terraform"}
          onClose={() => setActivePanel(null)}
          nodes={currentNodes}
          edges={currentEdges}
          diagramName={activeDiagram?.name || "diagram"}
          geminiApiKey={geminiApiKey}
        />

        <MiniStackPanel
          isOpen={activePanel === "ministack"}
          onClose={() => setActivePanel(null)}
          nodes={currentNodes}
        />

        <GlueStudioPanel
          isOpen={activePanel === "glue"}
          onClose={() => setActivePanel(null)}
          nodes={currentNodes}
        />

        <PropertiesPanel />

        {/* Sidebar (Left Drawer) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 md:bg-transparent z-[69]"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Dialogs */}
        <SpecificationDialog
          isOpen={!!generatedSpecification}
          specification={generatedSpecification || ""}
          onClose={() => setGeneratedSpecification(null)}
        />

        <AIProviderDialog
          open={isAIDialogOpen}
          onClose={() => setIsAIDialogOpen(false)}
        />
        <KeyboardShortcutsDialog
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
        <TemplatesDialog
          isOpen={templatesOpen || activePanel === "templates"}
          onClose={() => {
            setTemplatesOpen(false);
            if (activePanel === "templates") setActivePanel(null);
          }}
        />
      </div>
    </ReactFlowProvider>
    <OnboardingTour />
    </>
  );
}
