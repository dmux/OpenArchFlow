import React, { useEffect, useRef } from "react";
import { useDiagramStore } from "@/lib/store";
import { SimulationEngine } from "@/lib/simulation";
import { useResizable } from "@/hooks/useResizable";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Pen,
  Terminal,
  Trash2,
  BarChart2,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";
import SimulationMetrics from "./SimulationMetrics";
import TraceViewer from "./TraceViewer";

interface SimulationControlsProps {
  isOpen: boolean;
}

export default function SimulationControls({
  isOpen,
}: SimulationControlsProps) {
  const {
    isPlaying,
    isPaused,
    simulationSpeed,
    setSimulationSpeed,
    simulationLogs,
    clearSimulationLogs,
    resetSimulation,
    interactionMode,
    setInteractionMode,
    trafficMultiplier,
    setTrafficMultiplier,
    killedNodes,
  } = useDiagramStore();

  const laserPointerEnabled = interactionMode === "laser";
  const setLaserPointerEnabled = (enabled: boolean) =>
    setInteractionMode(enabled ? "laser" : "default");

  const [isLogsOpen, setIsLogsOpen] = React.useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = React.useState(false);
  const [isTracesOpen, setIsTracesOpen] = React.useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const { size: logsSize, handleMouseDown: handleLogsMouseDown } = useResizable(
    { width: 500, height: 400 },
    { minW: 300, maxW: 900, minH: 200, maxH: 700 },
  );
  const { size: metricsSize, handleMouseDown: handleMetricsMouseDown } =
    useResizable(
      { width: 600, height: 420 },
      { minW: 300, maxW: 900, minH: 200, maxH: 700 },
    );
  const { size: tracesSize, handleMouseDown: handleTracesMouseDown } =
    useResizable(
      { width: 640, height: 440 },
      { minW: 300, maxW: 900, minH: 200, maxH: 700 },
    );

  const handleToggleSimulation = () => {
    if (isPlaying) {
      SimulationEngine.getInstance().stop();
    } else {
      SimulationEngine.getInstance().start();
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      SimulationEngine.getInstance().resume();
    } else {
      SimulationEngine.getInstance().pause();
    }
  };

  // Auto-scroll logs
  useEffect(() => {
    if (scrollEndRef.current && isLogsOpen) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simulationLogs, isLogsOpen]);

  // Sync killed nodes to engine mid-simulation
  useEffect(() => {
    if (isPlaying) {
      import("@/lib/simulation/SimulationEngine").then(
        ({ SimulationEngine: Engine }) => {
          Engine.getInstance().setKilledNodes(killedNodes);
        },
      );
    }
  }, [killedNodes, isPlaying]);

  // Sync traffic multiplier to engine mid-simulation
  useEffect(() => {
    if (isPlaying) {
      import("@/lib/simulation/SimulationEngine").then(
        ({ SimulationEngine: Engine }) => {
          Engine.getInstance().setTrafficMultiplier(trafficMultiplier);
        },
      );
    }
  }, [trafficMultiplier, isPlaying]);

  if (!isOpen && !isPlaying) return null;

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Main Controls */}
      <div
        className={cn(
          "bg-background/80 backdrop-blur-md border border-border p-2 rounded-full shadow-lg flex items-center gap-2",
        )}
      >
        {/* Play / Pause / Resume */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPlaying && !isPaused ? "secondary" : "default"}
                size="icon"
                className="rounded-full h-10 w-10 shadow-sm"
                onClick={isPlaying ? handlePauseResume : handleToggleSimulation}
              >
                {isPlaying && !isPaused ? (
                  <Pause className="fill-current" size={16} />
                ) : (
                  <Play className="fill-current" size={16} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isPlaying
                  ? isPaused
                    ? "Resume Simulation"
                    : "Pause Simulation"
                  : "Start Simulation"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Stop — only when playing */}
        {isPlaying && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  className="rounded-full h-10 w-10 shadow-sm"
                  onClick={handleToggleSimulation}
                >
                  <Square className="fill-current" size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Stop Simulation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Paused badge removed — icon change alone signals pause state */}

        <div className="h-6 w-px bg-border mx-1" />

        <div className="flex items-center gap-2 px-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            Speed
          </span>
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
          <span className="text-xs font-mono w-8 text-right">
            {simulationSpeed.toFixed(1)}x
          </span>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Traffic Multiplier */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase mr-1">
            Traffic
          </span>
          {[1, 2, 5].map((m) => (
            <Button
              key={m}
              variant={trafficMultiplier === m ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-6 px-2 text-xs font-mono rounded",
                trafficMultiplier === m &&
                  "bg-blue-600 text-white hover:bg-blue-700",
              )}
              onClick={() => setTrafficMultiplier(m)}
            >
              ×{m}
            </Button>
          ))}
        </div>

        {killedNodes.size > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-medium">
            <span>💀 {killedNodes.size} killed</span>
          </div>
        )}

        <div className="h-6 w-px bg-border mx-1" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 text-muted-foreground"
                onClick={resetSimulation}
              >
                <RotateCcw size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset Simulation State</p>
            </TooltipContent>
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
                      simulationLogs.length > 0
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "text-muted-foreground",
                    )}
                  >
                    <Terminal
                      size={14}
                      className={cn(isPlaying && "animate-pulse")}
                    />
                    {simulationLogs.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {simulationLogs.length > 9
                          ? "9+"
                          : simulationLogs.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Simulation Logs ({simulationLogs.length})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <PopoverContent
            className="p-0 flex flex-col relative overflow-hidden"
            style={{ width: logsSize.width, height: logsSize.height }}
            side="top"
            align="center"
          >
            <div className="flex flex-col flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Terminal
                    size={14}
                    className={cn(isPlaying && "text-green-500 animate-pulse")}
                  />
                  <span className="text-sm font-semibold">
                    Simulation Logs ({simulationLogs.length})
                  </span>
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
                <ScrollArea className="flex-1 w-full p-4 font-mono text-xs overflow-y-auto">
                  <div className="space-y-1.5">
                    {simulationLogs.map((log) => (
                      <div key={log.id} className="flex gap-2">
                        <span className="text-muted-foreground opacity-50 select-none">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <div className="flex-1 break-words">
                          {log.nodeLabel && (
                            <span className="font-bold text-foreground mr-2">
                              [{log.nodeLabel}]
                            </span>
                          )}
                          <span
                            className={cn(
                              log.level === "error" &&
                                "text-destructive font-semibold",
                              log.level === "success" &&
                                "text-green-600 font-semibold",
                              log.level === "warning" && "text-yellow-600",
                              log.level === "info" && "text-muted-foreground",
                            )}
                          >
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
            {/* Resize handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-10"
              onMouseDown={handleLogsMouseDown}
            >
              <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-muted-foreground/40 hover:border-muted-foreground/70 rounded-sm transition-colors" />
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Metrics Popover */}
        <Popover open={isMetricsOpen} onOpenChange={setIsMetricsOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant={isMetricsOpen ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "rounded-full h-8 w-8",
                      isMetricsOpen
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "text-muted-foreground",
                    )}
                  >
                    <BarChart2 size={14} />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Live Metrics</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent
            className="p-0 flex flex-col relative overflow-hidden"
            style={{ width: metricsSize.width, height: metricsSize.height }}
            side="top"
            align="center"
          >
            <div className="flex items-center justify-between p-3 border-b bg-muted/50 shrink-0">
              <div className="flex items-center gap-2">
                <BarChart2
                  size={14}
                  className={cn(isPlaying && "text-emerald-500 animate-pulse")}
                />
                <span className="text-sm font-semibold">Live Metrics</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <SimulationMetrics />
            </div>
            {/* Resize handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-10"
              onMouseDown={handleMetricsMouseDown}
            >
              <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-muted-foreground/40 hover:border-muted-foreground/70 rounded-sm transition-colors" />
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Traces Popover */}
        <Popover open={isTracesOpen} onOpenChange={setIsTracesOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant={isTracesOpen ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "rounded-full h-8 w-8",
                      isTracesOpen
                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                        : "text-muted-foreground",
                    )}
                  >
                    <GitBranch size={14} />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Trace Viewer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent
            className="p-0 flex flex-col relative overflow-hidden"
            style={{ width: tracesSize.width, height: tracesSize.height }}
            side="top"
            align="center"
          >
            <div className="flex items-center gap-2 p-3 border-b bg-muted/50 shrink-0">
              <GitBranch
                size={14}
                className={cn(isPlaying && "text-violet-500 animate-pulse")}
              />
              <span className="text-sm font-semibold">Trace Viewer</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <TraceViewer />
            </div>
            {/* Resize handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-10"
              onMouseDown={handleTracesMouseDown}
            >
              <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-muted-foreground/40 hover:border-muted-foreground/70 rounded-sm transition-colors" />
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
                className={`rounded-full h-8 w-8 ${laserPointerEnabled ? "bg-red-500 hover:bg-red-600 text-white" : "text-muted-foreground"}`}
                onClick={() => setLaserPointerEnabled(!laserPointerEnabled)}
              >
                <Pen size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Laser Pointer (Presentation Mode)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Logs Preview (Tiny) - only show when playing and not in popover */}
      {isPlaying && !isLogsOpen && simulationLogs.length > 0 && (
        <div className="bg-background/90 backdrop-blur border border-border rounded-lg shadow-sm px-3 py-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
          <span className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                simulationLogs[simulationLogs.length - 1].level === "error"
                  ? "bg-red-500"
                  : simulationLogs[simulationLogs.length - 1].level ===
                      "success"
                    ? "bg-green-500"
                    : "bg-blue-500"
              }`}
            />
            {simulationLogs[simulationLogs.length - 1].message}
          </span>
        </div>
      )}
    </div>
  );
}
