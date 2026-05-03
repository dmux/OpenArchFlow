import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';
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
} from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled';
import * as Y from 'yjs';
import { sharedDiagrams, initCollaboration } from './collaboration';

const elk = new ELK();

const syncToYjs = (id: string | null, roomId: string | null, diagrams: Record<string, Diagram>) => {
    if (id && roomId && diagrams[id]) {
        sharedDiagrams.set(id, diagrams[id]);
    }
};

export interface AppEdgeData {
    simulationAction?: {
        type: 'read' | 'write' | 'trigger';
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
}

export interface NodeSimulationStatus {
    status: 'idle' | 'processing' | 'success' | 'error';
    lastRun?: number;
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

export interface AppNodeData extends Record<string, unknown> {
    label: string;
    service: string;
    type?: string;
    metadata?: Record<string, any>;
    mock?: NodeMockData;
    simulation?: NodeSimulationStatus;
    pricing?: NodePricing;
    layerId?: string;
}

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
    level: 'info' | 'success' | 'error' | 'warning';
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

    // Layer Actions
    addLayer: (name?: string) => void;
    removeLayer: (layerId: string) => void;
    updateLayer: (layerId: string, patch: Partial<Omit<Layer, 'id'>>) => void;
    moveNodeToLayer: (nodeId: string, layerId: string) => void;

    // Simulation State
    isPlaying: boolean;
    setIsPlaying: (isPlaying: boolean) => void;
    simulationSpeed: number;
    setSimulationSpeed: (speed: number) => void;
    simulationLogs: SimulationLog[];
    addSimulationLog: (log: Omit<SimulationLog, 'id' | 'timestamp'>) => void;
    clearSimulationLogs: () => void;

    // Simulation Actions
    updateNodeMock: (nodeId: string, mock: Partial<NodeMockData>) => void;
    setNodeSimulationStatus: (nodeId: string, status: NodeSimulationStatus) => void;
    resetSimulation: () => void;
    stopSimulation: () => void;

    // Interaction Mode
    interactionMode: 'default' | 'laser'; // 'default' = selection/pan, 'laser' = laser pointer
    setInteractionMode: (mode: 'default' | 'laser') => void;

    // Collaboration
    collaborationRoomId: string | null;
    setCollaborationRoomId: (id: string | null) => void;

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
            isPlaying: false,
            simulationSpeed: 1,
            simulationLogs: [],
            generatedSpecification: null,
            interactionMode: 'default',
            collaborationRoomId: null,

            setCollaborationRoomId: (id) => {
                set({ collaborationRoomId: id });
                if (id) {
                    initCollaboration(id);
                    // Initial sync: push current active diagram to Yjs if it's not there
                    const { activeDiagramId, diagrams } = get();
                    if (activeDiagramId && diagrams[activeDiagramId]) {
                        if (!sharedDiagrams.has(activeDiagramId)) {
                            sharedDiagrams.set(activeDiagramId, diagrams[activeDiagramId]);
                        }
                    }
                }
            },

            importDiagram: (diagram) => set((state) => {
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
                    layers: diagram.layers?.length ? diagram.layers : [{ id: 'default', name: 'Default', visible: true, locked: false, color: '#6366f1' }],
                };

                const newDiagrams = { ...state.diagrams, [newId]: newDiagram };
                
                syncToYjs(newId, state.collaborationRoomId, newDiagrams);

                return {
                    diagrams: newDiagrams,
                    activeDiagramId: newId // Switch to imported diagram
                };
            }),

