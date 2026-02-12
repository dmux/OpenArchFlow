'use client';

import FlowCanvas from '@/components/diagram/FlowCanvas';
import FloatingInput from '@/components/diagram/FloatingInput';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { useDiagramStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { WebLLMService } from '@/lib/ai/webllm';
import { InitProgressReport } from '@mlc-ai/web-llm';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Cloud, Laptop, Download, Layout, Trash2 } from 'lucide-react';
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

export default function Home() {
    const clearDiagram = useDiagramStore((state) => state.clear);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [useLocalAI, setUseLocalAI] = useState(true);
    const [modelProgressText, setModelProgressText] = useState<string>('');
    const [modelProgressValue, setModelProgressValue] = useState<number>(0);
    const [isModelLoading, setIsModelLoading] = useState(false);

    const layout = useDiagramStore((state) => state.layout);
    const setNodes = useDiagramStore((state) => state.setNodes);
    const setEdges = useDiagramStore((state) => state.setEdges);
    const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
    const setGeminiApiKey = useDiagramStore((state) => state.setGeminiApiKey);

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
        <main className="flex w-full h-screen overflow-hidden bg-background">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 relative h-full overflow-hidden">
                {/* Header / Controls */}
                <div className="absolute top-4 left-4 z-50 flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="bg-background/80 backdrop-blur">
                        <Layout className="w-5 h-5" />
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
                </div>

                {/* ... rest of the component (Modal, Canvas, Input) ... */}
                {isModelLoading && (
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
                )}

                {/* API Key Input Overlay for Cloud Mode */}
                {!useLocalAI && (!geminiApiKey || !geminiApiKey.trim()) && !isLoading && (
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
                )}

                <LoadingOverlay
                    isLoading={isLoading}
                    message={useLocalAI ? "Running Phi-3 Local Model..." : "Consulting Cloud Gemini..."}
                />

                <FlowCanvas />

                <FloatingInput onSubmit={handlePromptSubmit} isLoading={isLoading || isModelLoading} />
            </div>
        </main>
    );
}
