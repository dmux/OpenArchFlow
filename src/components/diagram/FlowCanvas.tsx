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

const nodeTypes = {
    'aws-compute': AWSNode,
    'aws-database': AWSNode,
    'aws-network': AWSNode,
    'aws-storage': AWSNode,
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
    } = useDiagramStore(useShallow(selector));

    const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
        setSelectedNode(node.id);
    }, [setSelectedNode]);

    const onEdgeClick = useCallback((_event: React.MouseEvent, edge: any) => {
        // Stop propagation if needed, but ReactFlow handles this well usually
        useDiagramStore.getState().setSelectedEdge(edge.id);
    }, []);

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
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed },
                }}
            >
                <Background gap={12} size={1} />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}



export default FlowCanvas;
