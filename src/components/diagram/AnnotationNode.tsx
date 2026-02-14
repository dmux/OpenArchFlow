import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { AppNodeData } from '@/lib/store';

const AnnotationNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const { label, metadata } = data;
    const text = metadata?.text || label || 'Annotation';
    const color = metadata?.color || 'rgb(239, 68, 68)'; // red-500 (laser red)
    const pointerDirection = metadata?.pointerDirection || 'down'; // 'left', 'right', 'up', 'down'
    const animated = metadata?.animated !== false; // default true

    // Calculate beam length and position based on direction
    const getBeamStyles = () => {
        const beamLength = 80; // pixels
        switch (pointerDirection) {
            case 'up':
                return {
                    width: '3px',
                    height: `${beamLength}px`,
                    top: `-${beamLength}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                };
            case 'down':
                return {
                    width: '3px',
                    height: `${beamLength}px`,
                    bottom: `-${beamLength}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                };
            case 'left':
                return {
                    width: `${beamLength}px`,
                    height: '3px',
                    left: `-${beamLength}px`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                };
            case 'right':
            default:
                return {
                    width: `${beamLength}px`,
                    height: '3px',
                    right: `-${beamLength}px`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                };
        }
    };

    const getDotPosition = () => {
        const dotDistance = 90; // pixels from center
        switch (pointerDirection) {
            case 'up':
                return {
                    top: `-${dotDistance}px`,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                };
            case 'down':
                return {
                    bottom: `-${dotDistance}px`,
                    left: '50%',
                    transform: 'translate(-50%, 50%)',
                };
            case 'left':
                return {
                    left: `-${dotDistance}px`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                };
            case 'right':
            default:
                return {
                    right: `-${dotDistance}px`,
                    top: '50%',
                    transform: 'translate(50%, -50%)',
                };
        }
    };

    const beamStyles = getBeamStyles();
    const dotPosition = getDotPosition();

    return (
        <div className="relative">
            {/* Label Box - Optional, can be hidden */}
            {text && (
                <div
                    className={cn(
                        "relative flex items-center gap-2 px-3 py-2 rounded-md border transition-all duration-200 shadow-md backdrop-blur-sm",
                        selected && "scale-105 shadow-lg"
                    )}
                    style={{
                        backgroundColor: `${color}15`, // 15% opacity
                        borderColor: `${color}60`,
                        color: color,
                    }}
                >
                    <div className="font-medium text-xs leading-tight whitespace-nowrap">
                        {text}
                    </div>
                </div>
            )}

            {/* Laser Beam */}
            <div
                className={cn(
                    "absolute pointer-events-none",
                    animated && "animate-pulse"
                )}
                style={{
                    ...beamStyles,
                    background: `linear-gradient(to ${pointerDirection === 'up' ? 'top' : pointerDirection === 'down' ? 'bottom' : pointerDirection === 'left' ? 'left' : 'right'}, ${color}00, ${color}80, ${color}00)`,
                    boxShadow: `0 0 8px ${color}, 0 0 12px ${color}80`,
                }}
            />

            {/* Laser Dot (the actual pointer) */}
            <div
                className={cn(
                    "absolute pointer-events-none",
                    animated && "animate-ping"
                )}
                style={{
                    ...dotPosition,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    boxShadow: `
                        0 0 10px ${color},
                        0 0 20px ${color},
                        0 0 30px ${color},
                        0 0 40px ${color}80,
                        inset 0 0 10px ${color}
                    `,
                }}
            />

            {/* Static dot (always visible) */}
            <div
                className="absolute pointer-events-none"
                style={{
                    ...dotPosition,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    boxShadow: `
                        0 0 8px ${color},
                        0 0 16px ${color},
                        0 0 24px ${color}80
                    `,
                }}
            />

            {/* Invisible handles for potential connections */}
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
    );
};

export default memo(AnnotationNode);
