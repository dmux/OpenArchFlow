import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

const elk = new ELK();

export type AppNode = Node<AppNodeData>;
export type AppEdge = Edge;

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
}

export interface NodeSimulationStatus {
    status: 'idle' | 'processing' | 'success' | 'error';
    lastRun?: number;
}

export interface AppNodeData extends Record<string, unknown> {
    label: string;
    service: string;
    type?: string;
    metadata?: Record<string, any>;
    mock?: NodeMockData;
    simulation?: NodeSimulationStatus;
}

export interface SimulationLog {
    id: string;
    timestamp: number;
    nodeId?: string;
    nodeLabel?: string;
    level: 'info' | 'success' | 'error' | 'warning';
    message: string;
}

interface Diagram {
    id: string;
    name: string;
    nodes: AppNode[];
    edges: AppEdge[];
    lastModified: number;
}

interface DiagramState {
    diagrams: Record<string, Diagram>;
    activeDiagramId: string | null;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
    geminiApiKey: string | null;
    generatedSpecification: string | null;

    // Actions for Diagram Management
    createDiagram: (name?: string) => string;
    deleteDiagram: (id: string) => void;
    setActiveDiagram: (id: string) => void;
    setSelectedNode: (id: string | null) => void;
    setSelectedEdge: (id: string | null) => void;

    updateEdge: (id: string, data: any) => void;
    renameDiagram: (id: string, name: string) => void;
    setGeminiApiKey: (key: string | null) => void;
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

    // Simulation State
    isPlaying: boolean;
    setIsPlaying: (isPlaying: boolean) => void;
    simulationLogs: SimulationLog[];
    addSimulationLog: (log: Omit<SimulationLog, 'id' | 'timestamp'>) => void;
    clearSimulationLogs: () => void;

    // Simulation Actions
    updateNodeMock: (nodeId: string, mock: Partial<NodeMockData>) => void;
    setNodeSimulationStatus: (nodeId: string, status: NodeSimulationStatus) => void;
    resetSimulation: () => void;
}

