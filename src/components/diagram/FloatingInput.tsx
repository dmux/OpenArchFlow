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
    defaultCollapsed?: boolean;
}

const EXAMPLE_PROMPTS = [
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

export default function FloatingInput({ onSubmit, isLoading, disabled, placeholder, defaultCollapsed = false }: FloatingInputProps) {
    const [prompt, setPrompt] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [showExamples, setShowExamples] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsCollapsed(defaultCollapsed);
    }, [defaultCollapsed]);

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

    return (
        <div className={cn(
            "fixed bottom-8 left-24 z-50 transition-all duration-300 ease-in-out",
            isCollapsed ? "w-12 h-12" : "w-full max-w-2xl"
        )} ref={dropdownRef}>
            {isCollapsed ? (
                <Button
                    onClick={() => setIsCollapsed(false)}
                    className="h-12 w-12 rounded-full shadow-lg bg-background/80 backdrop-blur-lg border border-border p-0 hover:bg-background/90"
                    title="Expand AI Input"
                >
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                </Button>
            ) : (
                <div className="relative">
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

                        {/* Examples Button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-8 w-8 rounded-full ml-1 transition-colors",
                                showExamples ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setShowExamples(!showExamples)}
                            title="Example prompts"
                        >
                            <Lightbulb className="w-4 h-4" />
                        </Button>

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

                    {/* Examples Dropdown */}
                    {showExamples && !disabled && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-background/95 backdrop-blur-lg border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Example prompts:</p>
                            <div className="space-y-1">
                                {EXAMPLE_PROMPTS.map((example, index) => {
                                    const Icon = example.icon;
                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => handleExampleClick(example.prompt)}
                                            className="w-full group flex items-start gap-3 px-3 py-2.5 bg-background/40 hover:bg-background/80 border border-transparent hover:border-border/50 rounded-xl transition-all duration-200 text-left"
                                        >
                                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0 mt-0.5">
                                                <Icon className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-0.5">
                                                    {example.title}
                                                </div>
                                                <div className="text-xs text-muted-foreground line-clamp-2">
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
            )}
        </div>
    );
}