            importDiagrams: (importedDiagrams) => set((state) => {
                const newDiagrams = { ...state.diagrams };

                Object.values(importedDiagrams).forEach(diagram => {
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
                        lastModified: Date.now()
                    };
                    
                    syncToYjs(newId, state.collaborationRoomId, newDiagrams);
                });

                return {
                    diagrams: newDiagrams,
                    // keep active diagram as is, or switch if it was null
                    activeDiagramId: state.activeDiagramId || Object.keys(newDiagrams)[0]
                };
            }),

            setIsPlaying: (isPlaying) => set({ isPlaying }),
            setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),
            setInteractionMode: (mode) => set({ interactionMode: mode }),

            addSimulationLog: (log) => set((state) => ({
                simulationLogs: [
                    ...state.simulationLogs,
                    { ...log, id: crypto.randomUUID(), timestamp: Date.now() }
                ]
            })),

            clearSimulationLogs: () => set({ simulationLogs: [] }),

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
                                data: { ...node.data, mock: { ...currentMock, ...mock } }
                            };
                        }
                        return node;
                    });

                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, nodes: newNodes, lastModified: Date.now() },
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
                                data: { ...node.data, simulation: status }
                            };
                        }
                        return node;
                    });

                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, nodes: newNodes }
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
                        if (node.data.simulation?.status === 'processing') {
                            return {
                                ...node,
                                data: { ...node.data, simulation: { status: 'idle' as const, lastRun: Date.now() } }
                            };
                        }
                        return node;
                    });

                    return {
                        isPlaying: false,
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, nodes: newNodes }
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
                        data: { ...node.data, simulation: undefined }
                    }));

                    return {
                        isPlaying: false,
                        simulationLogs: [],
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, nodes: newNodes }
                        },
                    };
                });
            },

            createDiagram: (name = 'New Architecture') => {
                const id = crypto.randomUUID();
                const defaultLayer: Layer = { id: 'default', name: 'Default', visible: true, locked: false, color: '#6366f1' };
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

            setActiveDiagram: (id) => set({ activeDiagramId: id, selectedNodeId: null, selectedEdgeId: null }),
            setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
            setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

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

            setGeminiApiKey: (key) => set({ geminiApiKey: key, isOfflineMode: false }),
            setOfflineMode: (isOffline) => set({ isOfflineMode: isOffline }),
            setGeneratedSpecification: (spec) => set({ generatedSpecification: spec }),

            // --- Active Diagram Actions ---

            onNodesChange: (changes: NodeChange[]) => {
                const { activeDiagramId, diagrams, collaborationRoomId } = get();
                if (!activeDiagramId || !diagrams[activeDiagramId]) return;

                const activeDiagram = diagrams[activeDiagramId];
                const newNodes = applyNodeChanges(changes, activeDiagram.nodes);

                const newDiagrams = {
                    ...diagrams,
                    [activeDiagramId]: { ...activeDiagram, nodes: newNodes, lastModified: Date.now() },
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
                    [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
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
                    [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
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
                    const id = get().createDiagram('Generated Architecture');
                    set((state) => {
                        const newDiagrams = {
                            ...state.diagrams,
                            [id]: { ...state.diagrams[id], nodes, lastModified: Date.now() }
                        };
                        syncToYjs(id, state.collaborationRoomId, newDiagrams);
                        return { diagrams: newDiagrams };
                    });
                    return;
                }

                set((state) => {
                    const newDiagrams = {
                        ...state.diagrams,
                        [activeDiagramId]: { ...state.diagrams[activeDiagramId], nodes, lastModified: Date.now() },
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
                        [activeDiagramId]: { ...state.diagrams[activeDiagramId], edges, lastModified: Date.now() },
                    };
                    syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
                    return { diagrams: newDiagrams };
                });
            },

            addNode: (node) => {
                const { activeDiagramId, collaborationRoomId } = get();

                if (!activeDiagramId) {
                    const id = get().createDiagram('New Architecture');
                    set((state) => {
                        const newDiagrams = {
                            ...state.diagrams,
                            [id]: {
                                ...state.diagrams[id],
                                nodes: [node],
                                lastModified: Date.now()
                            }
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
                            lastModified: Date.now()
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
                    // Remove node
                    const newNodes = activeDiagram.nodes.filter((node) => node.id !== id);
                    // Remove connected edges
                    const newEdges = activeDiagram.edges.filter(
                        (edge) => edge.source !== id && edge.target !== id
                    );

                    const newDiagrams = {
                        ...state.diagrams,
                        [activeDiagramId]: { ...activeDiagram, nodes: newNodes, edges: newEdges, lastModified: Date.now() },
                    };
                    syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
                    return {
                        diagrams: newDiagrams,
                        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
                    };
                });
            },

            updateNode: (id, data) => {
                const { activeDiagramId, collaborationRoomId } = get();
                if (!activeDiagramId) return;

                set((state) => {
                    const activeDiagram = state.diagrams[activeDiagramId];
                    const newNodes = activeDiagram.nodes.map((node) =>
                        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                    );

                    const newDiagrams = {
                        ...state.diagrams,
                        [activeDiagramId]: { ...activeDiagram, nodes: newNodes, lastModified: Date.now() },
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
                        edge.id === id ? { ...edge, label: data.label, data: { ...edge.data, ...data } } : edge
                    );

                    const newDiagrams = {
                        ...state.diagrams,
                        [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
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
                    const newEdges = activeDiagram.edges.filter((edge) => edge.id !== id);

                    const newDiagrams = {
                        ...state.diagrams,
                        [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
                    };
                    syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
                    return {
                        diagrams: newDiagrams,
                        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
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
                    id: 'root',
                    layoutOptions: {
                        'elk.algorithm': 'layered',
                        'elk.direction': 'DOWN',
                        'elk.spacing.nodeNode': '80',
                        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
                    },
                    children: nodes.map((node) => ({
                        id: node.id,
                        width: node.width ?? 150,
                        height: node.height ?? 50,
                    })),
                    edges: edges.map((edge) => ({
                        id: edge.id,
                        sources: [edge.source],
                        targets: [edge.target],
                    })),
                };

                try {
                    const layoutedGraph = await elk.layout(graph);

                    const layoutedNodes = nodes.map((node) => {
                        const layoutNode = layoutedGraph.children?.find((n) => n.id === node.id);
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
                        [activeDiagramId]: { ...activeDiagram, nodes: layoutedNodes, lastModified: Date.now() },
                    };

                    set({ diagrams: newDiagrams });
                    syncToYjs(activeDiagramId, get().collaborationRoomId, newDiagrams);
                } catch (error) {
                    console.error('ELK Layout Error:', error);
                }
            },

            clear: () => {
                const { activeDiagramId, diagrams, collaborationRoomId } = get();
                if (!activeDiagramId) return;

                const newDiagrams = {
                    ...diagrams,
                    [activeDiagramId]: { ...diagrams[activeDiagramId], nodes: [], edges: [], lastModified: Date.now() },
                };

                set({ diagrams: newDiagrams });
                syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
            },

            batchUpdateNodes: (ids, data) => {
                const { activeDiagramId, collaborationRoomId } = get();
                if (!activeDiagramId) return;
                set((state) => {
                    const diagram = state.diagrams[activeDiagramId];
                    const idSet = new Set(ids);
                    const nodes = diagram.nodes.map((n) =>
                        idSet.has(n.id)
                            ? { ...n, data: { ...n.data, ...data, metadata: { ...(n.data.metadata ?? {}), ...(data.metadata ?? {}) } } }
                            : n
                    );
                    const newDiagrams = { ...state.diagrams, [activeDiagramId]: { ...diagram, nodes, lastModified: Date.now() } };
                    syncToYjs(activeDiagramId, collaborationRoomId, newDiagrams);
                    return { diagrams: newDiagrams };
                });
            },

            addLayer: (name) => {
                const { activeDiagramId } = get();
                if (!activeDiagramId) return;
                const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];
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
                    const remaining = (diagram.layers ?? []).filter((l) => l.id !== layerId);
                    const fallbackId = remaining[0]?.id ?? 'default';
                    const updatedNodes = diagram.nodes.map((n) =>
                        n.data.layerId === layerId ? { ...n, data: { ...n.data, layerId: fallbackId } } : n
                    );
                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: {
                                ...diagram,
                                layers: remaining.length > 0 ? remaining : [{ id: 'default', name: 'Default', visible: true, locked: false, color: '#6366f1' }],
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
                    const layers = (diagram.layers ?? []).map((l) => l.id === layerId ? { ...l, ...patch } : l);
                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...diagram, layers, lastModified: Date.now() },
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
                        n.id === nodeId ? { ...n, data: { ...n.data, layerId } } : n
                    );
                    return {
                        diagrams: { ...state.diagrams, [activeDiagramId]: { ...diagram, nodes, lastModified: Date.now() } },
                    };
                });
            },

            applyRemoteUpdate: (id, diagram) => {
                set((state) => ({
                    diagrams: {
                        ...state.diagrams,
                        [id]: {
                            ...diagram,
                            layers: diagram.layers?.length ? diagram.layers : [{ id: 'default', name: 'Default', visible: true, locked: false, color: '#6366f1' }],
                        },
                    }
                }));
            },
        }),
        {
            name: 'open-arch-flow-storage-v2', // Changed version to reset/separate storage
            partialize: (state) => ({
                diagrams: state.diagrams,
                activeDiagramId: state.activeDiagramId,
                geminiApiKey: state.geminiApiKey,
                isOfflineMode: state.isOfflineMode,
                collaborationRoomId: state.collaborationRoomId,
            }),
            onRehydrateStorage: () => (state) => {
                // Ensure there is at least one diagram if none exist after hydration
                if (state && (!state.activeDiagramId || Object.keys(state.diagrams).length === 0)) {
                    state.createDiagram('Untitled Architecture');
                }
                // Back-fill `layers` for diagrams saved before the layer system
                if (state) {
                    const defaultLayer = { id: 'default', name: 'Default', visible: true, locked: false, color: '#6366f1' };
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
            }
        }
      ),
      {
          partialize: (state) => ({
              diagrams: state.diagrams,
              activeDiagramId: state.activeDiagramId,
          }),
          limit: 50,
      }
    )
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
