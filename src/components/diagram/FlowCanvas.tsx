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
import AWSNode from './AWSNode';
import FrameNode from './FrameNode';
import AnnotationNode from './AnnotationNode';
import NoteNode from './NoteNode';
import LaserPointer from './LaserPointer';
import GenericNode from './GenericNode';

const nodeTypes = {
    'aws-compute': AWSNode,
    'aws-database': AWSNode,
    'aws-network': AWSNode,
    'aws-storage': AWSNode,
    'aws-integration': AWSNode,
    'aws-security': AWSNode,
    'aws-management': AWSNode,
    'aws-analytics': AWSNode,
    'aws-developer': AWSNode, // Added
    'aws-machine-learning': AWSNode, // Added
    'aws-media-services': AWSNode, // Added
    'aws-migration': AWSNode, // Added
    'aws-robotics': AWSNode, // Added
    'aws-satellite': AWSNode, // Added
    'aws-blockchain': AWSNode, // Added
    'aws-business-applications': AWSNode, // Added
    'aws-customer-engagement': AWSNode, // Added
    'aws-end-user-computing': AWSNode, // Added
    'aws-front-end-web-mobile': AWSNode, // Added
    'aws-game-tech': AWSNode, // Added
    'aws-internet-of-things': AWSNode, // Added
    'aws-quantum-technologies': AWSNode, // Added
    'aws-serverless': AWSNode, // Added
    'aws-containers': AWSNode, // Added
    'aws-ai': AWSNode, // Added
    'aws-devtools': AWSNode, // Added
    'cloud-native': AWSNode,
    'client': AWSNode,
    'frame': FrameNode,
    'annotation': AnnotationNode,
    'note': NoteNode,
    'generic': GenericNode,
    'default': AWSNode,
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
        </div>
    );
}



export default FlowCanvas;
