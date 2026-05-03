'use client';

import React from 'react';
import {
    EdgeProps,
    getBezierPath,
    getStraightPath,
    getSmoothStepPath,
    EdgeLabelRenderer,
    BaseEdge,
    MarkerType,
} from 'reactflow';

export default function StyledEdge({
    id,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data,
    label,
    markerEnd,
    markerStart,
    selected,
}: EdgeProps) {
    const edgeType: string = data?.edgeType ?? 'smoothstep';
    const strokeColor: string = data?.strokeColor ?? 'hsl(var(--muted-foreground))';
    const strokeWidth: number = data?.strokeWidth ?? 2;
    const dashed: boolean = data?.dashed ?? false;
    const waypoints: { x: number; y: number }[] = data?.waypoints ?? [];

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (edgeType === 'straight') {
        [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    } else if (edgeType === 'step') {
        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX, sourceY, sourcePosition,
            targetX, targetY, targetPosition,
            borderRadius: 0,
        });
    } else if (edgeType === 'bezier') {
        [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    } else if (edgeType === 'waypoint' && waypoints.length > 0) {
        // Build polyline through waypoints
        const points = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
        edgePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        labelX = (sourceX + targetX) / 2;
        labelY = (sourceY + targetY) / 2;
    } else {
        // default smoothstep
        [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    }

    const style: React.CSSProperties = {
        stroke: selected ? 'hsl(var(--primary))' : strokeColor,
        strokeWidth,
        strokeDasharray: dashed ? '6 3' : undefined,
    };

    // Resolve markerEnd — prefer data override, else inherit prop
    const resolvedMarkerEnd = data?.arrowEnd === 'none'
        ? undefined
        : data?.arrowEnd === 'arrow'
            ? `url(#arrow-${id})`
            : markerEnd;

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} markerEnd={resolvedMarkerEnd} markerStart={markerStart} />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan text-[11px] font-medium px-1.5 py-0.5 rounded bg-background/90 border border-border text-foreground shadow-sm"
                    >
                        {label as string}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
