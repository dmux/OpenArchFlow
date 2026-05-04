"use client";

import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ControlButton,
  MiniMap,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useDiagramStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import CloudNode from "./CloudNode";
import FrameNode from "./FrameNode";
import AnnotationNode from "./AnnotationNode";
import NoteNode from "./NoteNode";
import LaserPointer from "./LaserPointer";
import GenericNode from "./GenericNode";
import AlignmentToolbar from "./AlignmentToolbar";
import AlignmentGuides from "./AlignmentGuides";
import CollaborationCursors from "./CollaborationCursors";
import StyledEdge from "./StyledEdge";
import CustomShapeNode from "./CustomShapeNode";
import SwimlaneNode from "./SwimlaneNode";
import TableNode from "./TableNode";
import SequenceActorNode from "./SequenceActorNode";
import { publishCursor } from "@/lib/collaboration";

const nodeTypes = {
  "aws-compute": CloudNode,
  "aws-database": CloudNode,
  "aws-network": CloudNode,
  "aws-storage": CloudNode,
  "aws-integration": CloudNode,
  "aws-security": CloudNode,
  "aws-management": CloudNode,
  "aws-analytics": CloudNode,
  "aws-developer": CloudNode,
  "aws-machine-learning": CloudNode,
  "aws-media-services": CloudNode,
  "aws-migration": CloudNode,
  "aws-robotics": CloudNode,
  "aws-satellite": CloudNode,
  "aws-blockchain": CloudNode,
  "aws-business-applications": CloudNode,
  "aws-customer-engagement": CloudNode,
  "aws-end-user-computing": CloudNode,
  "aws-front-end-web-mobile": CloudNode,
  "aws-game-tech": CloudNode,
  "aws-internet-of-things": CloudNode,
  "aws-quantum-technologies": CloudNode,
  "aws-serverless": CloudNode,
  "aws-containers": CloudNode,
  "aws-ai": CloudNode,
  "aws-devtools": CloudNode,
  "azure-compute": CloudNode,
  "azure-database": CloudNode,
  "azure-network": CloudNode,
  "azure-storage": CloudNode,
  "cloud-native": CloudNode,
  integration: CloudNode,
  client: CloudNode,
  frame: FrameNode,
  annotation: AnnotationNode,
  note: NoteNode,
  generic: GenericNode,
  "custom-shape": CustomShapeNode,
  swimlane: SwimlaneNode,
  table: TableNode,
  "sequence-actor": SequenceActorNode,
  default: CloudNode,
};

const EMPTY_NODES: any[] = [];
const EMPTY_EDGES: any[] = [];
const EMPTY_LAYERS: any[] = [];

const edgeTypes = { styled: StyledEdge };

const selector = (state: any) => {
  const activeDiagram = state.activeDiagramId
    ? state.diagrams[state.activeDiagramId]
    : null;
  return {
    nodes: activeDiagram?.nodes ?? EMPTY_NODES,
    edges: activeDiagram?.edges ?? EMPTY_EDGES,
    layers: activeDiagram?.layers ?? EMPTY_LAYERS,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    setNodes: state.setNodes,
    setEdges: state.setEdges,
    setSelectedNode: state.setSelectedNode,
    isPlaying: state.isPlaying,
    interactionMode: state.interactionMode,
    layout: state.layout,
    activeSimulationEdges: state.activeSimulationEdges,
  };
};

import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutDashboard, Map } from "lucide-react";

