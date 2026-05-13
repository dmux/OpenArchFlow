import { create } from "zustand";
import { persist } from "zustand/middleware";
import { temporal } from "zundo";
import type { MiniStackNodeState, MiniStackConfig } from "./ministack/types";
import { DEFAULT_MINISTACK_CONFIG } from "./ministack/types";

export interface BedrockCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: number; // Unix timestamp ms
}

export interface BedrockConfig {
  region: string;
  credentials: BedrockCredentials;
  accountId: string;
  accountName: string;
  roleName: string;
  ssoStartUrl: string;
  ssoRegion: string;
  accessToken: string;
  accessTokenExpiration: number; // Unix timestamp ms
}
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import ELK from "elkjs/lib/elk.bundled";
import * as Y from "yjs";
import {
  sharedDiagrams,
  initCollaboration,
  destroyCollaboration,
} from "./collaboration";

const elk = new ELK();

const syncToYjs = (
  id: string | null,
  roomId: string | null,
  diagrams: Record<string, Diagram>,
) => {
  if (id && roomId && diagrams[id]) {
    sharedDiagrams.set(id, diagrams[id]);
  }
};

export interface AppEdgeData {
  simulationAction?: {
    type: "read" | "write" | "trigger";
    targetId?: string; // For things like GetItem where we might want to specify WHAT to get (though typically implied by connection)
    query?: string; // e.g. "Select * from Users" or "GetItem { id: payload.userId }"
  };
  [key: string]: any;
}

export type AppNode = Node<AppNodeData>;
export type AppEdge = Edge<AppEdgeData>;

export interface NodeMockData {
  enabled?: boolean;
  latency?: number; // ms
  failureRate?: number; // 0-100
  // For Gateway / API
  endpoints?: {
    id: string;
    method: string;
    path: string;
    status: number;
    targetNodeId?: string; // NEW: Specific routing target
  }[];
  // For Compute
  responseBody?: string;
  // For Client
  testRequests?: {
    id: string;
    method: string;
    path: string;
    body?: string;
  }[];
  // Global Config for Root Nodes (Clients/Gateways)
  requestsPerSecond?: number; // 0 = Single shot, >0 = Continuous

  // For Database / Storage Nodes
  data?: Record<string, any>[]; // Mocked data items (rows, documents)
  queryLogic?: string; // Optional: "random", "first", "byId"

  // Simulation config — all optional, backward-compatible
  concurrencyLimit?: number; // Override default for Lambda/RDS/ECS
  cacheHitRate?: number; // 0-100, for CloudFront/ElastiCache
  queueMaxDepth?: number; // SQS/Kinesis visual cap
  coldStartEnabled?: boolean; // Override service default

  // Traffic Source request config (used when type === "traffic-source")
  httpMethod?: string;       // HTTP verb forwarded to API Gateway
  httpPath?: string;         // Path forwarded to API Gateway (e.g. /users)
  payloadTemplate?: string;  // JSON string — becomes the request body / Lambda event
}

export interface NodeSimulationStatus {
  status: "idle" | "processing" | "success" | "error";
  lastRun?: number;
  // Live metrics (ephemeral — not persisted)
  requestCount?: number;
  errorCount?: number;
  latencies?: number[]; // circular buffer, last 100 samples (ms)
  queueDepth?: number;
  cacheHits?: number;
  cacheMisses?: number;
  throttleCount?: number;
  activeConcurrency?: number;
  cumulativeCostUsd?: number;
}

/** Input shape used by updateNodeMetrics store action */
export interface NodeMetricsUpdate {
  nodeId: string;
  requests?: number;
  errors?: number;
  latencySample?: number;
  queueDepthDelta?: number;
  cacheHit?: boolean;
  throttled?: boolean;
  concurrencyDelta?: number;
  costDelta?: number;
}

export interface NodePricing {
  rate?: number; // Price per unit (e.g., $0.023)
  unit?: string; // Unit (e.g., Hrs, GB-Mo, Request)
  hourlyCost?: number;
  monthlyCost?: number;
  quantity?: number; // User-defined usage quantity (count, GBs, etc.)
  currency?: string;
  lastUpdated?: number;
  error?: string;
  loading?: boolean;
}

export interface TerraformNodeConfig {
  resourceType?: string;
  resourceName?: string;
  customArgs?: Record<string, unknown>;
}

export interface AppNodeData extends Record<string, unknown> {
  label: string;
  service: string;
  type?: string;
  metadata?: Record<string, any>;
  mock?: NodeMockData;
  simulation?: NodeSimulationStatus;
  pricing?: NodePricing;
  layerId?: string;
  iacConfig?: {
    terraform?: TerraformNodeConfig;
  };
  ministack?: MiniStackNodeState;
}

export type { MiniStackNodeState, MiniStackConfig };

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export interface SimulationLog {
  id: string;
  timestamp: number;
  nodeId?: string;
  nodeLabel?: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
}

export interface Diagram {
  id: string;
  name: string;
  nodes: AppNode[];
  edges: AppEdge[];
  layers: Layer[];
  lastModified: number;
}

