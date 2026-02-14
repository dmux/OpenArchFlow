import { AppNode, AppEdge, NodeMockData, NodeSimulationStatus } from '../store';

export interface SimulationOptions {
    speed: number; // 0.1 to 5.0 multiplier
    duration?: number; // ms, optional
}

export type SimulationCallback = (
    activeNodeIds: string[],
    activeEdgeIds: string[],
    logs: { nodeId?: string; level: 'info' | 'success' | 'error' | 'warning'; message: string }[]
) => void;

export class SimulationEngine {
    private static instance: SimulationEngine;
    private isRunning: boolean = false;
    private speed: number = 1.0;
    private updateCallback: SimulationCallback | null = null;

    // Tracking active simulation state
    private activeRequests: {
        id: string;
        currentNodeId: string;
        path: string[];
        startTime: number;
        status: 'pending' | 'success' | 'failed';
        payload?: any; // Data carried by the request
    }[] = [];

    private constructor() { }

    public static getInstance(): SimulationEngine {
        if (!SimulationEngine.instance) {
            SimulationEngine.instance = new SimulationEngine();
        }
        return SimulationEngine.instance;
    }

    public start(
        nodes: AppNode[],
        edges: AppEdge[],
        callback: SimulationCallback,
        options?: SimulationOptions
    ) {
        if (this.isRunning) this.stop();

        this.isRunning = true;
        this.updateCallback = callback;
        this.speed = options?.speed || 1.0;
        this.activeRequests = [];

        // Identify Entry Points (Clients or Gateways with no incoming edges from other nodes)
        // For simplicity, we trigger all "Client" nodes or anyone with "requestsPerSecond" > 0
        const entryNodes = nodes.filter(n => {
            const mock = n.data.mock as NodeMockData | undefined;
            return mock?.requestsPerSecond && mock.requestsPerSecond > 0;
        });

        if (entryNodes.length === 0) {
            callback([], [], [{ level: 'warning', message: 'No entry points found. Configure "Requests Per Second" on a Client or Gateway node.' }]);
            this.stop();
            return;
        }

        // Start the simulation loop
        this.tick(nodes, edges);
    }

    public stop() {
        this.isRunning = false;
        this.activeRequests = [];
    }

