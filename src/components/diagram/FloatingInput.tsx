'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CornerDownLeft, Sparkles, ChevronLeft, Globe, Zap, Box, Database, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FloatingInputProps {
    onSubmit: (prompt: string) => void;
    isLoading: boolean;
    disabled?: boolean;
    placeholder?: string;
    isOpen: boolean;
}

const EXAMPLE_PROMPTS = [
    // ... same prompts ...
    {
        icon: Globe,
        title: "Static Website",
        prompt: "Create a secure static website architecture using Amazon S3 for hosting and CloudFront as a CDN to improve globally latency."
    },
    {
        icon: Zap,
        title: "Serverless API",
        prompt: "Design a serverless REST API using API Gateway to route requests, AWS Lambda for business logic, and DynamoDB for a scalable NoSQL database."
    },
    {
        icon: Box,
        title: "Microservices",
        prompt: "A scalable microservices architecture running on ECS Fargate behind an Application Load Balancer. Include an RDS PostgreSQL database for persistence and ElastiCache for caching."
    },
    {
        icon: Database,
        title: "Data Pipeline",
        prompt: "A data ingestion pipeline where files are uploaded to an S3 bucket, triggering a Lambda function to process the data and store the results in a Redshift data warehouse."
    }
];

export default function FloatingInput({
    onSubmit,
    isLoading,
    disabled,
    placeholder,
    isOpen
}: FloatingInputProps) {
    const [prompt, setPrompt] = useState('');
    const [showExamples, setShowExamples] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowExamples(false);
            }
        };

        if (showExamples) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExamples]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || disabled) return;
        onSubmit(prompt);
        setPrompt('');
    };

    const handleExampleClick = (examplePrompt: string) => {
        setPrompt(examplePrompt);
        setShowExamples(false);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300" ref={dropdownRef}>
            <div className="relative">
                <form
                    onSubmit={handleSubmit}
                    className={`relative flex items-center w-full bg-background/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all duration-300 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <div className="pl-3 text-muted-foreground">
                        <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" />
                    </div>

                    {/* Examples Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-9 w-9 rounded-xl ml-2 transition-colors",
                            showExamples ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setShowExamples(!showExamples)}
                        title="Example prompts"
                    >
                        <Lightbulb className="w-5 h-5" />
                    </Button>

                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={placeholder || "Describe your AWS architecture..."}
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-14 text-base shadow-none"
                        disabled={isLoading || disabled}
                        autoFocus
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="rounded-xl h-11 w-11 shrink-0 mr-1 shadow-lg shadow-primary/20"
                        disabled={isLoading || !prompt.trim() || disabled}
                    >
                        <CornerDownLeft className="h-5 w-5" />
                    </Button>
                </form>

                {/* Examples Dropdown */}
                {showExamples && !disabled && (
                    <div className="absolute bottom-full left-0 right-0 mb-4 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                        <p className="text-xs font-semibold text-muted-foreground mb-3 px-2 flex items-center gap-2">
                            <Lightbulb className="w-3 h-3 text-yellow-500" />
                            SUGGESTIONS:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {EXAMPLE_PROMPTS.map((example, index) => {
                                const Icon = example.icon;
                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleExampleClick(example.prompt)}
                                        className="w-full group flex items-start gap-3 px-3 py-3 bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border/50 rounded-xl transition-all duration-200 text-left"
                                    >
                                        <div className="p-2 bg-background rounded-lg group-hover:scale-110 transition-transform shrink-0 mt-0.5 border shadow-sm">
                                            <Icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors mb-0.5">
                                                {example.title}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                {example.prompt}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