interface DiagramState {
  diagrams: Record<string, Diagram>;
  activeDiagramId: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  geminiApiKey: string | null;
  isOfflineMode: boolean;
  aiProvider: "offline" | "gemini" | "local" | "bedrock";
  nodeDisplayMode: "card" | "icon";
  setNodeDisplayMode: (mode: "card" | "icon") => void;
  setAiProvider: (provider: "offline" | "gemini" | "local" | "bedrock") => void;
  bedrockConfig: BedrockConfig | null;
  bedrockModel: string;
  setBedrockConfig: (config: BedrockConfig | null) => void;
  setBedrockModel: (model: string) => void;
  generatedSpecification: string | null;

  // Import Actions
  importDiagram: (diagram: Diagram) => void;
  importDiagrams: (diagrams: Record<string, Diagram>) => void;

  // Actions for Diagram Management
  createDiagram: (name?: string) => string;
  deleteDiagram: (id: string) => void;
  setActiveDiagram: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;

  updateEdge: (id: string, data: any) => void;
  renameDiagram: (id: string, name: string) => void;
  setGeminiApiKey: (key: string | null) => void;
  setOfflineMode: (isOffline: boolean) => void;
  setGeneratedSpecification: (spec: string | null) => void;

  // Actions for Active Diagram (Proxied)
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  addNode: (node: AppNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, data: any) => void;
  removeEdge: (id: string) => void;
  layout: () => Promise<void>;
  clear: () => void;

  // Collaboration internal
  applyRemoteUpdate: (id: string, diagram: Diagram) => void;

  // Batch update for multi-node styling
  batchUpdateNodes: (ids: string[], data: Partial<AppNodeData>) => void;

  // Grouping
  groupNodes: (ids: string[]) => void;
  ungroupNodes: (groupId: string) => void;
  setGroupLocked: (groupId: string, locked: boolean) => void;

  // Layer Actions
  addLayer: (name?: string) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, patch: Partial<Omit<Layer, "id">>) => void;
  moveNodeToLayer: (nodeId: string, layerId: string) => void;

  // Simulation State
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  isPaused: boolean;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  simulationLogs: SimulationLog[];
  addSimulationLog: (log: Omit<SimulationLog, "id" | "timestamp">) => void;
  clearSimulationLogs: () => void;

  // Simulation Actions
  updateNodeMock: (nodeId: string, mock: Partial<NodeMockData>) => void;
  setNodeSimulationStatus: (
    nodeId: string,
    status: NodeSimulationStatus,
  ) => void;
  /** Batch-update live metrics for multiple nodes (ephemeral) */
  updateNodeMetrics: (updates: NodeMetricsUpdate[]) => void;
  resetSimulation: () => void;
  stopSimulation: () => void;

  // Fault injection (ephemeral, not persisted)
  killedNodes: Set<string>;
  trafficMultiplier: number;
  toggleKillNode: (nodeId: string) => void;
  setTrafficMultiplier: (m: number) => void;

  // Live edge activity (ephemeral, per-tick)
  activeSimulationEdges: Map<string, "active" | "error" | "throttled">;
  setActiveSimulationEdges: (
    edges: Map<string, "active" | "error" | "throttled">,
  ) => void;

  // Simulation traces (ephemeral, last 50)
  simulationTraces: import("./simulation/SimulationEngine").RequestTrace[];
  addSimulationTraces: (
    traces: import("./simulation/SimulationEngine").RequestTrace[],
  ) => void;
  clearSimulationTraces: () => void;

  // Interaction Mode
  interactionMode: "default" | "laser" | "pan"; // 'default' = selection/pan, 'laser' = laser pointer, 'pan' = hand/pan mode
  setInteractionMode: (mode: "default" | "laser" | "pan") => void;

  // Collaboration
  collaborationRoomId: string | null;
  setCollaborationRoomId: (id: string | null) => void;

  // Custom SVG Shapes
  customShapes: { id: string; name: string; svgContent: string }[];
  addCustomShape: (name: string, svgContent: string) => void;
  removeCustomShape: (id: string) => void;

  // MiniStack
  ministackConfig: MiniStackConfig;
  setMinistackConfig: (config: Partial<MiniStackConfig>) => void;
  setNodeMinistackState: (nodeId: string, state: Partial<MiniStackNodeState>) => void;
  resetNodeMinistackState: (nodeId: string) => void;
  resetAllMinistackStates: () => void;

  // Google Sign-In
  googleUser: { sub: string; email: string; name: string; picture: string } | null;
  setGoogleUser: (user: { sub: string; email: string; name: string; picture: string } | null) => void;

  // Gemini Model
  geminiModel: string;
  setGeminiModel: (model: string) => void;

  // Google Drive Sync
  driveFileId: string | null;
  driveLastSyncedAt: number | null;
  driveSyncStatus: "idle" | "syncing" | "error" | "conflict";
  driveLastError: string | null;
  setDriveFileId: (id: string | null) => void;
  setDriveSyncStatus: (status: "idle" | "syncing" | "error" | "conflict") => void;
  setDriveSyncResult: (fileId: string, syncedAt: number) => void;
  setDriveError: (error: string | null) => void;

  // Onboarding tour
  tourCompleted: boolean;
  tourOpen: boolean;
  setTourCompleted: () => void;
  setTourOpen: (open: boolean) => void;
}

