import React from 'react';
import { useDiagramStore } from '@/lib/store';
import { X, ExternalLink, Info, Unplug, Trash2, PlayCircle, Settings, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import JsonEditor from './JsonEditor';

export default function PropertiesPanel() {
    const {
        selectedNodeId,
        selectedEdgeId,
        diagrams,
        activeDiagramId,
        setSelectedNode,
        setSelectedEdge,
        updateEdge,
        updateNodeMock,
        removeNode,
        removeEdge
    } = useDiagramStore();

    const handleTriggerNode = () => {
        if (selectedNodeId) {
            // We need to import SimulationEngine but avoiding circular dependency might be tricky if not careful.
            // Actually, we can just import it.
            import('@/lib/simulation').then(({ SimulationEngine }) => {
                SimulationEngine.getInstance().start([selectedNodeId]);
            });
        }
    };

    if (!activeDiagramId || (!selectedNodeId && !selectedEdgeId)) return null;

    const activeDiagram = diagrams[activeDiagramId];
    if (!activeDiagram) return null;

    // Handle Node Selection
    if (selectedNodeId) {
        const selectedNode = activeDiagram.nodes.find(n => n.id === selectedNodeId);
        if (!selectedNode) return null;

        const { label, service, metadata, mock } = selectedNode.data;
        const type = selectedNode.type || 'default';

        // Helper to determine node category
        const isGateway = service?.toLowerCase().includes('gateway') || service?.toLowerCase().includes('balancer') || service?.toLowerCase().includes('appsync');
        const isCompute = service?.toLowerCase().includes('lambda') || service?.toLowerCase().includes('container') || service?.toLowerCase().includes('instance');
        const isClient = type === 'client';

        // Get connected target nodes for Gateway routing
        const connectedEdges = activeDiagram.edges.filter(e => e.source === selectedNodeId);
        const connectedTargetNodes = connectedEdges.map(e => activeDiagram.nodes.find(n => n.id === e.target)).filter(Boolean) as any[];

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="fixed right-4 top-24 bottom-4 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-start justify-between bg-muted/30">
                        <div>
                            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                                {service} <span className="text-[10px] h-5 px-1.5 border border-border rounded-full flex items-center">{type}</span>
                            </div>
                            <h2 className="text-xl font-bold text-card-foreground leading-tight">{label}</h2>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1" onClick={() => setSelectedNode(null)}>
                            <X size={18} />
                        </Button>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6">

                            {/* Metadata Section */}
                            {metadata && Object.keys(metadata).length > 0 ? (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                        <Info size={14} /> Configuration & Details
                                    </h3>
                                    <div className="grid gap-3">
                                        {Object.entries(metadata).map(([key, value]) => (
                                            <div key={key} className="bg-muted/50 p-3 rounded-lg border border-border/50">
                                                <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{key.replace(/_/g, ' ')}</div>
                                                <div className="text-sm font-medium text-foreground break-words">{String(value)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground italic">No metadata available for this resource.</div>
                            )}

                            <Separator />

                            {/* Simulation / Mock Configuration */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                            <PlayCircle size={14} /> Simulation Mock
                                        </h3>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-6 w-6 ml-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={handleTriggerNode}
                                            title="Trigger Simulation from this Node"
                                        >
                                            <PlayCircle size={14} />
                                        </Button>
                                    </div>
                                    <Switch
                                        checked={mock?.enabled !== false}
                                        onCheckedChange={(checked) => updateNodeMock(selectedNodeId, { enabled: checked })}
                                    />
                                </div>

                                {(mock?.enabled !== false) && (
                                    <div className="space-y-4 border rounded-lg p-3 bg-muted/20">

                                        {/* Gateway Specific Config */}
                                        {isGateway && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs uppercase text-muted-foreground">Endpoints</Label>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => {
                                                            const newEndpoint = {
                                                                id: crypto.randomUUID(),
                                                                method: 'GET',
                                                                path: '/path',
                                                                status: 200
                                                            };
                                                            updateNodeMock(selectedNodeId, {
                                                                endpoints: [...(mock?.endpoints || []), newEndpoint]
                                                            });
                                                        }}
                                                    >
                                                        <Plus size={14} />
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    {(mock?.endpoints || []).length === 0 && (
                                                        <div className="text-xs text-muted-foreground italic">No endpoints defined.</div>
                                                    )}
                                                    {mock?.endpoints?.map((ep, idx) => (
                                                        <div key={ep.id} className="flex flex-col gap-2 bg-card p-2 rounded border shadow-sm">
                                                            <div className="flex gap-2 items-center">
                                                                <select
                                                                    value={ep.method}
                                                                    onChange={(e) => {
                                                                        const newEndpoints = [...(mock?.endpoints || [])];
                                                                        newEndpoints[idx].method = e.target.value;
                                                                        updateNodeMock(selectedNodeId, { endpoints: newEndpoints });
                                                                    }}
                                                                    className="h-7 w-[80px] text-xs rounded-md border border-input bg-background px-2 py-1"
                                                                >
                                                                    {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                                                                </select>
                                                                <Input
                                                                    value={ep.path}
                                                                    onChange={(e) => {
                                                                        const newEndpoints = [...(mock.endpoints || [])];
                                                                        newEndpoints[idx].path = e.target.value;
                                                                        updateNodeMock(selectedNodeId, { endpoints: newEndpoints });
                                                                    }}
                                                                    className="h-7 text-xs flex-1"
                                                                    placeholder="/users"
                                                                />
                                                                <Input
                                                                    value={ep.status}
                                                                    type="number"
                                                                    onChange={(e) => {
                                                                        const newEndpoints = [...(mock.endpoints || [])];
                                                                        newEndpoints[idx].status = parseInt(e.target.value);
                                                                        updateNodeMock(selectedNodeId, { endpoints: newEndpoints });
                                                                    }}
                                                                    className="h-7 w-[70px] text-xs text-center"
                                                                    placeholder="200"
                                                                />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => {
                                                                        const newEndpoints = (mock.endpoints || []).filter(e => e.id !== ep.id);
                                                                        updateNodeMock(selectedNodeId, { endpoints: newEndpoints });
                                                                    }}
                                                                >
                                                                    <Trash size={12} />
                                                                </Button>
                                                            </div>
                                                            {/* Target Routing Selector */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-muted-foreground uppercase">Routes to:</span>
                                                                <select
                                                                    value={ep.targetNodeId || ''}
                                                                    onChange={(e) => {
                                                                        const newEndpoints = [...(mock?.endpoints || [])];
                                                                        newEndpoints[idx].targetNodeId = e.target.value || undefined;
                                                                        updateNodeMock(selectedNodeId, { endpoints: newEndpoints });
                                                                    }}
                                                                    className="h-6 flex-1 text-xs rounded-md border border-input bg-background px-2"
                                                                >
                                                                    <option value="">(Broadcast to all)</option>
                                                                    {connectedTargetNodes.map(node => (
                                                                        <option key={node.id} value={node.id}>
                                                                            {node.data.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Client Specific Config */}
                                        {isClient && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs uppercase text-muted-foreground">Traffic Simulation</Label>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between">
                                                        <Label className="text-xs">Requests Per Second (RPS)</Label>
                                                        <span className="text-xs text-muted-foreground">{mock?.requestsPerSecond || 0} req/s</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={mock?.requestsPerSecond || 0}
                                                        onChange={(e) => updateNodeMock(selectedNodeId, { requestsPerSecond: parseInt(e.target.value) })}
                                                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">
                                                        0 = Single request. &gt;0 = Continuous stream.
                                                    </p>
                                                </div>
                                                <Separator className="my-2" />

                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs uppercase text-muted-foreground">Test Requests</Label>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => {
                                                            const newReq = {
                                                                id: crypto.randomUUID(),
                                                                method: 'GET',
                                                                path: '/users'
                                                            };
                                                            updateNodeMock(selectedNodeId, { testRequests: [...(mock?.testRequests || []), newReq] });
                                                        }}
                                                    >
                                                        <Plus size={14} />
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    {mock?.testRequests?.map((req, idx) => (
                                                        <div key={req.id} className="flex gap-2 items-center bg-card p-2 rounded border shadow-sm">
                                                            <select
                                                                value={req.method}
                                                                onChange={(e) => {
                                                                    const newRequests = [...(mock?.testRequests || [])];
                                                                    newRequests[idx].method = e.target.value;
                                                                    updateNodeMock(selectedNodeId, { testRequests: newRequests });
                                                                }}
                                                                className="h-7 w-[80px] text-xs rounded-md border border-input bg-background px-2 py-1"
                                                            >
                                                                {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                                                            </select>
                                                            <Input
                                                                value={req.path}
                                                                onChange={(e) => {
                                                                    const newRequests = [...(mock.testRequests || [])];
                                                                    newRequests[idx].path = e.target.value;
                                                                    updateNodeMock(selectedNodeId, { testRequests: newRequests });
                                                                }}
                                                                className="h-7 text-xs flex-1"
                                                                placeholder="/api/resource"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                onClick={() => {
                                                                    const newRequests = (mock.testRequests || []).filter(r => r.id !== req.id);
                                                                    updateNodeMock(selectedNodeId, { testRequests: newRequests });
                                                                }}
                                                            >
                                                                <Trash size={12} />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {(mock?.testRequests || []).length === 0 && (
                                                        <div className="text-xs text-muted-foreground italic">No requests defined.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Compute / Generic Config */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <Label className="text-xs">Latency (ms)</Label>
                                                    <span className="text-xs text-muted-foreground">{mock?.latency || 0}ms</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={5000}
                                                    step={100}
                                                    value={mock?.latency || 0}
                                                    onChange={(e) => updateNodeMock(selectedNodeId, { latency: parseInt(e.target.value) })}
                                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <Label className="text-xs">Failure Rate (%)</Label>
                                                    <span className="text-xs text-muted-foreground">{mock?.failureRate || 0}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    value={mock?.failureRate || 0}
                                                    onChange={(e) => updateNodeMock(selectedNodeId, { failureRate: parseInt(e.target.value) })}
                                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>

                                            {isCompute && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Response Body (JSON)</Label>
                                                    <JsonEditor
                                                        value={mock?.responseBody || ''}
                                                        onChange={(val) => updateNodeMock(selectedNodeId, { responseBody: val })}
                                                        placeholder='{"status": "ok"}'
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Actions */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground">Actions</h3>
                                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                                    <a href={`https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation-guide&searchQuery=${service}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink size={14} /> View AWS Documentation
                                    </a>
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full justify-start gap-2"
                                    onClick={() => removeNode(selectedNodeId)}
                                >
                                    <Trash2 size={14} /> Delete Resource
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>
                </motion.div>
            </AnimatePresence>
        );
    }

    // Handle Edge Selection
    if (selectedEdgeId) {
        const selectedEdge = activeDiagram.edges.find(e => e.id === selectedEdgeId);
        if (!selectedEdge) return null;

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="fixed right-4 top-24 bottom-4 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-start justify-between bg-muted/30">
                        <div>
                            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                                Connection
                            </div>
                            <h2 className="text-xl font-bold text-card-foreground leading-tight">{selectedEdge.label || 'Untitled Connection'}</h2>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1" onClick={() => setSelectedEdge(null)}>
                            <X size={18} />
                        </Button>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Unplug size={14} /> Connection Details
                                </h3>

                                <div className="space-y-2">
                                    <Label htmlFor="edge-label">Label</Label>
                                    <Input
                                        id="edge-label"
                                        placeholder="e.g., Use HTTPS"
                                        value={selectedEdge.label as string || ''}
                                        onChange={(e) => updateEdge(selectedEdgeId, { label: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Text to display on the connection line.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-muted/30 rounded-lg">
                                    <span className="text-xs text-muted-foreground uppercase block mb-1">Source</span>
                                    <span className="font-mono text-xs">{selectedEdge.source}</span>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg">
                                    <span className="text-xs text-muted-foreground uppercase block mb-1">Target</span>
                                    <span className="font-mono text-xs">{selectedEdge.target}</span>
                                </div>
                            </div>

                            <Separator />

                            <div className="pt-2">
                                <Button
                                    variant="destructive"
                                    className="w-full justify-start gap-2"
                                    onClick={() => removeEdge(selectedEdgeId)}
                                >
                                    <Trash2 size={14} /> Delete Connection
                                </Button>
                            </div>

                        </div>
                    </ScrollArea>
                </motion.div>
            </AnimatePresence>
        );
    }

    return null;
}
