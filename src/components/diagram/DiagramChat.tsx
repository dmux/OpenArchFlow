'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { MessageSquare, Send, Sparkles, Bot, User, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface DiagramChatProps {
    isOpen: boolean;
    onClose: () => void;
    currentNodes: any[];
    currentEdges: any[];
    geminiApiKey: string | null;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const STANDARD_PROMPTS = [
    { label: "Explain Architecture", prompt: "Explain this architecture in simple terms, highlighting the main flow." },
    { label: "Estimate Pricing", prompt: "Provide a rough monthly pricing estimate for this architecture on AWS." },
    { label: "Security Review", prompt: "Perform a security review of this architecture. Identify any potential vulnerabilities." },
    { label: "Well-Architected", prompt: "How does this align with the AWS Well-Architected Framework? Give me a brief summary." }
];

export default function DiagramChat({
    isOpen,
    onClose,
    currentNodes,
    currentEdges,
    geminiApiKey
}: DiagramChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isLoading]);

    const handleSend = async (promptText: string = input) => {
        if (!promptText.trim()) return;
        if (!geminiApiKey || geminiApiKey === 'offline') {
            toast.error("Please set your Gemini API Key first.");
            return;
        }

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: promptText };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // Convert existing messages to Gemini format (excluding system prompt logic which is in API)
            const chatHistory = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                content: msg.content
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: promptText,
                    apiKey: geminiApiKey,
                    currentNodes,
                    currentEdges,
                    history: chatHistory
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to get response');
            }

            const data = await response.json();

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (error) {
            console.error('Chat error:', error);
            toast.error(error instanceof Error ? error.message : 'Error communicating with AI');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setMessages([]);
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-[400px] sm:w-[500px] flex flex-col p-0 mr-4 my-4 h-[calc(100vh-32px)] rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl z-[100]">
                <SheetHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col space-y-1">
                        <SheetTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            Diagram Chat
                        </SheetTitle>
                        <SheetDescription>
                            Discuss your architecture with AI
                        </SheetDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {messages.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={handleClear} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col h-full items-center justify-center text-center space-y-6 mt-10">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <Bot className="w-12 h-12 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg">How can I help you?</h3>
                                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                                    I analyze your current architecture and answer any questions you have.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 w-full max-w-[300px]">
                                {STANDARD_PROMPTS.map((prompt, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline"
                                        className="justify-start text-xs h-auto py-2.5 px-3 whitespace-normal text-left"
                                        onClick={() => handleSend(prompt.prompt)}
                                    >
                                        <Sparkles className="w-3.5 h-3.5 mr-2 text-primary shrink-0" />
                                        {prompt.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-3 max-w-[90%]",
                                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                        msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-indigo-500/10 text-indigo-500"
                                    )}>
                                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted prose prose-sm dark:prose-invert max-w-none"
                                    )}>
                                        {msg.role === 'user' ? (
                                            msg.content
                                        ) : (
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 max-w-[90%]">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-500">
                                        <Bot className="w-4 h-4 animate-pulse" />
                                    </div>
                                    <div className="rounded-2xl px-4 py-3 bg-muted flex flex-row items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex items-end gap-2"
                    >
                        <Input
                            placeholder="Ask about your architecture..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            className="bg-secondary/50 border-0 focus-visible:ring-1 min-h-[44px]"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !input.trim()}
                            className="h-11 w-11 shrink-0 rounded-xl"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
