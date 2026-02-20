'use client';

import React, { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Search, Box, Frame, MessageSquare, Database, File, User, Activity, Play, Square, Circle, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiagramStore } from "@/lib/store";
import { getAwsIcon } from "@/lib/aws-icon-registry";
import { cn } from "@/lib/utils";

import { AWS_SERVICES } from "@/lib/aws-services";

interface ComponentPaletteProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ComponentPalette({ isOpen, onOpenChange }: ComponentPaletteProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const addNode = useDiagramStore((state) => state.addNode);

    const filteredServices = AWS_SERVICES.map(category => ({
        ...category,
        items: category.items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.service.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.items.length > 0);

    const handleAddNode = (item: any) => {
        const id = crypto.randomUUID();
        const newNode = {
            id,
            type: item.type,
            position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 }, // Random offset to avoid perfect overlap
            data: {
                label: item.name,
                service: item.service,
                type: item.type,
                subtype: (item as any).subtype,
            },
        };
        addNode(newNode);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-[400px] sm:w-[500px] flex flex-col p-0 ml-20 my-4 h-[calc(100vh-32px)] rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl">
                <SheetHeader className="p-6 pb-2 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <Box className="w-5 h-5 text-primary" />
                        Component Library
                    </SheetTitle>
                    <SheetDescription>
                        Browse and add AWS components to your architecture.
                    </SheetDescription>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search services (e.g., EC2, S3)..."
                            className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    <TooltipProvider delayDuration={300}>
                        <div className="space-y-6">
                            {filteredServices.map((category) => (
                                <div key={category.category} className="space-y-3">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        {category.category}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {category.items.map((item) => {
                                            // Use custom icons for diagram tools
                                            let Icon;
                                            if (item.type === 'frame') {
                                                Icon = Frame;
                                            } else if (item.type === 'annotation') {
                                                Icon = MessageSquare;
                                            } else if (item.type === 'note') {
                                                Icon = MessageSquare;
                                            } else if (item.type === 'generic') {
                                                // Generic tool icons
                                                switch ((item as any).subtype) {
                                                    case 'process': Icon = Square; break;
                                                    case 'database': Icon = Database; break;
                                                    case 'file': Icon = File; break;
                                                    case 'start-end': Icon = Play; break;
                                                    case 'decision': Icon = HelpCircle; break;
                                                    case 'actor': Icon = User; break;
                                                    default: Icon = Activity;
                                                }
                                            } else {
                                                Icon = getAwsIcon(item.service, item.type || '');
                                            }

                                            return (
                                                <Tooltip key={`${item.service}-${item.name}`}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => handleAddNode(item)}
                                                            className="flex flex-col items-center justify-center p-3 h-24 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/50 hover:shadow-sm transition-all text-center group"
                                                        >
                                                            <div className="p-2 rounded-full bg-muted group-hover:bg-background transition-colors mb-2">
                                                                <Icon
                                                                    className={cn(
                                                                        "w-8 h-8",
                                                                        (item.type === 'client' || item.type === 'frame' || item.type === 'note' || item.type === 'annotation') && "text-primary"
                                                                    )}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium truncate w-full px-1">
                                                                {item.name}
                                                            </span>
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-[200px]">
                                                        <p className="font-semibold mb-1">{item.name}</p>
                                                        <p className="text-xs">{item.description}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {filteredServices.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p>No components found matching "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    </TooltipProvider>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
