'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { AppNodeData } from '@/lib/store';

const CustomShapeNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const svgContent: string = (data as any).svgContent ?? '';
    const label: string = data.label ?? '';

    return (
        <>
            <NodeResizer minWidth={60} minHeight={60} isVisible={selected} lineClassName="!border-primary" handleClassName="!w-2.5 !h-2.5 !bg-primary" />
            <div
                className={`relative flex flex-col items-center justify-center w-full h-full rounded-lg transition-all ${selected ? 'ring-2 ring-primary' : ''}`}
                style={{ minWidth: 80, minHeight: 80 }}
            >
                <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-muted-foreground" />

                {svgContent ? (
                    <div
                        className="w-12 h-12 flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">SVG</div>
                )}

                {label && (
                    <span className="mt-1 text-xs font-medium text-foreground text-center leading-tight max-w-[120px] truncate">{label}</span>
                )}

                <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-muted-foreground" />
            </div>
        </>
    );
};

export default memo(CustomShapeNode);
