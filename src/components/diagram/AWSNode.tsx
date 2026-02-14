import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { getAwsIcon } from '@/lib/aws-icon-registry';

import { AppNodeData } from '@/lib/store';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AWSNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const { label, service, simulation } = data;
    const isProcessing = simulation?.status === 'processing';
    const isSuccess = simulation?.status === 'success';
    const isError = simulation?.status === 'error';

    const Icon = getAwsIcon(service || 'Service', data.type || '');
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
                "relative group flex flex-col items-center justify-center p-4 min-w-[120px] rounded-xl border-2 transition-all duration-200",
                selected
                    ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 bg-card"
                    : "border-border hover:border-primary/50 hover:shadow-lg bg-card",
                isProcessing && "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
                isSuccess && "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]",
                isError && "border-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            )}
        >
            {/* Simulation Status Badge */}
            {simulation?.status && simulation.status !== 'idle' && (
                <div className={cn(
                    "absolute -top-3 -right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm",
                    isProcessing && "bg-blue-500",
                    isSuccess && "bg-green-500",
                    isError && "bg-destructive"
                )}>
                    {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isSuccess && <CheckCircle className="w-3.5 h-3.5" />}
                    {isError && <XCircle className="w-3.5 h-3.5" />}
                </div>
            )}
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
