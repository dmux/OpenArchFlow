import React from "react";
import { useDiagramStore, Layer } from "@/lib/store";
import {
  X,
  ExternalLink,
  Info,
  Unplug,
  Trash2,
  PlayCircle,
  Settings,
  Plus,
  Trash,
  Layers,
  Table2,
  Lock,
  LockOpen,
  Ungroup,
  SkullIcon,
  HeartPulse,
} from "lucide-react";
import type { TableColumn } from "@/components/diagram/TableNode";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import JsonEditor from "./JsonEditor";
import PricingSection from "./PricingSection";
import { SiTerraform } from "react-icons/si";
import { getResourceDef } from "@/lib/iac/terraform/resource-map";
import { MiniConsoleDialog } from "@/components/ministack/MiniConsoleDialog";
import { Rocket, CheckCircle, XCircle, Clock, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LANE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#ef4444",
  "#8b5cf6",
];

function SwimlaneEditor({
  nodeId,
  metadata,
}: {
  nodeId: string;
  metadata: Record<string, any> | undefined;
}) {
  const lanes: { id: string; title: string; color: string }[] =
    metadata?.lanes ?? [
      { id: "lane-1", title: "Lane 1", color: "#6366f1" },
      { id: "lane-2", title: "Lane 2", color: "#10b981" },
    ];
  const direction: string = metadata?.direction ?? "horizontal";

  const updateMeta = (patch: Record<string, any>) => {
    useDiagramStore
      .getState()
      .updateNode(nodeId, { metadata: { ...(metadata ?? {}), ...patch } });
  };

  const updateLane = (
    id: string,
    patch: Partial<{ title: string; color: string }>,
  ) => {
    updateMeta({
      lanes: lanes.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const addLane = () => {
    const next = {
      id: crypto.randomUUID(),
      title: `Lane ${lanes.length + 1}`,
      color: LANE_COLORS[lanes.length % LANE_COLORS.length],
    };
    updateMeta({ lanes: [...lanes, next] });
  };

  const removeLane = (id: string) => {
    if (lanes.length <= 1) return;
    updateMeta({ lanes: lanes.filter((l) => l.id !== id) });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Settings size={14} /> Swimlane Properties
      </h3>
      <div>
        <Label className="text-xs">Direction</Label>
        <select
          value={direction}
          onChange={(e) => updateMeta({ direction: e.target.value })}
          className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring mt-1"
        >
          <option value="horizontal">Horizontal lanes</option>
          <option value="vertical">Vertical lanes</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Lanes</Label>
        {lanes.map((lane) => (
          <div key={lane.id} className="flex items-center gap-1.5">
            <input
              type="color"
              value={lane.color}
              onChange={(e) => updateLane(lane.id, { color: e.target.value })}
              className="h-7 w-7 rounded p-0.5 border border-input cursor-pointer shrink-0"
            />
            <Input
              value={lane.title}
              onChange={(e) => updateLane(lane.id, { title: e.target.value })}
              className="h-7 text-xs flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 hover:text-destructive"
              onClick={() => removeLane(lane.id)}
            >
              <Trash size={12} />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs gap-1.5"
          onClick={addLane}
        >
          <Plus size={12} /> Add Lane
        </Button>
      </div>
    </div>
  );
}

function TableColumnEditor({
  nodeId,
  metadata,
}: {
  nodeId: string;
  metadata: Record<string, any> | undefined;
}) {
  const columns: TableColumn[] = (metadata?.columns as TableColumn[]) ?? [];
  const [newName, setNewName] = React.useState("");
  const [newType, setNewType] = React.useState("VARCHAR(255)");

  const updateColumns = (cols: TableColumn[]) => {
    useDiagramStore
      .getState()
      .updateNode(nodeId, { metadata: { ...(metadata ?? {}), columns: cols } });
  };

  const addColumn = () => {
    if (!newName.trim()) return;
    const col: TableColumn = {
      id: `col-${nodeId}-${crypto.randomUUID().slice(0, 8)}`,
      name: newName.trim(),
      type: newType.trim() || "VARCHAR(255)",
      isPrimaryKey: false,
      isForeignKey: false,
      nullable: true,
    };
    updateColumns([...columns, col]);
    setNewName("");
    setNewType("VARCHAR(255)");
  };

  const removeColumn = (id: string) =>
    updateColumns(columns.filter((c) => c.id !== id));
  const updateColumn = (id: string, patch: Partial<TableColumn>) =>
    updateColumns(columns.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Table2 size={14} /> Columns
      </h3>
      <div className="space-y-1">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex items-center gap-1 bg-muted/30 rounded px-1.5 py-1"
          >
            <Input
              value={col.name}
              onChange={(e) => updateColumn(col.id, { name: e.target.value })}
              className="h-6 text-xs w-24 shrink-0"
              placeholder="name"
            />
            <Input
              value={col.type}
              onChange={(e) => updateColumn(col.id, { type: e.target.value })}
              className="h-6 text-xs flex-1 font-mono"
              placeholder="type"
            />
            <button
              title="Primary Key"
              onClick={() =>
                updateColumn(col.id, { isPrimaryKey: !col.isPrimaryKey })
              }
              className={`text-[10px] px-1 rounded font-bold shrink-0 ${col.isPrimaryKey ? "bg-amber-400/20 text-amber-600" : "text-muted-foreground hover:text-amber-500"}`}
            >
              PK
            </button>
            <button
              title="Foreign Key"
              onClick={() =>
                updateColumn(col.id, { isForeignKey: !col.isForeignKey })
              }
              className={`text-[10px] px-1 rounded font-bold shrink-0 ${col.isForeignKey ? "bg-blue-400/20 text-blue-500" : "text-muted-foreground hover:text-blue-400"}`}
            >
              FK
            </button>
            <button
              title="Nullable"
              onClick={() => updateColumn(col.id, { nullable: !col.nullable })}
              className={`text-[10px] px-1 rounded shrink-0 ${col.nullable ? "text-muted-foreground" : "bg-red-400/20 text-red-500 font-bold"}`}
            >
              NN
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 hover:text-destructive"
              onClick={() => removeColumn(col.id)}
            >
              <Trash size={10} />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="column_name"
          className="h-7 text-xs w-28 shrink-0"
          onKeyDown={(e) => {
            if (e.key === "Enter") addColumn();
          }}
        />
        <Input
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          placeholder="VARCHAR(255)"
          className="h-7 text-xs flex-1 font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter") addColumn();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={!newName.trim()}
          onClick={addColumn}
        >
          <Plus size={12} />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        PK = Primary Key · FK = Foreign Key · NN = Not Null
      </p>
    </div>
  );
}

const RESERVED_METADATA_KEYS = new Set([
  "label",
  "service",
  "type",
  "metadata",
  "mock",
  "simulation",
  "pricing",
  "layerId",
  "provider",
  "subtype",
  "backgroundColor",
  "borderColor",
  "textColor",
  "iconColor",
  "borderWidth",
  "opacity",
  "customIcon",
  "shape",
  "title",
  "description",
  "text",
  "color",
  "pointerDirection",
  "animated",
  "noteColor",
  "fontSize",
]);

function CustomPropertiesEditor({
  nodeId,
  metadata,
}: {
  nodeId: string;
  metadata: Record<string, any> | undefined;
}) {
  const [newKey, setNewKey] = React.useState("");
  const [newVal, setNewVal] = React.useState("");

  const customEntries = Object.entries(metadata ?? {}).filter(
    ([k]) => !RESERVED_METADATA_KEYS.has(k),
  );

  const commit = () => {
    if (!newKey.trim()) return;
    useDiagramStore.getState().updateNode(nodeId, {
      metadata: { ...(metadata ?? {}), [newKey.trim()]: newVal },
    });
    setNewKey("");
    setNewVal("");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Plus size={14} /> Custom Properties
      </h3>
      {customEntries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-muted-foreground w-24 truncate shrink-0">
            {k}
          </span>
          <Input
            value={String(v ?? "")}
            onChange={(e) =>
              useDiagramStore.getState().updateNode(nodeId, {
                metadata: { ...(metadata ?? {}), [k]: e.target.value },
              })
            }
            className="h-7 text-xs flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 hover:text-destructive"
            onClick={() => {
              const { [k]: _, ...rest } = metadata ?? {};
              useDiagramStore.getState().updateNode(nodeId, { metadata: rest });
            }}
          >
            <Trash size={12} />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-1.5 pt-1">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Key"
          className="h-7 text-xs w-24 shrink-0"
        />
        <Input
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          placeholder="Value"
          className="h-7 text-xs flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          disabled={!newKey.trim()}
          onClick={commit}
        >
          <Plus size={12} />
        </Button>
      </div>
    </div>
  );
}

function IaCConfigSection({
  nodeId,
  node,
}: {
  nodeId: string;
  node: any;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const updateNode = useDiagramStore.getState().updateNode;

  const service = node.data.service ?? "";
  const detectedDef = getResourceDef(service);
  const terraformConfig = node.data.iacConfig?.terraform ?? {};
  const currentResourceType = terraformConfig.resourceType ?? detectedDef?.resource ?? "";
  const currentResourceName = terraformConfig.resourceName ?? (node.data.label ?? service).toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");

  const updateTerraform = (patch: Record<string, unknown>) => {
    updateNode(nodeId, {
      iacConfig: {
        ...(node.data.iacConfig ?? {}),
        terraform: { ...terraformConfig, ...patch },
      },
    });
  };

  if (!detectedDef && !currentResourceType) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <SiTerraform size={14} style={{ color: "#7B42BC" }} /> Infrastructure as Code
        </h3>
        <p className="text-xs text-muted-foreground p-2 rounded border border-dashed border-border">
          No Terraform resource mapping found for <strong>{service}</strong>. You can set a custom resource type below.
        </p>
        <div>
          <Label className="text-xs">Custom Resource Type</Label>
          <Input
            value={currentResourceType}
            onChange={(e) => updateTerraform({ resourceType: e.target.value })}
            placeholder="e.g. aws_instance"
            className="h-8 text-xs font-mono mt-1"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <SiTerraform size={14} style={{ color: "#7B42BC" }} />
          Infrastructure as Code
        </span>
        <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="space-y-3 pl-1">
          <div className="flex items-center gap-2 p-2 rounded-lg border border-[#7B42BC33] bg-[#7B42BC08]">
            <SiTerraform size={12} style={{ color: "#7B42BC" }} />
            <span className="text-xs font-mono text-muted-foreground">hashicorp/aws ~5.0</span>
          </div>

          <div>
            <Label className="text-xs">Resource Type</Label>
            <div className="flex gap-1 mt-1">
              <Input
                value={currentResourceType}
                onChange={(e) => updateTerraform({ resourceType: e.target.value })}
                placeholder="aws_instance"
                className="h-8 text-xs font-mono flex-1"
              />
            </div>
            {detectedDef && currentResourceType === detectedDef.resource && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Auto-detected from {service}</p>
            )}
          </div>

          <div>
            <Label className="text-xs">Resource Name</Label>
            <Input
              value={currentResourceName}
              onChange={(e) => updateTerraform({ resourceName: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "") })}
              placeholder="my_resource"
              className="h-8 text-xs font-mono mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Used in HCL: <code className="bg-muted px-1 rounded">{currentResourceType}.{currentResourceName}</code>
            </p>
          </div>

          {detectedDef?.outputs && detectedDef.outputs.length > 0 && (
            <div>
              <Label className="text-xs">Exported Attributes</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {detectedDef.outputs.map((attr) => (
                  <span key={attr} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "#7B42BC15", color: "#7B42BC" }}>
                    .{attr}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Traffic Source Fire Section ───────────────────────────────────────────────
interface FireHop {
  label: string;
  latencyMs: number;
  ok: boolean;
  response: unknown;
}

function TrafficSourceFireSection({ node, nodes, edges }: { node: any; nodes: any[]; edges: any[] }) {
  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const mock = node.data.mock as any;
  const [firing, setFiring] = React.useState(false);
  const [hops, setHops] = React.useState<FireHop[]>([]);

  const handleFire = React.useCallback(async () => {
    const method = (mock?.httpMethod ?? "POST").toUpperCase();
    const path   = mock?.httpPath ?? "/";
    let body: unknown = {};
    try { body = JSON.parse(mock?.payloadTemplate ?? "{}"); } catch { body = {}; }

    setFiring(true);
    setHops([]);

    const { executeMiniStackNode } = await import("@/lib/simulation/ministack-executor");
    const visited = new Set<string>();
    const collectedHops: FireHop[] = [];

    // Traverse the graph from sourceNodeId, calling deployed nodes along the way.
    // payload evolves: Traffic Source sets _method/_path/_body; downstream nodes
    // receive the previous hop's response as their input.
    async function traverse(currentNodeId: string, payload: unknown, depth: number): Promise<void> {
      if (depth > 8 || visited.has(currentNodeId)) return;
      visited.add(currentNodeId);

      const outgoing = edges.filter((e: any) => e.source === currentNodeId);
      for (const edge of outgoing) {
        const target = nodes.find((n: any) => n.id === edge.target);
        if (!target || visited.has(target.id)) continue;

        const isDeployed = target.data?.ministack?.status === "deployed";
        if (!isDeployed) {
          // Non-deployed node: pass through without a real call, continue chain
          await traverse(target.id, payload, depth + 1);
          continue;
        }

        const t0 = performance.now();
        try {
          const result = await executeMiniStackNode(target, payload, ministackConfig);
          const latencyMs = Math.round(performance.now() - t0);
          const hop: FireHop = {
            label: target.data.label ?? target.data.service,
            latencyMs,
            ok: result.status === "success",
            response: result.status === "success" ? result.responsePayload : result.errorMessage,
          };
          collectedHops.push(hop);
          setHops([...collectedHops]);

          // Use this hop's response as payload for the next hop
          const nextPayload = result.status === "success" && result.responsePayload != null
            ? result.responsePayload
            : payload;
          await traverse(target.id, nextPayload, depth + 1);
        } catch (e) {
          collectedHops.push({
            label: target.data.label ?? target.data.service,
            latencyMs: Math.round(performance.now() - t0),
            ok: false,
            response: e instanceof Error ? e.message : "Error",
          });
          setHops([...collectedHops]);
        }
      }
    }

    try {
      await traverse(node.id, { _method: method, _path: path, _body: body }, 0);
      if (collectedHops.length === 0) {
        setHops([{ label: "—", latencyMs: 0, ok: false, response: "No deployed node reachable. Deploy downstream nodes first." }]);
      }
    } finally {
      setFiring(false);
    }
  }, [mock, node.id, nodes, edges, ministackConfig]);

  const totalMs = hops.reduce((s, h) => s + h.latencyMs, 0);
  const allOk = hops.length > 0 && hops.every((h) => h.ok);
  const lastHop = hops[hops.length - 1];

  return (
    <div className="space-y-2 pt-1">
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 text-xs h-7 border-violet-500/40 text-violet-400 hover:bg-violet-500/10"
        onClick={handleFire}
        disabled={firing}
      >
        {firing
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Firing…</>
          : <><Play className="w-3 h-3" /> Fire 1 request</>}
      </Button>

      {hops.length > 0 && (
        <div className={cn(
          "rounded border p-2 text-xs space-y-1.5",
          allOk ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5",
        )}>
          {/* Per-hop results */}
          {hops.map((hop, i) => (
            <div key={i} className="flex items-start gap-1.5 font-mono">
              <span className={hop.ok ? "text-green-400 shrink-0" : "text-destructive shrink-0"}>
                {hop.ok ? "✓" : "✗"}
              </span>
              <span className="text-muted-foreground shrink-0">{hop.label}</span>
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{hop.latencyMs}ms</span>
            </div>
          ))}

          {/* Separator + final response */}
          {lastHop && (
            <>
              <div className="border-t border-border/50 pt-1">
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  Response {hops.length > 1 ? `(${totalMs}ms total)` : ""}
                </p>
                <pre className="text-[10px] break-all whitespace-pre-wrap max-h-28 overflow-auto">
                  {typeof lastHop.response === "string"
                    ? lastHop.response
                    : JSON.stringify(lastHop.response, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const INVOKE_DEFAULTS: Record<string, string> = {
  lambda:       '{\n  "key": "value"\n}',
  sqs:          '{\n  "message": "hello from simulation"\n}',
  dynamodb:     '{\n  "id": { "S": "sim-1" },\n  "data": { "S": "value" }\n}',
  sns:          '{\n  "event": "notification",\n  "payload": {}\n}',
  eventbridge:  '{\n  "source": "openarchflow.simulation",\n  "detail": {}\n}',
  s3:           '{\n  "body": "hello world"\n}',
  apigateway:   '{\n  "_method": "GET",\n  "_path": "/",\n  "_body": {}\n}',
  "api-gateway":'{\n  "_method": "GET",\n  "_path": "/",\n  "_body": {}\n}',
};

const INVOKE_LABEL: Record<string, string> = {
  lambda: "Invoke", sqs: "Send message", dynamodb: "Put item",
  sns: "Publish", eventbridge: "Put event", s3: "Put object",
  apigateway: "Send request", "api-gateway": "Send request",
};

function MiniStackSection({ nodeId, node }: { nodeId: string; node: any }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [consoleOpen, setConsoleOpen] = React.useState(false);
  const [deploying, setDeploying] = React.useState(false);
  const [nameOverride, setNameOverride] = React.useState<string>(() => node.data.ministack?.resourceNameOverride ?? "");
  const [invokeOpen, setInvokeOpen] = React.useState(false);
  const [invokePayload, setInvokePayload] = React.useState<string>(() => {
    const svc = (node.data.service ?? "").toLowerCase();
    return INVOKE_DEFAULTS[svc] ?? '{\n  "key": "value"\n}';
  });
  const [invoking, setInvoking] = React.useState(false);
  const [invokeResult, setInvokeResult] = React.useState<{ ok: boolean; latencyMs: number; summary: string } | null>(null);

  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const setNodeMinistackState = useDiagramStore((s) => s.setNodeMinistackState);
  const resetNodeMinistackState = useDiagramStore((s) => s.resetNodeMinistackState);

  const ms = node.data.ministack;
  const status = ms?.status;
  const isDeployed = status === "deployed";
  const isError = status === "error";
  const service = (node.data.service ?? "").toLowerCase();
  const resourceId = ms?.resourceId ?? "";

  const handleQuickInvoke = React.useCallback(async () => {
    let body: unknown;
    try { body = JSON.parse(invokePayload); } catch { toast.error("Invalid JSON payload"); return; }
    setInvoking(true);
    setInvokeResult(null);
    const t0 = performance.now();
    try {
      let res: Response;
      const cfg = ministackConfig;

      if (service === "lambda") {
        res = await fetch("/api/ministack/resource/lambda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg, functionName: resourceId, payload: invokePayload }) });
      } else if (service === "sqs") {
        const queueUrl = ms?.endpoint ?? `${cfg.endpoint}/000000000000/${resourceId}`;
        res = await fetch("/api/ministack/resource/sqs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg, queueUrl, messageBody: invokePayload }) });
      } else if (service === "dynamodb") {
        res = await fetch("/api/ministack/resource/dynamodb", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg, tableName: resourceId, item: body }) });
      } else if (service === "sns") {
        const topicArn = ms?.resourceArn ?? `arn:aws:sns:${cfg.region}:${cfg.accountId}:${resourceId}`;
        res = await fetch("/api/ministack/resource/sns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg, topicArn, message: invokePayload }) });
      } else if (service === "eventbridge") {
        res = await fetch("/api/ministack/resource/eventbridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg, busName: resourceId, source: "openarchflow.invoke", detailType: "ManualInvoke", detail: invokePayload }) });
      } else if (service === "s3") {
        res = await fetch("/api/ministack/resource/s3", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: cfg, bucket: resourceId, key: `invoke/${Date.now()}.json`, content: invokePayload }) });
      } else if (service === "apigateway" || service === "api-gateway") {
        const p = body as Record<string, unknown>;
        const method = String(p._method ?? "POST").toUpperCase();
        const path = String(p._path ?? "/");
        const gwBody = p._body ?? body;
        // Route through Next.js proxy — browser can't call localhost:4566 directly (CORS)
        res = await fetch("/api/ministack/resource/apigateway-invoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: cfg, restApiId: resourceId, method, path, body: gwBody }),
        });
      } else {
        toast.error("Quick invoke not supported for this service");
        return;
      }

      const latencyMs = Math.round(performance.now() - t0);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data as any).error) {
        setInvokeResult({ ok: false, latencyMs, summary: String((data as any).error ?? `HTTP ${res.status}`) });
      } else {
        const summary = JSON.stringify(data).slice(0, 120);
        setInvokeResult({ ok: true, latencyMs, summary });
        toast.success(`${INVOKE_LABEL[service] ?? "Invoke"} — ${latencyMs}ms`);
      }
    } catch (e) {
      const latencyMs = Math.round(performance.now() - t0);
      setInvokeResult({ ok: false, latencyMs, summary: e instanceof Error ? e.message : "Error" });
    } finally {
      setInvoking(false);
    }
  }, [invokePayload, service, resourceId, ms, ministackConfig]);

  const handleSaveNameOverride = () => {
    setNodeMinistackState(nodeId, { resourceNameOverride: nameOverride.trim() || undefined });
  };

  const handleDeployThis = async () => {
    setDeploying(true);
    setNodeMinistackState(nodeId, { status: "deploying" });
    const override = nameOverride.trim() || undefined;
    try {
      const res = await fetch("/api/ministack/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: [{
            nodeId,
            service: node.data.service,
            label: node.data.label,
            nodeConfig: override ? { resourceNameOverride: override } : undefined,
          }],
          config: ministackConfig,
        }),
      });
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.status === "deployed") {
        setNodeMinistackState(nodeId, {
          status: "deployed",
          resourceId: result.resourceId,
          resourceArn: result.resourceArn,
          endpoint: result.endpoint,
          deployedAt: Date.now(),
          resourceNameOverride: override,
        });
      } else {
        setNodeMinistackState(nodeId, { status: result?.status ?? "error", errorMessage: result?.errorMessage });
      }
    } catch (e) {
      setNodeMinistackState(nodeId, { status: "error", errorMessage: e instanceof Error ? e.message : "Deploy failed" });
    } finally {
      setDeploying(false);
    }
  };

  const statusColor = isDeployed
    ? "text-green-600 dark:text-green-400"
    : isError
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <Rocket size={14} className={statusColor} />
          MiniStack Deploy
        </span>
        <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="space-y-3 pl-1">
          {/* Status */}
          <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20">
            {isDeployed && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
            {isError && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
            {!isDeployed && !isError && <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            <span className={cn("text-xs font-medium capitalize", statusColor)}>
              {status ?? "idle"}
            </span>
          </div>

          {/* Resource ID */}
          {ms?.resourceId && (
            <div>
              <Label className="text-xs text-muted-foreground">Resource ID</Label>
              <div className="flex items-center gap-1 mt-0.5">
                <code className="text-[10px] font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {ms.resourceId}
                </code>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border"
                  onClick={() => { navigator.clipboard.writeText(ms.resourceId!); }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* ARN */}
          {ms?.resourceArn && (
            <div>
              <Label className="text-xs text-muted-foreground">ARN</Label>
              <div className="flex items-center gap-1 mt-0.5">
                <code className="text-[10px] font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {ms.resourceArn}
                </code>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border"
                  onClick={() => { navigator.clipboard.writeText(ms.resourceArn!); }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Endpoint */}
          {ms?.endpoint && (
            <div>
              <Label className="text-xs text-muted-foreground">Endpoint</Label>
              <div className="flex items-center gap-1 mt-0.5">
                <code className="text-[10px] font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {ms.endpoint}
                </code>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded border border-border"
                  onClick={() => { navigator.clipboard.writeText(ms.endpoint!); }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {isError && ms?.errorMessage && (
            <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">
              {ms.errorMessage}
            </p>
          )}

          {/* Resource name override */}
          {!isDeployed && (
            <div>
              <Label className="text-xs text-muted-foreground">Resource name override</Label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  value={nameOverride}
                  onChange={(e) => setNameOverride(e.target.value)}
                  onBlur={handleSaveNameOverride}
                  placeholder="auto (from label)"
                  className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background font-mono placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeployThis}
              disabled={deploying}
              className="h-7 text-xs gap-1.5"
            >
              <Rocket className="w-3 h-3" />
              {deploying ? "Deploying…" : isDeployed ? "Re-deploy" : "Deploy"}
            </Button>
            {isDeployed && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInvokeOpen((v) => !v)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Play className="w-3 h-3" />
                  {INVOKE_LABEL[service] ?? "Invoke"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConsoleOpen(true)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Settings size={12} />
                  Console
                </Button>
              </>
            )}
            {status && status !== "idle" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => resetNodeMinistackState(nodeId)}
                className="h-7 text-xs text-muted-foreground gap-1.5"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Quick Invoke panel */}
          {isDeployed && invokeOpen && (
            <div className="space-y-2 pt-1 border-t border-border">
              {(service === "apigateway" || service === "api-gateway") && (
                <p className="text-[10px] text-muted-foreground">
                  Use <code className="font-mono">_method</code>, <code className="font-mono">_path</code>, <code className="font-mono">_body</code> keys to configure the request.
                </p>
              )}
              <textarea
                value={invokePayload}
                onChange={(e) => setInvokePayload(e.target.value)}
                rows={4}
                className="w-full text-xs p-2 rounded border border-border bg-background font-mono resize-none"
                placeholder='{"key": "value"}'
              />
              <Button
                size="sm"
                onClick={handleQuickInvoke}
                disabled={invoking}
                className="h-7 text-xs gap-1.5 bg-orange-500 hover:bg-orange-600 text-white w-full"
              >
                {invoking
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
                  : <><Play className="w-3 h-3" /> {INVOKE_LABEL[service] ?? "Invoke"}</>
                }
              </Button>
              {invokeResult && (
                <div className={cn(
                  "rounded border px-2 py-1.5 text-[10px] font-mono space-y-0.5",
                  invokeResult.ok
                    ? "border-green-500/30 bg-green-500/5 text-green-400"
                    : "border-destructive/30 bg-destructive/5 text-destructive",
                )}>
                  <p>{invokeResult.ok ? "✓" : "✗"} {invokeResult.latencyMs}ms</p>
                  <p className="break-all line-clamp-3 text-muted-foreground">{invokeResult.summary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {consoleOpen && ms?.resourceId && (
        <MiniConsoleDialog
          open={consoleOpen}
          onClose={() => setConsoleOpen(false)}
          service={node.data.service}
          nodeLabel={node.data.label}
          config={ministackConfig}
          resourceId={ms.resourceId}
          resourceArn={ms.resourceArn}
          endpoint={ms.endpoint}
        />
      )}
    </div>
  );
}

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
    removeEdge,
    moveNodeToLayer,
    ungroupNodes,
    setGroupLocked,
    batchUpdateNodes,
    toggleKillNode,
    killedNodes,
    isPlaying,
  } = useDiagramStore();

  const handleTriggerNode = () => {
    if (selectedNodeId) {
      // We need to import SimulationEngine but avoiding circular dependency might be tricky if not careful.
      // Actually, we can just import it.
      import("@/lib/simulation").then(({ SimulationEngine }) => {
        SimulationEngine.getInstance().start([selectedNodeId]);
      });
    }
  };

  if (!activeDiagramId || (!selectedNodeId && !selectedEdgeId)) return null;

  const activeDiagram = diagrams[activeDiagramId];
  if (!activeDiagram) return null;

  // Handle Node Selection
  if (selectedNodeId) {
    const selectedNode = activeDiagram.nodes.find(
      (n) => n.id === selectedNodeId,
    );
    if (!selectedNode) return null;

    const { label, service, metadata, mock } = selectedNode.data;
    const type = selectedNode.type || "default";

    // Helper to determine node category
    const isFrame = type === "frame";
    const isGroup = isFrame && "locked" in selectedNode.data; // group frames have a 'locked' field
    const isGroupLocked = selectedNode.data.locked as boolean | undefined;
    const isSwimlane = type === "swimlane";
    const isTable = type === "table";
    const isAnnotation = type === "annotation";
    const isNote = type === "note";
    const isGateway =
      service?.toLowerCase().includes("gateway") ||
      service?.toLowerCase().includes("balancer") ||
      service?.toLowerCase().includes("appsync");
    const isCompute =
      service?.toLowerCase().includes("lambda") ||
      service?.toLowerCase().includes("container") ||
      service?.toLowerCase().includes("instance");
    const isDatabase =
      service?.toLowerCase().includes("dynamodb") ||
      service?.toLowerCase().includes("rds") ||
      service?.toLowerCase().includes("database") ||
      service?.toLowerCase().includes("store") ||
      type === "database";
    const isClient = type === "client" || type === "traffic-source";

    // Get connected target nodes for Gateway routing
    const connectedEdges = activeDiagram.edges.filter(
      (e) => e.source === selectedNodeId,
    );
    const connectedTargetNodes = connectedEdges
      .map((e) => activeDiagram.nodes.find((n) => n.id === e.target))
      .filter(Boolean) as any[];

    return (
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="fixed right-0 md:right-4 top-16 md:top-24 bottom-0 md:bottom-4 w-full md:w-96 bg-card border border-border rounded-none md:rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-start justify-between bg-muted/30">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                {service}{" "}
                <span className="text-[10px] h-5 px-1.5 border border-border rounded-full flex items-center">
                  {type}
                </span>
              </div>
              <h2 className="text-xl font-bold text-card-foreground leading-tight">
                {type === "note" ? "Sticky Note" : label}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-1"
              onClick={() => setSelectedNode(null)}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Quick Start traffic banner — shown on client/entry nodes with no traffic configured */}
              {(isClient || isGateway) &&
                !isPlaying &&
                !mock?.requestsPerSecond && (
                  <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <PlayCircle size={16} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                        Enable simulation traffic
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        This node has no requests configured. Set it as the
                        traffic entry point to visualize HTTP flow through your
                        architecture.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateNodeMock(selectedNodeId, {
                              requestsPerSecond: 5,
                              enabled: true,
                            })
                          }
                          className="text-[11px] font-medium px-2.5 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                        >
                          5 req/s
                        </button>
                        <button
                          onClick={() =>
                            updateNodeMock(selectedNodeId, {
                              requestsPerSecond: 20,
                              enabled: true,
                            })
                          }
                          className="text-[11px] font-medium px-2.5 py-1 rounded bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors dark:text-blue-400"
                        >
                          20 req/s
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Layer Assignment */}
              {(() => {
                const layers: Layer[] = activeDiagram.layers ?? [];
                if (layers.length <= 1) return null;
                const currentLayerId = selectedNode.data.layerId ?? "default";
                return (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Layers size={14} /> Layer
                    </h3>
                    <select
                      value={currentLayerId}
                      onChange={(e) =>
                        moveNodeToLayer(selectedNodeId, e.target.value)
                      }
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {layers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {/* Frame-specific Properties */}
              {isFrame && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Settings size={14} /> Frame Properties
                  </h3>
                  {/* Group actions (only for grouped frames) */}
                  {isGroup && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => {
                          setGroupLocked(selectedNodeId, !isGroupLocked);
                        }}
                      >
                        {isGroupLocked ? (
                          <>
                            <LockOpen size={12} /> Desbloquear grupo
                          </>
                        ) : (
                          <>
                            <Lock size={12} /> Bloquear grupo
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        onClick={() => ungroupNodes(selectedNodeId)}
                      >
                        <Ungroup size={12} /> Desagrupar
                      </Button>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={metadata?.title || label || ""}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            label: e.target.value,
                            metadata: { ...metadata, title: e.target.value },
                          });
                        }}
                        placeholder="Group Name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={metadata?.description || ""}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            metadata: {
                              ...metadata,
                              description: e.target.value,
                            },
                          });
                        }}
                        placeholder="Optional description"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Background Color</Label>
                      <Input
                        type="color"
                        value={metadata?.borderColor || "#93c5fd"}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          const color = e.target.value;
                          // Convert hex to rgba for background
                          const r = parseInt(color.slice(1, 3), 16);
                          const g = parseInt(color.slice(3, 5), 16);
                          const b = parseInt(color.slice(5, 7), 16);
                          updateNode(selectedNodeId, {
                            metadata: {
                              ...metadata,
                              borderColor: color,
                              backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
                            },
                          });
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Swimlane Properties */}
              {isSwimlane && (
                <SwimlaneEditor nodeId={selectedNodeId} metadata={metadata} />
              )}

              {/* Table / ER Diagram Properties */}
              {isTable && (
                <TableColumnEditor
                  nodeId={selectedNodeId}
                  metadata={metadata}
                />
              )}

              {/* Annotation-specific Properties */}
              {isAnnotation && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Settings size={14} /> Annotation Properties
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Text</Label>
                      <Input
                        value={metadata?.text || label || ""}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            label: e.target.value,
                            metadata: { ...metadata, text: e.target.value },
                          });
                        }}
                        placeholder="Annotation text"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input
                        type="color"
                        value={metadata?.color || "#ef4444"}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            metadata: { ...metadata, color: e.target.value },
                          });
                        }}
                        className="h-8"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Laser pointer color (red is more realistic)
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Pointer Direction</Label>
                      <select
                        value={metadata?.pointerDirection || "right"}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            metadata: {
                              ...metadata,
                              pointerDirection: e.target.value,
                            },
                          });
                        }}
                        className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                      >
                        <option value="up">Up ↑</option>
                        <option value="down">Down ↓</option>
                        <option value="left">Left ←</option>
                        <option value="right">Right →</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Animated</Label>
                      <Switch
                        checked={metadata?.animated !== false}
                        onCheckedChange={(checked) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            metadata: { ...metadata, animated: checked },
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky Note-specific Properties */}
              {isNote && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Settings size={14} /> Sticky Note Properties
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Content</Label>
                      <textarea
                        value={metadata?.text || label || ""}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            label: e.target.value,
                            metadata: { ...metadata, text: e.target.value },
                          });
                        }}
                        placeholder="Write your note..."
                        className="w-full min-h-[60px] text-sm rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Background</Label>
                        <Input
                          type="color"
                          value={metadata?.backgroundColor || "#fef08a"}
                          onChange={(e) => {
                            const updateNode =
                              useDiagramStore.getState().updateNode;
                            updateNode(selectedNodeId, {
                              metadata: {
                                ...metadata,
                                backgroundColor: e.target.value,
                              },
                            });
                          }}
                          className="h-8 p-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Border</Label>
                        <Input
                          type="color"
                          value={metadata?.borderColor || "#facc15"}
                          onChange={(e) => {
                            const updateNode =
                              useDiagramStore.getState().updateNode;
                            updateNode(selectedNodeId, {
                              metadata: {
                                ...metadata,
                                borderColor: e.target.value,
                              },
                            });
                          }}
                          className="h-8 p-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Text Color</Label>
                      <Input
                        type="color"
                        value={metadata?.textColor || "#854d0e"}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            metadata: {
                              ...metadata,
                              textColor: e.target.value,
                            },
                          });
                        }}
                        className="h-8 p-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Font Size</Label>
                      <select
                        value={metadata?.fontSize || "13px"}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, {
                            metadata: { ...metadata, fontSize: e.target.value },
                          });
                        }}
                        className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                      >
                        <option value="11px">Small</option>
                        <option value="13px">Medium</option>
                        <option value="16px">Large</option>
                        <option value="20px">Extra Large</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Regular Metadata Section for other nodes */}
              {!isFrame && !isAnnotation && !isNote && !isTable && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Info size={14} /> Configuration & Details
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Name / Label</Label>
                      <Input
                        value={label || ""}
                        onChange={(e) => {
                          const updateNode =
                            useDiagramStore.getState().updateNode;
                          updateNode(selectedNodeId, { label: e.target.value });
                        }}
                        placeholder="Component Name"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {metadata && Object.keys(metadata).length > 0 ? (
                    <div className="grid gap-3 mt-3">
                      {Object.entries(metadata).map(([key, value]) => (
                        <div
                          key={key}
                          className="bg-muted/50 p-3 rounded-lg border border-border/50"
                        >
                          <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                            {key.replace(/_/g, " ")}
                          </div>
                          <div className="text-sm font-medium text-foreground break-words">
                            {String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic mt-3">
                      No metadata available for this resource.
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Simulation / Mock Configuration - Only for non-Frame/Annotation nodes */}
              {!isFrame && !isAnnotation && (
                <div className="space-y-4">
                  {/* Deployed-node notice — mock settings are overridden by real MiniStack */}
                  {selectedNode.data.ministack?.status === "deployed" && (
                    <div className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/8 px-3 py-2 text-xs text-orange-400">
                      <Rocket size={12} className="mt-0.5 shrink-0" />
                      <span>
                        Node deployed to MiniStack — simulation will use real latency &amp; behavior.
                        Mock settings below are <strong>ignored</strong>.
                      </span>
                    </div>
                  )}
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
                      {isPlaying && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-6 px-2 ml-1 text-xs",
                            killedNodes.has(selectedNodeId)
                              ? "text-green-600 hover:text-green-700 border-green-300"
                              : "text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10",
                          )}
                          onClick={() => toggleKillNode(selectedNodeId)}
                          title={
                            killedNodes.has(selectedNodeId)
                              ? "Restore Service"
                              : "Kill Service (fault injection)"
                          }
                        >
                          {killedNodes.has(selectedNodeId) ? (
                            <>
                              <HeartPulse size={11} className="mr-1" />
                              Restore
                            </>
                          ) : (
                            <>
                              <SkullIcon size={11} className="mr-1" />
                              Kill
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <Switch
                      checked={mock?.enabled !== false}
                      disabled={selectedNode.data.ministack?.status === "deployed"}
                      onCheckedChange={(checked) =>
                        updateNodeMock(selectedNodeId, { enabled: checked })
                      }
                    />
                  </div>

                  {mock?.enabled !== false && (
                    <div className={cn(
                      "space-y-4 border rounded-lg p-3 bg-muted/20",
                      selectedNode.data.ministack?.status === "deployed" && "pointer-events-none opacity-40",
                    )}>
                      {/* Gateway Specific Config */}
                      {isGateway && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs uppercase text-muted-foreground">
                              Endpoints
                            </Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                const newEndpoint = {
                                  id: crypto.randomUUID(),
                                  method: "GET",
                                  path: "/path",
                                  status: 200,
                                };
                                updateNodeMock(selectedNodeId, {
                                  endpoints: [
                                    ...(mock?.endpoints || []),
                                    newEndpoint,
                                  ],
                                });
                              }}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(mock?.endpoints || []).length === 0 && (
                              <div className="text-xs text-muted-foreground italic">
                                No endpoints defined.
                              </div>
                            )}
                            {mock?.endpoints?.map((ep, idx) => (
                              <div
                                key={ep.id}
                                className="flex flex-col gap-2 bg-card p-2 rounded border shadow-sm"
                              >
                                <div className="flex gap-2 items-center">
                                  <select
                                    value={ep.method}
                                    onChange={(e) => {
                                      const newEndpoints = [
                                        ...(mock?.endpoints || []),
                                      ];
                                      newEndpoints[idx].method = e.target.value;
                                      updateNodeMock(selectedNodeId, {
                                        endpoints: newEndpoints,
                                      });
                                    }}
                                    className="h-7 w-[80px] text-xs rounded-md border border-input bg-background px-2 py-1"
                                  >
                                    {["GET", "POST", "PUT", "DELETE"].map(
                                      (m) => (
                                        <option key={m} value={m}>
                                          {m}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                  <Input
                                    value={ep.path}
                                    onChange={(e) => {
                                      const newEndpoints = [
                                        ...(mock.endpoints || []),
                                      ];
                                      newEndpoints[idx].path = e.target.value;
                                      updateNodeMock(selectedNodeId, {
                                        endpoints: newEndpoints,
                                      });
                                    }}
                                    className="h-7 text-xs flex-1"
                                    placeholder="/users"
                                  />
                                  <Input
                                    value={ep.status}
                                    type="number"
                                    onChange={(e) => {
                                      const newEndpoints = [
                                        ...(mock.endpoints || []),
                                      ];
                                      newEndpoints[idx].status = parseInt(
                                        e.target.value,
                                      );
                                      updateNodeMock(selectedNodeId, {
                                        endpoints: newEndpoints,
                                      });
                                    }}
                                    className="h-7 w-[70px] text-xs text-center"
                                    placeholder="200"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      const newEndpoints = (
                                        mock.endpoints || []
                                      ).filter((e) => e.id !== ep.id);
                                      updateNodeMock(selectedNodeId, {
                                        endpoints: newEndpoints,
                                      });
                                    }}
                                  >
                                    <Trash size={12} />
                                  </Button>
                                </div>
                                {/* Target Routing Selector */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground uppercase">
                                    Routes to:
                                  </span>
                                  <select
                                    value={ep.targetNodeId || ""}
                                    onChange={(e) => {
                                      const newEndpoints = [
                                        ...(mock?.endpoints || []),
                                      ];
                                      newEndpoints[idx].targetNodeId =
                                        e.target.value || undefined;
                                      updateNodeMock(selectedNodeId, {
                                        endpoints: newEndpoints,
                                      });
                                    }}
                                    className="h-6 flex-1 text-xs rounded-md border border-input bg-background px-2"
                                  >
                                    <option value="">(Broadcast to all)</option>
                                    {connectedTargetNodes.map((node) => (
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
                            <Label className="text-xs uppercase text-muted-foreground">
                              Traffic Simulation
                            </Label>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <Label className="text-xs">
                                Requests Per Second (RPS)
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {mock?.requestsPerSecond || 0} req/s
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={mock?.requestsPerSecond || 0}
                              onChange={(e) =>
                                updateNodeMock(selectedNodeId, {
                                  requestsPerSecond: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              0 = Single request. &gt;0 = Continuous stream.
                            </p>
                          </div>
                          {/* Traffic Source — method / path / payload */}
                          {type === "traffic-source" && (
                            <>
                              <Separator className="my-2" />
                              <div className="space-y-2">
                                <Label className="text-xs uppercase text-muted-foreground">
                                  Request Config
                                </Label>
                                <div className="flex gap-2">
                                  <select
                                    value={(mock as any)?.httpMethod ?? "POST"}
                                    onChange={(e) =>
                                      updateNodeMock(selectedNodeId, { httpMethod: e.target.value } as any)
                                    }
                                    className="h-7 w-[80px] text-xs rounded-md border border-input bg-background px-2 py-1 shrink-0"
                                  >
                                    {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                  <Input
                                    value={(mock as any)?.httpPath ?? "/"}
                                    onChange={(e) =>
                                      updateNodeMock(selectedNodeId, { httpPath: e.target.value } as any)
                                    }
                                    placeholder="/path"
                                    className="h-7 text-xs font-mono flex-1"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Payload (JSON)</Label>
                                  <textarea
                                    value={(mock as any)?.payloadTemplate ?? "{}"}
                                    onChange={(e) =>
                                      updateNodeMock(selectedNodeId, { payloadTemplate: e.target.value } as any)
                                    }
                                    rows={4}
                                    className="w-full text-xs p-2 rounded border border-input bg-background font-mono resize-none"
                                    placeholder='{"key": "value"}'
                                  />
                                  <p className="text-[10px] text-muted-foreground">
                                    Forwarded as HTTP body to API Gateway, or as Lambda event.
                                  </p>
                                </div>
                              </div>
                              <Separator className="my-2" />
                              <TrafficSourceFireSection
                                node={selectedNode}
                                nodes={activeDiagram.nodes}
                                edges={activeDiagram.edges}
                              />
                            </>
                          )}

                          <Separator className="my-2" />

                          <div className="flex items-center justify-between">
                            <Label className="text-xs uppercase text-muted-foreground">
                              Test Requests
                            </Label>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                const newReq = {
                                  id: crypto.randomUUID(),
                                  method: "GET",
                                  path: "/users",
                                };
                                updateNodeMock(selectedNodeId, {
                                  testRequests: [
                                    ...(mock?.testRequests || []),
                                    newReq,
                                  ],
                                });
                              }}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {mock?.testRequests?.map((req, idx) => (
                              <div
                                key={req.id}
                                className="flex gap-2 items-center bg-card p-2 rounded border shadow-sm"
                              >
                                <select
                                  value={req.method}
                                  onChange={(e) => {
                                    const newRequests = [
                                      ...(mock?.testRequests || []),
                                    ];
                                    newRequests[idx].method = e.target.value;
                                    updateNodeMock(selectedNodeId, {
                                      testRequests: newRequests,
                                    });
                                  }}
                                  className="h-7 w-[80px] text-xs rounded-md border border-input bg-background px-2 py-1"
                                >
                                  {["GET", "POST", "PUT", "DELETE"].map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                                <Input
                                  value={req.path}
                                  onChange={(e) => {
                                    const newRequests = [
                                      ...(mock.testRequests || []),
                                    ];
                                    newRequests[idx].path = e.target.value;
                                    updateNodeMock(selectedNodeId, {
                                      testRequests: newRequests,
                                    });
                                  }}
                                  className="h-7 text-xs flex-1"
                                  placeholder="/api/resource"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    const newRequests = (
                                      mock.testRequests || []
                                    ).filter((r) => r.id !== req.id);
                                    updateNodeMock(selectedNodeId, {
                                      testRequests: newRequests,
                                    });
                                  }}
                                >
                                  <Trash size={12} />
                                </Button>
                              </div>
                            ))}
                            {(mock?.testRequests || []).length === 0 && (
                              <div className="text-xs text-muted-foreground italic">
                                No requests defined.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Compute / Generic Config */}
                      <div className="space-y-3">
                        {isPlaying && (
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live — changes take effect instantly
                          </p>
                        )}
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label className="text-xs">Latency (ms)</Label>
                            <span className="text-xs text-muted-foreground">
                              {mock?.latency || 0}ms
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={5000}
                            step={100}
                            value={mock?.latency || 0}
                            onChange={(e) =>
                              updateNodeMock(selectedNodeId, {
                                latency: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label className="text-xs">Failure Rate (%)</Label>
                            <span className="text-xs text-muted-foreground">
                              {mock?.failureRate || 0}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={mock?.failureRate || 0}
                            onChange={(e) =>
                              updateNodeMock(selectedNodeId, {
                                failureRate: parseInt(e.target.value),
                              })
                            }
                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>

                        {isCompute && (
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Response Body (JSON)
                            </Label>
                            <JsonEditor
                              value={mock?.responseBody || ""}
                              onChange={(val) =>
                                updateNodeMock(selectedNodeId, {
                                  responseBody: val,
                                })
                              }
                              placeholder='{"status": "ok"}'
                            />
                          </div>
                        )}
                      </div>

                      {/* Database / Storage Config */}
                      {isDatabase && (
                        <div className="space-y-3">
                          <Separator className="my-2" />
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs uppercase text-muted-foreground">
                                Mock Data (JSON Array)
                              </Label>
                              <span className="text-[10px] text-muted-foreground">
                                Array of objects
                              </span>
                            </div>
                            <JsonEditor
                              value={JSON.stringify(mock?.data || [], null, 2)}
                              onChange={(val) => {
                                try {
                                  const parsed = JSON.parse(val);
                                  if (Array.isArray(parsed)) {
                                    updateNodeMock(selectedNodeId, {
                                      data: parsed,
                                    });
                                  }
                                } catch (e) {
                                  // Allow typing invalid JSON while editing, but maybe don't save or handle gracefully?
                                  // For now, simpler to only update on valid JSON or let JsonEditor handle validation visual
                                  // Actually JsonEditor likely returns string. We need to parse.
                                  // If parse fails, we might rely on the Editor's own validation state if we had access.
                                  // Let's just try parse.
                                }
                              }}
                              placeholder='[{"id": "1", "name": "Item A"}]'
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Simulated queries will return items from this
                              list.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generic Custom Node Styling properties */}
                  {type === "generic" && (
                    <div className="space-y-3 border rounded-lg p-3 bg-muted/20 mt-4">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Settings size={14} /> Appearance
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Background</Label>
                          <Input
                            type="color"
                            value={metadata?.backgroundColor || "#ffffff"}
                            onChange={(e) => {
                              const updateNode =
                                useDiagramStore.getState().updateNode;
                              updateNode(selectedNodeId, {
                                metadata: {
                                  ...metadata,
                                  backgroundColor: e.target.value,
                                },
                              });
                            }}
                            className="h-8 p-1 w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Border</Label>
                          <Input
                            type="color"
                            value={metadata?.borderColor || "#e2e8f0"}
                            onChange={(e) => {
                              const updateNode =
                                useDiagramStore.getState().updateNode;
                              updateNode(selectedNodeId, {
                                metadata: {
                                  ...metadata,
                                  borderColor: e.target.value,
                                },
                              });
                            }}
                            className="h-8 p-1 w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Text Color</Label>
                          <Input
                            type="color"
                            value={metadata?.textColor || "#0f172a"}
                            onChange={(e) => {
                              const updateNode =
                                useDiagramStore.getState().updateNode;
                              updateNode(selectedNodeId, {
                                metadata: {
                                  ...metadata,
                                  textColor: e.target.value,
                                },
                              });
                            }}
                            className="h-8 p-1 w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Icon Color</Label>
                          <Input
                            type="color"
                            value={metadata?.iconColor || "#0f172a"}
                            onChange={(e) => {
                              const updateNode =
                                useDiagramStore.getState().updateNode;
                              updateNode(selectedNodeId, {
                                metadata: {
                                  ...metadata,
                                  iconColor: e.target.value,
                                },
                              });
                            }}
                            className="h-8 p-1 w-full"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <Label className="text-xs">Icon</Label>
                        <select
                          value={metadata?.customIcon || ""}
                          onChange={(e) => {
                            const updateNode =
                              useDiagramStore.getState().updateNode;
                            updateNode(selectedNodeId, {
                              metadata: {
                                ...metadata,
                                customIcon: e.target.value,
                              },
                            });
                          }}
                          className="w-full h-8 mt-1 text-xs rounded-md border border-input bg-background px-2"
                        >
                          <option value="">Default (by Subtype)</option>
                          <option value="activity">Activity</option>
                          <option value="server">Server</option>
                          <option value="cloud">Cloud</option>
                          <option value="database">Database</option>
                          <option value="shield">Shield (Security)</option>
                          <option value="settings">Settings (Gear)</option>
                          <option value="mail">Mail</option>
                          <option value="globe">Globe (Web)</option>
                          <option value="smartphone">Smartphone</option>
                          <option value="monitor">Monitor (Client)</option>
                          <option value="file">File</option>
                          <option value="user">User</option>
                          <option value="cpu">CPU (Compute)</option>
                          <option value="hard-drive">Hard Drive</option>
                          <option value="wifi">WiFi / Connectivity</option>
                          <option value="zap">Zap (Action)</option>
                          <option value="square">Square</option>
                          <option value="circle">Circle</option>
                          <option value="play">Play (Start)</option>
                          <option value="help-circle">Decision (Help)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Universal Appearance — shown for all non-annotation, non-note nodes */}
              {!isAnnotation && !isNote && type !== "generic" && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Settings size={14} /> Appearance
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Fill Color</Label>
                      <Input
                        type="color"
                        value={metadata?.backgroundColor || "#ffffff"}
                        onChange={(e) => {
                          const ids = activeDiagram.nodes
                            .filter((n) => n.selected)
                            .map((n) => n.id);
                          const targets =
                            ids.length > 1 ? ids : [selectedNodeId];
                          batchUpdateNodes(targets, {
                            metadata: { backgroundColor: e.target.value },
                          });
                        }}
                        className="h-8 p-1 w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Border Color</Label>
                      <Input
                        type="color"
                        value={metadata?.borderColor || "#e2e8f0"}
                        onChange={(e) => {
                          const ids = activeDiagram.nodes
                            .filter((n) => n.selected)
                            .map((n) => n.id);
                          const targets =
                            ids.length > 1 ? ids : [selectedNodeId];
                          batchUpdateNodes(targets, {
                            metadata: { borderColor: e.target.value },
                          });
                        }}
                        className="h-8 p-1 w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Text Color</Label>
                      <Input
                        type="color"
                        value={metadata?.textColor || "#0f172a"}
                        onChange={(e) => {
                          const ids = activeDiagram.nodes
                            .filter((n) => n.selected)
                            .map((n) => n.id);
                          const targets =
                            ids.length > 1 ? ids : [selectedNodeId];
                          batchUpdateNodes(targets, {
                            metadata: { textColor: e.target.value },
                          });
                        }}
                        className="h-8 p-1 w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Border Width</Label>
                      <select
                        value={metadata?.borderWidth ?? 2}
                        onChange={(e) => {
                          const ids = activeDiagram.nodes
                            .filter((n) => n.selected)
                            .map((n) => n.id);
                          const targets =
                            ids.length > 1 ? ids : [selectedNodeId];
                          batchUpdateNodes(targets, {
                            metadata: { borderWidth: Number(e.target.value) },
                          });
                        }}
                        className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value={1}>1px</option>
                        <option value={2}>2px (default)</option>
                        <option value={3}>3px</option>
                        <option value={4}>4px</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-xs">Opacity</Label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round((metadata?.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={metadata?.opacity ?? 1}
                      onChange={(e) => {
                        const ids = activeDiagram.nodes
                          .filter((n) => n.selected)
                          .map((n) => n.id);
                        const targets = ids.length > 1 ? ids : [selectedNodeId];
                        batchUpdateNodes(targets, {
                          metadata: { opacity: parseFloat(e.target.value) },
                        });
                      }}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              )}

              {/* Pricing Section - Only for AWS nodes */}
              {service?.toLowerCase().includes("aws") ||
              selectedNode.data.service ? (
                <PricingSection node={selectedNode} />
              ) : null}

              {/* Infrastructure as Code Config — shown for all AWS nodes */}
              {(type.startsWith("aws-") || (selectedNode.data.type ?? "").toString().startsWith("aws-")) && (
                <IaCConfigSection nodeId={selectedNodeId} node={selectedNode} />
              )}

              {/* MiniStack Deploy — shown for all AWS nodes */}
              {(type.startsWith("aws-") || (selectedNode.data.type ?? "").toString().startsWith("aws-")) && (
                <MiniStackSection nodeId={selectedNodeId} node={selectedNode} />
              )}

              {/* Custom Properties */}
              <CustomPropertiesEditor
                nodeId={selectedNodeId}
                metadata={metadata}
              />

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Actions
                </h3>
                {!isFrame && !isAnnotation && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    asChild
                  >
                    <a
                      href={`https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation-guide&searchQuery=${service}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} /> View AWS Documentation
                    </a>
                  </Button>
                )}
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
    const selectedEdge = activeDiagram.edges.find(
      (e) => e.id === selectedEdgeId,
    );
    if (!selectedEdge) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="fixed right-0 md:right-4 top-16 md:top-24 bottom-0 md:bottom-4 w-full md:w-96 bg-card border border-border rounded-none md:rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-start justify-between bg-muted/30">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                Connection
              </div>
              <h2 className="text-xl font-bold text-card-foreground leading-tight">
                {selectedEdge.label || "Untitled Connection"}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-1"
              onClick={() => setSelectedEdge(null)}
            >
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
                    value={(selectedEdge.label as string) || ""}
                    onChange={(e) =>
                      updateEdge(selectedEdgeId, { label: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Text to display on the connection line.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Connector Style */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Settings size={14} /> Connector Style
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Routing</Label>
                    <select
                      value={selectedEdge.data?.edgeType ?? "smoothstep"}
                      onChange={(e) =>
                        updateEdge(selectedEdgeId, { edgeType: e.target.value })
                      }
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="smoothstep">Smooth Step</option>
                      <option value="straight">Straight</option>
                      <option value="step">Step</option>
                      <option value="bezier">Bezier</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="color"
                      value={selectedEdge.data?.strokeColor ?? "#94a3b8"}
                      onChange={(e) =>
                        updateEdge(selectedEdgeId, {
                          strokeColor: e.target.value,
                        })
                      }
                      className="h-8 p-1 w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Width</Label>
                    <select
                      value={selectedEdge.data?.strokeWidth ?? 2}
                      onChange={(e) =>
                        updateEdge(selectedEdgeId, {
                          strokeWidth: Number(e.target.value),
                        })
                      }
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value={1}>1px</option>
                      <option value={2}>2px</option>
                      <option value={3}>3px</option>
                      <option value={4}>4px</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Switch
                      checked={selectedEdge.data?.dashed ?? false}
                      onCheckedChange={(v) =>
                        updateEdge(selectedEdgeId, { dashed: v })
                      }
                    />
                    <Label className="text-xs">Dashed</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Simulation Action Configuration */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <PlayCircle size={14} /> Simulation Action
                </h3>
                <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
                  <div className="space-y-1">
                    <Label className="text-xs">Action Type</Label>
                    <select
                      value={selectedEdge.data?.simulationAction?.type || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const currentAction =
                          selectedEdge.data?.simulationAction || {};
                        if (!val) {
                          const { simulationAction, ...rest } =
                            selectedEdge.data || {};
                          updateEdge(selectedEdgeId, rest);
                        } else {
                          updateEdge(selectedEdgeId, {
                            simulationAction: { ...currentAction, type: val },
                          });
                        }
                      }}
                      className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                    >
                      <option value="">(None - Pass Through)</option>
                      <option value="read">Read / Fetch Data</option>
                      <option value="write">Write / Update Data</option>
                      <option value="trigger">Trigger / Invoke</option>
                    </select>
                  </div>

                  {selectedEdge.data?.simulationAction?.type && (
                    <div className="space-y-1">
                      <Label className="text-xs">Query / Payload Filter</Label>
                      <Input
                        value={selectedEdge.data?.simulationAction?.query || ""}
                        onChange={(e) => {
                          const currentAction =
                            selectedEdge.data?.simulationAction || {};
                          updateEdge(selectedEdgeId, {
                            simulationAction: {
                              ...currentAction,
                              query: e.target.value,
                            },
                          });
                        }}
                        placeholder={
                          selectedEdge.data.simulationAction.type === "read"
                            ? "e.g. GetItem { id: payload.userId }"
                            : selectedEdge.data.simulationAction.type ===
                                "write"
                              ? "e.g. PutItem { ...payload }"
                              : "e.g. Invoke Function"
                        }
                        className="h-8 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Describes the intent of this connection during
                        simulation.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground uppercase block mb-1">
                    Source
                  </span>
                  <span className="font-mono text-xs">
                    {selectedEdge.source}
                  </span>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <span className="text-xs text-muted-foreground uppercase block mb-1">
                    Target
                  </span>
                  <span className="font-mono text-xs">
                    {selectedEdge.target}
                  </span>
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
