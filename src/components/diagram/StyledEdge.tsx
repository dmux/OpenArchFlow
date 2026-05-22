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
    Position,
} from 'reactflow';

/**
 * Auto-detect the best source/target positions based on relative node positions.
 * This fixes connections that were created using only Top/Bottom handles — even when
 * nodes are placed side-by-side the routing now picks Left/Right automatically.
 */
function smartPositions(
    sourceX: number, sourceY: number,
    targetX: number, targetY: number,
    fallbackSrc: Position, fallbackTgt: Position,
) {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Only override when the horizontal delta clearly dominates (2:1 ratio).
    // This preserves intentional vertical connections while fixing side-by-side cases.
    if (absDx > absDy * 1.5) {
        return {
            srcPos: dx > 0 ? Position.Right : Position.Left,
            tgtPos: dx > 0 ? Position.Left : Position.Right,
        };
    }
    if (absDy > absDx * 1.5) {
        return {
            srcPos: dy > 0 ? Position.Bottom : Position.Top,
            tgtPos: dy > 0 ? Position.Top : Position.Bottom,
        };
    }
    // Diagonal — use whichever axis is larger
    if (absDx >= absDy) {
        return {
            srcPos: dx > 0 ? Position.Right : Position.Left,
            tgtPos: dx > 0 ? Position.Left : Position.Right,
        };
    }
    return {
        srcPos: dy > 0 ? Position.Bottom : Position.Top,
        tgtPos: dy > 0 ? Position.Top : Position.Bottom,
    };
}

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
    const strokeColor: string = data?.strokeColor ?? '';
    const strokeWidth: number = data?.strokeWidth ?? 2;
    const dashed: boolean = data?.dashed ?? false;
    const animated: boolean = data?.animated ?? false;
    const waypoints: { x: number; y: number }[] = data?.waypoints ?? [];

    // For straight lines we don't need position hinting — use raw coords.
    // For all curved types, override source/target positions with smart detection.
    const { srcPos, tgtPos } = edgeType === 'straight'
        ? { srcPos: sourcePosition, tgtPos: targetPosition }
        : smartPositions(sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition);

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (edgeType === 'straight') {
        [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    } else if (edgeType === 'step') {
        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX, sourceY, sourcePosition: srcPos,
            targetX, targetY, targetPosition: tgtPos,
            borderRadius: 0,
        });
    } else if (edgeType === 'bezier') {
        [edgePath, labelX, labelY] = getBezierPath({
            sourceX, sourceY, sourcePosition: srcPos,
            targetX, targetY, targetPosition: tgtPos,
        });
    } else if (edgeType === 'waypoint' && waypoints.length > 0) {
        // Build polyline through waypoints
        const points = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
        edgePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        labelX = (sourceX + targetX) / 2;
        labelY = (sourceY + targetY) / 2;
    } else {
        // default smoothstep
        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX, sourceY, sourcePosition: srcPos,
            targetX, targetY, targetPosition: tgtPos,
        });
    }

    const effectiveColor = selected
        ? 'hsl(var(--primary))'
        : strokeColor || 'hsl(var(--muted-foreground))';

    const style: React.CSSProperties = {
        stroke: effectiveColor,
        strokeWidth,
        strokeDasharray: dashed ? '6 3' : undefined,
        // Inline animation for animated edges (supplement React Flow's built-in animated prop)
        animation: animated && !selected ? 'dashdraw 0.5s linear infinite' : undefined,
    };

    // Resolve markerEnd — prefer data override, else inherit prop
    const resolvedMarkerEnd = data?.arrowEnd === 'none'
        ? undefined
        : data?.arrowEnd === 'arrow'
            ? `url(#arrow-${id})`
            : markerEnd;

    // Resolve markerStart
    const resolvedMarkerStart = data?.arrowStart === 'none' || !data?.arrowStart
        ? undefined
        : data?.arrowStart === 'arrowclosed'
            ? { type: MarkerType.ArrowClosed }
            : { type: MarkerType.Arrow };

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} markerEnd={resolvedMarkerEnd} markerStart={resolvedMarkerStart as any} />
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
