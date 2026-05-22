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
    useStore,
} from 'reactflow';

/**
 * Auto-detect the best source/target positions based on relative node centers.
 */
function smartPositions(
    srcCX: number, srcCY: number,
    tgtCX: number, tgtCY: number,
) {
    const dx = tgtCX - srcCX;
    const dy = tgtCY - srcCY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

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

/** Given a node's internals and a desired handle position, return the correct X,Y. */
function handleCoordsForPosition(
    node: any,
    pos: Position,
    fallbackX: number,
    fallbackY: number,
): { x: number; y: number } {
    const pa = node?.positionAbsolute;
    const w: number = node?.width ?? 0;
    const h: number = node?.height ?? 0;
    if (!pa || !w || !h) return { x: fallbackX, y: fallbackY };

    const cx = pa.x + w / 2;
    const cy = pa.y + h / 2;
    switch (pos) {
        case Position.Left:   return { x: pa.x,     y: cy };
        case Position.Right:  return { x: pa.x + w, y: cy };
        case Position.Top:    return { x: cx,        y: pa.y };
        case Position.Bottom: return { x: cx,        y: pa.y + h };
    }
}

export default function StyledEdge({
    id,
    source, target,
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

    // Pull node internals so we can recalculate handle coordinates to match the
    // desired routing side — the coordinates ReactFlow passes in always reflect the
    // handle that was used when the edge was drawn (often Top/Bottom), not the side
    // we want to route from after layout changes.
    const nodeInternals = useStore((s: any) => s.nodeInternals);
    const srcNode = nodeInternals.get(source);
    const tgtNode = nodeInternals.get(target);

    // Derive node centers from internals (fall back to passed-in coords).
    const srcCX = srcNode?.positionAbsolute && srcNode?.width
        ? srcNode.positionAbsolute.x + srcNode.width / 2
        : sourceX;
    const srcCY = srcNode?.positionAbsolute && srcNode?.height
        ? srcNode.positionAbsolute.y + srcNode.height / 2
        : sourceY;
    const tgtCX = tgtNode?.positionAbsolute && tgtNode?.width
        ? tgtNode.positionAbsolute.x + tgtNode.width / 2
        : targetX;
    const tgtCY = tgtNode?.positionAbsolute && tgtNode?.height
        ? tgtNode.positionAbsolute.y + tgtNode.height / 2
        : targetY;

    // For straight lines use raw coords; for curved types use smart routing.
    const { srcPos, tgtPos } = edgeType === 'straight'
        ? { srcPos: sourcePosition, tgtPos: targetPosition }
        : smartPositions(srcCX, srcCY, tgtCX, tgtCY);

    // Recalculate actual handle X,Y to match the chosen side.
    const { x: eSrcX, y: eSrcY } = edgeType === 'straight'
        ? { x: sourceX, y: sourceY }
        : handleCoordsForPosition(srcNode, srcPos, sourceX, sourceY);
    const { x: eTgtX, y: eTgtY } = edgeType === 'straight'
        ? { x: targetX, y: targetY }
        : handleCoordsForPosition(tgtNode, tgtPos, targetX, targetY);

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (edgeType === 'straight') {
        [edgePath, labelX, labelY] = getStraightPath({ sourceX: eSrcX, sourceY: eSrcY, targetX: eTgtX, targetY: eTgtY });
    } else if (edgeType === 'step') {
        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX: eSrcX, sourceY: eSrcY, sourcePosition: srcPos,
            targetX: eTgtX, targetY: eTgtY, targetPosition: tgtPos,
            borderRadius: 0,
        });
    } else if (edgeType === 'bezier') {
        [edgePath, labelX, labelY] = getBezierPath({
            sourceX: eSrcX, sourceY: eSrcY, sourcePosition: srcPos,
            targetX: eTgtX, targetY: eTgtY, targetPosition: tgtPos,
        });
    } else if (edgeType === 'waypoint' && waypoints.length > 0) {
        // Build polyline through waypoints
        const points = [{ x: eSrcX, y: eSrcY }, ...waypoints, { x: eTgtX, y: eTgtY }];
        edgePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        labelX = (eSrcX + eTgtX) / 2;
        labelY = (eSrcY + eTgtY) / 2;
    } else {
        // default smoothstep
        [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX: eSrcX, sourceY: eSrcY, sourcePosition: srcPos,
            targetX: eTgtX, targetY: eTgtY, targetPosition: tgtPos,
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
