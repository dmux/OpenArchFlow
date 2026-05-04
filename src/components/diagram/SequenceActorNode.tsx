'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { AppNodeData } from '@/lib/store';
import { User } from 'lucide-react';

const ACTOR_BOX_HEIGHT = 48;
const ACTOR_BOX_WIDTH = 140;
const LIFELINE_SLOT_HEIGHT = 50;
const LIFELINE_SLOTS = 16;
const LIFELINE_HEIGHT = LIFELINE_SLOTS * LIFELINE_SLOT_HEIGHT;

const SequenceActorNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const actorName: string = data.label ?? 'Actor';
    const subtype: string = data.metadata?.subtype as string ?? 'actor';
    const isSystem = subtype === 'system' || subtype === 'boundary';

    return (
        <>
            <NodeResizer
                minWidth={ACTOR_BOX_WIDTH}
                minHeight={ACTOR_BOX_HEIGHT + LIFELINE_HEIGHT}
                isVisible={selected}
                lineClassName="!border-primary"
                handleClassName="!w-2.5 !h-2.5 !bg-primary"
            />
            <div className="relative" style={{ width: ACTOR_BOX_WIDTH }}>
                {/* Actor box */}
                <div
                    className={`flex flex-col items-center justify-center rounded-lg border-2 bg-card text-card-foreground transition-all ${selected ? 'border-primary shadow-lg' : 'border-border'}`}
                    style={{ height: ACTOR_BOX_HEIGHT, minWidth: ACTOR_BOX_WIDTH }}
                >
                    <Handle type="target" position={Position.Top} id="top" className="!w-2.5 !h-2.5 !bg-primary/60" />
                    <Handle type="source" position={Position.Top} id="top-src" className="!opacity-0 !pointer-events-none" />

                    <div className="flex items-center gap-1.5 px-2">
                        {isSystem ? (
                            <div className="w-4 h-4 rounded-sm border border-current opacity-60 shrink-0" />
                        ) : (
                            <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className="text-xs font-semibold truncate">{actorName}</span>
                    </div>
                </div>

                {/* Lifeline */}
                <div className="relative" style={{ height: LIFELINE_HEIGHT }}>
                    {/* Dashed vertical line centered */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            bottom: 0,
                            width: 0,
                            borderLeft: '2px dashed hsl(var(--border))',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Per-slot source/target handles along the lifeline */}
                    {Array.from({ length: LIFELINE_SLOTS }).map((_, i) => {
                        const top = i * LIFELINE_SLOT_HEIGHT + LIFELINE_SLOT_HEIGHT / 2;
                        return (
                            <React.Fragment key={i}>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`lifeline-src-${i}`}
                                    style={{ top, right: 0 }}
                                    className="!w-2 !h-2 !bg-primary/50 !opacity-0 hover:!opacity-100"
                                />
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={`lifeline-tgt-${i}`}
                                    style={{ top, left: 0 }}
                                    className="!w-2 !h-2 !bg-primary/50 !opacity-0 hover:!opacity-100"
                                />
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Bottom activation box placeholder */}
                <div
                    className={`flex items-center justify-center rounded-lg border-2 bg-card text-card-foreground ${selected ? 'border-primary' : 'border-border'}`}
                    style={{ height: ACTOR_BOX_HEIGHT, minWidth: ACTOR_BOX_WIDTH }}
                >
                    <div className="flex items-center gap-1.5 px-2">
                        {isSystem ? (
                            <div className="w-4 h-4 rounded-sm border border-current opacity-60 shrink-0" />
                        ) : (
                            <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className="text-xs font-semibold truncate text-muted-foreground">{actorName}</span>
                    </div>
                    <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2.5 !h-2.5 !bg-primary/60" />
                    <Handle type="target" position={Position.Bottom} id="bottom-tgt" className="!opacity-0 !pointer-events-none" />
                </div>
            </div>
        </>
    );
};

export default memo(SequenceActorNode);
