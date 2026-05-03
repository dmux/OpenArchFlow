'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { AppNodeData } from '@/lib/store';

interface Lane {
    id: string;
    title: string;
    color: string;
}

const DEFAULT_LANES: Lane[] = [
    { id: 'lane-1', title: 'Lane 1', color: '#6366f1' },
    { id: 'lane-2', title: 'Lane 2', color: '#10b981' },
];

const SwimlaneNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const title: string = (data.metadata?.title as string) || data.label || 'Swimlane';
    const lanes: Lane[] = (data.metadata?.lanes as Lane[]) || DEFAULT_LANES;
    const direction: 'horizontal' | 'vertical' = (data.metadata?.direction as any) || 'horizontal';
    const isHorizontal = direction === 'horizontal';

    return (
        <>
            <NodeResizer
                minWidth={300}
                minHeight={200}
                isVisible={selected}
                lineClassName="!border-primary"
                handleClassName="!w-3 !h-3 !bg-primary"
            />
            <div
                className={`relative w-full h-full rounded-xl border-2 overflow-hidden ${selected ? 'border-primary shadow-lg' : 'border-border'}`}
                style={{ background: 'hsl(var(--card))' }}
            >
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 h-8 flex items-center px-3 z-10 bg-muted/80 border-b border-border">
                    <span className="text-xs font-semibold text-foreground truncate">{title}</span>
                </div>

                {/* Lanes */}
                <div className={`absolute inset-0 top-8 flex ${isHorizontal ? 'flex-col' : 'flex-row'}`}>
                    {lanes.map((lane, i) => (
                        <div
                            key={lane.id}
                            className={`flex-1 relative ${i > 0 ? (isHorizontal ? 'border-t' : 'border-l') : ''} border-border/60`}
                            style={{ background: `${lane.color}08` }}
                        >
                            {/* Lane label */}
                            <div
                                className={`absolute flex items-center justify-center text-[10px] font-semibold text-white z-10 ${isHorizontal
                                    ? 'left-0 top-0 bottom-0 w-7 flex-col'
                                    : 'top-0 left-0 right-0 h-6'
                                    }`}
                                style={{ backgroundColor: lane.color, writingMode: isHorizontal ? 'vertical-rl' : undefined }}
                            >
                                {lane.title}
                            </div>
                        </div>
                    ))}
                </div>

                <Handle type="target" position={Position.Top} className="!opacity-0" />
                <Handle type="source" position={Position.Bottom} className="!opacity-0" />
            </div>
        </>
    );
};

export default memo(SwimlaneNode);
