'use client';

import React, { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ExternalLink, ShieldCheck, Laptop } from "lucide-react";
import { useDiagramStore } from '@/lib/store';
import { toast } from 'sonner';

export function GeminiKeyDialog() {
    const geminiApiKey = useDiagramStore((state) => state.geminiApiKey);
    const setGeminiApiKey = useDiagramStore((state) => state.setGeminiApiKey);
    const setOfflineMode = useDiagramStore((state) => state.setOfflineMode);

    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Open dialog if API key is explicitly set to null (trigger state)
    useEffect(() => {
        if (geminiApiKey === null) {
            setIsOpen(true);
            setInputValue('');
        } else {
            setIsOpen(false);
        }
    }, [geminiApiKey]);

    const handleSave = () => {
        if (!inputValue.trim()) {
            toast.error('Please enter a valid API Key');
            return;
        }
        setGeminiApiKey(inputValue.trim());
        setIsOpen(false);
        toast.success('Gemini API Key saved locally');
    };

    const handleOfflineMode = () => {
        setOfflineMode(true);
        setGeminiApiKey('offline'); // Placeholder to close dialog and mark as set
        setIsOpen(false);
        toast.info('Using Application in Offline Mode');
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent className="max-w-md border-border bg-background/95 backdrop-blur-2xl shadow-2xl rounded-3xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-sky-500/10 rounded-2xl">
                            <KeyRound className="w-6 h-6 text-sky-500" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-xl font-bold tracking-tight">
                                Gemini API Setup
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                                Configure your key to enable Cloud AI features.
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                            Gemini API Key
                        </Label>
                        <div className="relative group">
                            <Input
                                id="api-key"
                                type="password"
                                placeholder="Paste your key here..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="h-12 bg-muted/30 border-border focus-visible:ring-sky-500 rounded-2xl pl-4 pr-10 transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-sky-500 transition-colors">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground ml-1 leading-relaxed">
                            Your key is stored <strong>only locally</strong> in your browser's persistent storage.
                        </p>
                    </div>

                    <div className="bg-sky-500/5 border border-sky-500/10 rounded-2xl p-4 space-y-2">
                        <h4 className="text-xs font-bold text-sky-600 uppercase tracking-widest flex items-center gap-2">
                            <ExternalLink className="w-3 h-3" /> Don't have a key?
                        </h4>
                        <p className="text-xs text-sky-900/70 dark:text-sky-100/70 leading-normal">
                            You can get a free API key from Google AI Studio to start generating diagrams.
                        </p>
                        <Button
                            variant="link"
                            className="p-0 h-auto text-xs text-sky-600 font-semibold hover:text-sky-700"
                            asChild
                        >
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                                Get a free Gemini Key →
                            </a>
                        </Button>
                    </div>
                </div>

                <AlertDialogFooter className="flex-col sm:flex-row gap-2 border-t pt-6 bg-muted/30 -mx-6 -mb-6 px-6 pb-6 rounded-b-3xl">
                    <Button
                        variant="ghost"
                        onClick={handleOfflineMode}
                        className="flex-1 rounded-xl h-11 text-muted-foreground hover:text-foreground hover:bg-background/50"
                    >
                        <Laptop className="w-4 h-4 mr-2" />
                        Use Offline
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="flex-1 bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-11 shadow-lg shadow-sky-500/20 transition-all active:scale-95"
                    >
                        Save API Key
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