function FlowCanvas() {
  const {
    nodes,
    edges,
    layers,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    setSelectedNode,
    isPlaying,
    interactionMode,
    layout,
    activeSimulationEdges,
  } = useDiagramStore(useShallow(selector));

  const [showMiniMap, setShowMiniMap] = useState(false);

  const isLaserMode = interactionMode === "laser";

  // Apply layer visibility / lock constraints in a stable memoized derivation
  const visibleNodes = useMemo(() => {
    const hidden = new Set(
      layers.filter((l: any) => !l.visible).map((l: any) => l.id as string),
    );
    const locked = new Set(
      layers.filter((l: any) => l.locked).map((l: any) => l.id as string),
    );
    if (hidden.size === 0 && locked.size === 0) return nodes;
    return nodes
      .filter((n: any) => !n.data?.layerId || !hidden.has(n.data.layerId))
      .map((n: any) => {
        if (!n.data?.layerId || !locked.has(n.data.layerId)) return n;
        return {
          ...n,
          draggable: false,
          connectable: false,
          selectable: false,
        };
      });
  }, [nodes, layers]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const vpEl = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement | null;
    if (!vpEl) return;
    const match = vpEl.style.transform.match(
      /translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/,
    );
    if (!match) return;
    const tx = parseFloat(match[1]);
    const ty = parseFloat(match[2]);
    const scale = parseFloat(match[3]);
    publishCursor((e.clientX - tx) / scale, (e.clientY - ty) / scale);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    const vpEl = document.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement | null;
    if (!vpEl) return;
    const match = vpEl.style.transform.match(
      /translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/,
    );
    if (!match) return;
    const tx = parseFloat(match[1]);
    const ty = parseFloat(match[2]);
    const scale = parseFloat(match[3]);
    publishCursor(
      (e.touches[0].clientX - tx) / scale,
      (e.touches[0].clientY - ty) / scale,
    );
  }, []);

  const onNodeDragStart = useCallback(() => {
    useDiagramStore.temporal.getState().pause();
  }, []);

  const onNodeDragStop = useCallback(() => {
    useDiagramStore.temporal.getState().resume();
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (isLaserMode) return;
      setSelectedNode(node.id);
    },
    [setSelectedNode, isLaserMode],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: any) => {
      if (isLaserMode) return;
      // Stop propagation if needed, but ReactFlow handles this well usually
      useDiagramStore.getState().setSelectedEdge(edge.id);
    },
    [isLaserMode],
  );

  const animatedEdges = React.useMemo(() => {
    return edges.map((edge: any) => {
      // Edges with custom style data are rendered by StyledEdge
      const hasStyle =
        edge.data?.strokeColor ||
        edge.data?.strokeWidth ||
        edge.data?.dashed ||
        edge.data?.edgeType;
      const type = hasStyle ? "styled" : (edge.type ?? "smoothstep");
      if (!isPlaying) return { ...edge, type };

      const simStatus = activeSimulationEdges.get(edge.id);
      const strokeColor =
        simStatus === 'error' ? '#ef4444' :
        simStatus === 'throttled' ? '#f97316' :
        simStatus === 'active' ? '#22c55e' :
        'hsl(var(--primary))';
      const strokeWidth = simStatus ? 3 : 2;

      return {
        ...edge,
        type,
        animated: true,
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth,
          filter: simStatus ? `drop-shadow(0 0 4px ${strokeColor})` : undefined,
        },
      };
    });
  }, [edges, isPlaying, activeSimulationEdges]);

  // Initialize from store on mount if needed (Zustand persist handles hydration usually)
  // But ReactFlow internal state needs to be synced if controlled.

  return (
    <div
      className={`w-full h-full bg-background [touch-action:none]${isLaserMode ? " laser-mode" : ""}`}
      style={{ width: "100%", height: "100%" }}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      <TooltipProvider delayDuration={300}>
        <ReactFlow
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          nodes={visibleNodes}
          edges={animatedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-left"
          preventScrolling
          nodesDraggable={!isLaserMode}
          nodesConnectable={!isLaserMode}
          elementsSelectable={!isLaserMode}
          selectionOnDrag={!isLaserMode}
          panOnDrag={isLaserMode ? true : [1, 2]}
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background gap={12} size={1} />
          <Controls position="bottom-right">
            <ControlButton onClick={() => layout()} title="Auto-layout (ELK)">
              <LayoutDashboard size={14} />
            </ControlButton>
            <ControlButton
              onClick={() => setShowMiniMap((v) => !v)}
              title="Toggle minimap"
              style={{
                color: showMiniMap ? "var(--primary, #6366f1)" : undefined,
              }}
            >
              <Map size={14} />
            </ControlButton>
          </Controls>
          {showMiniMap && (
            <MiniMap
              position="bottom-right"
              style={{ marginBottom: 148 }}
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
          )}
        </ReactFlow>

        {/* Laser Pointer Overlay */}
        <LaserPointer />

        {/* Alignment Toolbar (appears when 2+ nodes selected) */}
        <AlignmentToolbar />

        {/* Smart alignment guides during drag */}
        <AlignmentGuides />

        {/* Remote collaboration cursors */}
        <CollaborationCursors />
      </TooltipProvider>
    </div>
  );
}

export default FlowCanvas;
