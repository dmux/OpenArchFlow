import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Cpu, Database, Cloud, HardDrive, Network, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

const IconMap: Record<string, React.ElementType> = {
    'aws-compute': Cpu,
    'aws-database': Database,
    'aws-storage': HardDrive,
    'aws-network': Network,
    'default': Cloud,
};

const AWSNode = ({ data, selected }: NodeProps) => {
    const Icon = IconMap[data.type] || IconMap['default'] || Box;
    const label = data.label || 'AWS Resource';
    const service = data.service || 'Service';

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
                selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/5"
            )}>
                <Icon size={24} strokeWidth={1.5} />
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
