import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { cn } from '@/lib/utils';
import { AppNodeData } from '@/lib/store';

const FrameNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const { label, metadata } = data;
    const title = metadata?.title || label || 'Group';
    const description = metadata?.description || '';
    const backgroundColor = metadata?.backgroundColor || 'rgba(147, 197, 253, 0.1)'; // blue-300 with opacity
    const borderColor = metadata?.borderColor || 'rgb(147, 197, 253)'; // blue-300

    return (
        <>
            <NodeResizer
                minWidth={200}
                minHeight={150}
                isVisible={selected}
                lineClassName="!border-primary"
                handleClassName="!w-3 !h-3 !bg-primary"
            />
            <div
                className={cn(
                    "relative w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200 p-4",
                    selected ? "shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "shadow-sm"
                )}
                style={{
                    backgroundColor,
                    borderColor: selected ? 'hsl(var(--primary))' : borderColor,
                }}
            >
                {/* Title */}
                <div className="absolute -top-3 left-4 px-3 py-1 rounded-md font-semibold text-sm"
                    style={{
                        backgroundColor: borderColor,
                        color: 'white',
                    }}
                >
                    {title}
                </div>

                {/* Description */}
                {description && (
                    <div className="absolute top-6 left-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm p-2 rounded-md">
                        {description}
                    </div>
                )}

                {/* Handles - optional, frames might not need connections */}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="opacity-0"
                    isConnectable={false}
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="opacity-0"
                    isConnectable={false}
                />
            </div>
        </>
    );
};

export default memo(FrameNode);
