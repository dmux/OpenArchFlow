'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignHorizontalSpaceAround,
    AlignVerticalSpaceAround,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDiagramStore } from '@/lib/store';

export default function AlignmentToolbar() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const activeDiagramId = useDiagramStore((s) => s.activeDiagramId);
    const diagrams = useDiagramStore((s) => s.diagrams);
    const setNodes = useDiagramStore((s) => s.setNodes);

    const nodes = activeDiagramId ? (diagrams[activeDiagramId]?.nodes ?? []) : [];
    const selectedNodes = nodes.filter((n) => n.selected);
    const visible = mounted && selectedNodes.length >= 2;

    const align = useCallback(
        (type: string) => {
            if (!activeDiagramId) return;
            const all = diagrams[activeDiagramId]?.nodes ?? [];
            const sel = all.filter((n) => n.selected);
            if (sel.length < 2) return;

            const updated = all.map((node) => {
                if (!node.selected) return node;
                let x = node.position.x;
                let y = node.position.y;
                const w = node.width ?? 150;
                const h = node.height ?? 50;

                const minX = Math.min(...sel.map((n) => n.position.x));
                const maxX = Math.max(...sel.map((n) => n.position.x + (n.width ?? 150)));
                const minY = Math.min(...sel.map((n) => n.position.y));
                const maxY = Math.max(...sel.map((n) => n.position.y + (n.height ?? 50)));
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;

                switch (type) {
                    case 'left':   x = minX; break;
                    case 'centerX': x = centerX - w / 2; break;
                    case 'right':  x = maxX - w; break;
                    case 'top':    y = minY; break;
                    case 'centerY': y = centerY - h / 2; break;
                    case 'bottom': y = maxY - h; break;
                    case 'distH': {
                        const sorted = [...sel].sort((a, b) => a.position.x - b.position.x);
                        const totalW = sorted.reduce((s, n) => s + (n.width ?? 150), 0);
                        const spanX = (sorted[sorted.length - 1].position.x + (sorted[sorted.length - 1].width ?? 150)) - sorted[0].position.x;
                        const gap = (spanX - totalW) / (sorted.length - 1);
                        let cur = sorted[0].position.x + (sorted[0].width ?? 150) + gap;
                        for (let i = 1; i < sorted.length - 1; i++) {
                            if (sorted[i].id === node.id) x = cur;
                            cur += (sorted[i].width ?? 150) + gap;
                        }
                        break;
                    }
                    case 'distV': {
                        const sorted = [...sel].sort((a, b) => a.position.y - b.position.y);
                        const totalH = sorted.reduce((s, n) => s + (n.height ?? 50), 0);
                        const spanY = (sorted[sorted.length - 1].position.y + (sorted[sorted.length - 1].height ?? 50)) - sorted[0].position.y;
                        const gap = (spanY - totalH) / (sorted.length - 1);
                        let cur = sorted[0].position.y + (sorted[0].height ?? 50) + gap;
                        for (let i = 1; i < sorted.length - 1; i++) {
                            if (sorted[i].id === node.id) y = cur;
                            cur += (sorted[i].height ?? 50) + gap;
                        }
                        break;
                    }
                }
                return { ...node, position: { x, y } };
            });

            setNodes(updated);
        },
        [activeDiagramId, diagrams, setNodes]
    );

    if (!visible) return null;

    const tools = [
        { id: 'left',    icon: AlignStartVertical,          label: 'Align Left',            action: () => align('left') },
        { id: 'centerX', icon: AlignCenterVertical,         label: 'Align Center (H)',      action: () => align('centerX') },
        { id: 'right',   icon: AlignEndVertical,            label: 'Align Right',           action: () => align('right') },
        { id: 'top',     icon: AlignStartHorizontal,        label: 'Align Top',             action: () => align('top') },
        { id: 'centerY', icon: AlignCenterHorizontal,       label: 'Align Middle (V)',      action: () => align('centerY') },
        { id: 'bottom',  icon: AlignEndHorizontal,          label: 'Align Bottom',          action: () => align('bottom') },
        { id: 'distH',   icon: AlignHorizontalSpaceAround,  label: 'Distribute Horizontal', action: () => align('distH') },
        { id: 'distV',   icon: AlignVerticalSpaceAround,    label: 'Distribute Vertical',   action: () => align('distV') },
    ];

    return (
        <TooltipProvider delayDuration={0}>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1 bg-background/90 backdrop-blur-xl border border-border rounded-xl shadow-2xl px-2 py-1.5">
                {tools.map((t) => (
                    <Tooltip key={t.id}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={t.action}
                                className="h-8 w-8 rounded-lg hover:bg-accent"
                            >
                                <t.icon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p className="text-xs font-medium">{t.label}</p></TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    );
}
