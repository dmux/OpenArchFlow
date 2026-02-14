import React from 'react';
import { useDiagramStore } from '@/lib/store';
import { SimulationEngine } from '@/lib/simulation';
import { Play, Square, FastForward, RotateCcw, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SimulationControls() {
    const {
        isPlaying,
        simulationSpeed,
        setSimulationSpeed,
        simulationLogs,
        clearSimulationLogs,
        resetSimulation
    } = useDiagramStore();

    const handleToggleSimulation = () => {
        if (isPlaying) {
            SimulationEngine.getInstance().stop();
        } else {
            SimulationEngine.getInstance().start();
        }
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">

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
            </div>

            {/* Logs Preview (Tiny) - could expand to full panel */}
            {isPlaying && (
                <div className="bg-background/90 backdrop-blur border border-border rounded-lg shadow-sm px-3 py-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
                    {simulationLogs.length > 0 ? (
                        <span className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${simulationLogs[simulationLogs.length - 1].level === 'error' ? 'bg-red-500' :
                                simulationLogs[simulationLogs.length - 1].level === 'success' ? 'bg-green-500' : 'bg-blue-500'
                                }`} />
                            {simulationLogs[simulationLogs.length - 1].message}
                        </span>
                    ) : (
                        "Simulation Ready..."
                    )}
                </div>
            )}
        </div>
    );
}
