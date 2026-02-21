'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    Cloud,
    Laptop,
    Github,
    KeyRound,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiagramStore } from '@/lib/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getLayoutedElements } from '@/lib/layout-utils';

// Components
import FlowCanvas from '@/components/diagram/FlowCanvas';
import { ReactFlowProvider } from 'reactflow';
import ComponentPalette from '@/components/diagram/ComponentPalette';
import PropertiesPanel from '@/components/diagram/PropertiesPanel';
import { Sidebar } from '@/components/layout/Sidebar';
import FloatingInput from '@/components/diagram/FloatingInput';
import SimulationControls from '@/components/simulation/SimulationControls';
import { PrivacyInfo } from '@/components/layout/PrivacyInfo';
import SpecificationDialog from '@/components/diagram/SpecificationDialog';
import { UnifiedToolbar } from '@/components/layout/UnifiedToolbar';
import { GeminiKeyDialog } from '@/components/layout/GeminiKeyDialog';
import DiagramChat from '@/components/diagram/DiagramChat';

// Service
import { WebLLMService } from '@/lib/ai/webllm';

// UI Components
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Home() {
    return (
        <main className="flex h-screen w-full overflow-hidden bg-background">
            <HomeContent />
        </main>
    );
}

function HomeContent() {
    const setNodes = useDiagramStore((state) => state.setNodes);
    const setEdges = useDiagramStore((state) => state.setEdges);

    // Get current nodes and edges for incremental AI edits
    const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
    const diagrams = useDiagramStore((state) => state.diagrams);
    const activeDiagram = activeDiagramId ? diagrams[activeDiagramId] : null;
    const currentNodes = activeDiagram?.nodes || [];
    const currentEdges = activeDiagram?.edges || [];

    const isOfflineMode = useDiagramStore((state) => state.isOfflineMode);
    const setGeminiApiKey = useDiagramStore((state) => state.setGeminiApiKey);
    const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
    const generatedSpecification = useDiagramStore((state) => state.generatedSpecification);
    const setGeneratedSpecification = useDiagramStore((state) => state.setGeneratedSpecification);

    // AI States
    const [useLocalAI, setUseLocalAI] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // UI Panel State
    const [activePanel, setActivePanel] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Initialize Local AI model if needed
    useEffect(() => {
        if (useLocalAI) {
            const initModel = async () => {
                setIsModelLoading(true);
                try {
                    const service = WebLLMService.getInstance();
                    if (!service.isReady()) {
                        toast.info('Loading AI model locally in your browser. This may take a minute...', {
                            duration: 5000,
                        });
                        await service.initialize((status: any) => {
                            console.log('Model init progress:', status.text);
                        });
                        toast.success('Local AI model ready!');
                    }
                } catch (error) {
                    console.error('Failed to initialize local model:', error);
                    toast.error('Failed to load local AI model. Falling back to Cloud.');
                    setUseLocalAI(false);
                } finally {
                    setIsModelLoading(false);
                }
            };
            initModel();
        }
    }, [useLocalAI]);

    const handlePromptSubmit = useCallback(async (prompt: string) => {
        setIsLoading(true);
        try {
            let result;
            if (useLocalAI) {
                const service = WebLLMService.getInstance();
                if (!service.isReady()) throw new Error('Local model not ready yet.');

                const rawJson = await service.generate(prompt, currentNodes, currentEdges);
                try {
                    result = JSON.parse(rawJson);
                } catch (e) {
                    throw new Error('Local AI generated invalid JSON. Please try again.');
                }
            } else {
                if (!geminiApiKey || geminiApiKey === 'offline') {
                    setGeminiApiKey(null); // Trigger setup dialog
                    throw new Error(geminiApiKey === 'offline' ? 'AI Features are disabled in Offline Mode. Please set an API Key.' : 'Please set your Gemini API Key first.');
                }
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        apiKey: geminiApiKey,
                        currentNodes: currentNodes,
                        currentEdges: currentEdges
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to generate architecture');
                }

                result = await response.json();
            }

            if (result && result.nodes && result.edges) {
                const layouted = getLayoutedElements(result.nodes, result.edges);
                setNodes(layouted.nodes);
                setEdges(layouted.edges);
                toast.success('Architecture generated successfully!');
                setActivePanel(null); // Close AI panel on success
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate architecture');
        } finally {
            setIsLoading(false);
        }
    }, [geminiApiKey, setGeminiApiKey, setNodes, setEdges, useLocalAI, currentNodes, currentEdges]);

    return (
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
                    useLocalAI={useLocalAI}
                />

                {/* Main Content Area */}
                <div className="flex-1 relative h-full overflow-hidden flex flex-col">

                    {/* Minimal Top Header */}
                    <div className="absolute top-4 left-20 right-4 z-50 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center space-x-4 pointer-events-auto">
                            <h1 className="text-xl font-bold tracking-tighter text-foreground/80 hidden md:block select-none">
                                Open Arch Flow
                            </h1>
                        </div>

                        <div className="flex items-center space-x-3 pointer-events-auto">
                            {/* AI Mode Toggle */}
                            <TooltipProvider delayDuration={400}>
                                <div className="flex items-center space-x-3 bg-background/80 backdrop-blur-xl border border-border shadow-xl rounded-2xl px-4 py-2 hover:bg-background/100 transition-all">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "flex items-center space-x-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer group",
                                                    !useLocalAI ? 'text-sky-500' : 'text-muted-foreground hover:text-sky-400'
                                                )}
                                                onClick={() => {
                                                    if (!useLocalAI) setGeminiApiKey(null);
                                                    else setUseLocalAI(false);
                                                }}
                                            >
                                                <Cloud className="w-3.5 h-3.5" />
                                                <span className="inline">Cloud (Gemini)</span>
                                                {!useLocalAI && (
                                                    <KeyRound
                                                        className="w-3 h-3 ml-0.5 text-foreground opacity-50 group-hover:opacity-100 transition-opacity"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">
                                            {!useLocalAI ? "Change Gemini API Key" : "Switch to Gemini (Cloud)"}
                                        </TooltipContent>
                                    </Tooltip>

                                    <Switch
                                        id="ai-mode"
                                        checked={useLocalAI}
                                        onCheckedChange={setUseLocalAI}
                                        disabled={isLoading || isModelLoading}
                                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-sky-500 scale-90"
                                    />

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "flex items-center space-x-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                                                    useLocalAI ? 'text-emerald-500' : 'text-muted-foreground hover:text-emerald-400'
                                                )}
                                                onClick={() => setUseLocalAI(true)}
                                            >
                                                <Laptop className="w-3.5 h-3.5" />
                                                <span className="inline">Local (Phi-3)</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">
                                            Switch to Local AI (Phi-3)
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </TooltipProvider>

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
                        isOpen={activePanel === 'ai'}
                        onSubmit={handlePromptSubmit}
                        isLoading={isLoading}
                        disabled={isModelLoading}
                        placeholder={useLocalAI ? "Describe using Local AI..." : "Describe architecture (Gemini)..."}
                    />

                    <SimulationControls isOpen={activePanel === 'simulation'} />
                </div>

                {/* Right Side Panels */}
                <ComponentPalette
                    isOpen={activePanel === 'library'}
                    onOpenChange={(open: boolean) => setActivePanel(open ? 'library' : null)}
                />

                <DiagramChat
                    isOpen={activePanel === 'chat'}
                    onClose={() => setActivePanel(null)}
                    currentNodes={currentNodes}
                    currentEdges={currentEdges}
                    geminiApiKey={geminiApiKey}
                />

                <PropertiesPanel />

                {/* Sidebar (Left Drawer) */}
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                {/* Dialogs */}
                <SpecificationDialog
                    isOpen={!!generatedSpecification}
                    specification={generatedSpecification || ''}
                    onClose={() => setGeneratedSpecification(null)}
                />

                <GeminiKeyDialog />
            </div>
        </ReactFlowProvider>
    );
}
