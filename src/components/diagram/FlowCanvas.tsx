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
    ReactFlowProvider,
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
    };
};

function FlowCanvasInternal() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,
        setSelectedNode,
    } = useDiagramStore(useShallow(selector));

    const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
        setSelectedNode(node.id);
    }, [setSelectedNode]);

    // Initialize from store on mount if needed (Zustand persist handles hydration usually)
    // But ReactFlow internal state needs to be synced if controlled.

    return (
        <div className="w-full h-full bg-background" style={{ width: '100vw', height: '100vh' }}>
            <ReactFlow
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                nodes={nodes}
                edges={edges}
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

export default function FlowCanvas() {
    return (
        <ReactFlowProvider>
            <FlowCanvasInternal />
        </ReactFlowProvider>
    );
}
