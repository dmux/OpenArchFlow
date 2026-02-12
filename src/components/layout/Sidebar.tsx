import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDiagramStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Layout, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Simple date formatter to avoid extra dependency for now
const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const diagrams = useDiagramStore((state) => state.diagrams);
    const activeDiagramId = useDiagramStore((state) => state.activeDiagramId);
    const createDiagram = useDiagramStore((state) => state.createDiagram);
    const setActiveDiagram = useDiagramStore((state) => state.setActiveDiagram);
    const deleteDiagram = useDiagramStore((state) => state.deleteDiagram);
    // ...

    // Sort diagrams by lastModified desc
    const sortedDiagrams = Object.values(diagrams).sort((a, b) => b.lastModified - a.lastModified);

    const handleCreate = () => {
        createDiagram('New Architecture');
    };

    return (
        <div
            className={cn(
                "h-full bg-background border-r transition-[width] duration-300 ease-in-out overflow-hidden flex-shrink-0",
                isOpen ? "w-80" : "w-0 border-r-0"
            )}
        >
            <div className="w-80 h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <Layout className="w-5 h-5" />
                        My Diagrams
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-4">
                    <Button onClick={handleCreate} className="w-full flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Diagram
                    </Button>
                </div>

                <Separator />

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                        {sortedDiagrams.map((diagram) => (
                            <div
                                key={diagram.id}
                                onClick={() => setActiveDiagram(diagram.id)}
                                className={cn(
                                    "group flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors",
                                    activeDiagramId === diagram.id ? "bg-accent border-primary" : "bg-card"
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm truncate">{diagram.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(diagram.lastModified)}
                                    </p>
                                </div>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Diagram?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete "{diagram.name}"? This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteDiagram(diagram.id);
                                                }}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-4 text-xs text-center text-muted-foreground border-t">
                    {sortedDiagrams.length} diagrams stored locally
                </div>
            </div>
        </div>
    );
}
