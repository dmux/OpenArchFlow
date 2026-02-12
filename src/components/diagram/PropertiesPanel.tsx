import React from 'react';
import { useDiagramStore } from '@/lib/store';
import { X, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export default function PropertiesPanel() {
    const { selectedNodeId, diagrams, activeDiagramId, setSelectedNode } = useDiagramStore();

    if (!activeDiagramId || !selectedNodeId) return null;

    const activeDiagram = diagrams[activeDiagramId];
    if (!activeDiagram) return null;

    const selectedNode = activeDiagram.nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return null;

    const { label, service, metadata } = selectedNode.data;
    const type = selectedNode.type || 'default';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="fixed right-4 top-24 bottom-4 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-start justify-between bg-muted/30">
                    <div>
                        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                            {service} <span className="text-[10px] h-5 px-1.5 border border-border rounded-full flex items-center">{type}</span>
                        </div>
                        <h2 className="text-xl font-bold text-card-foreground leading-tight">{label}</h2>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1" onClick={() => setSelectedNode(null)}>
                        <X size={18} />
                    </Button>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-6">

                        {/* Metadata Section */}
                        {metadata && Object.keys(metadata).length > 0 ? (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Info size={14} /> Configuration & Details
                                </h3>
                                <div className="grid gap-3">
                                    {Object.entries(metadata).map(([key, value]) => (
                                        <div key={key} className="bg-muted/50 p-3 rounded-lg border border-border/50">
                                            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{key.replace(/_/g, ' ')}</div>
                                            <div className="text-sm font-medium text-foreground break-words">{String(value)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic text-center py-8">
                                No additional configuration details available for this resource.
                            </div>
                        )}

                        <Separator />

                        {/* Actions / Links (Placeholder) */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground">Actions</h3>
                            <Button variant="outline" className="w-full justify-start gap-2" asChild>
                                <a href={`https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation-guide&searchQuery=${service}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink size={14} /> View AWS Documentation
                                </a>
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            </motion.div>
        </AnimatePresence>
    );
}
