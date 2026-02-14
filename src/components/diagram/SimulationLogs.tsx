import React, { useEffect, useRef } from 'react';
import { useDiagramStore, SimulationLog } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Trash2, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export default function SimulationLogs() {
    const { simulationLogs, clearSimulationLogs, isPlaying } = useDiagramStore();
    const scrollEndRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = React.useState(true);

    // Auto-scroll
    useEffect(() => {
        if (scrollEndRef.current) {
            scrollEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [simulationLogs, isOpen]);

    // Open automatically on new logs if playing
    useEffect(() => {
        if (isPlaying && simulationLogs.length > 0) {
            setIsOpen(true);
        }
    }, [isPlaying, simulationLogs.length]);

    if (simulationLogs.length === 0 && !isPlaying) return null;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-none">
            <div className="bg-card/95 backdrop-blur border shadow-xl rounded-xl overflow-hidden pointer-events-auto flex flex-col max-h-[300px]">
                {/* Header */}
                <div
                    className="flex items-center justify-between p-2 px-4 bg-muted/50 text-xs font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className={cn(isPlaying && "text-green-500 animate-pulse")} />
                        <span>Simulation Logs ({simulationLogs.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearSimulationLogs();
                            }}
                        >
                            <Trash2 size={12} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false); // actually close/hide? For now just toggle logic is in header click
                            }}
                        >
                            <X size={12} />
                        </Button>
                    </div>
                </div>

                {/* Logs List */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <ScrollArea className="h-[200px] w-full p-4 font-mono text-xs">
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
