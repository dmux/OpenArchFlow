'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useDiagramStore } from '@/lib/store';

interface TrailPoint {
    x: number;
    y: number;
    id: number;
}

export default function LaserPointer() {
    const laserPointerEnabled = useDiagramStore((state) => state.laserPointerEnabled);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [trail, setTrail] = useState<TrailPoint[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const newPos = { x: e.clientX, y: e.clientY };
        setMousePos(newPos);
        setIsVisible(true);

        // Add to trail
        const newPoint: TrailPoint = {
            x: e.clientX,
            y: e.clientY,
            id: Date.now() + Math.random(),
        };

        setTrail((prev) => {
            const updated = [...prev, newPoint];
            // Keep only last 12 points for performance
            return updated.slice(-12);
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsVisible(false);
    }, []);

    useEffect(() => {
        if (!laserPointerEnabled) {
            setTrail([]);
            setIsVisible(false);
            return;
        }

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [laserPointerEnabled, handleMouseMove, handleMouseLeave]);

    if (!laserPointerEnabled || !isVisible) return null;

    const laserColor = '#ef4444'; // red-500

    return (
        <div
            className="fixed inset-0 z-[9999] pointer-events-none"
            style={{ cursor: 'none' }}
        >
            {/* Trail points */}
            {trail.map((point, index) => {
                const opacity = (index + 1) / trail.length; // 0.08 to 1.0
                const size = 4 + (opacity * 4); // 4px to 8px

                return (
                    <div
                        key={point.id}
                        className="absolute transition-opacity duration-150"
                        style={{
                            left: point.x,
                            top: point.y,
                            width: `${size}px`,
                            height: `${size}px`,
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            backgroundColor: laserColor,
                            opacity: opacity * 0.6,
                            boxShadow: `0 0 ${size * 2}px ${laserColor}`,
                        }}
                    />
                );
            })}

            {/* Main laser dot - animated ping layer */}
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

            {/* Main laser dot - static layer */}
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
        </div>
    );
}
