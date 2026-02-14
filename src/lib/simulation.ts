import { useDiagramStore } from '@/lib/store';

export class SimulationEngine {
    private static instance: SimulationEngine;
    private activeTimeouts: NodeJS.Timeout[] = [];

    private constructor() { }

    static getInstance() {
        if (!this.instance) this.instance = new SimulationEngine();
        return this.instance;
    }

    start(startNodeIds?: string[]) {
        const store = useDiagramStore.getState();
        // Reset first, then start playing
        store.clearSimulationLogs();
        store.resetSimulation();
        store.setIsPlaying(true);

        // 1. Identify Entry Points (Gateways or Roots)
        let roots: { id: string }[] = [];

        if (startNodeIds && startNodeIds.length > 0) {
            roots = startNodeIds.map(id => ({ id }));
        } else {
            roots = this.findRootNodes();
        }

        if (roots.length === 0) {
            store.addSimulationLog({ level: 'warning', message: 'No entry points found to start simulation.' });
            return;
        }

        store.addSimulationLog({ level: 'info', message: `Starting simulation with ${roots.length} entry points.` });

        roots.forEach(node => this.processNode(node.id));
    }

    stop() {
        const store = useDiagramStore.getState();
        store.setIsPlaying(false);
        this.activeTimeouts.forEach(clearTimeout);
        this.activeTimeouts = [];
        // Optional: Reset visualization state on stop
        // store.resetSimulation(); 
        store.addSimulationLog({ level: 'info', message: 'Simulation stopped.' });
    }

    private findRootNodes() {
        const { diagrams, activeDiagramId } = useDiagramStore.getState();
        if (!activeDiagramId) return [];
        const { nodes, edges } = diagrams[activeDiagramId];

        // Nodes with no incoming edges OR Nodes explicitly marked as Gateway/LoadBalancer
        const targetIds = new Set(edges.map(e => e.target));
        return nodes.filter(n =>
            // Logic: It's a root if it has no incoming edges...
            !targetIds.has(n.id) ||
            // ...OR if it is a Gateway/LB (these often start flows even if technically connected for some reason, though usually they are roots)
            n.data.service?.toLowerCase().includes('gateway') ||
            n.data.service?.toLowerCase().includes('balancer') ||
            n.data.service?.toLowerCase().includes('appsync')
        );
    }

    private processNode(nodeId: string, payload?: any) {
        // Always get fresh state
        const store = useDiagramStore.getState();

        // Check if stopped
        if (!store.isPlaying) return;

        const { diagrams, activeDiagramId } = store;
        if (!activeDiagramId) return;

        const node = diagrams[activeDiagramId].nodes.find(n => n.id === nodeId);
        if (!node) {
            return;
        }

        // 1. Set Processing (Synchronous update)
        // We use setTimeout 0 to push this to next tick to avoid React batching issues if called in loop
        setTimeout(() => {
            useDiagramStore.getState().setNodeSimulationStatus(nodeId, { status: 'processing', lastRun: Date.now() });

            let msg = `Processing started.`;
            if (payload?.method && payload?.path) {
                msg += ` [${payload.method} ${payload.path}]`;
            }
            useDiagramStore.getState().addSimulationLog({ nodeId, nodeLabel: node.data.label, level: 'info', message: msg });
        }, 0);

        // 2. Determine Latency & Outcome
        const mock = node.data.mock || {};
        const latency = mock.latency || 1000; // Default 1s
        const shouldFail = Math.random() * 100 < (mock.failureRate || 0);

        // 3. Wait
        const timeout = setTimeout(() => {
            // Check if still playing (Fresh State)
            const currentStore = useDiagramStore.getState();
            if (!currentStore.isPlaying) return;

            if (shouldFail) {
                currentStore.setNodeSimulationStatus(nodeId, { status: 'error', lastRun: Date.now() });
                currentStore.addSimulationLog({ nodeId, nodeLabel: node.data.label, level: 'error', message: `Failed (Simulated).` });
            } else {
                currentStore.setNodeSimulationStatus(nodeId, { status: 'success', lastRun: Date.now() });

                const responseMsg = mock.responseBody ? `Response: ${mock.responseBody.substring(0, 20)}...` : 'Success';
                currentStore.addSimulationLog({ nodeId, nodeLabel: node.data.label, level: 'success', message: `Completed. ${responseMsg}` });

                // 4. Trigger next nodes
                this.triggerDownstream(nodeId);
            }
        }, latency);

        this.activeTimeouts.push(timeout);
    }

    private triggerDownstream(sourceId: string) {
        const store = useDiagramStore.getState();
        const { diagrams, activeDiagramId } = store;
        if (!activeDiagramId) return;

        const { edges } = diagrams[activeDiagramId];
        const outgoingEdges = edges.filter(e => e.source === sourceId);

        if (outgoingEdges.length === 0) {
            // End of flow
        }

        outgoingEdges.forEach(edge => {
            // Could add edge animation triggers here if we want specific edge highlighting
            this.processNode(edge.target);
        });
    }
}
