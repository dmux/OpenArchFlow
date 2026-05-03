'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDiagramStore, Layer } from '@/lib/store';

const LAYER_COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4',
];

interface LayerRowProps {
    layer: Layer;
    nodeCount: number;
    onToggleVisible: () => void;
    onToggleLocked: () => void;
    onRename: (name: string) => void;
    onColorChange: (color: string) => void;
    onDelete: () => void;
    canDelete: boolean;
}

function LayerRow({ layer, nodeCount, onToggleVisible, onToggleLocked, onRename, onColorChange, onDelete, canDelete }: LayerRowProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(layer.name);

    const commitRename = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== layer.name) onRename(trimmed);
        else setDraft(layer.name);
        setEditing(false);
    };

    return (
        <div className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg group transition-colors',
            !layer.visible && 'opacity-50',
            'hover:bg-accent/50'
        )}>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />

            {/* Color swatch */}
            <div className="relative shrink-0">
                <div
                    className="h-3 w-3 rounded-full border border-border/50 cursor-pointer"
                    style={{ backgroundColor: layer.color }}
                    onClick={(e) => {
                        e.stopPropagation();
                        const nextIndex = (LAYER_COLORS.indexOf(layer.color) + 1) % LAYER_COLORS.length;
                        onColorChange(LAYER_COLORS[nextIndex]);
                    }}
                    title="Click to cycle color"
                />
            </div>

            {/* Name */}
            {editing ? (
                <Input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') { setDraft(layer.name); setEditing(false); }
                    }}
                    className="h-5 text-xs px-1 py-0 border-none bg-accent focus-visible:ring-1"
                />
            ) : (
                <span
                    className="flex-1 text-xs font-medium truncate cursor-pointer"
                    onDoubleClick={() => { setDraft(layer.name); setEditing(true); }}
                    title="Double-click to rename"
                >
                    {layer.name}
                </span>
            )}

            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{nodeCount}</span>

            <Button variant="ghost" size="icon" className="h-6 w-6 rounded shrink-0 opacity-0 group-hover:opacity-100" onClick={onToggleVisible}>
                {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded shrink-0 opacity-0 group-hover:opacity-100" onClick={onToggleLocked}>
                {layer.locked ? <Lock className="h-3 w-3 text-amber-500" /> : <Unlock className="h-3 w-3" />}
            </Button>
            {canDelete && (
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}

interface LayersPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LayersPanel({ isOpen, onClose }: LayersPanelProps) {
    const activeDiagramId = useDiagramStore((s) => s.activeDiagramId);
    const diagrams = useDiagramStore((s) => s.diagrams);
    const addLayer = useDiagramStore((s) => s.addLayer);
    const removeLayer = useDiagramStore((s) => s.removeLayer);
    const updateLayer = useDiagramStore((s) => s.updateLayer);

    const diagram = activeDiagramId ? diagrams[activeDiagramId] : null;
    const layers: Layer[] = diagram?.layers ?? [{ id: 'default', name: 'Default', visible: true, locked: false, color: '#6366f1' }];
    const nodes = diagram?.nodes ?? [];

    const nodeCountByLayer = React.useMemo(() => {
        const counts: Record<string, number> = {};
        for (const n of nodes) {
            const lid = n.data?.layerId ?? 'default';
            counts[lid] = (counts[lid] ?? 0) + 1;
        }
        return counts;
    }, [nodes]);

    if (!isOpen) return null;

    return (
        <div className="fixed left-[72px] top-1/2 -translate-y-1/2 z-[65] w-56 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={onClose}>
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="py-1 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {[...layers].reverse().map((layer) => (
                    <LayerRow
                        key={layer.id}
                        layer={layer}
                        nodeCount={nodeCountByLayer[layer.id] ?? 0}
                        onToggleVisible={() => updateLayer(layer.id, { visible: !layer.visible })}
                        onToggleLocked={() => updateLayer(layer.id, { locked: !layer.locked })}
                        onRename={(name) => updateLayer(layer.id, { name })}
                        onColorChange={(color) => updateLayer(layer.id, { color })}
                        onDelete={() => removeLayer(layer.id)}
                        canDelete={layers.length > 1}
                    />
                ))}
            </div>

            <div className="px-2 pb-2 pt-1 border-t border-border">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs justify-start gap-1.5 rounded-lg"
                    onClick={() => addLayer()}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add Layer
                </Button>
            </div>
        </div>
    );
}
