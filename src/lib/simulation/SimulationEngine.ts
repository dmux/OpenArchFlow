import { AppNode, AppEdge, NodeMockData } from "../store";
import { getServiceBehavior, sampleLatency } from "./aws-behaviors";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SimulationOptions {
  speed: number; // 0.1–5.0 multiplier
  duration?: number; // ms, optional auto-stop
}

/** Per-node metrics delta emitted each tick */
export interface NodeMetricsDelta {
  nodeId: string;
  requests: number;
  errors: number;
  latencySample?: number; // ms
  queueDepthDelta?: number;
  cacheHit?: boolean;
  throttled?: boolean;
  concurrencyDelta?: number;
  costDelta?: number; // USD
}

/** A single hop in a request trace */
export interface TraceHop {
  nodeId: string;
  nodeLabel: string;
  enteredAt: number;
  exitedAt: number;
  latencyMs: number;
  status: "success" | "error" | "throttled";
  errorMessage?: string;
}

/** A complete request trace (X-Ray-like) */
export interface RequestTrace {
  id: string;
  startedAt: number;
  finishedAt: number;
  totalLatencyMs: number;
  status: "success" | "error";
  hops: TraceHop[];
}

export interface ActiveEdgeState {
  id: string;
  status: "active" | "error" | "throttled";
}

export type SimulationCallback = (
  activeNodeIds: string[],
  activeEdgeIds: ActiveEdgeState[],
  logs: {
    nodeId?: string;
    level: "info" | "success" | "error" | "warning";
    message: string;
  }[],
  metricDeltas: NodeMetricsDelta[],
  completedTraces: RequestTrace[],
) => void;

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface ActiveRequest {
  id: string;
  currentNodeId: string;
  path: string[];
  startTime: number;
  status: "pending" | "success" | "failed";
  payload?: unknown;
  hops: TraceHop[];
  nodeEnteredAt: number;
}

// Per-node active concurrency tracking (cleared on stop)
const activeConcurrency: Map<string, number> = new Map();

// Lambda/ECS/Aurora cold-start warm tracking (persists within session)
const warmedNodes: Set<string> = new Set();

// SQS/Kinesis queue depths
const queueDepths: Map<string, number> = new Map();

// ALB/NLB round-robin counters
const rrCounters: Map<string, number> = new Map();

// ─── Engine class ─────────────────────────────────────────────────────────────

export class SimulationEngine {
  private static _instance: SimulationEngine;
  private isRunning = false;
  private speed = 1.0;
  private cb: SimulationCallback | null = null;
  private activeRequests: ActiveRequest[] = [];
  private killedNodes: Set<string> = new Set();
  private trafficMultiplier = 1;
  private _nodes: AppNode[] = [];
  private _edges: AppEdge[] = [];

  private constructor() {}

  public static getInstance(): SimulationEngine {
    if (!SimulationEngine._instance) {
      SimulationEngine._instance = new SimulationEngine();
    }
    return SimulationEngine._instance;
  }

  // ── Control ──────────────────────────────────────────────────────────────

  public setKilledNodes(killed: Set<string>) {
    this.killedNodes = killed;
  }

  /** Hot-update nodes during a running simulation (e.g. mock changes). */
  public updateNodes(nodes: AppNode[]) {
    this._nodes = nodes;
  }

