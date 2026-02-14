'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CornerDownLeft, Sparkles, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FloatingInputProps {
    onSubmit: (prompt: string) => void;
    isLoading: boolean;
    disabled?: boolean;
    placeholder?: string;
    defaultCollapsed?: boolean;
}

export default function FloatingInput({ onSubmit, isLoading, disabled, placeholder, defaultCollapsed = false }: FloatingInputProps) {
    const [prompt, setPrompt] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    useEffect(() => {
        setIsCollapsed(defaultCollapsed);
    }, [defaultCollapsed]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || disabled) return;
        onSubmit(prompt);
        setPrompt('');
    };

    return (
        <div className={cn(
            "fixed bottom-8 left-24 z-50 transition-all duration-300 ease-in-out",
            isCollapsed ? "w-12 h-12" : "w-full max-w-xl"
        )}>
            {isCollapsed ? (
                <Button
                    onClick={() => setIsCollapsed(false)}
                    className="h-12 w-12 rounded-full shadow-lg bg-background/80 backdrop-blur-lg border border-border p-0 hover:bg-background/90"
                    title="Expand AI Input"
                >
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                </Button>
            ) : (
                <div className="relative flex items-center">
                    <form
                        onSubmit={handleSubmit}
                        className={`relative flex items-center w-full bg-background/80 backdrop-blur-lg border border-border rounded-full shadow-lg p-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all duration-300 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full ml-1 mr-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsCollapsed(true)}
                            title="Collapse"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="pl-1 text-muted-foreground">
                            <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" />
                        </div>
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={placeholder || "Describe your AWS architecture..."}
                            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-12 text-base shadow-none"
                            disabled={isLoading || disabled}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="rounded-full h-10 w-10 shrink-0 mr-1"
                            disabled={isLoading || !prompt.trim() || disabled}
                        >
                            <CornerDownLeft className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}
