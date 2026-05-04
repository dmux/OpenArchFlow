'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Node } from 'reactflow';
import { useDiagramStore } from '@/lib/store';

const THRESHOLD = 6;

interface GuideLine {
    orientation: 'h' | 'v';
    position: number;
    length: number;
    start: number;
}

export default function AlignmentGuides() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [guides, setGuides] = useState<GuideLine[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeDiagramId = useDiagramStore((s) => s.activeDiagramId);
    const diagrams = useDiagramStore((s) => s.diagrams);
    const getNodes = useCallback((): Node[] => {
        if (!activeDiagramId) return [];
        return (diagrams[activeDiagramId]?.nodes ?? []) as Node[];
    }, [activeDiagramId, diagrams]);

    const computeGuides = useCallback(
        (draggedNode: Node, allNodes: Node[]) => {
            const others = allNodes.filter((n) => n.id !== draggedNode.id);
            const dW = draggedNode.width ?? 150;
            const dH = draggedNode.height ?? 50;
            const dx = draggedNode.position.x;
            const dy = draggedNode.position.y;

            const result: GuideLine[] = [];

            for (const n of others) {
                const nW = n.width ?? 150;
                const nH = n.height ?? 50;
                const nx = n.position.x;
                const ny = n.position.y;

                const vChecks: [number, number][] = [
                    [dx, nx], [dx, nx + nW], [dx, nx + nW / 2],
                    [dx + dW, nx], [dx + dW, nx + nW], [dx + dW, nx + nW / 2],
                    [dx + dW / 2, nx], [dx + dW / 2, nx + nW], [dx + dW / 2, nx + nW / 2],
                ];

                for (const [a, b] of vChecks) {
                    if (Math.abs(a - b) < THRESHOLD) {
                        const minY = Math.min(dy, ny);
                        const maxY = Math.max(dy + dH, ny + nH);
                        result.push({ orientation: 'v', position: b, length: maxY - minY, start: minY });
                        break;
                    }
                }

                const hChecks: [number, number][] = [
                    [dy, ny], [dy, ny + nH], [dy, ny + nH / 2],
                    [dy + dH, ny], [dy + dH, ny + nH], [dy + dH, ny + nH / 2],
                    [dy + dH / 2, ny], [dy + dH / 2, ny + nH], [dy + dH / 2, ny + nH / 2],
                ];

                for (const [a, b] of hChecks) {
                    if (Math.abs(a - b) < THRESHOLD) {
                        const minX = Math.min(dx, nx);
                        const maxX = Math.max(dx + dW, nx + nW);
                        result.push({ orientation: 'h', position: b, length: maxX - minX, start: minX });
                        break;
                    }
                }
            }

            return result;
        },
        []
    );

    useEffect(() => {
        if (!mounted) return;
        const rfWrapper = document.querySelector('.react-flow__pane') as HTMLElement | null;
        if (!rfWrapper) return;

        const onDrag = () => {
            const allNodes = getNodes();
            const dragging = allNodes.find((n) => (n as any).dragging);
            if (!dragging) { setGuides([]); return; }
            setGuides(computeGuides(dragging as Node, allNodes));
        };

        const onDragEnd = () => setGuides([]);

        rfWrapper.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
        return () => {
            rfWrapper.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', onDragEnd);
        };
    }, [mounted, getNodes, computeGuides]);

    if (!mounted || guides.length === 0) return null;

    const vpEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    const transform = vpEl ? vpEl.style.transform : '';
    const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/);
    const tx = match ? parseFloat(match[1]) : 0;
    const ty = match ? parseFloat(match[2]) : 0;
    const scale = match ? parseFloat(match[3]) : 1;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 pointer-events-none z-[55] overflow-hidden"
        >
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                {guides.map((g, i) => {
                    if (g.orientation === 'v') {
                        const x = g.position * scale + tx;
                        const y1 = g.start * scale + ty;
                        const y2 = (g.start + g.length) * scale + ty;
                        return (
                            <line
                                key={i}
                                x1={x} y1={y1} x2={x} y2={y2}
                                stroke="hsl(var(--primary))"
                                strokeWidth={1}
                                strokeDasharray="4 2"
                                opacity={0.8}
                            />
                        );
                    } else {
                        const y = g.position * scale + ty;
                        const x1 = g.start * scale + tx;
                        const x2 = (g.start + g.length) * scale + tx;
                        return (
                            <line
                                key={i}
                                x1={x1} y1={y} x2={x2} y2={y}
                                stroke="hsl(var(--primary))"
                                strokeWidth={1}
                                strokeDasharray="4 2"
                                opacity={0.8}
                            />
                        );
                    }
                })}
            </svg>
        </div>
    );
}
