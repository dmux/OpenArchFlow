import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { AppNodeData } from '@/lib/store';
import { MessageSquare } from 'lucide-react';

const NoteNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const { label, metadata } = data;
    const text = metadata?.text || label || 'New Note';
    const backgroundColor = metadata?.backgroundColor || '#fef08a'; // yellow-200
    const borderColor = metadata?.borderColor || '#facc15'; // yellow-400
    const textColor = metadata?.textColor || '#854d0e'; // yellow-900
    const fontSize = metadata?.fontSize || '13px';

    return (
        <div
            className={cn(
                "flex items-center justify-center transition-all duration-200 border-2 shadow-sm",
                selected
                    ? "px-4 py-3 min-w-[120px] min-h-[60px] rounded-lg ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md"
                    : "w-10 h-10 rounded-full opacity-80 hover:opacity-100 scale-100"
            )}
            style={{
                backgroundColor,
                borderColor,
                color: textColor,
                fontSize: selected ? fontSize : '16px'
            }}
        >
            {selected ? (
                <div className="font-medium whitespace-pre-wrap break-words leading-relaxed">
                    {text}
                </div>
            ) : (
                <MessageSquare className="w-5 h-5" />
            )}

            {/* Hidden handles to allow connections if desired, though annotations are usually terminal */}
            <Handle
                type="target"
                position={Position.Top}
                className="opacity-0 w-0 h-0 border-0"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="opacity-0 w-0 h-0 border-0"
            />
        </div>
    );
};

export default memo(NoteNode);