export const useDiagramStore = create<DiagramState>()(
    persist(
        (set, get) => ({
            diagrams: {},
            activeDiagramId: null,
            selectedNodeId: null,
            selectedEdgeId: null,
            geminiApiKey: null,
            isPlaying: false,
            simulationLogs: [],
            generatedSpecification: null,

            setIsPlaying: (isPlaying) => set({ isPlaying }),

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
                const newDiagram: Diagram = {
                    id,
                    name,
                    nodes: [],
                    edges: [],
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
                set((state) => ({
                    diagrams: {
                        ...state.diagrams,
                        [id]: { ...state.diagrams[id], name, lastModified: Date.now() },
                    },
                }));
            },

            setGeminiApiKey: (key) => set({ geminiApiKey: key }),
            setGeneratedSpecification: (spec) => set({ generatedSpecification: spec }),

            // --- Active Diagram Actions ---

            onNodesChange: (changes: NodeChange[]) => {
                const { activeDiagramId, diagrams } = get();
                if (!activeDiagramId || !diagrams[activeDiagramId]) return;

                const activeDiagram = diagrams[activeDiagramId];
                const newNodes = applyNodeChanges(changes, activeDiagram.nodes);

                set({
                    diagrams: {
                        ...diagrams,
                        [activeDiagramId]: { ...activeDiagram, nodes: newNodes, lastModified: Date.now() },
                    },
                });
            },

            onEdgesChange: (changes: EdgeChange[]) => {
                const { activeDiagramId, diagrams } = get();
                if (!activeDiagramId || !diagrams[activeDiagramId]) return;

                const activeDiagram = diagrams[activeDiagramId];
                const newEdges = applyEdgeChanges(changes, activeDiagram.edges);

                set({
                    diagrams: {
                        ...diagrams,
                        [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
                    },
                });
            },

            onConnect: (connection: Connection) => {
                const { activeDiagramId, diagrams } = get();
                if (!activeDiagramId || !diagrams[activeDiagramId]) return;

                const activeDiagram = diagrams[activeDiagramId];
                const newEdges = addEdge(connection, activeDiagram.edges);

                set({
                    diagrams: {
                        ...diagrams,
                        [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
                    },
                    selectedEdgeId: newEdges[newEdges.length - 1].id,
                    selectedNodeId: null,
                });
            },

            setNodes: (nodes) => {
                const { activeDiagramId } = get();

                // Auto-create if no active diagram exists (e.g. initial load or empty state)
                if (!activeDiagramId) {
                    const id = get().createDiagram('Generated Architecture');
                    set((state) => ({
                        diagrams: {
                            ...state.diagrams,
                            [id]: { ...state.diagrams[id], nodes, lastModified: Date.now() }
                        }
                    }));
                    return;
                }

                set((state) => ({
                    diagrams: {
                        ...state.diagrams,
                        [activeDiagramId]: { ...state.diagrams[activeDiagramId], nodes, lastModified: Date.now() },
                    },
                }));
            },

            setEdges: (edges) => {
                const { activeDiagramId } = get();
                if (!activeDiagramId) return; // Should be handled by setNodes usually

                set((state) => ({
                    diagrams: {
                        ...state.diagrams,
                        [activeDiagramId]: { ...state.diagrams[activeDiagramId], edges, lastModified: Date.now() },
                    },
                }));
            },

            addNode: (node) => {
                const { activeDiagramId } = get();
                if (!activeDiagramId) return;

                set((state) => ({
                    diagrams: {
                        ...state.diagrams,
                        [activeDiagramId]: {
                            ...state.diagrams[activeDiagramId],
                            nodes: [...state.diagrams[activeDiagramId].nodes, node],
                            lastModified: Date.now()
                        },
                    },
                }));
            },

            removeNode: (id) => {
                const { activeDiagramId } = get();
                if (!activeDiagramId) return;

                set((state) => {
                    const activeDiagram = state.diagrams[activeDiagramId];
                    // Remove node
                    const newNodes = activeDiagram.nodes.filter((node) => node.id !== id);
                    // Remove connected edges
                    const newEdges = activeDiagram.edges.filter(
                        (edge) => edge.source !== id && edge.target !== id
                    );

                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, nodes: newNodes, edges: newEdges, lastModified: Date.now() },
                        },
                        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
                    };
                });
            },

            updateNode: (id, data) => {
                const { activeDiagramId } = get();
                if (!activeDiagramId) return;

                set((state) => {
                    const activeDiagram = state.diagrams[activeDiagramId];
                    const newNodes = activeDiagram.nodes.map((node) =>
                        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                    );

                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, nodes: newNodes, lastModified: Date.now() },
                        },
                    };
                });
            },

            updateEdge: (id, data) => {
                const { activeDiagramId } = get();
                if (!activeDiagramId) return;

                set((state) => {
                    const activeDiagram = state.diagrams[activeDiagramId];
                    const newEdges = activeDiagram.edges.map((edge) =>
                        edge.id === id ? { ...edge, label: data.label, data: { ...edge.data, ...data } } : edge
                    );

                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
                        },
                    };
                });
            },

            removeEdge: (id) => {
                const { activeDiagramId } = get();
                if (!activeDiagramId) return;

                set((state) => {
                    const activeDiagram = state.diagrams[activeDiagramId];
                    const newEdges = activeDiagram.edges.filter((edge) => edge.id !== id);

                    return {
                        diagrams: {
                            ...state.diagrams,
                            [activeDiagramId]: { ...activeDiagram, edges: newEdges, lastModified: Date.now() },
                        },
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

                    set({
                        diagrams: {
                            ...diagrams,
                            [activeDiagramId]: { ...activeDiagram, nodes: layoutedNodes, lastModified: Date.now() },
                        },
                    });
                } catch (error) {
                    console.error('ELK Layout Error:', error);
                }
            },

            clear: () => {
                const { activeDiagramId, diagrams } = get();
                if (!activeDiagramId) return;

                set({
                    diagrams: {
                        ...diagrams,
                        [activeDiagramId]: { ...diagrams[activeDiagramId], nodes: [], edges: [], lastModified: Date.now() },
                    },
                });
            },
        }),
        {
            name: 'open-arch-flow-storage-v2', // Changed version to reset/separate storage
            partialize: (state) => ({
                diagrams: state.diagrams,
                activeDiagramId: state.activeDiagramId,
                geminiApiKey: state.geminiApiKey,
                // isPlaying is transient, do not persist
            }),
            onRehydrateStorage: () => (state) => {
                // Ensure there is at least one diagram if none exist after hydration
                if (state && (!state.activeDiagramId || Object.keys(state.diagrams).length === 0)) {
                    state.createDiagram('Untitled Architecture');
                }
            }
        }
    )
);
