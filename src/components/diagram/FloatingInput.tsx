'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CornerDownLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface FloatingInputProps {
    onSubmit: (prompt: string) => void;
    isLoading: boolean;
}

export default function FloatingInput({ onSubmit, isLoading }: FloatingInputProps) {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        onSubmit(prompt);
        setPrompt('');
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
            <form
                onSubmit={handleSubmit}
                className="relative flex items-center w-full bg-background/80 backdrop-blur-lg border border-border rounded-full shadow-lg p-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all duration-300"
            >
                <div className="pl-3 text-muted-foreground">
                    <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" />
                </div>
                <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your AWS architecture (e.g., 'Serverless API with Lambda and DynamoDB')..."
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-12 text-base shadow-none"
                    disabled={isLoading}
                />
                <Button
                    type="submit"
                    size="icon"
                    className="rounded-full h-10 w-10 shrink-0 mr-1"
                    disabled={isLoading || !prompt.trim()}
                >
                    <CornerDownLeft className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
