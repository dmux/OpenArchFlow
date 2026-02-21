import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { AppNodeData } from '@/lib/store';
import {
    Loader2, CheckCircle, XCircle, Database, File, User, Activity, Play,
    Square, Circle, HelpCircle, Server, Cloud, Shield, Settings, Mail,
    Globe, Smartphone, Monitor, Cpu, HardDrive, Wifi, Zap
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getServiceDescription } from '@/lib/registry';

// Basic map of selectable string icons to their Lucide component
const CUSTOM_ICONS: Record<string, any> = {
    'activity': Activity,
    'server': Server,
    'cloud': Cloud,
    'database': Database,
    'shield': Shield,
    'settings': Settings,
    'mail': Mail,
    'globe': Globe,
    'smartphone': Smartphone,
    'monitor': Monitor,
    'file': File,
    'user': User,
    'cpu': Cpu,
    'hard-drive': HardDrive,
    'wifi': Wifi,
    'zap': Zap,
    'square': Square,
    'circle': Circle,
    'play': Play,
    'help-circle': HelpCircle,
};

const GenericNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const { label, service, simulation, provider } = data;
    const isProcessing = simulation?.status === 'processing';
    const isSuccess = simulation?.status === 'success';
    const isError = simulation?.status === 'error';

    const subtype = (data.subtype as string) || 'process'; // process, database, file, start-end, decision, actor
    const description = getServiceDescription(provider as string || 'generic', service || '', (data.subtype as string) || (data.type as string));


    // Define shapes and icons based on subtype
    let Icon = Activity;
    let shapeClasses = "rounded-lg"; // Default rounded rectangle
    let iconColor = "text-foreground";

    switch (subtype) {
        case 'process':
            Icon = Square;
            shapeClasses = "rounded-lg";
            break;
        case 'database':
            Icon = Database;
            shapeClasses = "rounded-lg"; // Can't easily do cylinder with border-radius alone, stick to icon
            break;
        case 'file':
            Icon = File;
            shapeClasses = "rounded-lg"; // File icon handles the shape look
            break;
        case 'start-end':
            Icon = Play; // or Stop/Circle
            shapeClasses = "rounded-full aspect-square flex items-center justify-center";
            break;
        case 'decision':
            Icon = HelpCircle;
            shapeClasses = "rotate-45 rounded-sm aspect-square flex items-center justify-center";
            // Content needs to be counter-rotated if we rotate the container
            // For simplicity in first pass, we might just use the icon inside a square container
            // But let's try to make it look distinct.
            // Actually, rotating the whole node makes handles rotate too, which is tricky in ReactFlow unless handles are absolute positioned carefully.
            // Let's stick to standard node container but render the shape INSIDE.
            shapeClasses = "rounded-lg";
            break;
        case 'actor':
            Icon = User;
            shapeClasses = "rounded-full";
            break;
        default:
            Icon = Square;
            shapeClasses = "rounded-lg";
    }

    // Custom colors and icon from metadata
    const customBg = data.metadata?.backgroundColor;
    const customBorder = data.metadata?.borderColor;
    const customText = data.metadata?.textColor;
    const customIconColor = data.metadata?.iconColor;
    const customIconName = data.metadata?.customIcon as string | undefined;

    if (customIconName && CUSTOM_ICONS[customIconName]) {
        Icon = CUSTOM_ICONS[customIconName];
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={cn(
                        "relative group flex flex-col items-center justify-center p-4 min-w-[120px] transition-all duration-200 bg-card",
                        shapeClasses,
                        "border-2",
                        selected
                            ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105"
                            : "border-border hover:border-primary/50 hover:shadow-lg",
                        subtype === 'decision' && "min-w-[100px] min-h-[100px]",
                        subtype === 'start-end' && "min-w-[80px] min-h-[80px] p-2"
                    )}
                    style={{
                        backgroundColor: customBg,
                        borderColor: selected ? undefined : customBorder, // Selection color overrides custom border temporarily
                    }}
                >
                    {/* Handles */}
                    <Handle
                        type="target"
                        position={Position.Top}
                        className={cn(
                            "w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary",
                            // Adjust handle position for rotated shapes if needed
                        )}
                    />

                    {/* Icon / Shape Content */}
                    <div className={cn(
                        "p-2 rounded-full mb-2 transition-colors",
                        selected && !customBg ? "bg-primary/10" : "",
                        !selected && !customBg ? "bg-muted group-hover:bg-primary/5" : "",
                        subtype === 'decision' && "mb-0" // Centered for decision
                    )}>
                        <Icon
                            size={subtype === 'start-end' || subtype === 'actor' ? 32 : 24}
                            className={cn("text-foreground", iconColor)}
                            style={{ color: customIconColor }}
                        />
                    </div>

                    {/* Label */}
                    {(subtype !== 'decision' && subtype !== 'start-end') && (
                        <div className="text-center w-full">
                            <div className="font-semibold text-sm text-foreground leading-tight truncate px-1" style={{ color: customText }}>
                                {label}
                            </div>
                        </div>
                    )}

                    {/* Label for Decision/Start-End */}
                    {(subtype === 'decision' || subtype === 'start-end') && (
                        <div className="text-center absolute -bottom-6 left-1/2 -translate-x-1/2 w-32">
                            <div className="text-xs font-medium text-muted-foreground">
                                {label}
                            </div>
                        </div>
                    )}

                    <Handle
                        type="source"
                        position={Position.Bottom}
                        className="w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary"
                    />

                    {/* Adding Right/Left handles for Generic nodes as they are often used in flowcharts */}
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="right"
                        className="w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary"
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="left"
                        className="w-3 h-3 !bg-muted-foreground transition-colors group-hover:!bg-primary"
                    />
                </div>
            </TooltipTrigger>
            {description && (
                <TooltipContent side="right" className="max-w-[200px]">
                    <p className="font-semibold mb-1">{label}</p>
                    <p className="text-xs">{description}</p>
                </TooltipContent>
            )}
        </Tooltip>
    );
};

export default memo(GenericNode);
