"use client";

import { useEffect, useRef } from "react";
import { useDiagramStore, AppNode } from "@/lib/store";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).contentEditable === "true"
  );
}

export function useKeyboardShortcuts() {
  const clipboardRef = useRef<AppNode[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const mod = e.ctrlKey || e.metaKey;
      const state = useDiagramStore.getState();
      const activeDiagramId = state.activeDiagramId;
      const nodes = activeDiagramId
        ? (state.diagrams[activeDiagramId]?.nodes ?? [])
        : [];

      // Undo
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useDiagramStore.temporal.getState().undo();
        return;
      }

      // Redo — Ctrl+Y or Ctrl+Shift+Z
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        useDiagramStore.temporal.getState().redo();
        return;
      }

      // Select All
      if (mod && e.key === "a") {
        e.preventDefault();
        state.setNodes(nodes.map((n) => ({ ...n, selected: true })));
        return;
      }

      // Copy
      if (mod && e.key === "c") {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length > 0) clipboardRef.current = selected;
        return;
      }

      // Paste
      if (mod && e.key === "v") {
        e.preventDefault();
        if (clipboardRef.current.length === 0) return;
        clipboardRef.current.forEach((node) => {
          state.addNode({
            ...node,
            id: crypto.randomUUID(),
            selected: true,
            position: { x: node.position.x + 30, y: node.position.y + 30 },
          });
        });
        return;
      }

      // Duplicate — Ctrl+D
      if (mod && e.key === "d") {
        e.preventDefault();
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return;
        clipboardRef.current = selected;
        selected.forEach((node) => {
          state.addNode({
            ...node,
            id: crypto.randomUUID(),
            selected: true,
            position: { x: node.position.x + 30, y: node.position.y + 30 },
          });
        });
        return;
      }

      // Auto Layout — Ctrl+L
      if (mod && e.key === "l") {
        e.preventDefault();
        state.layout();
        return;
      }

      // Group selected — Ctrl+G
      if (mod && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        const selected = nodes.filter((n) => n.selected && n.type !== "frame");
        if (selected.length >= 2) {
          state.groupNodes(selected.map((n) => n.id));
        }
        return;
      }

      // Ungroup — Ctrl+Shift+G
      if (mod && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        const { selectedNodeId } = state;
        if (selectedNodeId) {
          const node = nodes.find((n) => n.id === selectedNodeId);
          if (node?.type === "frame" && "locked" in node.data) {
            state.ungroupNodes(selectedNodeId);
          }
        }
        return;
      }

      // Keyboard Shortcuts Help — Ctrl+?  (key '/' with shift, or '?' directly)
      if (mod && (e.key === "?" || (e.key === "/" && e.shiftKey))) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("openShortcutsDialog"));
        return;
      }

      // Zoom in — '+' or '=' (the '+' glyph requires Shift on most layouts)
      if (!mod && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("diagram:zoomIn"));
        return;
      }

      // Zoom out — '-' or '_'
      if (!mod && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("diagram:zoomOut"));
        return;
      }

      // Delete / Backspace — remove selected nodes and edges
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (!activeDiagramId) return;
        const { edges } = state.diagrams[activeDiagramId];
        const selectedNodeIds = nodes
          .filter((n) => n.selected)
          .map((n) => n.id);
        const selectedEdgeIds = edges
          .filter((edge) => (edge as any).selected)
          .map((edge) => edge.id);
        selectedEdgeIds.forEach((id) => state.removeEdge(id));
        selectedNodeIds.forEach((id) => state.removeNode(id));
        return;
      }

      // Escape — deselect all
      if (e.key === "Escape") {
        state.setNodes(nodes.map((n) => ({ ...n, selected: false })));
        state.setSelectedNode(null);
        state.setSelectedEdge(null);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