export const useDiagramStore = create<DiagramState>()(
  temporal(
    persist(
      (set, get) => ({
        diagrams: {},
        activeDiagramId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        geminiApiKey: null,
        isOfflineMode: false,
        aiProvider: "offline" as const,
        nodeDisplayMode: "icon" as const,
        isPlaying: false,
        isPaused: false,
        simulationSpeed: 1,
        simulationLogs: [],
        generatedSpecification: null,
        interactionMode: "default",
        collaborationRoomId: null,
        customShapes: [],
        killedNodes: new Set<string>(),
        trafficMultiplier: 1,
        simulationTraces: [],
        activeSimulationEdges: new Map<
          string,
          "active" | "error" | "throttled"
        >(),
        ministackConfig: { ...DEFAULT_MINISTACK_CONFIG },
        googleUser: null,
        geminiModel: "gemini-2.5-flash",
        bedrockConfig: null,
        bedrockModel: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        driveFileId: null,
        driveLastSyncedAt: null,
        driveSyncStatus: "idle" as const,
        driveLastError: null,
        tourCompleted: false,
        tourOpen: false,

        setCollaborationRoomId: (id) => {
          if (!id) {
            // Destroy the WebRTC provider when the user stops collaboration,
            // so the peer disconnects from the room immediately.
            destroyCollaboration();
            set({ collaborationRoomId: null });
            return;
          }
          set({ collaborationRoomId: id });
          initCollaboration(id);
          // Initial sync: push current active diagram to Yjs if it's not there
          const { activeDiagramId, diagrams } = get();
          if (activeDiagramId && diagrams[activeDiagramId]) {
            if (!sharedDiagrams.has(activeDiagramId)) {
              sharedDiagrams.set(activeDiagramId, diagrams[activeDiagramId]);
            }
          }
        },

        importDiagram: (diagram) =>
          set((state) => {
            // Check if ID exists, if so, create a new ID and append (Imported) to name
            let newId = diagram.id;
            let newName = diagram.name;

            if (state.diagrams[newId]) {
              newId = crypto.randomUUID();
              newName = `${diagram.name} (Imported)`;
            }

            const newDiagram = {
              ...diagram,
              id: newId,
              name: newName,
              lastModified: Date.now(),
              layers: diagram.layers?.length
                ? diagram.layers
                : [
                    {
                      id: "default",
                      name: "Default",
                      visible: true,
                      locked: false,
                      color: "#6366f1",
                    },
                  ],
            };

            const newDiagrams = { ...state.diagrams, [newId]: newDiagram };

            syncToYjs(newId, state.collaborationRoomId, newDiagrams);

            return {
              diagrams: newDiagrams,
              activeDiagramId: newId, // Switch to imported diagram
            };
          }),

        importDiagrams: (importedDiagrams) =>
          set((state) => {
            const newDiagrams = { ...state.diagrams };

            Object.values(importedDiagrams).forEach((diagram) => {
              let newId = diagram.id;
              let newName = diagram.name;

              // Conflict resolution: if ID exists, generate new ID
              if (newDiagrams[newId]) {
                newId = crypto.randomUUID();
                newName = `${diagram.name} (Imported)`;
              }

              newDiagrams[newId] = {
                ...diagram,
                id: newId,
                name: newName,
                lastModified: Date.now(),
              };

              syncToYjs(newId, state.collaborationRoomId, newDiagrams);
            });

            return {
              diagrams: newDiagrams,
              // keep active diagram as is, or switch if it was null
              activeDiagramId:
                state.activeDiagramId || Object.keys(newDiagrams)[0],
            };
          }),

        setIsPlaying: (isPlaying) => set({ isPlaying }),
        pauseSimulation: () => set({ isPaused: true }),
        resumeSimulation: () => set({ isPaused: false }),
        setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),
        setInteractionMode: (mode) => set({ interactionMode: mode }),

        toggleKillNode: (nodeId) =>
          set((state) => {
            const next = new Set(state.killedNodes);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return { killedNodes: next };
          }),

        setTrafficMultiplier: (m) => set({ trafficMultiplier: Math.max(1, m) }),

        setActiveSimulationEdges: (edges) =>
          set({ activeSimulationEdges: edges }),

        addSimulationTraces: (traces) =>
          set((state) => ({
            simulationTraces: [...state.simulationTraces, ...traces].slice(-50),
          })),

        clearSimulationTraces: () => set({ simulationTraces: [] }),

        addSimulationLog: (log) =>
          set((state) => ({
            simulationLogs: [
              ...state.simulationLogs,
              { ...log, id: crypto.randomUUID(), timestamp: Date.now() },
            ],
          })),

        clearSimulationLogs: () => set({ simulationLogs: [] }),

        updateNodeMetrics: (updates) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => {
              const update = updates.find((u) => u.nodeId === node.id);
              if (!update) return node;
              const prev = (node.data.simulation ?? {
                status: "processing" as const,
              }) as NodeSimulationStatus;
              const prevLatencies = prev.latencies ?? [];
              const newLatencies =
                update.latencySample !== undefined
                  ? [...prevLatencies, update.latencySample].slice(-100)
                  : prevLatencies;
              const newQueueDepth =
                update.queueDepthDelta !== undefined
                  ? Math.max(0, (prev.queueDepth ?? 0) + update.queueDepthDelta)
                  : prev.queueDepth;
              const newCacheHits =
                update.cacheHit === true
                  ? (prev.cacheHits ?? 0) + 1
                  : prev.cacheHits;
              const newCacheMisses =
                update.cacheHit === false
                  ? (prev.cacheMisses ?? 0) + 1
                  : prev.cacheMisses;
              const newStatus: NodeSimulationStatus = {
                ...prev,
                status: "processing",
                requestCount: (prev.requestCount ?? 0) + (update.requests ?? 0),
                errorCount: (prev.errorCount ?? 0) + (update.errors ?? 0),
                throttleCount: update.throttled
                  ? (prev.throttleCount ?? 0) + 1
                  : prev.throttleCount,
                latencies: newLatencies,
                queueDepth: newQueueDepth,
                cacheHits: newCacheHits,
                cacheMisses: newCacheMisses,
                cumulativeCostUsd:
                  (prev.cumulativeCostUsd ?? 0) + (update.costDelta ?? 0),
              };
              return { ...node, data: { ...node.data, simulation: newStatus } };
            });
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: { ...activeDiagram, nodes: newNodes },
              },
            };
          });
        },

        updateNodeMock: (nodeId, mock) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => {
              if (node.id === nodeId) {
                const currentMock = node.data.mock || {};
                return {
                  ...node,
                  data: { ...node.data, mock: { ...currentMock, ...mock } },
                };
              }
              return node;
            });

            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...activeDiagram,
                  nodes: newNodes,
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        setNodeSimulationStatus: (nodeId, status) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => {
              if (node.id === nodeId) {
                return {
                  ...node,
                  data: { ...node.data, simulation: status },
                };
              }
              return node;
            });

            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: { ...activeDiagram, nodes: newNodes },
                // We don't update lastModified for simulation state to avoid "unsaved changes" if we implemented that
              },
            };
          });
        },

        stopSimulation: () => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => {
              // Clear processing status on stop
              if (node.data.simulation?.status === "processing") {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    simulation: {
                      status: "idle" as const,
                      lastRun: Date.now(),
                    },
                  },
                };
              }
              return node;
            });

            return {
              isPlaying: false,
              isPaused: false,
              activeSimulationEdges: new Map(),
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: { ...activeDiagram, nodes: newNodes },
              },
            };
          });
        },

        resetSimulation: () => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => ({
              ...node,
              data: { ...node.data, simulation: undefined },
            }));

            return {
              isPlaying: false,
              isPaused: false,
              simulationLogs: [],
              simulationTraces: [],
              killedNodes: new Set<string>(),
              trafficMultiplier: 1,
              activeSimulationEdges: new Map(),
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: { ...activeDiagram, nodes: newNodes },
              },
            };
          });
        },

        createDiagram: (name = "New Architecture") => {
          const id = crypto.randomUUID();
          const defaultLayer: Layer = {
            id: "default",
            name: "Default",
            visible: true,
            locked: false,
            color: "#6366f1",
          };
          const newDiagram: Diagram = {
            id,
            name,
            nodes: [],
            edges: [],
            layers: [defaultLayer],
            lastModified: Date.now(),
          };
          set((state) => ({
            diagrams: { ...state.diagrams, [id]: newDiagram },
            activeDiagramId: id,
            selectedNodeId: null,
            selectedEdgeId: null,
          }));
          return id;
        },

        deleteDiagram: (id) => {
          set((state) => {
            const newDiagrams = { ...state.diagrams };
            delete newDiagrams[id];

            // If deleting active, switch to another or null
            let newActiveId = state.activeDiagramId;
            if (state.activeDiagramId === id) {
              const remainingIds = Object.keys(newDiagrams);
              newActiveId = remainingIds.length > 0 ? remainingIds[0] : null;
            }

            return {
              diagrams: newDiagrams,
              activeDiagramId: newActiveId,
              selectedNodeId: state.selectedNodeId,
              selectedEdgeId: state.selectedEdgeId,
            };
          });
        },

        setActiveDiagram: (id) =>
          set({
            activeDiagramId: id,
            selectedNodeId: null,
            selectedEdgeId: null,
          }),
        setSelectedNode: (id) =>
          set({ selectedNodeId: id, selectedEdgeId: null }),
        setSelectedEdge: (id) =>
          set({ selectedEdgeId: id, selectedNodeId: null }),

        renameDiagram: (id, name) => {
          const { collaborationRoomId } = get();
          set((state) => {
            const newDiagrams = {
              ...state.diagrams,
              [id]: { ...state.diagrams[id], name, lastModified: Date.now() },
            };
            syncToYjs(id, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
        },

        setGeminiApiKey: (key) =>
          set({ geminiApiKey: key, isOfflineMode: false }),
        setOfflineMode: (isOffline) => set({ isOfflineMode: isOffline }),
        setNodeDisplayMode: (mode) => set({ nodeDisplayMode: mode }),
        setAiProvider: (provider) => set({ aiProvider: provider }),
        setGeneratedSpecification: (spec) =>
          set({ generatedSpecification: spec }),

        // --- Active Diagram Actions ---

        onNodesChange: (changes: NodeChange[]) => {
          const { activeDiagramId, diagrams, collaborationRoomId } = get();
          if (!activeDiagramId || !diagrams[activeDiagramId]) return;

          const activeDiagram = diagrams[activeDiagramId];

          // When a parent/group node is removed, unparent its children first
          // so ReactFlow doesn't throw "Parent node not found"
          const removedIds = new Set(
            changes
              .filter(
                (c): c is { type: "remove"; id: string } => c.type === "remove",
              )
              .map((c) => c.id),
          );

          let baseNodes = activeDiagram.nodes;
          if (removedIds.size > 0) {
            baseNodes = baseNodes.map((node) => {
              if (node.parentNode && removedIds.has(node.parentNode)) {
                // Convert position back to absolute before un-parenting
                const parent = activeDiagram.nodes.find(
                  (n) => n.id === node.parentNode,
                );
                const absX = (parent?.position.x ?? 0) + node.position.x;
                const absY = (parent?.position.y ?? 0) + node.position.y;
                const unparented = {
                  ...node,
                  position: { x: absX, y: absY },
                } as Record<string, unknown>;
                delete unparented.parentNode;
                delete unparented.extent;
                return unparented as typeof node;
              }
              return node;
            });
          }

          const newNodes = applyNodeChanges(changes, baseNodes);

          const newDiagrams = {
            ...diagrams,
            [activeDiagramId]: {
              ...activeDiagram,
              nodes: newNodes,
              lastModified: Date.now(),
            },
          };

          set({ diagrams: newDiagrams });
          syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
        },

        onEdgesChange: (changes: EdgeChange[]) => {
          const { activeDiagramId, diagrams, collaborationRoomId } = get();
          if (!activeDiagramId || !diagrams[activeDiagramId]) return;

          const activeDiagram = diagrams[activeDiagramId];
          const newEdges = applyEdgeChanges(changes, activeDiagram.edges);

          const newDiagrams = {
            ...diagrams,
            [activeDiagramId]: {
              ...activeDiagram,
              edges: newEdges,
              lastModified: Date.now(),
            },
          };

          set({ diagrams: newDiagrams });
          syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
        },

        onConnect: (connection: Connection) => {
          const { activeDiagramId, diagrams, collaborationRoomId } = get();
          if (!activeDiagramId || !diagrams[activeDiagramId]) return;

          const activeDiagram = diagrams[activeDiagramId];
          const newEdges = addEdge(connection, activeDiagram.edges);

          const newDiagrams = {
            ...diagrams,
            [activeDiagramId]: {
              ...activeDiagram,
              edges: newEdges,
              lastModified: Date.now(),
            },
          };

          set({
            diagrams: newDiagrams,
            selectedEdgeId: newEdges[newEdges.length - 1].id,
            selectedNodeId: null,
          });
          syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
        },

        setNodes: (nodes) => {
          const { activeDiagramId, collaborationRoomId } = get();

          // Auto-create if no active diagram exists (e.g. initial load or empty state)
          if (!activeDiagramId) {
            const id = get().createDiagram("Generated Architecture");
            set((state) => {
              const newDiagrams = {
                ...state.diagrams,
                [id]: {
                  ...state.diagrams[id],
                  nodes,
                  lastModified: Date.now(),
                },
              };
              syncToYjs(id, state.collaborationRoomId, newDiagrams);
              return { diagrams: newDiagrams };
            });
            return;
          }

          set((state) => {
            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...state.diagrams[activeDiagramId],
                nodes,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
        },

        setEdges: (edges) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return; // Should be handled by setNodes usually

          set((state) => {
            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...state.diagrams[activeDiagramId],
                edges,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
        },

        addNode: (node) => {
          const { activeDiagramId, collaborationRoomId } = get();

          if (!activeDiagramId) {
            const id = get().createDiagram("New Architecture");
            set((state) => {
              const newDiagrams = {
                ...state.diagrams,
                [id]: {
                  ...state.diagrams[id],
                  nodes: [node],
                  lastModified: Date.now(),
                },
              };
              syncToYjs(id, state.collaborationRoomId, newDiagrams);
              return { diagrams: newDiagrams };
            });
            return;
          }

          set((state) => {
            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...state.diagrams[activeDiagramId],
                nodes: [...state.diagrams[activeDiagramId].nodes, node],
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
        },

        removeNode: (id) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];

            // If the node being removed is a parent, convert children to absolute
            // positions and unparent them so ReactFlow doesn't throw "Parent not found"
            const parentNode = activeDiagram.nodes.find((n) => n.id === id);
            const nodesWithUnparentedChildren = activeDiagram.nodes.map(
              (node) => {
                if ((node as { parentNode?: string }).parentNode !== id)
                  return node;
                const absX = (parentNode?.position.x ?? 0) + node.position.x;
                const absY = (parentNode?.position.y ?? 0) + node.position.y;
                const unparented = {
                  ...node,
                  position: { x: absX, y: absY },
                } as Record<string, unknown>;
                delete unparented.parentNode;
                delete unparented.extent;
                return unparented as typeof node;
              },
            );

            // Remove the target node
            const newNodes = nodesWithUnparentedChildren.filter(
              (node) => node.id !== id,
            );
            // Remove connected edges
            const newEdges = activeDiagram.edges.filter(
              (edge) => edge.source !== id && edge.target !== id,
            );

            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...activeDiagram,
                nodes: newNodes,
                edges: newEdges,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return {
              diagrams: newDiagrams,
              selectedNodeId:
                state.selectedNodeId === id ? null : state.selectedNodeId,
            };
          });
        },

        updateNode: (id, data) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) =>
              node.id === id
                ? { ...node, data: { ...node.data, ...data } }
                : node,
            );

            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...activeDiagram,
                nodes: newNodes,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
        },

        updateEdge: (id, data) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newEdges = activeDiagram.edges.map((edge) =>
              edge.id === id
                ? {
                    ...edge,
                    label: data.label,
                    data: { ...edge.data, ...data },
                  }
                : edge,
            );

            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...activeDiagram,
                edges: newEdges,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
        },

        removeEdge: (id) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;

          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newEdges = activeDiagram.edges.filter(
              (edge) => edge.id !== id,
            );

            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...activeDiagram,
                edges: newEdges,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return {
              diagrams: newDiagrams,
              selectedEdgeId:
                state.selectedEdgeId === id ? null : state.selectedEdgeId,
            };
          });
        },

        layout: async () => {
          const { activeDiagramId, diagrams } = get();
          if (!activeDiagramId || !diagrams[activeDiagramId]) return;

          const activeDiagram = diagrams[activeDiagramId];
          const { nodes, edges } = activeDiagram;
          if (nodes.length === 0) return;

          const graph = {
            id: "root",
            layoutOptions: {
              "elk.algorithm": "layered",
              "elk.direction": "DOWN",
              "elk.spacing.nodeNode": "80",
              "elk.layered.spacing.nodeNodeBetweenLayers": "100",
            },
            children: nodes
              .filter((node) => !(node as any).parentNode)
              .map((node) => ({
                id: node.id,
                width: node.width ?? 150,
                height: node.height ?? 50,
              })),
            edges: edges
              .filter(
                (edge) =>
                  !nodes.find(
                    (n) => n.id === edge.source && (n as any).parentNode,
                  ) &&
                  !nodes.find(
                    (n) => n.id === edge.target && (n as any).parentNode,
                  ),
              )
              .map((edge) => ({
                id: edge.id,
                sources: [edge.source],
                targets: [edge.target],
              })),
          };

          try {
            const layoutedGraph = await elk.layout(graph);

            const layoutedNodes = nodes.map((node) => {
              // Don't move child nodes — their positions are relative to the parent
              if ((node as any).parentNode) return node;
              const layoutNode = layoutedGraph.children?.find(
                (n) => n.id === node.id,
              );
              if (layoutNode) {
                return {
                  ...node,
                  position: {
                    x: layoutNode.x!,
                    y: layoutNode.y!,
                  },
                };
              }
              return node;
            });

            const newDiagrams = {
              ...diagrams,
              [activeDiagramId]: {
                ...activeDiagram,
                nodes: layoutedNodes,
                lastModified: Date.now(),
              },
            };

            set({ diagrams: newDiagrams });
            syncToYjs(activeDiagramId, get().collaborationRoomId, newDiagrams);
          } catch (error) {
            console.error("ELK Layout Error:", error);
          }
        },

        clear: () => {
          const { activeDiagramId, diagrams, collaborationRoomId } = get();
          if (!activeDiagramId) return;

          const newDiagrams = {
            ...diagrams,
            [activeDiagramId]: {
              ...diagrams[activeDiagramId],
              nodes: [],
              edges: [],
              lastModified: Date.now(),
            },
          };

          set({ diagrams: newDiagrams });
          syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
        },

        addCustomShape: (name, svgContent) =>
          set((state) => ({
            customShapes: [
              ...state.customShapes,
              { id: crypto.randomUUID(), name, svgContent },
            ],
          })),

        removeCustomShape: (id) =>
          set((state) => ({
            customShapes: state.customShapes.filter((s) => s.id !== id),
          })),

        groupNodes: (ids) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;
          const temporal = useDiagramStore.temporal.getState();
          temporal.pause();
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const toGroup = diagram.nodes.filter((n) => ids.includes(n.id));
            if (toGroup.length < 2) return state;

            const PADDING = 24;
            const minX =
              Math.min(...toGroup.map((n) => n.position.x)) - PADDING;
            const minY =
              Math.min(...toGroup.map((n) => n.position.y)) - PADDING;
            const maxX =
              Math.max(...toGroup.map((n) => n.position.x + (n.width ?? 150))) +
              PADDING;
            const maxY =
              Math.max(...toGroup.map((n) => n.position.y + (n.height ?? 50))) +
              PADDING;

            const groupId = crypto.randomUUID();
            const frameNode: AppNode = {
              id: groupId,
              type: "frame",
              position: { x: minX, y: minY },
              width: maxX - minX,
              height: maxY - minY,
              data: {
                label: "Group",
                service: "frame",
                subtype: "default",
                locked: false,
              },
              style: { width: maxX - minX, height: maxY - minY },
              selected: false,
            };

            const others = diagram.nodes.filter((n) => !ids.includes(n.id));
            const children = toGroup.map((n) => ({
              ...n,
              parentNode: groupId,
              extent: "parent" as const,
              position: { x: n.position.x - minX, y: n.position.y - minY },
              selected: false,
            }));

            // frame must come before its children in the array
            const newNodes = [...others, frameNode, ...children];
            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...diagram,
                nodes: newNodes,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams, selectedNodeId: groupId };
          });
          temporal.resume();
        },

        ungroupNodes: (groupId) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;
          const temporal = useDiagramStore.temporal.getState();
          temporal.pause();
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const frame = diagram.nodes.find((n) => n.id === groupId);
            if (!frame) return state;

            const newNodes = diagram.nodes
              .filter((n) => n.id !== groupId)
              .map((n) => {
                if (n.parentNode !== groupId) return n;
                // Convert relative position back to absolute
                const { parentNode: _p, extent: _e, ...rest } = n as any;
                return {
                  ...rest,
                  position: {
                    x: frame.position.x + n.position.x,
                    y: frame.position.y + n.position.y,
                  },
                  selected: true,
                };
              });

            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...diagram,
                nodes: newNodes,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams, selectedNodeId: null };
          });
          temporal.resume();
        },

        setGroupLocked: (groupId, locked) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;
          const temporal = useDiagramStore.temporal.getState();
          temporal.pause();
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const newNodes = diagram.nodes.map((n) => {
              if (n.id === groupId) {
                return { ...n, data: { ...n.data, locked } };
              }
              if ((n as any).parentNode === groupId) {
                return { ...n, draggable: !locked, selectable: !locked };
              }
              return n;
            });
            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...diagram,
                nodes: newNodes,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
          temporal.resume();
        },

        batchUpdateNodes: (ids, data) => {
          const { activeDiagramId, collaborationRoomId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const idSet = new Set(ids);
            const nodes = diagram.nodes.map((n) =>
              idSet.has(n.id)
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      ...data,
                      metadata: {
                        ...(n.data.metadata ?? {}),
                        ...(data.metadata ?? {}),
                      },
                    },
                  }
                : n,
            );
            const newDiagrams = {
              ...state.diagrams,
              [activeDiagramId]: {
                ...diagram,
                nodes,
                lastModified: Date.now(),
              },
            };
            syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            return { diagrams: newDiagrams };
          });
        },

        addLayer: (name) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          const colors = [
            "#6366f1",
            "#ec4899",
            "#f59e0b",
            "#10b981",
            "#3b82f6",
            "#ef4444",
            "#8b5cf6",
          ];
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const newLayer: Layer = {
              id: crypto.randomUUID(),
              name: name ?? `Layer ${(diagram.layers?.length ?? 0) + 1}`,
              visible: true,
              locked: false,
              color: colors[(diagram.layers?.length ?? 0) % colors.length],
            };
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...diagram,
                  layers: [...(diagram.layers ?? []), newLayer],
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        removeLayer: (layerId) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const remaining = (diagram.layers ?? []).filter(
              (l) => l.id !== layerId,
            );
            const fallbackId = remaining[0]?.id ?? "default";
            const updatedNodes = diagram.nodes.map((n) =>
              n.data.layerId === layerId
                ? { ...n, data: { ...n.data, layerId: fallbackId } }
                : n,
            );
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...diagram,
                  layers:
                    remaining.length > 0
                      ? remaining
                      : [
                          {
                            id: "default",
                            name: "Default",
                            visible: true,
                            locked: false,
                            color: "#6366f1",
                          },
                        ],
                  nodes: updatedNodes,
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        updateLayer: (layerId, patch) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const layers = (diagram.layers ?? []).map((l) =>
              l.id === layerId ? { ...l, ...patch } : l,
            );
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...diagram,
                  layers,
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        moveNodeToLayer: (nodeId, layerId) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const diagram = state.diagrams[activeDiagramId];
            const nodes = diagram.nodes.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, layerId } } : n,
            );
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...diagram,
                  nodes,
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        applyRemoteUpdate: (id, diagram) => {
          set((state) => ({
            diagrams: {
              ...state.diagrams,
              [id]: {
                ...diagram,
                layers: diagram.layers?.length
                  ? diagram.layers
                  : [
                      {
                        id: "default",
                        name: "Default",
                        visible: true,
                        locked: false,
                        color: "#6366f1",
                      },
                    ],
              },
            },
          }));
        },

        setMinistackConfig: (config) => {
          set((state) => ({
            ministackConfig: { ...state.ministackConfig, ...config },
          }));
        },

        setNodeMinistackState: (nodeId, ministackState) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => {
              if (node.id === nodeId) {
                const merged = { ...(node.data.ministack ?? {}), ...ministackState } as MiniStackNodeState;
                return {
                  ...node,
                  data: { ...node.data, ministack: merged },
                };
              }
              return node;
            });
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...activeDiagram,
                  nodes: newNodes as AppNode[],
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        resetNodeMinistackState: (nodeId) => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => {
              if (node.id !== nodeId) return node;
              const { ministack: _removed, ...rest } = node.data;
              return { ...node, data: rest as AppNodeData };
            });
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...activeDiagram,
                  nodes: newNodes,
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        resetAllMinistackStates: () => {
          const { activeDiagramId } = get();
          if (!activeDiagramId) return;
          set((state) => {
            const activeDiagram = state.diagrams[activeDiagramId];
            const newNodes = activeDiagram.nodes.map((node) => {
              const { ministack: _removed, ...rest } = node.data;
              return { ...node, data: rest as AppNodeData };
            });
            return {
              diagrams: {
                ...state.diagrams,
                [activeDiagramId]: {
                  ...activeDiagram,
                  nodes: newNodes,
                  lastModified: Date.now(),
                },
              },
            };
          });
        },

        setGoogleUser: (user) => set({ googleUser: user }),
        setGeminiModel: (model) => set({ geminiModel: model }),
        setBedrockConfig: (config) => set({ bedrockConfig: config }),
        setBedrockModel: (model) => set({ bedrockModel: model }),
        setDriveFileId: (id) => set({ driveFileId: id }),
        setDriveSyncStatus: (status) => set({ driveSyncStatus: status }),
        setDriveSyncResult: (fileId, syncedAt) =>
          set({ driveFileId: fileId, driveLastSyncedAt: syncedAt, driveSyncStatus: "idle", driveLastError: null }),
        setDriveError: (error) => set({ driveSyncStatus: "error", driveLastError: error }),
        setTourCompleted: () => set({ tourCompleted: true, tourOpen: false }),
        setTourOpen: (open) => set({ tourOpen: open }),
      }),
      {
        name: "open-arch-flow-storage-v2", // Changed version to reset/separate storage
        partialize: (state) => ({
          diagrams: state.diagrams,
          activeDiagramId: state.activeDiagramId,
          geminiApiKey: state.geminiApiKey,
          isOfflineMode: state.isOfflineMode,
          aiProvider: state.aiProvider,
          geminiModel: state.geminiModel,
          bedrockConfig: state.bedrockConfig,
          bedrockModel: state.bedrockModel,
          googleUser: state.googleUser,
          collaborationRoomId: state.collaborationRoomId,
          customShapes: state.customShapes,
          ministackConfig: state.ministackConfig,
          nodeDisplayMode: state.nodeDisplayMode,
          driveFileId: state.driveFileId,
          driveLastSyncedAt: state.driveLastSyncedAt,
          tourCompleted: state.tourCompleted,
        }),
        onRehydrateStorage: () => (state) => {
          // Clear expired Bedrock credentials on load
          if (state?.bedrockConfig) {
            if (Date.now() > state.bedrockConfig.credentials.expiration) {
              state.bedrockConfig = null;
              if (state.aiProvider === "bedrock") state.aiProvider = "offline";
            }
          }
          // Ensure there is at least one diagram if none exist after hydration
          if (
            state &&
            (!state.activeDiagramId || Object.keys(state.diagrams).length === 0)
          ) {
            state.createDiagram("Untitled Architecture");
          }
          // Back-fill `layers` for diagrams saved before the layer system
          if (state) {
            const defaultLayer = {
              id: "default",
              name: "Default",
              visible: true,
              locked: false,
              color: "#6366f1",
            };
            Object.values(state.diagrams).forEach((d) => {
              if (!d.layers || d.layers.length === 0) {
                (d as any).layers = [defaultLayer];
              }
            });
          }
          // Re-initialize collaboration if room ID is present
          if (state?.collaborationRoomId) {
            initCollaboration(state.collaborationRoomId);
          }
        },
      },
    ),
    {
      partialize: (state) => ({
        diagrams: state.diagrams,
        activeDiagramId: state.activeDiagramId,
      }),
      limit: 50,
    },
  ),
);

// Subscribe to Yjs changes to update Zustand store
// Remote updates must not pollute the local undo history
sharedDiagrams.observe((event) => {
  if (!event.transaction.local) {
    const state = useDiagramStore.getState();
    const activeId = state.activeDiagramId;
    if (activeId && sharedDiagrams.has(activeId)) {
      const remoteDiagram = sharedDiagrams.get(activeId) as Diagram;
      useDiagramStore.temporal.getState().pause();
      state.applyRemoteUpdate(activeId, remoteDiagram);
      useDiagramStore.temporal.getState().resume();
    }
  }
});