    private async tick(nodes: AppNode[], edges: AppEdge[]) {
        if (!this.isRunning) return;

        const activeNodeIds: string[] = [];
        const activeEdgeIds: string[] = [];
        const logs: any[] = [];

        // 1. Generate new requests from Entry Nodes
        nodes.forEach(node => {
            const mock = node.data.mock as NodeMockData | undefined;
            if (mock?.requestsPerSecond && mock.requestsPerSecond > 0) {
                // Simple probability check based on RPS and tick rate (assuming 60fps or similar, but we use setTimeout loop)
                // Let's assume tick runs every ~100ms.
                const chance = (mock.requestsPerSecond / 10); // RPS / 10 ticks per second
                if (Math.random() < chance) {
                    this.activeRequests.push({
                        id: crypto.randomUUID(),
                        currentNodeId: node.id,
                        path: [node.id],
                        startTime: Date.now(),
                        status: 'pending'
                    });
                    logs.push({ nodeId: node.id, level: 'info', message: `Request initiated from ${node.data.label}` });
                }
            }
        });

        // 2. Process active requests
        // This is a simplified "step" model. In a real engine, we'd handle async processing times more accurately.
        const nextRequests: typeof this.activeRequests = [];

        for (const req of this.activeRequests) {
            const currentNode = nodes.find(n => n.id === req.currentNodeId);
            if (!currentNode) continue;

            activeNodeIds.push(currentNode.id);

            // Simulation Logic:
            // a. Check Latency (if enough time passed since entering node) - Simplified for now: specific chance to move forward
            // b. Check Failure Rate

            const mock = currentNode.data.mock as NodeMockData | undefined;
            const failureRate = mock?.failureRate || 0;

            // Data Querying / Fetching Logic
            // Legacy: Node-based auto-fetch (keep as fallback if payload is empty and node has data)
            if (!req.payload && mock?.data && mock.data.length > 0) {
                // Simple logic: Pick random item or first item
                // For now, let's pick random to simulate varying data
                const randomItem = mock.data[Math.floor(Math.random() * mock.data.length)];
                req.payload = randomItem;
                logs.push({ nodeId: currentNode.id, level: 'success', message: `Data Fetched (Auto): ${JSON.stringify(randomItem).substring(0, 30)}...` });
            }

            if (Math.random() * 100 < failureRate) {
                req.status = 'failed';
                logs.push({ nodeId: currentNode.id, level: 'error', message: `Request failed at ${currentNode.data.label}` });
                // Request dies here
                continue;
            }

            // Find valid targets
            const outgoingEdges = edges.filter(e => e.source === currentNode.id);
            if (outgoingEdges.length > 0) {
                // Determine routing
                // If Gateway with endpoints routing, check config (TODO: meaningful routing)
                // For now: Broadcast or Random Load Balance? Let's do Random for simple load balancing
                // or Broadcast if it's meant to trigger multiple downstream (like SNS)

                // Let's default to: Pick ONE random target for standard flow, unless it's a known "Fan-out" type
                const targetEdge = outgoingEdges[Math.floor(Math.random() * outgoingEdges.length)];
                const targetNodeId = targetEdge.target;
                activeEdgeIds.push(targetEdge.id); // Visualize traffic on this edge

                // Process Edge Simulation Actions (Request Semantics)
                const edgeData = targetEdge.data;
                if (edgeData?.simulationAction) {
                    const action = edgeData.simulationAction;
                    const targetNode = nodes.find(n => n.id === targetNodeId);

                    if (targetNode) {
                        if (action.type === 'read') {
                            // Fetch data from target node's mock data
                            const targetMock = targetNode.data.mock as NodeMockData | undefined;
                            if (targetMock?.data && targetMock.data.length > 0) {
                                // Simple logic: Pick random item or first item
                                // Future: Use action.query to filter
                                const randomItem = targetMock.data[Math.floor(Math.random() * targetMock.data.length)];
                                req.payload = randomItem;
                                logs.push({
                                    nodeId: targetNodeId,
                                    level: 'success',
                                    message: `Read Action: Fetched ${JSON.stringify(randomItem).substring(0, 20)}...`
                                });
                            } else {
                                logs.push({ nodeId: targetNodeId, level: 'warning', message: `Read Action: No data found in ${targetNode.data.label}` });
                            }
                        } else if (action.type === 'write') {
                            logs.push({ nodeId: targetNodeId, level: 'success', message: `Write Action: Data written to ${targetNode.data.label}` });
                        } else if (action.type === 'trigger') {
                            logs.push({ nodeId: targetNodeId, level: 'info', message: `Trigger Action: Invoking ${targetNode.data.label}` });
                        }
                    }
                }

                // Move request to next node
                req.currentNodeId = targetNodeId;
                req.path.push(targetNodeId);
                nextRequests.push(req);
            } else {
                // Reached end of flow
                req.status = 'success';
                logs.push({ nodeId: currentNode.id, level: 'success', message: `Request completed at ${currentNode.data.label}` });
                if (req.payload) {
                    logs.push({ nodeId: currentNode.id, level: 'info', message: `Final Payload: ${JSON.stringify(req.payload).substring(0, 50)}...` });
                }
            }
        }

        this.activeRequests = nextRequests;

        // Callback with updates
        if (this.updateCallback) {
            this.updateCallback(activeNodeIds, activeEdgeIds, logs);
        }

        // Schedule next tick
        setTimeout(() => this.tick(nodes, edges), 1000 / (10 * this.speed)); // Base 10 ticks per second * speed
    }
}
