import React, { useEffect, useRef } from 'react';
import { useDiagramStore } from '@/lib/store';
import { SimulationEngine } from '@/lib/simulation';
import { Play, Square, FastForward, RotateCcw, List, Pointer, Terminal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

interface SimulationControlsProps {
    isOpen: boolean;
}

export default function SimulationControls({ isOpen }: SimulationControlsProps) {
    const {
        isPlaying,
        simulationSpeed,
        setSimulationSpeed,
        simulationLogs,
        clearSimulationLogs,
        resetSimulation,
        interactionMode,
        setInteractionMode
    } = useDiagramStore();

    const laserPointerEnabled = interactionMode === 'laser';
    const setLaserPointerEnabled = (enabled: boolean) => setInteractionMode(enabled ? 'laser' : 'default');

    const [isLogsOpen, setIsLogsOpen] = React.useState(false);
    const scrollEndRef = useRef<HTMLDivElement>(null);

    const handleToggleSimulation = () => {
        if (isPlaying) {
            SimulationEngine.getInstance().stop();
        } else {
            SimulationEngine.getInstance().start();
        }
    };

    // Auto-scroll logs
    useEffect(() => {
        if (scrollEndRef.current && isLogsOpen) {
            scrollEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [simulationLogs, isLogsOpen]);

    if (!isOpen && !isPlaying) return null;

    return (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Main Controls */}
            <div className="bg-background/80 backdrop-blur-md border border-border p-2 rounded-full shadow-lg flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={isPlaying ? "destructive" : "default"}
                                size="icon"
                                className="rounded-full h-10 w-10 shadow-sm"
                                onClick={handleToggleSimulation}
                            >
                                {isPlaying ? <Square className="fill-current" size={16} /> : <Play className="fill-current" size={16} />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isPlaying ? "Stop Simulation" : "Start Simulation"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="h-6 w-px bg-border mx-1" />

                <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Speed</span>
                    <div className="w-24">
                        <Slider
                            defaultValue={[1]}
                            value={[simulationSpeed]}
                            min={0.1}
                            max={5}
                            step={0.1}
                            onValueChange={(val) => setSimulationSpeed(val[0])}
                            className="cursor-pointer"
                        />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{simulationSpeed.toFixed(1)}x</span>
                </div>

                <div className="h-6 w-px bg-border mx-1" />

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground" onClick={resetSimulation}>
                                <RotateCcw size={14} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Reset Simulation State</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="h-6 w-px bg-border mx-1" />

                {/* Simulation Logs Popover */}
                <Popover open={isLogsOpen} onOpenChange={setIsLogsOpen}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={simulationLogs.length > 0 ? "default" : "ghost"}
                                        size="icon"
                                        className={cn(
                                            "rounded-full h-8 w-8 relative",
                                            simulationLogs.length > 0 ? "bg-blue-500 hover:bg-blue-600 text-white" : "text-muted-foreground"
                                        )}
                                    >
                                        <Terminal size={14} className={cn(isPlaying && "animate-pulse")} />
                                        {simulationLogs.length > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {simulationLogs.length > 9 ? '9+' : simulationLogs.length}
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Simulation Logs ({simulationLogs.length})</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <PopoverContent
                        className="w-[500px] p-0"
                        side="top"
                        align="center"
                    >
                        <div className="flex flex-col max-h-[400px]">
                            {/* Header */}
                            <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <Terminal size={14} className={cn(isPlaying && "text-green-500 animate-pulse")} />
                                    <span className="text-sm font-semibold">Simulation Logs ({simulationLogs.length})</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:text-destructive"
                                    onClick={clearSimulationLogs}
                                    disabled={simulationLogs.length === 0}
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </div>

                            {/* Logs List */}
                            {simulationLogs.length === 0 ? (
                                <div className="p-8 text-center text-sm text-muted-foreground">
                                    No simulation logs yet. Start a simulation to see logs here.
                                </div>
                            ) : (
                                <ScrollArea className="h-[300px] w-full p-4 font-mono text-xs">
                                    <div className="space-y-1.5">
                                        {simulationLogs.map((log) => (
                                            <div key={log.id} className="flex gap-2">
                                                <span className="text-muted-foreground opacity-50 select-none">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                                <div className="flex-1 break-words">
                                                    {log.nodeLabel && (
                                                        <span className="font-bold text-foreground mr-2">[{log.nodeLabel}]</span>
                                                    )}
                                                    <span className={cn(
                                                        log.level === 'error' && "text-destructive font-semibold",
                                                        log.level === 'success' && "text-green-600 font-semibold",
                                                        log.level === 'warning' && "text-yellow-600",
                                                        log.level === 'info' && "text-muted-foreground"
                                                    )}>
                                                        {log.message}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={scrollEndRef} />
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="h-6 w-px bg-border mx-1" />

                {/* Laser Pointer Toggle */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={laserPointerEnabled ? "default" : "ghost"}
                                size="icon"
                                className={`rounded-full h-8 w-8 ${laserPointerEnabled ? 'bg-red-500 hover:bg-red-600 text-white' : 'text-muted-foreground'}`}
                                onClick={() => setLaserPointerEnabled(!laserPointerEnabled)}
                            >
                                <Pointer size={14} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Laser Pointer (Presentation Mode)</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Logs Preview (Tiny) - only show when playing and not in popover */}
            {isPlaying && !isLogsOpen && simulationLogs.length > 0 && (
                <div className="bg-background/90 backdrop-blur border border-border rounded-lg shadow-sm px-3 py-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
                    <span className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${simulationLogs[simulationLogs.length - 1].level === 'error' ? 'bg-red-500' :
                            simulationLogs[simulationLogs.length - 1].level === 'success' ? 'bg-green-500' : 'bg-blue-500'
                            }`} />
                        {simulationLogs[simulationLogs.length - 1].message}
                    </span>
                </div>
            )}
        </div>
    );
}
