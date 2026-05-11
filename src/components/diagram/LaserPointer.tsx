'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDiagramStore } from '@/lib/store';

interface TrailPoint {
    x: number;
    y: number;
    id: number;
    timestamp: number;
}

const TRAIL_DURATION = 1000; // ms — trail fades out after this
const MAX_TRAIL_POINTS = 60;

export default function LaserPointer() {
    const interactionMode = useDiagramStore((state) => state.interactionMode);
    const laserPointerEnabled = interactionMode === 'laser';
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [renderTrail, setRenderTrail] = useState<TrailPoint[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    const trailRef = useRef<TrailPoint[]>([]);
    const animFrameRef = useRef<number | null>(null);
    const isVisibleRef = useRef(false);

    const startAnimLoop = useCallback(() => {
        if (animFrameRef.current !== null) return;

        const loop = () => {
            const now = Date.now();
            const filtered = trailRef.current.filter(
                (p) => now - p.timestamp < TRAIL_DURATION,
            );
            trailRef.current = filtered;
            setRenderTrail([...filtered]);

            if (filtered.length > 0 || isVisibleRef.current) {
                animFrameRef.current = requestAnimationFrame(loop);
            } else {
                animFrameRef.current = null;
            }
        };

        animFrameRef.current = requestAnimationFrame(loop);
    }, []);

    const stopAnimLoop = useCallback(() => {
        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            const pos = { x: e.clientX, y: e.clientY };
            setMousePos(pos);
            isVisibleRef.current = true;
            setIsVisible(true);

            const newPoint: TrailPoint = {
                x: e.clientX,
                y: e.clientY,
                id: Date.now() + Math.random(),
                timestamp: Date.now(),
            };

            trailRef.current = [...trailRef.current, newPoint].slice(
                -MAX_TRAIL_POINTS,
            );
            startAnimLoop();
        },
        [startAnimLoop],
    );

    const handleMouseLeave = useCallback(() => {
        isVisibleRef.current = false;
        setIsVisible(false);
        // Let the anim loop run until all trail points decay naturally
    }, []);

    useEffect(() => {
        if (!laserPointerEnabled) {
            trailRef.current = [];
            setRenderTrail([]);
            isVisibleRef.current = false;
            setIsVisible(false);
            stopAnimLoop();
            return;
        }

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            stopAnimLoop();
        };
    }, [laserPointerEnabled, handleMouseMove, handleMouseLeave, stopAnimLoop]);

    if (!laserPointerEnabled || (!isVisible && renderTrail.length === 0))
        return null;

    const laserColor = '#ef4444'; // red-500
    const now = Date.now();

    return (
        <div
            className="fixed inset-0 z-[9999] pointer-events-none"
            style={{ cursor: 'none' }}
        >
            {/* SVG Trail — thin constant line with time-based opacity decay */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <filter id="laser-glow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Glow layer — blurred, wider */}
                {renderTrail.map((point, index) => {
                    if (index === 0) return null;
                    const prev = renderTrail[index - 1];
                    const age = now - point.timestamp;
                    const opacity = Math.max(0, 1 - age / TRAIL_DURATION);
                    return (
                        <line
                            key={`glow-${point.id}`}
                            x1={prev.x} y1={prev.y}
                            x2={point.x} y2={point.y}
                            stroke={laserColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                            opacity={opacity * 0.25}
                        />
                    );
                })}

                {/* Crisp layer — thin constant line */}
                {renderTrail.map((point, index) => {
                    if (index === 0) return null;
                    const prev = renderTrail[index - 1];
                    const age = now - point.timestamp;
                    const opacity = Math.max(0, 1 - age / TRAIL_DURATION);
                    return (
                        <line
                            key={`line-${point.id}`}
                            x1={prev.x} y1={prev.y}
                            x2={point.x} y2={point.y}
                            stroke={laserColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            opacity={opacity}
                        />
                    );
                })}
            </svg>

            {isVisible && (
                <>
                    {/* Ping animation layer */}
                    <div
                        className="absolute animate-ping"
                        style={{
                            left: mousePos.x,
                            top: mousePos.y,
                            width: '20px',
                            height: '20px',
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            backgroundColor: laserColor,
                            boxShadow: `
                                0 0 10px ${laserColor},
                                0 0 20px ${laserColor},
                                0 0 30px ${laserColor},
                                0 0 40px ${laserColor}80
                            `,
                        }}
                    />

                    {/* Static glow dot */}
                    <div
                        className="absolute"
                        style={{
                            left: mousePos.x,
                            top: mousePos.y,
                            width: '14px',
                            height: '14px',
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            backgroundColor: laserColor,
                            boxShadow: `
                                0 0 8px ${laserColor},
                                0 0 16px ${laserColor},
                                0 0 24px ${laserColor}80,
                                0 0 32px ${laserColor}40,
                                inset 0 0 8px ${laserColor}
                            `,
                        }}
                    />

                    {/* Outer glow ring */}
                    <div
                        className="absolute"
                        style={{
                            left: mousePos.x,
                            top: mousePos.y,
                            width: '32px',
                            height: '32px',
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            border: `1px solid ${laserColor}40`,
                            boxShadow: `0 0 12px ${laserColor}60`,
                        }}
                    />
                </>
            )}
        </div>
    );
}
