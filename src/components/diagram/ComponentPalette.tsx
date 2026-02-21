'use client';

import React, { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Search, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiagramStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getAllProviders, getServiceIcon } from "@/lib/registry";
import { ProviderId } from "@/lib/providers/types";

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
    const [activeProviderId, setActiveProviderId] = useState<ProviderId>('aws');
    const addNode = useDiagramStore((state) => state.addNode);

    const providers = getAllProviders();
    const activeProvider = providers.find(p => p.id === activeProviderId) || providers[0];

    // Some generic tools shouldn't filter by name as strictly or we just filter normally
    const filteredServices = activeProvider.services.map(category => ({
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
                provider: activeProviderId,
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
                        Browse and add architecture components to your diagram.
                    </SheetDescription>

                    {/* Provider Tabs */}
                    <div className="flex flex-wrap gap-2 mt-4 pb-2">
                        {providers.map(p => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    setActiveProviderId(p.id);
                                    setSearchQuery("");
                                }}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                                    activeProviderId === p.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                )}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>

                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Search ${activeProvider.name} services...`}
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
                                            const Icon = getServiceIcon(activeProviderId, item.service, item.type || '', (item as any).subtype);

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
                                                                        "w-8 h-8 transition-colors",
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
                                    <p>No {activeProvider.name} components found matching "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    </TooltipProvider>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
