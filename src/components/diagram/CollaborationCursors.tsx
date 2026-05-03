'use client';

import React, { useEffect, useState } from 'react';
import { getAwareness, getRemoteCursors, RemoteCursor } from '@/lib/collaboration';
import { useDiagramStore } from '@/lib/store';

export default function CollaborationCursors() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [cursors, setCursors] = useState<RemoteCursor[]>([]);
    const collaborationRoomId = useDiagramStore((s) => s.collaborationRoomId);

    useEffect(() => {
        if (!collaborationRoomId) { setCursors([]); return; }

        const awareness = getAwareness();
        if (!awareness) return;

        const update = () => setCursors(getRemoteCursors());
        awareness.on('change', update);
        return () => awareness.off('change', update);
    }, [collaborationRoomId]);

    if (!mounted || cursors.length === 0) return null;

    // Read the ReactFlow viewport transform to convert flow coords → screen coords
    const vpEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    const transform = vpEl ? vpEl.style.transform : '';
    const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/);
    const tx = match ? parseFloat(match[1]) : 0;
    const ty = match ? parseFloat(match[2]) : 0;
    const scale = match ? parseFloat(match[3]) : 1;

    return (
        <div className="absolute inset-0 pointer-events-none z-[65] overflow-hidden">
            {cursors.map((c) => {
                const screenX = c.x * scale + tx;
                const screenY = c.y * scale + ty;
                return (
                    <div
                        key={c.clientId}
                        className="absolute flex items-start gap-1"
                        style={{ left: screenX, top: screenY, transform: 'translate(-2px, -2px)' }}
                    >
                        {/* Cursor arrow */}
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                                d="M2 2L14 6.5L8 8.5L5.5 14L2 2Z"
                                fill={c.color}
                                stroke="white"
                                strokeWidth="1"
                            />
                        </svg>
                        {/* Name label */}
                        <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-white whitespace-nowrap"
                            style={{ backgroundColor: c.color }}
                        >
                            {c.name}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
