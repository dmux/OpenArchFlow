'use client';

import React, { useCallback, useState } from 'react';
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
    Pointer,
    MousePointer2,
    Loader2,
    Sun,
    Moon,
    Monitor,
    Check,
    MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { useDiagramStore } from '@/lib/store';
import { SimulationEngine } from '@/lib/simulation';
import { useReactFlow } from 'reactflow';
import { getLayoutedElements } from '@/lib/layout-utils';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { WebLLMService } from '@/lib/ai/webllm';

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
    useLocalAI
}: UnifiedToolbarProps) {
    const { getNodes, fitView } = useReactFlow();
    const isPlaying = useDiagramStore((state) => state.isPlaying);
    const interactionMode = useDiagramStore((state) => state.interactionMode);
    const setInteractionMode = useDiagramStore((state) => state.setInteractionMode);
    const clear = useDiagramStore((state) => state.clear);
    const setNodes = useDiagramStore((state) => state.setNodes);
    const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
    const diagrams = useDiagramStore((state) => state.diagrams);
    const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
    const setGeneratedSpecification = useDiagramStore((state) => state.setGeneratedSpecification);
    const { setTheme, theme } = useTheme();

    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const activeDiagram = activeDiagramId ? diagrams[activeDiagramId] : null;
    const nodes = activeDiagram?.nodes || [];
    const edges = activeDiagram?.edges || [];
    const activeDiagramName = activeDiagram?.name || 'Architecture';

    const handleAutoLayout = useCallback(() => {
        if (nodes.length === 0) {
            toast.error('No nodes to organize');
            return;
        }
        const layouted = getLayoutedElements(nodes, edges, 'TB');
        setNodes(layouted.nodes);

        // Center the view after layout
        setTimeout(() => {
            fitView({ padding: 0.2, duration: 800 });
        }, 50); // Small delay to ensure state update

        toast.success('Layout organized automatically!');
    }, [nodes, edges, setNodes, fitView]);

    const handleExport = useCallback(async () => {
        const nodes = getNodes();
        if (nodes.length === 0) {
            toast.error('No diagram to export');
            return;
        }

        const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewportElement) {
            toast.error('Could not find diagram viewport');
            return;
        }

        try {
            const { getNodesBounds, getViewportForBounds } = await import('reactflow');
            const nodesBounds = getNodesBounds(nodes);
            const padding = 50;
            const imageWidth = nodesBounds.width + padding * 2;
            const imageHeight = nodesBounds.height + padding * 2;

            const viewport = getViewportForBounds(
                nodesBounds,
                imageWidth,
                imageHeight,
                0.5, 2, padding
            );

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
                        const offsetX = padding - nodesBounds.x * viewport.zoom;
                        const offsetY = padding - nodesBounds.y * viewport.zoom;
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

            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = 'architecture-diagram.png';
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success('Diagram exported successfully!');
                }
            });
        } catch (err) {
            toast.error('Failed to export diagram.');
        }
    }, [getNodes]);

    const handleGenerateSpec = useCallback(async () => {
        if (nodes.length === 0) {
            toast.error('No diagram to generate specification for');
            return;
        }

        setIsGenerating(true);
        try {
            let specification: string;

            if (useLocalAI) {
                toast.info('Generating specification with Local AI...');
                const service = WebLLMService.getInstance();
                if (!service.isReady()) throw new Error('Local model not ready yet.');
                specification = await service.generateSpecification(nodes, edges, activeDiagramName);
            } else {
                if (!geminiApiKey) throw new Error('Gemini API Key is required.');
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
            toast.error(error instanceof Error ? error.message : 'Failed to generate specification');
        } finally {
            setIsGenerating(false);
        }
    }, [nodes, edges, activeDiagramName, geminiApiKey, setGeneratedSpecification, setIsGenerating, useLocalAI]);

    const mainTools = [
        {
            id: 'diagrams',
            icon: LayoutGrid,
            label: 'Diagrams',
            onClick: () => {
                setIsSidebarOpen(!isSidebarOpen);
                if (activePanel === 'diagrams') setActivePanel(null);
                else setActivePanel('diagrams');
            },
            active: isSidebarOpen
        },
        {
            id: 'library',
            icon: Plus,
            label: 'Add Component',
            onClick: () => setActivePanel(activePanel === 'library' ? null : 'library'),
            active: activePanel === 'library'
        },
        {
            id: 'ai',
            icon: Sparkles,
            label: 'AI Generate',
            onClick: () => setActivePanel(activePanel === 'ai' ? null : 'ai'),
            active: activePanel === 'ai'
        },
        {
            id: 'chat',
            icon: MessageSquare,
            label: 'Diagram Chat',
            onClick: () => setActivePanel(activePanel === 'chat' ? null : 'chat'),
            active: activePanel === 'chat'
        }
    ];

    const actionTools = [
        {
            id: 'layout',
            icon: Workflow,
            label: 'Auto Layout',
            onClick: handleAutoLayout,
            active: false
        },
        {
            id: 'export',
            icon: Download,
            label: 'Export PNG',
            onClick: handleExport,
            active: false
        },
        {
            id: 'generate',
            icon: isGenerating ? Loader2 : FileText,
            label: 'Generate Spec',
            onClick: handleGenerateSpec,
            active: isGenerating,
            className: isGenerating ? "animate-spin" : ""
        },
        {
            id: 'select',
            icon: MousePointer2,
            label: 'Select / Edit',
            onClick: () => setInteractionMode('default'),
            active: interactionMode === 'default'
        },
        {
            id: 'laser',
            icon: Pointer,
            label: 'Laser Pointer',
            onClick: () => setInteractionMode(interactionMode === 'laser' ? 'default' : 'laser'),
            active: interactionMode === 'laser'
        }
    ];

    const simulationTools = [
        {
            id: 'simulation-panel',
            icon: Terminal,
            label: 'Simulation Panel',
            onClick: () => setActivePanel(activePanel === 'simulation' ? null : 'simulation'),
            active: activePanel === 'simulation'
        },
        {
            id: 'simulation',
            icon: isPlaying ? Square : Play,
            label: isPlaying ? 'Stop Simulation' : 'Start Simulation',
            onClick: () => {
                if (isPlaying) SimulationEngine.getInstance().stop();
                else SimulationEngine.getInstance().start();
            },
            active: isPlaying,
            variant: isPlaying ? 'destructive' : 'default' as any
        }
    ];

    return (
        <TooltipProvider delayDuration={0}>
            <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center gap-3 p-1.5 bg-background/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                {/* Main Panels */}
                <div className="flex flex-col gap-1.5">
                    {mainTools.map((tool) => (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={tool.active ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={tool.onClick}
                                    className={cn(
                                        "h-10 w-10 rounded-lg transition-all duration-200",
                                        tool.active && "bg-primary text-primary-foreground shadow-lg scale-105",
                                        !tool.active && "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <tool.icon className={cn("h-5 w-5", (tool.id === 'ai' || tool.id === 'chat') && !tool.active && "text-indigo-500")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10}><p className="font-medium">{tool.label}</p></TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                <div className="w-6 h-px bg-border my-0.5" />

                {/* Quick Actions */}
                <div className="flex flex-col gap-1.5">
                    {actionTools.map((tool) => (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={tool.active ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={tool.onClick}
                                    className={cn(
                                        "h-9 w-9 rounded-lg transition-all duration-200",
                                        tool.active && "bg-secondary text-secondary-foreground shadow-sm",
                                        !tool.active && "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <tool.icon className={cn("h-4.5 w-4.5", tool.id === 'laser' && tool.active && "text-red-500", tool.className)} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10}><p className="font-medium">{tool.label}</p></TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                <div className="w-6 h-px bg-border my-0.5" />

                {/* Simulation */}
                <div className="flex flex-col gap-1.5">
                    {simulationTools.map((tool) => (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={tool.variant || (tool.active ? 'default' : 'ghost')}
                                    size="icon"
                                    onClick={tool.onClick}
                                    className={cn(
                                        "h-10 w-10 rounded-lg transition-all duration-200",
                                        tool.active && !tool.variant && "bg-primary text-primary-foreground shadow-lg",
                                        !tool.active && "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <tool.icon className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10}><p className="font-medium">{tool.label}</p></TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                <div className="w-6 h-px bg-border my-0.5" />

                {/* Danger Zone / Settings */}
                <div className="flex flex-col gap-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowClearConfirm(true)}
                                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-4.5 w-4.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10}><p className="font-medium">Clear Canvas</p></TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                                    >
                                        <Settings2 className="h-4.5 w-4.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10}><p className="font-medium">Settings</p></TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent side="right" align="end" sideOffset={15} className="w-48 p-2 rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl">
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
                                {theme === "light" && <Check className="h-4 w-4 text-primary" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setTheme("dark")}
                                className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent"
                            >
                                <div className="flex items-center gap-2">
                                    <Moon className="h-4 w-4 text-indigo-400" />
                                    <span className="text-sm font-medium">Dark</span>
                                </div>
                                {theme === "dark" && <Check className="h-4 w-4 text-primary" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setTheme("system")}
                                className="flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer hover:bg-accent focus:bg-accent"
                            >
                                <div className="flex items-center gap-2">
                                    <Monitor className="h-4 w-4 text-sky-500" />
                                    <span className="text-sm font-medium">System</span>
                                </div>
                                {theme === "system" && <Check className="h-4 w-4 text-primary" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

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
                            onClick={() => {
                                clear();
                                setShowClearConfirm(false);
                                toast.success('Canvas cleared');
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