  public setTrafficMultiplier(m: number) {
    this.trafficMultiplier = Math.max(1, m);
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public start(
    nodes: AppNode[],
    edges: AppEdge[],
    callback: SimulationCallback,
    options?: SimulationOptions,
    killedNodes?: Set<string>,
  ) {
    if (this.isRunning) this.stop();

    this.isRunning = true;
    this.cb = callback;
    this.speed = options?.speed ?? 1.0;
    this.activeRequests = [];
    this.killedNodes = killedNodes ?? new Set();
    this.trafficMultiplier = 1;
    this._nodes = nodes;
    this._edges = edges;
    activeConcurrency.clear();
    queueDepths.clear();
    rrCounters.clear();

    const entryNodes = nodes.filter((n) => {
      const mock = n.data.mock as NodeMockData | undefined;
      return (mock?.requestsPerSecond ?? 0) > 0;
    });

    if (entryNodes.length === 0) {
      callback(
        [],
        [],
        [
          {
            level: "warning",
            message:
              'No entry points found. Set "Requests/s" > 0 on a Client or Gateway node.',
          },
        ],
        [],
        [],
      );
      this.stop();
      return;
    }

    this.scheduleTick(nodes, edges);
  }

  public stop() {
    this.isRunning = false;
    this.activeRequests = [];
  }

  // ── Scheduling ──────────────────────────────────────────────────────────

  private scheduleTick(_nodes?: AppNode[], _edges?: AppEdge[]) {
    if (!this.isRunning) return;
    const intervalMs = 1000 / (10 * this.speed);
    setTimeout(() => this.tick(), intervalMs);
  }

  // ── Core Tick ────────────────────────────────────────────────────────────

  private tick() {
    const nodes = this._nodes;
    const edges = this._edges;
    if (!this.isRunning || !this.cb) return;

    const now = Date.now();
    const activeNodeIds: string[] = [];
    const activeEdgeIds: ActiveEdgeState[] = [];
    const logs: {
      nodeId?: string;
      level: "info" | "success" | "error" | "warning";
      message: string;
    }[] = [];
    const metricDeltas: NodeMetricsDelta[] = [];
    const completedTraces: RequestTrace[] = [];

    const addDelta = (delta: NodeMetricsDelta) => {
      const ex = metricDeltas.find((d) => d.nodeId === delta.nodeId);
      if (ex) {
        ex.requests += delta.requests;
        ex.errors += delta.errors;
        if (delta.latencySample !== undefined)
          ex.latencySample = delta.latencySample;
        if (delta.queueDepthDelta !== undefined)
          ex.queueDepthDelta =
            (ex.queueDepthDelta ?? 0) + delta.queueDepthDelta;
        if (delta.cacheHit !== undefined) ex.cacheHit = delta.cacheHit;
        if (delta.throttled) ex.throttled = true;
        if (delta.concurrencyDelta !== undefined)
          ex.concurrencyDelta =
            (ex.concurrencyDelta ?? 0) + delta.concurrencyDelta;
        if (delta.costDelta !== undefined)
          ex.costDelta = (ex.costDelta ?? 0) + delta.costDelta;
      } else {
        metricDeltas.push({ ...delta });
      }
    };

    // 1. Spawn new requests from entry nodes
    nodes.forEach((node) => {
      const mock = node.data.mock as NodeMockData | undefined;
      const rps = (mock?.requestsPerSecond ?? 0) * this.trafficMultiplier;
      if (rps <= 0) return;
      const chance = rps / 10;
      const spawns = Math.floor(chance) + (Math.random() < chance % 1 ? 1 : 0);
      for (let i = 0; i < spawns; i++) {
        this.activeRequests.push({
          id: crypto.randomUUID(),
          currentNodeId: node.id,
          path: [node.id],
          startTime: now,
          status: "pending",
          hops: [],
          nodeEnteredAt: now,
        });
        logs.push({
          nodeId: node.id,
          level: "info",
          message: `→ New request from [${node.data.label}]`,
        });
        addDelta({ nodeId: node.id, requests: 1, errors: 0 });
      }
    });

    // 2. Process each active request
    const nextRequests: ActiveRequest[] = [];

    for (const req of this.activeRequests) {
      const currentNode = nodes.find((n) => n.id === req.currentNodeId);
      if (!currentNode) continue;

      activeNodeIds.push(currentNode.id);
      const mock = currentNode.data.mock as NodeMockData | undefined;
      const behavior = getServiceBehavior(currentNode.data.service ?? "");

      // ── Killed node ────────────────────────────────────────────────────
      if (this.killedNodes.has(currentNode.id)) {
        // Mark inbound edges as error
        edges
          .filter((e) => e.target === currentNode.id)
          .forEach((e) => activeEdgeIds.push({ id: e.id, status: "error" }));
        logs.push({
          nodeId: currentNode.id,
          level: "error",
          message: `✗ ServiceUnavailableException at [${currentNode.data.label}]`,
        });
        req.hops.push({
          nodeId: currentNode.id,
          nodeLabel: currentNode.data.label,
          enteredAt: req.nodeEnteredAt,
          exitedAt: now,
          latencyMs: now - req.nodeEnteredAt,
          status: "error",
          errorMessage: "ServiceUnavailableException",
        });
        completedTraces.push(this.finishTrace(req, "error", now));
        addDelta({ nodeId: currentNode.id, requests: 1, errors: 1 });
        continue;
      }

      // ── Concurrency limit ──────────────────────────────────────────────
      const concurrencyLimit =
        (mock as NodeMockData & { concurrencyLimit?: number })
          ?.concurrencyLimit ?? behavior.concurrencyLimit;
      if (concurrencyLimit !== undefined) {
        const cur = activeConcurrency.get(currentNode.id) ?? 0;
        if (cur >= concurrencyLimit) {
          const throttleErr = behavior.throttleError ?? "ThrottlingException";
          logs.push({
            nodeId: currentNode.id,
            level: "warning",
            message: `⚡ ${throttleErr} at [${currentNode.data.label}] (${cur}/${concurrencyLimit})`,
          });
          addDelta({
            nodeId: currentNode.id,
            requests: 1,
            errors: 1,
            throttled: true,
          });
          edges
            .filter((e) => e.target === currentNode.id)
            .forEach((e) =>
              activeEdgeIds.push({ id: e.id, status: "throttled" }),
            );
          req.hops.push({
            nodeId: currentNode.id,
            nodeLabel: currentNode.data.label,
            enteredAt: req.nodeEnteredAt,
            exitedAt: now,
            latencyMs: now - req.nodeEnteredAt,
            status: "throttled",
            errorMessage: throttleErr,
          });
          completedTraces.push(this.finishTrace(req, "error", now));
          continue;
        }
        activeConcurrency.set(currentNode.id, cur + 1);
      }

      // ── Cold start ────────────────────────────────────────────────────
      const coldEnabled =
        (mock as NodeMockData & { coldStartEnabled?: boolean })
          ?.coldStartEnabled ?? behavior.coldStart;
      if (coldEnabled && !warmedNodes.has(currentNode.id)) {
        warmedNodes.add(currentNode.id);
        const coldMs = sampleLatency(behavior.coldStartLatency);
        logs.push({
          nodeId: currentNode.id,
          level: "warning",
          message: `❄ Cold start at [${currentNode.data.label}] +${coldMs}ms`,
        });
        addDelta({
          nodeId: currentNode.id,
          requests: 0,
          errors: 0,
          latencySample: coldMs,
        });
      }

      // ── Failure rate ──────────────────────────────────────────────────
      const failureRate = mock?.failureRate ?? 0;
      if (Math.random() * 100 < failureRate) {
        const latency = sampleLatency(behavior.latencyRange);
        logs.push({
          nodeId: currentNode.id,
          level: "error",
          message: `✗ Request failed at [${currentNode.data.label}]`,
        });
        edges
          .filter((e) => e.target === currentNode.id)
          .forEach((e) => activeEdgeIds.push({ id: e.id, status: "error" }));
        req.hops.push({
          nodeId: currentNode.id,
          nodeLabel: currentNode.data.label,
          enteredAt: req.nodeEnteredAt,
          exitedAt: now,
          latencyMs: latency,
          status: "error",
          errorMessage: "Simulated failure",
        });
        completedTraces.push(this.finishTrace(req, "error", now));
        addDelta({
          nodeId: currentNode.id,
          requests: 1,
          errors: 1,
          latencySample: latency,
        });
        this.releaseConcurrency(currentNode.id, concurrencyLimit);
        continue;
      }

      // ── Auto-fill payload from mock data ─────────────────────────────
      if (!req.payload && mock?.data && mock.data.length > 0) {
        req.payload = mock.data[Math.floor(Math.random() * mock.data.length)];
      }

      const latency = sampleLatency(behavior.latencyRange);
      addDelta({
        nodeId: currentNode.id,
        requests: 1,
        errors: 0,
        latencySample: latency,
      });

      const costDelta =
        behavior.cost.pricePerUnit * behavior.cost.unitsPerRequest;
      if (costDelta > 0)
        addDelta({ nodeId: currentNode.id, requests: 0, errors: 0, costDelta });

      const outEdges = edges.filter((e) => e.source === currentNode.id);

      // ── Queue routing (SQS, Kinesis) ─────────────────────────────────
      if (behavior.routing === "queue") {
        const depth = (queueDepths.get(currentNode.id) ?? 0) + 1;
        queueDepths.set(currentNode.id, depth);
        addDelta({
          nodeId: currentNode.id,
          requests: 0,
          errors: 0,
          queueDepthDelta: 1,
        });
        logs.push({
          nodeId: currentNode.id,
          level: "info",
          message: `📥 [${currentNode.data.label}] queued (depth=${depth})`,
        });
        const consumeCount = Math.min(depth, 2);
        if (consumeCount > 0 && outEdges.length > 0) {
          queueDepths.set(currentNode.id, depth - consumeCount);
          addDelta({
            nodeId: currentNode.id,
            requests: 0,
            errors: 0,
            queueDepthDelta: -consumeCount,
          });
          for (let c = 0; c < consumeCount; c++) {
            const edge = outEdges[Math.floor(Math.random() * outEdges.length)];
            activeEdgeIds.push({ id: edge.id, status: "active" });
            nextRequests.push({
              id: crypto.randomUUID(),
              currentNodeId: edge.target,
              path: [...req.path, edge.target],
              startTime: req.startTime,
              status: "pending",
              payload: req.payload,
              hops: [
                ...req.hops,
                {
                  nodeId: currentNode.id,
                  nodeLabel: currentNode.data.label,
                  enteredAt: req.nodeEnteredAt,
                  exitedAt: now,
                  latencyMs: latency,
                  status: "success",
                },
              ],
              nodeEnteredAt: now,
            });
          }
        }
        this.releaseConcurrency(currentNode.id, concurrencyLimit);
        continue;
      }

      // ── Cache routing (CloudFront, ElastiCache) ───────────────────────
      if (behavior.routing === "cache") {
        const hitRate =
          (mock as NodeMockData & { cacheHitRate?: number })?.cacheHitRate ??
          70;
        const isHit = Math.random() * 100 < hitRate;
        addDelta({
          nodeId: currentNode.id,
          requests: 0,
          errors: 0,
          cacheHit: isHit,
        });
        if (isHit) {
          logs.push({
            nodeId: currentNode.id,
            level: "success",
            message: `⚡ Cache HIT at [${currentNode.data.label}]`,
          });
          req.hops.push({
            nodeId: currentNode.id,
            nodeLabel: currentNode.data.label,
            enteredAt: req.nodeEnteredAt,
            exitedAt: now,
            latencyMs: latency,
            status: "success",
          });
          completedTraces.push(this.finishTrace(req, "success", now));
          this.releaseConcurrency(currentNode.id, concurrencyLimit);
          continue;
        }
        logs.push({
          nodeId: currentNode.id,
          level: "info",
          message: `📡 Cache MISS at [${currentNode.data.label}]`,
        });
      }

      if (outEdges.length === 0) {
        req.hops.push({
          nodeId: currentNode.id,
          nodeLabel: currentNode.data.label,
          enteredAt: req.nodeEnteredAt,
          exitedAt: now,
          latencyMs: latency,
          status: "success",
        });
        logs.push({
          nodeId: currentNode.id,
          level: "success",
          message: `✓ Request complete at [${currentNode.data.label}]`,
        });
        completedTraces.push(this.finishTrace(req, "success", now));
        this.releaseConcurrency(currentNode.id, concurrencyLimit);
        continue;
      }

      // ── Fan-out (SNS, EventBridge) ────────────────────────────────────
      if (behavior.routing === "fan-out") {
        req.hops.push({
          nodeId: currentNode.id,
          nodeLabel: currentNode.data.label,
          enteredAt: req.nodeEnteredAt,
          exitedAt: now,
          latencyMs: latency,
          status: "success",
        });
        logs.push({
          nodeId: currentNode.id,
          level: "info",
          message: `📣 [${currentNode.data.label}] fan-out → ${outEdges.length} targets`,
        });
        outEdges.forEach((edge) => {
          activeEdgeIds.push({ id: edge.id, status: "active" });
          nextRequests.push({
            id: crypto.randomUUID(),
            currentNodeId: edge.target,
            path: [...req.path, edge.target],
            startTime: req.startTime,
            status: "pending",
            payload: req.payload,
            hops: [...req.hops],
            nodeEnteredAt: now,
          });
        });
        this.releaseConcurrency(currentNode.id, concurrencyLimit);
        continue;
      }

      // ── Round-robin (ALB, NLB) ────────────────────────────────────────
      if (behavior.routing === "round-robin") {
        const counter = rrCounters.get(currentNode.id) ?? 0;
        const chosenEdge = outEdges[counter % outEdges.length];
        rrCounters.set(currentNode.id, counter + 1);
        activeEdgeIds.push({ id: chosenEdge.id, status: "active" });
        req.hops.push({
          nodeId: currentNode.id,
          nodeLabel: currentNode.data.label,
          enteredAt: req.nodeEnteredAt,
          exitedAt: now,
          latencyMs: latency,
          status: "success",
        });
        req.currentNodeId = chosenEdge.target;
        req.path.push(chosenEdge.target);
        req.nodeEnteredAt = now;
        nextRequests.push(req);
        this.releaseConcurrency(currentNode.id, concurrencyLimit);
        continue;
      }

      // ── Default / unicast / passthrough ──────────────────────────────
      const chosenEdge = outEdges[Math.floor(Math.random() * outEdges.length)];
      activeEdgeIds.push({ id: chosenEdge.id, status: "active" });

      const edgeAction = (
        chosenEdge.data as { simulationAction?: { type: string } } | undefined
      )?.simulationAction;
      if (edgeAction) {
        const targetNode = nodes.find((n) => n.id === chosenEdge.target);
        if (targetNode) {
          const targetMock = targetNode.data.mock as NodeMockData | undefined;
          if (edgeAction.type === "read" && targetMock?.data?.length) {
            req.payload =
              targetMock.data[
                Math.floor(Math.random() * targetMock.data.length)
              ];
            logs.push({
              nodeId: chosenEdge.target,
              level: "success",
              message: `📖 Read from [${targetNode.data.label}]: ${JSON.stringify(req.payload).substring(0, 40)}`,
            });
          } else if (edgeAction.type === "write") {
            logs.push({
              nodeId: chosenEdge.target,
              level: "success",
              message: `✏ Write to [${targetNode.data.label}]`,
            });
          } else if (edgeAction.type === "trigger") {
            logs.push({
              nodeId: chosenEdge.target,
              level: "info",
              message: `⚡ Trigger [${targetNode.data.label}]`,
            });
          }
        }
      }

      req.hops.push({
        nodeId: currentNode.id,
        nodeLabel: currentNode.data.label,
        enteredAt: req.nodeEnteredAt,
        exitedAt: now,
        latencyMs: latency,
        status: "success",
      });
      req.currentNodeId = chosenEdge.target;
      req.path.push(chosenEdge.target);
      req.nodeEnteredAt = now;
      nextRequests.push(req);
      this.releaseConcurrency(currentNode.id, concurrencyLimit);
    }

    this.activeRequests = nextRequests;
    // Deduplicate edges (prefer error > throttled > active)
    const edgeMap = new Map<string, ActiveEdgeState>();
    for (const e of activeEdgeIds) {
      const existing = edgeMap.get(e.id);
      if (
        !existing ||
        e.status === "error" ||
        (e.status === "throttled" && existing.status === "active")
      ) {
        edgeMap.set(e.id, e);
      }
    }
    this.cb(
      activeNodeIds,
      Array.from(edgeMap.values()),
      logs,
      metricDeltas,
      completedTraces,
    );
    this.scheduleTick();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private releaseConcurrency(nodeId: string, limit: number | undefined) {
    if (limit === undefined) return;
    const c = activeConcurrency.get(nodeId) ?? 0;
    activeConcurrency.set(nodeId, Math.max(0, c - 1));
  }

  private finishTrace(
    req: ActiveRequest,
    status: "success" | "error",
    now: number,
  ): RequestTrace {
    const totalLatency = req.hops.reduce((sum, h) => sum + h.latencyMs, 0);
    return {
      id: req.id,
      startedAt: req.startTime,
      finishedAt: now,
      totalLatencyMs: totalLatency,
      status,
      hops: req.hops,
    };
  }
}
