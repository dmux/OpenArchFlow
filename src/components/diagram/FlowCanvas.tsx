'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Connection,
    Edge,
    MarkerType,
    Position,
    useNodesState,
    useEdgesState,
    addEdge,
    MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDiagramStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import CloudNode from './CloudNode';
import FrameNode from './FrameNode';
import AnnotationNode from './AnnotationNode';
import NoteNode from './NoteNode';
import LaserPointer from './LaserPointer';
import GenericNode from './GenericNode';

const nodeTypes = {
    'aws-compute': CloudNode,
    'aws-database': CloudNode,
    'aws-network': CloudNode,
    'aws-storage': CloudNode,
    'aws-integration': CloudNode,
    'aws-security': CloudNode,
    'aws-management': CloudNode,
    'aws-analytics': CloudNode,
    'aws-developer': CloudNode,
    'aws-machine-learning': CloudNode,
    'aws-media-services': CloudNode,
    'aws-migration': CloudNode,
    'aws-robotics': CloudNode,
    'aws-satellite': CloudNode,
    'aws-blockchain': CloudNode,
    'aws-business-applications': CloudNode,
    'aws-customer-engagement': CloudNode,
    'aws-end-user-computing': CloudNode,
    'aws-front-end-web-mobile': CloudNode,
    'aws-game-tech': CloudNode,
    'aws-internet-of-things': CloudNode,
    'aws-quantum-technologies': CloudNode,
    'aws-serverless': CloudNode,
    'aws-containers': CloudNode,
    'aws-ai': CloudNode,
    'aws-devtools': CloudNode,
    'azure-compute': CloudNode,
    'azure-database': CloudNode,
    'azure-network': CloudNode,
    'azure-storage': CloudNode,
    'cloud-native': CloudNode,
    'integration': CloudNode,
    'client': CloudNode,
    'frame': FrameNode,
    'annotation': AnnotationNode,
    'note': NoteNode,
    'generic': GenericNode,
    'default': CloudNode,
};

const EMPTY_NODES: any[] = [];
const EMPTY_EDGES: any[] = [];

const selector = (state: any) => {
    const activeDiagram = state.activeDiagramId ? state.diagrams[state.activeDiagramId] : null;
    return {
        nodes: activeDiagram?.nodes || EMPTY_NODES,
        edges: activeDiagram?.edges || EMPTY_EDGES,
        onNodesChange: state.onNodesChange,
        onEdgesChange: state.onEdgesChange,
        onConnect: state.onConnect,
        setNodes: state.setNodes,
        setEdges: state.setEdges,
        setSelectedNode: state.setSelectedNode,
        isPlaying: state.isPlaying,
        interactionMode: state.interactionMode,
    };
};

import { TooltipProvider } from '@/components/ui/tooltip';

function FlowCanvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,
        setSelectedNode,
        isPlaying,
        interactionMode,
    } = useDiagramStore(useShallow(selector));

    const isLaserMode = interactionMode === 'laser';

    const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
        if (isLaserMode) return;
        setSelectedNode(node.id);
    }, [setSelectedNode, isLaserMode]);

    const onEdgeClick = useCallback((_event: React.MouseEvent, edge: any) => {
        if (isLaserMode) return;
        // Stop propagation if needed, but ReactFlow handles this well usually
        useDiagramStore.getState().setSelectedEdge(edge.id);
    }, [isLaserMode]);

    const animatedEdges = React.useMemo(() => {
        if (!isPlaying) return edges;
        return edges.map((edge: any) => ({
            ...edge,
            animated: true,
            style: { ...edge.style, stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        }));
    }, [edges, isPlaying]);

    // Initialize from store on mount if needed (Zustand persist handles hydration usually)
    // But ReactFlow internal state needs to be synced if controlled.

    return (
        <div className="w-full h-full bg-background" style={{ width: '100vw', height: '100vh' }}>
            <TooltipProvider delayDuration={300}>
                <ReactFlow
                    nodeTypes={nodeTypes}
                    onNodeClick={onNodeClick}
                    onEdgeClick={onEdgeClick}
                    nodes={nodes}
                    edges={animatedEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    attributionPosition="bottom-right"
                    nodesDraggable={!isLaserMode}
                    nodesConnectable={!isLaserMode}
                    elementsSelectable={!isLaserMode}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        markerEnd: { type: MarkerType.ArrowClosed },
                    }}
                >
                    <Background gap={12} size={1} />
                    <Controls />
                    <MiniMap />
                </ReactFlow>

                {/* Laser Pointer Overlay */}
                <LaserPointer />
            </TooltipProvider>
        </div>
    );
}



export default FlowCanvas;
