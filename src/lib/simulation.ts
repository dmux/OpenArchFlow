import { useDiagramStore } from "@/lib/store";
import { SimulationEngine as CoreEngine } from "@/lib/simulation/SimulationEngine";

/**
 * Public facade used by UI components.
 * Delegates to CoreEngine while keeping the no-arg start/stop API.
 */
export class SimulationEngine {
  private static _facade: SimulationEngine;
  private _unsubNodes: (() => void) | null = null;

  private constructor() {}

  static getInstance(): SimulationEngine {
    if (!SimulationEngine._facade)
      SimulationEngine._facade = new SimulationEngine();
    return SimulationEngine._facade;
  }

  start(startNodeIds?: string[]) {
    const store = useDiagramStore.getState();
    store.clearSimulationLogs();
    store.clearSimulationTraces();
    store.resetSimulation();
    store.setIsPlaying(true);

    const { diagrams, activeDiagramId, killedNodes, simulationSpeed } = store;
    if (!activeDiagramId) {
      store.addSimulationLog({
        level: "warning",
        message: "No active diagram.",
      });
      return;
    }

    const { nodes, edges } = diagrams[activeDiagramId];

    // If caller specified specific start nodes, only honour those with rps > 0
    const activeNodes = startNodeIds
      ? nodes.map((n) => {
          if (!startNodeIds.includes(n.id)) return n;
          const mock = n.data.mock as
            | { requestsPerSecond?: number }
            | undefined;
          if (mock?.requestsPerSecond) return n;
          return {
            ...n,
            data: {
              ...n.data,
              mock: { ...(n.data.mock ?? {}), requestsPerSecond: 1 },
            },
          };
        })
      : nodes;

    CoreEngine.getInstance().start(
      activeNodes,
      edges,
      (activeNodeIds, activeEdgeIds, logs, metricDeltas, completedTraces) => {
        const s = useDiagramStore.getState();
        if (!s.isPlaying) return;

        // ── Visual status update ────────────────────────────────────────
        const allNodeIds = new Set(activeNodeIds);
        const { diagrams: diags, activeDiagramId: aid } = s;
        if (aid) {
          diags[aid]?.nodes.forEach((n) => {
            if (allNodeIds.has(n.id)) {
              s.setNodeSimulationStatus(n.id, {
                status: "processing",
                lastRun: Date.now(),
              });
            } else if (n.data.simulation?.status === "processing") {
              s.setNodeSimulationStatus(n.id, {
                ...(n.data.simulation ?? {}),
                status: "idle",
              });
            }
          });
        }

        // ── Live edge states ────────────────────────────────────────────
        const edgeMap = new Map<string, "active" | "error" | "throttled">();
        for (const e of activeEdgeIds) edgeMap.set(e.id, e.status);
        s.setActiveSimulationEdges(edgeMap);

        // ── Log entries ─────────────────────────────────────────────────
        logs.slice(-20).forEach((log) => {
          const node = aid
            ? diags[aid]?.nodes.find((n) => n.id === log.nodeId)
            : undefined;
          s.addSimulationLog({
            nodeId: log.nodeId,
            nodeLabel: node?.data.label,
            level: log.level,
            message: log.message,
          });
        });

        // ── Metrics ─────────────────────────────────────────────────────
        if (metricDeltas.length > 0) {
          s.updateNodeMetrics(
            metricDeltas.map((d) => ({
              nodeId: d.nodeId,
              requests: d.requests,
              errors: d.errors,
              latencySample: d.latencySample,
              queueDepthDelta: d.queueDepthDelta,
              cacheHit: d.cacheHit,
              throttled: d.throttled,
              concurrencyDelta: d.concurrencyDelta,
              costDelta: d.costDelta,
            })),
          );
        }

        // ── Traces ──────────────────────────────────────────────────────
        if (completedTraces.length > 0) {
          s.addSimulationTraces(completedTraces);
        }
      },
      { speed: simulationSpeed },
      killedNodes,
    );

    // Subscribe to node changes so live edits (failureRate, latency, rps…)
    // take effect on the very next tick without restarting the simulation.
    this._unsubNodes = useDiagramStore.subscribe((state, prev) => {
      const aid = state.activeDiagramId;
      if (!aid) return;
      const nodes = state.diagrams[aid]?.nodes;
      const prevNodes = prev.diagrams[aid]?.nodes;
      if (nodes && nodes !== prevNodes) {
        CoreEngine.getInstance().updateNodes(nodes);
      }
    });
  }

  pause() {
    CoreEngine.getInstance().pause();
    useDiagramStore.getState().pauseSimulation();
  }

  resume() {
    CoreEngine.getInstance().resume();
    useDiagramStore.getState().resumeSimulation();
  }

  stop() {
    this._unsubNodes?.();
    this._unsubNodes = null;
    CoreEngine.getInstance().stop();
    useDiagramStore.getState().stopSimulation();
    useDiagramStore
      .getState()
      .addSimulationLog({ level: "info", message: "Simulation stopped." });
  }
}
