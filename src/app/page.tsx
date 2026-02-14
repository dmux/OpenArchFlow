'use client';

import FlowCanvas from '@/components/diagram/FlowCanvas';
import FloatingInput from '@/components/diagram/FloatingInput';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { useDiagramStore } from '@/lib/store';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { WebLLMService } from '@/lib/ai/webllm';
import { InitProgressReport } from '@mlc-ai/web-llm';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import PropertiesPanel from '@/components/diagram/PropertiesPanel';
import ComponentPalette from '@/components/diagram/ComponentPalette';
import { Progress } from '@/components/ui/progress';
import { Sidebar } from '@/components/layout/Sidebar';
import { PrivacyInfo } from '@/components/layout/PrivacyInfo';
import { Button } from '@/components/ui/button';
import { Cloud, Laptop, Download, Layout, Trash2, Play, Square, FileText, LayoutGrid } from 'lucide-react';
import SpecificationDialog from '@/components/diagram/SpecificationDialog';
import SimulationLogs from '@/components/diagram/SimulationLogs';
import { SimulationEngine } from '@/lib/simulation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { ReactFlowProvider, useReactFlow } from 'reactflow';
import html2canvas from 'html2canvas';
import { getLayoutedElements } from '@/lib/layout-utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function ActionsMenu({ isGenerating, setIsGenerating }: { isGenerating: boolean; setIsGenerating: (value: boolean) => void }) {
    const { getNodes, getViewport } = useReactFlow();

    const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
    const diagrams = useDiagramStore((state) => state.diagrams);
    const setGeneratedSpecification = useDiagramStore((state) => state.setGeneratedSpecification);
    const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
    const setNodes = useDiagramStore((state) => state.setNodes);

    // Derive computed values from the store
    const activeDiagram = activeDiagramId ? diagrams[activeDiagramId] : null;
    const nodes = activeDiagram?.nodes || [];
    const edges = activeDiagram?.edges || [];
    const activeDiagramName = activeDiagram?.name || 'Architecture';

    const useLocalAI = React.useContext(AIContext);

    const handleGenerateSpec = useCallback(async (useLocal: boolean) => {
        if (nodes.length === 0) {
            toast.error('No diagram to generate specification for');
            return;
        }

        setIsGenerating(true);
        try {
            let specification: string;

            if (useLocal) {
                toast.info('Generating specification with Local AI...');
                const service = WebLLMService.getInstance();
                if (!service.isReady()) {
                    throw new Error('Local model not ready yet.');
                }
                specification = await service.generateSpecification(nodes, edges, activeDiagramName);
            } else {
                if (!geminiApiKey) {
                    throw new Error('Gemini API Key is required.');
                }

                toast.info('Generating specification with Cloud AI...');
                const response = await fetch('/api/generate-spec', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nodes, edges, apiKey: geminiApiKey, diagramName: activeDiagramName }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to generate specification');
                }

                const data = await response.json();
                specification = data.specification;
            }

            setGeneratedSpecification(specification);
            toast.success('Specification generated successfully!');
        } catch (error) {
            console.error('Specification generation error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate specification');
        } finally {
            setIsGenerating(false);
        }
    }, [nodes, edges, activeDiagramName, geminiApiKey, setGeneratedSpecification, setIsGenerating]);

    const handleAutoLayout = useCallback(() => {
        if (nodes.length === 0) {
            toast.error('No nodes to organize');
            return;
        }

        const layouted = getLayoutedElements(nodes, edges, 'TB');
        setNodes(layouted.nodes);
        toast.success('Layout organized automatically!');
    }, [nodes, edges, setNodes]);

    const handleExport = useCallback(async () => {
        const nodes = getNodes();

        if (nodes.length === 0) {
            toast.error('No diagram to export');
            return;
        }

        // Get the viewport element that contains the actual diagram content
        const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;

        if (!viewportElement) {
            toast.error('Could not find diagram viewport');
            return;
        }

        try {
            // Import getNodesBounds and getViewportForBounds from reactflow
            const { getNodesBounds, getViewportForBounds } = await import('reactflow');

            // Calculate the bounds of all nodes
            const nodesBounds = getNodesBounds(nodes);

            // Add padding
            const padding = 50;
            const imageWidth = nodesBounds.width + padding * 2;
            const imageHeight = nodesBounds.height + padding * 2;

            // Get the viewport that would fit all nodes
            const viewport = getViewportForBounds(
                nodesBounds,
                imageWidth,
                imageHeight,
                0.5, // min zoom
                2,   // max zoom
                padding
            );

            // Capture using html2canvas with proper configuration
            const canvas = await html2canvas(viewportElement, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                logging: false,
                width: imageWidth,
                height: imageHeight,
                onclone: (clonedDoc) => {
                    const clonedViewport = clonedDoc.querySelector('.react-flow__viewport') as HTMLElement;
                    if (clonedViewport) {
                        // Calculate the center offset
                        // We need to move the diagram so it's centered in the exported image
                        const offsetX = padding - nodesBounds.x * viewport.zoom;
                        const offsetY = padding - nodesBounds.y * viewport.zoom;

                        // Apply the transform to center and scale the diagram
                        clonedViewport.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${viewport.zoom})`;
                    }
                },
                ignoreElements: (element) => {
                    return element.classList?.contains('react-flow__minimap') ||
                        element.classList?.contains('react-flow__controls') ||
                        element.classList?.contains('react-flow__attribution') ||
                        element.classList?.contains('react-flow__panel');
                }
            });

            // Convert canvas to blob and download
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = 'architecture-diagram.png';
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success('Diagram exported successfully!');
                } else {
                    toast.error('Failed to create image');
                }
            });
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Failed to export diagram.');
        }
    }, [getNodes, getViewport]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-background/80 backdrop-blur">
                    Actions
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={handleAutoLayout}>
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Auto Layout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateSpec(useLocalAI.value)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Specification
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Context for sharing useLocalAI state
const AIContext = React.createContext<{ value: boolean }>({ value: false });

function HomeContent() {
    const clearDiagram = useDiagramStore((state) => state.clear);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [useLocalAI, setUseLocalAI] = useState(false);
    const generatedSpecification = useDiagramStore((state) => state.generatedSpecification);
    const setGeneratedSpecification = useDiagramStore((state) => state.setGeneratedSpecification);
    // ... (lines 36-288) ...
    const [modelProgressText, setModelProgressText] = useState<string>('');
    const [modelProgressValue, setModelProgressValue] = useState<number>(0);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const layout = useDiagramStore((state) => state.layout);
    const setNodes = useDiagramStore((state) => state.setNodes);
    const setEdges = useDiagramStore((state) => state.setEdges);
    const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
    const setGeminiApiKey = useDiagramStore((state) => state.setGeminiApiKey);
    const isPlaying = useDiagramStore((state) => state.isPlaying);
    const setIsPlaying = useDiagramStore((state) => state.setIsPlaying);

    const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
    const diagrams = useDiagramStore((state) => state.diagrams);

    const activeDiagram = activeDiagramId ? diagrams[activeDiagramId] : null;
    const nodes = activeDiagram?.nodes || [];

    // Initialize WebLLM when toggled on
    useEffect(() => {
        if (useLocalAI) {
            const initWebLLM = async () => {
                const service = WebLLMService.getInstance();
                if (service.isReady()) return;

                setIsModelLoading(true);
                try {
                    await service.initialize((report: InitProgressReport) => {
                        setModelProgressText(report.text);
                        setModelProgressValue(report.progress);
                    });
                    toast.success('Local AI model loaded successfully!');
                } catch (error) {
                    console.error('WebLLM Init Error:', error);
                    toast.error('Failed to load local model. Falling back to cloud.');
                    setUseLocalAI(false);
                } finally {
                    setIsModelLoading(false);
                    setModelProgressText('');
                    setModelProgressValue(0);
                }
            };
            initWebLLM();
        }
    }, [useLocalAI]);

    const handlePromptSubmit = async (prompt: string) => {
        setIsLoading(true);

        try {
            let data;

            if (useLocalAI) {
                toast.info('Generating with Local AI (Phi-3)...');
                const service = WebLLMService.getInstance();
                if (!service.isReady()) {
                    throw new Error('Local model not ready yet.');
                }
                const jsonString = await service.generate(prompt);
                try {
                    data = JSON.parse(jsonString);
                } catch (e) {
                    throw new Error('Failed to parse Local AI response');
                }
            } else {
                toast.info('Generating with Cloud AI...');

                if (!geminiApiKey) {
                    throw new Error("Gemini API Key is required. Please check your settings.");
                }

                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, apiKey: geminiApiKey }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Support project or use Local AI.');
                    }
                    throw new Error(errorData.error || 'Failed to generate architecture');
                }
                data = await response.json();
            }

            if (data.nodes && data.edges) {
                // React Flow requires position for every node
                const saneNodes = data.nodes.map((node: any) => ({
                    ...node,
                    position: node.position || { x: 0, y: 0 },
                }));

                setNodes(saneNodes);
                setEdges(data.edges);

                // Run layout immediately (ELK is headless, doesn't need DOM)
                await layout();
                toast.success('Architecture generated successfully!');
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AIContext.Provider value={{ value: useLocalAI }}>
            <main className="flex w-full h-screen overflow-hidden bg-background">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                <div className="flex-1 relative h-full overflow-hidden">
                    {/* Header / Controls */}
                    <div className="absolute top-4 left-4 z-50 flex items-center space-x-4">
                        <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-background/80 backdrop-blur">
                            <Layout className="w-5 h-5" />
                        </Button>

                        <ActionsMenu isGenerating={isGenerating} setIsGenerating={setIsGenerating} />

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                if (isPlaying) {
                                    SimulationEngine.getInstance().stop();
                                } else {
                                    SimulationEngine.getInstance().start();
                                }
                            }}
                            className={cn(
                                "bg-background/80 backdrop-blur transition-all",
                                isPlaying && "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                            )}
                            title={isPlaying ? "Stop Simulation" : "Start Simulation"}
                        >
                            {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        </Button>

                        <h1 className="text-xl font-bold tracking-tighter text-foreground/80 pointer-events-none hidden md:block">
                            OpenArchFlow
                        </h1>

                        <div className="flex items-center space-x-3 bg-background/80 backdrop-blur border rounded-full px-4 py-2 shadow-sm transition-all hover:bg-background/100">
                            <div className={`flex items-center space-x-1.5 text-xs font-medium transition-colors ${!useLocalAI ? 'text-sky-600 font-bold' : 'text-muted-foreground'}`}>
                                <Cloud className="w-3.5 h-3.5" />
                                <span>Cloud (Gemini)</span>
                            </div>

                            <Switch
                                id="ai-mode"
                                checked={useLocalAI}
                                onCheckedChange={setUseLocalAI}
                                disabled={isLoading || isModelLoading}
                                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-sky-500"
                            />

                            <div className={`flex items-center space-x-1.5 text-xs font-medium transition-colors ${useLocalAI ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}`}>
                                <Laptop className="w-3.5 h-3.5" />
                                <span>Local (Phi-3)</span>
                            </div>
                        </div>

                        {!useLocalAI && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setGeminiApiKey(null)}
                                className="text-xs text-muted-foreground hover:text-foreground h-8 px-3 bg-background/80 backdrop-blur border rounded-full"
                            >
                                Change Key
                            </Button>
                        )}

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="flex items-center space-x-1.5 px-4 py-2 bg-background/80 backdrop-blur border rounded-full shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive group">
                                    <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                                    <span className="text-xs font-medium text-muted-foreground group-hover:text-destructive transition-colors">Clear Canvas</span>
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Clear Canvas?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will remove all nodes and edges from the current diagram. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={clearDiagram} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Clear
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>


                        <PrivacyInfo />
                    </div>

                    {/* ... rest of the component (Modal, Canvas, Input) ... */}
                    {
                        isModelLoading && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                                {/* ... modal content ... */}
                                <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <Download className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Setting up Local AI</h3>
                                            <p className="text-sm text-muted-foreground">Downloading Phi-3 model to your browser...</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Progress value={modelProgressValue * 100} className="h-2" />
                                        <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                            <span className="truncate max-w-[280px]">{modelProgressText}</span>
                                            <span>{Math.round(modelProgressValue * 100)}%</span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                                        <strong>Note:</strong> This happens only once. The model (~2GB) will be cached for offline use.
                                    </div>
                                    <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                                        <strong>Note:</strong> This happens only once. The model (~2GB) will be cached for offline use.
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* API Key Input Overlay for Cloud Mode */}
                    {
                        !useLocalAI && (!geminiApiKey || !geminiApiKey.trim()) && !isLoading && (
                            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                                <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <Cloud className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Enter Gemini API Key</h3>
                                            <p className="text-sm text-muted-foreground">A valid API Key is required for Cloud generation.</p>
                                        </div>
                                    </div>

                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const key = formData.get('apiKey') as string;
                                        if (key?.trim()) {
                                            setGeminiApiKey(key.trim());
                                            toast.success('API Key saved!');
                                        }
                                    }} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="apiKey">Google Gemini API Key</Label>
                                            <Input
                                                id="apiKey"
                                                name="apiKey"
                                                type="password"
                                                placeholder="AIzaSy..."
                                                required
                                                className="font-mono"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Your key is stored locally in your browser. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get a key here</a>.
                                            </p>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="ghost" onClick={() => setUseLocalAI(true)}>
                                                Use Local AI Instead
                                            </Button>
                                            <Button type="submit">
                                                Save Key
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )
                    }

                    <LoadingOverlay
                        isLoading={isLoading}
                        message={useLocalAI ? "Running Phi-3 Local Model..." : "Consulting Cloud Gemini..."}
                    />

                    <FlowCanvas />
                    <PropertiesPanel />
                    <SimulationLogs />

                    {/* Component Palette */}
                    <div className="absolute top-4 right-4 z-50">
                        <ComponentPalette />
                    </div>

                    <FloatingInput
                        onSubmit={handlePromptSubmit}
                        isLoading={isLoading || isModelLoading}
                        disabled={!useLocalAI && !geminiApiKey}
                        placeholder={!useLocalAI && !geminiApiKey ? "Enter API Key to start..." : undefined}
                        defaultCollapsed={nodes.length > 0}
                    />

                    {/* Specification Dialog */}
                    {generatedSpecification && (
                        <SpecificationDialog
                            isOpen={!!generatedSpecification}
                            onClose={() => setGeneratedSpecification(null)}
                            specification={generatedSpecification}
                        />
                    )}

                    {/* Loading Overlay for Specification Generation */}
                    <LoadingOverlay isLoading={isGenerating} message="Generating technical specification..." />
                </div >
            </main >
        </AIContext.Provider>
    );
}

export default function Home() {
    return (
        <ReactFlowProvider>
            <HomeContent />
        </ReactFlowProvider>
    );
}
