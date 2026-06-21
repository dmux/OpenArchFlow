"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ControlButton,
  MiniMap,
  MarkerType,
  ConnectionLineType,
  ConnectionMode,
  useReactFlow,
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

import TrafficSourceNode from "./nodes/TrafficSourceNode";

const nodeTypes = {
  "traffic-source": TrafficSourceNode,
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
    edgeSettings: state.edgeSettings,
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
    edgeSettings,
  } = useDiagramStore(useShallow(selector));

  const [showMiniMap, setShowMiniMap] = useState(false);

  const { zoomIn, zoomOut } = useReactFlow();

  // Zoom via keyboard shortcuts (+/-). The key mapping lives in
  // useKeyboardShortcuts (outside the ReactFlowProvider) and reaches us here
  // through window CustomEvents.
  useEffect(() => {
    const handleZoomIn = () => zoomIn({ duration: 200 });
    const handleZoomOut = () => zoomOut({ duration: 200 });
    window.addEventListener("diagram:zoomIn", handleZoomIn);
    window.addEventListener("diagram:zoomOut", handleZoomOut);
    return () => {
      window.removeEventListener("diagram:zoomIn", handleZoomIn);
      window.removeEventListener("diagram:zoomOut", handleZoomOut);
    };
  }, [zoomIn, zoomOut]);

  const isLaserMode = interactionMode === "laser";
  const isPanMode = interactionMode === "pan";

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
      // Merge global edgeSettings as base, per-edge data takes precedence.
      // Edges that have explicit per-edge overrides keep them; everything else
      // falls back to the diagram-wide settings.
      const hasPerEdge =
        edge.data?.strokeColor ||
        edge.data?.strokeWidth != null ||
        edge.data?.dashed != null ||
        edge.data?.edgeType;

      const mergedData = {
        edgeType: edgeSettings.type,
        strokeWidth: edgeSettings.strokeWidth,
        dashed: edgeSettings.dashed,
        strokeColor: edgeSettings.color || undefined,
        arrowEnd: edgeSettings.markerEnd,
        arrowStart: edgeSettings.markerStart,
        animated: edgeSettings.animated,
        // Per-edge data always wins
        ...(hasPerEdge ? edge.data : {}),
        // But _global marker is just a creation hint, strip it
        _global: undefined,
      };

      const type = "styled";

      if (!isPlaying) {
        return { ...edge, type, data: mergedData };
      }

      const simStatus = activeSimulationEdges.get(edge.id);
      const strokeColor =
        simStatus === "error"
          ? "#ef4444"
          : simStatus === "throttled"
            ? "#f97316"
            : simStatus === "active"
              ? "#22c55e"
              : "hsl(var(--primary))";
      const strokeWidth = simStatus ? 3 : edgeSettings.strokeWidth;

      return {
        ...edge,
        type,
        data: mergedData,
        animated: true,
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth,
          filter: simStatus ? `drop-shadow(0 0 4px ${strokeColor})` : undefined,
        },
      };
    });
  }, [edges, edgeSettings, isPlaying, activeSimulationEdges]);

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
          panOnScroll
          panOnScrollSpeed={0.8}
          nodesDraggable={!isLaserMode && !isPanMode}
          nodesConnectable={!isLaserMode && !isPanMode}
          elementsSelectable={!isLaserMode && !isPanMode}
          selectionOnDrag={!isLaserMode && !isPanMode}
          panOnDrag={isLaserMode || isPanMode ? true : [1, 2]}
          connectionMode={ConnectionMode.Loose}
          snapToGrid
          snapGrid={[16, 16]}
          connectionLineType={
            edgeSettings.type === "bezier" ? ConnectionLineType.Bezier
            : edgeSettings.type === "straight" ? ConnectionLineType.Straight
            : edgeSettings.type === "step" ? ConnectionLineType.Step
            : ConnectionLineType.SmoothStep
          }
          defaultEdgeOptions={{
            type: "styled",
            markerEnd: edgeSettings.markerEnd !== "none"
              ? { type: edgeSettings.markerEnd === "arrow" ? MarkerType.Arrow : MarkerType.ArrowClosed }
              : undefined,
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
