"use client";

import React, { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Box, Upload, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDiagramStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getAllProviders, getServiceIcon } from "@/lib/registry";
import { ProviderId } from "@/lib/providers/types";
import { toast } from "sonner";

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

export default function ComponentPalette({
  isOpen,
  onOpenChange,
}: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ProviderId | "custom">("aws");
  const activeProviderId =
    activeTab === "custom" ? "aws" : (activeTab as ProviderId);
  const addNode = useDiagramStore((state) => state.addNode);
  const customShapes = useDiagramStore((state) => state.customShapes);
  const addCustomShape = useDiagramStore((state) => state.addCustomShape);
  const removeCustomShape = useDiagramStore((state) => state.removeCustomShape);
  const fileRef = useRef<HTMLInputElement>(null);

  const providers = getAllProviders();
  const activeProvider =
    providers.find((p) => p.id === activeProviderId) || providers[0];

  // Some generic tools shouldn't filter by name as strictly or we just filter normally
  const filteredServices = activeProvider.services
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.service.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.items.length > 0);

  const handleSvgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    // Sanitize using the native browser DOMParser — no SSR-unsafe imports needed
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) {
      toast.error("Invalid SVG file");
      return;
    }
    // Strip dangerous elements and attributes
    svgEl
      .querySelectorAll("script, foreignObject")
      .forEach((el) => el.remove());
    svgEl.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (
          attr.name.startsWith("on") ||
          ((attr.name === "href" || attr.name === "xlink:href") &&
            attr.value.trimStart().toLowerCase().startsWith("javascript:"))
        )
          el.removeAttribute(attr.name);
      });
    });
    const clean = svgEl.outerHTML;
    addCustomShape(file.name.replace(/\.svg$/i, ""), clean);
    toast.success(`Shape "${file.name}" added`);
    e.target.value = "";
  };

  const handleAddCustomNode = (shape: {
    id: string;
    name: string;
    svgContent: string;
  }) => {
    addNode({
      id: crypto.randomUUID(),
      type: "custom-shape",
      position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
      data: {
        label: shape.name,
        service: "Custom",
        type: "custom-shape",
        svgContent: shape.svgContent,
      } as any,
    });
  };

  const handleAddNode = (item: any) => {
    const id = crypto.randomUUID();
    const newNode = {
      id,
      type: item.type,
      position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
      data: {
        label: item.name,
        service: item.service,
        type: item.type,
        subtype: (item as any).subtype,
        provider: activeProviderId,
        // Traffic Source nodes start with a sensible RPS default so they
        // are immediately recognised as entry points by the simulation engine
        ...(item.type === "traffic-source" && {
          mock: {
            enabled: true,
            requestsPerSecond: 10,
            httpMethod: "POST",
            httpPath: "/",
            payloadTemplate: '{\n  "key": "value"\n}',
          },
        }),
      },
    };
    addNode(newNode);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full sm:w-[400px] flex flex-col p-0 ml-0 my-0 h-full sm:ml-20 sm:my-4 sm:h-[calc(100vh-32px)] rounded-none sm:rounded-2xl shadow-2xl border-border bg-background/95 backdrop-blur-xl"
      >
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
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveTab(p.id);
                  setSearchQuery("");
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                  activeTab === p.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                {p.name}
              </button>
            ))}
            <button
              onClick={() => {
                setActiveTab("custom");
                setSearchQuery("");
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                activeTab === "custom"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              Custom
            </button>
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
          {activeTab === "custom" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Upload your own SVG icons and shapes.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload SVG
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="hidden"
                  onChange={handleSvgUpload}
                />
              </div>
              {customShapes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Upload className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No custom shapes yet.</p>
                  <p className="text-xs mt-1">
                    Upload an SVG file to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {customShapes.map((shape) => (
                    <div key={shape.id} className="relative group">
                      <button
                        onClick={() => handleAddCustomNode(shape)}
                        className="flex flex-col items-center justify-center p-3 h-24 w-full rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/50 hover:shadow-sm transition-all text-center"
                      >
                        <div
                          className="w-10 h-10 flex items-center justify-center mb-1 [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: shape.svgContent }}
                        />
                        <span className="text-xs font-medium truncate w-full px-1">
                          {shape.name}
                        </span>
                      </button>
                      <button
                        onClick={() => removeCustomShape(shape.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded bg-destructive text-destructive-foreground transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <TooltipProvider delayDuration={300}>
              <div className="space-y-6">
                {filteredServices.map((category) => (
                  <div key={category.category} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {category.category}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {category.items.map((item) => {
                        const Icon = getServiceIcon(
                          activeProviderId,
                          item.service,
                          item.type || "",
                          (item as any).subtype,
                        );

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
                                      (item.type === "client" ||
                                        item.type === "frame" ||
                                        item.type === "note" ||
                                        item.type === "annotation") &&
                                        "text-primary",
                                    )}
                                  />
                                </div>
                                <span className="text-xs font-medium truncate w-full px-1">
                                  {item.name}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[200px]"
                            >
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
                    <p>
                      No {activeProvider.name} components found matching "
                      {searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </TooltipProvider>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
