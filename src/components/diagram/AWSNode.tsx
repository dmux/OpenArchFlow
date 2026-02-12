import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { getAwsIcon } from '@/lib/aws-icon-registry';

const AWSNode = ({ data, selected }: NodeProps) => {
    const Icon = getAwsIcon(data.service, data.type);
    const label = data.label || 'AWS Resource';
    const service = data.service || 'Service';
    // The main difference is styling: Official icons are colored SVGs, so we shouldn't tint them.
    // Lucide icons (fallbacks) need tinting.

    // Simple heuristic: If the service name was found in our registry, it's likely an official icon.
    // However, for simplicity, we'll just render the icon. 
    // If we want to strictly differentiate, we could have getAwsIcon return metadata.
    // For now, let's assume if it comes from our registry it might be colored, so we remove the `text-primary` class
    // dependent on whether we want to enforce theme colors or use official brand colors.
    // Official icons usually shouldn't be overridden with `text-primary`.

    return (
        <div
            className={cn(
                "relative group flex flex-col items-center justify-center p-4 min-w-[120px] rounded-xl border-2 bg-card transition-all duration-200",
                selected
                    ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105"
                    : "border-border hover:border-primary/50 hover:shadow-lg"
            )}
        >
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary"
            />

            {/* Icon Circle */}
            <div className={cn(
                "p-3 rounded-full mb-2 transition-colors",
                selected ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5"
            )}>
                {/* We pass size/strokeWidth props, but official icons might ignore strokeWidth if they are filled SVGs */}
                <Icon size={48} className="w-12 h-12" />
            </div>

            {/* Labels */}
            <div className="text-center">
                <div className="font-semibold text-sm text-foreground leading-tight">{label}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-medium bg-muted/50 px-2 py-0.5 rounded-full inline-block">
                    {service}
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary"
            />
        </div>
    );
};

export default memo(AWSNode);
