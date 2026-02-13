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
import { Plus, Trash2, Layout, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
    const renameDiagram = useDiagramStore((state) => state.renameDiagram);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // ...

    // Sort diagrams by lastModified desc
    const sortedDiagrams = Object.values(diagrams).sort((a, b) => b.lastModified - a.lastModified);

    const handleCreate = () => {
        createDiagram('New Architecture');
    };

    const startEditing = (e: React.MouseEvent, diagram: any) => {
        e.stopPropagation();
        setEditingId(diagram.id);
        setEditName(diagram.name);
    };

    const saveEditing = (e?: React.FocusEvent | React.KeyboardEvent) => {
        if (e) e.stopPropagation();

        if (editingId && editName.trim()) {
            renameDiagram(editingId, editName.trim());
        }
        setEditingId(null);
        setEditName('');
    };

    const cancelEditing = (e?: React.KeyboardEvent) => {
        if (e) e.stopPropagation();
        setEditingId(null);
        setEditName('');
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
                                <div className="flex-1 min-w-0 mr-2">
                                    {editingId === diagram.id ? (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={saveEditing}
                                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') saveEditing(e);
                                                    if (e.key === 'Escape') cancelEditing(e);
                                                }}
                                                autoFocus
                                                className="h-7 text-sm py-1 px-2"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="font-medium text-sm truncate" title={diagram.name}>{diagram.name}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(diagram.lastModified)}
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={(e) => startEditing(e, diagram)}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
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
