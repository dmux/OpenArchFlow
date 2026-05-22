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
 * Return the best exit/entry positions and the exact handle coordinates based on
 * the relative positions of two nodes' centers.
 *
 * We must return BOTH the position hint AND the coordinates together — if we
 * change the position hint but leave the coordinates pointing to the original
 * handle (e.g. Bottom), the path calculator gets a contradictory input and draws
 * an S-curve anyway.
 */
function smartRoute(
    srcNode: any,
    tgtNode: any,
    fallbackSrcX: number, fallbackSrcY: number,
    fallbackTgtX: number, fallbackTgtY: number,
    fallbackSrcPos: Position, fallbackTgtPos: Position,
): {
    srcPos: Position; tgtPos: Position;
    srcX: number; srcY: number;
    tgtX: number; tgtY: number;
} {
    const pa_s = srcNode?.positionAbsolute;
    const pa_t = tgtNode?.positionAbsolute;
    const sw: number = srcNode?.width ?? 0;
    const sh: number = srcNode?.height ?? 0;
    const tw: number = tgtNode?.width ?? 0;
    const th: number = tgtNode?.height ?? 0;

    // If either node isn't measured yet, keep everything as-is to avoid
    // handing mismatched coords+position to the path function.
    if (!pa_s || !sw || !sh || !pa_t || !tw || !th) {
        return {
            srcPos: fallbackSrcPos, tgtPos: fallbackTgtPos,
            srcX: fallbackSrcX, srcY: fallbackSrcY,
            tgtX: fallbackTgtX, tgtY: fallbackTgtY,
        };
    }

    const srcCX = pa_s.x + sw / 2;
    const srcCY = pa_s.y + sh / 2;
    const tgtCX = pa_t.x + tw / 2;
    const tgtCY = pa_t.y + th / 2;

    const dx = tgtCX - srcCX;
    const dy = tgtCY - srcCY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let srcPos: Position;
    let tgtPos: Position;

    if (absDx > absDy * 1.5) {
        srcPos = dx > 0 ? Position.Right : Position.Left;
        tgtPos = dx > 0 ? Position.Left  : Position.Right;
    } else if (absDy > absDx * 1.5) {
        srcPos = dy > 0 ? Position.Bottom : Position.Top;
        tgtPos = dy > 0 ? Position.Top    : Position.Bottom;
    } else if (absDx >= absDy) {
        srcPos = dx > 0 ? Position.Right : Position.Left;
        tgtPos = dx > 0 ? Position.Left  : Position.Right;
    } else {
        srcPos = dy > 0 ? Position.Bottom : Position.Top;
        tgtPos = dy > 0 ? Position.Top    : Position.Bottom;
    }

    // Calculate the exact midpoint of the chosen side for each node.
    const coord = (pa: {x:number;y:number}, w: number, h: number, pos: Position) => {
        const cx = pa.x + w / 2;
        const cy = pa.y + h / 2;
        switch (pos) {
            case Position.Left:   return { x: pa.x,     y: cy };
            case Position.Right:  return { x: pa.x + w, y: cy };
            case Position.Top:    return { x: cx,        y: pa.y };
            case Position.Bottom: return { x: cx,        y: pa.y + h };
        }
    };

    const { x: srcX, y: srcY } = coord(pa_s, sw, sh, srcPos);
    const { x: tgtX, y: tgtY } = coord(pa_t, tw, th, tgtPos);

    return { srcPos, tgtPos, srcX, srcY, tgtX, tgtY };
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

    // Use targeted selectors so the component re-renders when its specific nodes move.
    const srcNode = useStore(React.useCallback((s: any) => s.nodeInternals.get(source), [source]));
    const tgtNode = useStore(React.useCallback((s: any) => s.nodeInternals.get(target), [target]));

    // Waypoints are user-defined absolute positions — skip smart routing.
    const isWaypoint = edgeType === 'waypoint' && waypoints.length > 0;

    const { srcPos, tgtPos, srcX: eSrcX, srcY: eSrcY, tgtX: eTgtX, tgtY: eTgtY } = isWaypoint
        ? { srcPos: sourcePosition, tgtPos: targetPosition, srcX: sourceX, srcY: sourceY, tgtX: targetX, tgtY: targetY }
        : smartRoute(srcNode, tgtNode, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition);

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (isWaypoint) {
        const points = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
        edgePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        labelX = (sourceX + targetX) / 2;
        labelY = (sourceY + targetY) / 2;
    } else if (edgeType === 'straight') {
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
    } else {
        // default: smoothstep
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
        animation: animated && !selected ? 'dashdraw 0.5s linear infinite' : undefined,
    };

    const resolvedMarkerEnd = data?.arrowEnd === 'none'
        ? undefined
        : data?.arrowEnd === 'arrow'
            ? `url(#arrow-${id})`
            : markerEnd;

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
