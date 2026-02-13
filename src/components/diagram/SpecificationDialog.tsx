'use client';

import React, { useState } from 'react';
import { X, FileText, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SpecificationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    specification: string;
}

export default function SpecificationDialog({ isOpen, onClose, specification }: SpecificationDialogProps) {
    const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(specification);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-4xl h-[85vh] bg-background border rounded-xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Architecture Specification</h2>
                            <p className="text-sm text-muted-foreground">AI-generated technical documentation</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pt-4 border-b">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'preview'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                    >
                        Preview
                    </button>
                    <button
                        onClick={() => setActiveTab('markdown')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'markdown'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                    >
                        Markdown
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {activeTab === 'preview' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <SyntaxHighlighter
                                                style={oneDark}
                                                language={match[1]}
                                                PreTag="div"
                                                {...props}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        );
                                    },
                                }}
                            >
                                {specification}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <pre className="bg-muted p-4 rounded-lg overflow-auto">
                            <code className="text-sm font-mono">{specification}</code>
                        </pre>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <Button onClick={handleCopy} className="gap-2">
                        {copied ? (
                            <>
                                <Check className="w-4 h-4" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Copy Markdown
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
