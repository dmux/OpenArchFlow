'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Cpu, Cloud, Database, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

const icons = [Cpu, Cloud, Database, Activity, Sparkles];

export function LoadingOverlay({ isLoading, message = "Designing Architecture..." }: LoadingOverlayProps) {
    const [currentIconIndex, setCurrentIconIndex] = useState(0);

    useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => {
            setCurrentIconIndex((prev) => (prev + 1) % icons.length);
        }, 800);
        return () => clearInterval(interval);
    }, [isLoading]);

    const CurrentIcon = icons[currentIconIndex];

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm"
                >
                    <div className="relative flex flex-col items-center justify-center p-8">
                        {/* Orbiting Ring */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute w-32 h-32 rounded-full border-t-2 border-primary/50"
                        />
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute w-40 h-40 rounded-full border-b-2 border-indigo-500/30"
                        />

                        {/* Center Icon */}
                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <motion.div
                                key={currentIconIndex}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="p-4 bg-background/80 backdrop-blur-md rounded-2xl shadow-xl border border-primary/20"
                            >
                                <CurrentIcon className="w-8 h-8 text-primary animate-pulse" />
                            </motion.div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="flex flex-col items-center gap-2"
                            >
                                <span className="text-lg font-medium tracking-tight text-foreground/90">
                                    {message}
                                </span>
                                <span className="text-sm text-muted-foreground animate-pulse">
                                    Thinking...
                                </span>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
