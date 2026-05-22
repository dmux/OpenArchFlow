"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CloudDownload,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw,
} from "lucide-react";
import { useDiagramStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import { convertResourcesToNodesAndEdges } from "@/lib/import/aws-infra";
import type { DiscoveredService, DiscoveredResource, DiscoveredEdge } from "@/lib/aws/discovery";
import { getServiceIcon } from "@/lib/registry";
import { BedrockAuthDialog } from "@/components/layout/BedrockAuthDialog";

type DiscoveryTab = "ministack" | "aws";
type DialogPhase = "configure" | "discovering" | "results" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AWS_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "sa-east-1",
];

export function InfraDiscoveryDialog({ open, onClose }: Props) {
  const ministackConfig = useDiagramStore((s) => s.ministackConfig);
  const bedrockConfig = useDiagramStore((s) => s.bedrockConfig);
  const existingNodes = useDiagramStore(
    useShallow((s) => (s.activeDiagramId ? (s.diagrams[s.activeDiagramId]?.nodes ?? []) : []))
  );
  const existingEdges = useDiagramStore(
    useShallow((s) => (s.activeDiagramId ? (s.diagrams[s.activeDiagramId]?.edges ?? []) : []))
  );
  const setNodes = useDiagramStore((s) => s.setNodes);
  const setEdges = useDiagramStore((s) => s.setEdges);

  const [tab, setTab] = useState<DiscoveryTab>("ministack");
  const [phase, setPhase] = useState<DialogPhase>("configure");
  const [errorMsg, setErrorMsg] = useState("");
  const [showBedrockAuth, setShowBedrockAuth] = useState(false);

  // AWS credentials state
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsSessionToken, setAwsSessionToken] = useState("");

  // Results state
  const [services, setServices] = useState<DiscoveredService[]>([]);
  const [discoveredEdges, setDiscoveredEdges] = useState<DiscoveredEdge[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const reset = useCallback(() => {
    setPhase("configure");
    setErrorMsg("");
    setServices([]);
    setDiscoveredEdges([]);
    setSelectedIds(new Set());
    setExpandedServices(new Set());
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const fillBedrockCreds = useCallback(() => {
    if (!bedrockConfig) return;
    setAwsRegion(bedrockConfig.region ?? "us-east-1");
    setAwsAccessKey(bedrockConfig.credentials.accessKeyId ?? "");
    setAwsSecretKey(bedrockConfig.credentials.secretAccessKey ?? "");
    setAwsSessionToken(bedrockConfig.credentials.sessionToken ?? "");
  }, [bedrockConfig]);

  const discover = useCallback(async () => {
    setPhase("discovering");
    setErrorMsg("");

    const body =
      tab === "ministack"
        ? {
            source: "ministack",
            region: ministackConfig.region,
            endpoint: ministackConfig.endpoint,
          }
        : {
            source: "aws",
            region: awsRegion,
            credentials: {
              accessKeyId: awsAccessKey,
              secretAccessKey: awsSecretKey,
              ...(awsSessionToken ? { sessionToken: awsSessionToken } : {}),
            },
          };

    try {
      const res = await fetch("/api/aws/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? res.statusText);
      }

      const data = await res.json();
      const discovered: DiscoveredService[] = data.services ?? [];
      const edges: DiscoveredEdge[] = data.edges ?? [];

      setServices(discovered);
      setDiscoveredEdges(edges);
      // Pre-select all successfully discovered resources
      const allIds = new Set<string>(
        discovered.flatMap((s) => s.resources.map((r) => r.id))
      );
      setSelectedIds(allIds);
      // Expand services that have resources
      setExpandedServices(
        new Set(discovered.filter((s) => s.resources.length > 0).map((s) => s.service))
      );
      setPhase("results");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isConnRefused =
        message.toLowerCase().includes("econnrefused") ||
        message.toLowerCase().includes("fetch failed") ||
        message.toLowerCase().includes("failed to fetch");

      setErrorMsg(
        isConnRefused && tab === "ministack"
          ? "MiniStack is not running. Start it from the Deploy & Simulate panel."
          : message
      );
      setPhase("error");
    }
  }, [tab, ministackConfig, awsRegion, awsAccessKey, awsSecretKey, awsSessionToken]);

  const toggleResource = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleService = useCallback(
    (svc: DiscoveredService) => {
      const ids = svc.resources.map((r) => r.id);
      const allSelected = ids.every((id) => selectedIds.has(id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (allSelected) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        return next;
      });
    },
    [selectedIds]
  );

  const toggleExpand = useCallback((service: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  }, []);

  const importSelected = useCallback(() => {
    const selectedResources: DiscoveredResource[] = services.flatMap((s) =>
      s.resources.filter((r) => selectedIds.has(r.id))
    );

    if (selectedResources.length === 0) {
      toast.warning("No resources selected.");
      return;
    }

    const originX =
      existingNodes.length > 0
        ? Math.max(...existingNodes.map((n: { position: { x: number } }) => n.position.x + 220)) + 60
        : 100;
    const originY =
      existingNodes.length > 0
        ? Math.min(...existingNodes.map((n: { position: { y: number } }) => n.position.y))
        : 100;

    // Only include edges whose both endpoints are among the selected resources
    const selectedResourceIds = new Set(selectedResources.map((r) => r.id));
    const relevantEdges = discoveredEdges.filter(
      (e) => selectedResourceIds.has(e.sourceId) && selectedResourceIds.has(e.targetId)
    );

    const { nodes: newNodes, edges: newEdges } = convertResourcesToNodesAndEdges(
      selectedResources,
      relevantEdges,
      { originX, originY }
    );

    setNodes([...existingNodes, ...newNodes]);
    setEdges([...existingEdges, ...newEdges]);

    const edgeMsg = newEdges.length > 0 ? ` and ${newEdges.length} connection(s)` : "";
    toast.success(`${newNodes.length} resource(s)${edgeMsg} imported into the diagram.`);
    handleClose();
  }, [services, discoveredEdges, selectedIds, existingNodes, existingEdges, setNodes, setEdges, handleClose]);

  const selectedCount = selectedIds.size;
  const totalCount = services.reduce((acc, s) => acc + s.resources.length, 0);
  const partialErrors = services.filter((s) => s.error);
  const relevantEdgeCount = discoveredEdges.filter(
    (e) => selectedIds.has(e.sourceId) && selectedIds.has(e.targetId)
  ).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <CloudDownload className="h-4 w-4 text-orange-500" />
            Import from AWS
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border px-6">
          <button
            onClick={() => { setTab("ministack"); reset(); }}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === "ministack"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            MiniStack (Local)
          </button>
          <button
            onClick={() => { setTab("aws"); reset(); }}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === "aws"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            AWS Account
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Configure phase */}
          {phase === "configure" && (
            <div className="flex-1 px-6 py-5 space-y-4">
              {tab === "ministack" && (
                <>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Endpoint</Label>
                        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                          {ministackConfig.endpoint}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Region</Label>
                        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                          {ministackConfig.region}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Using MiniStack settings. To change the endpoint, use the Deploy &amp; Simulate panel.
                    </p>
                  </div>
                  <Button onClick={discover} className="w-full">
                    <CloudDownload className="h-4 w-4 mr-2" />
                    Discover Resources
                  </Button>
                </>
              )}

              {tab === "aws" && (
                <>
                  <div className="space-y-3">
                    {/* SSO login option */}
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-2">
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Login with AWS SSO</p>
                      {bedrockConfig ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <p className="text-xs text-muted-foreground flex-1">
                            Signed in as <span className="font-medium">{bedrockConfig.accountName} / {bedrockConfig.roleName}</span>
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fillBedrockCreds}
                            className="text-xs h-7 border-orange-500/40 text-orange-600 hover:bg-orange-500/10 shrink-0"
                          >
                            Use credentials
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            Authenticate via AWS IAM Identity Center to auto-fill credentials.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowBedrockAuth(true)}
                            className="w-full text-xs border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
                          >
                            Login with AWS SSO
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="relative flex items-center gap-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or enter keys manually</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="aws-region" className="text-sm">Region</Label>
                      <Input
                        id="aws-region"
                        list="aws-regions-list"
                        value={awsRegion}
                        onChange={(e) => setAwsRegion(e.target.value)}
                        placeholder="us-east-1"
                      />
                      <datalist id="aws-regions-list">
                        {AWS_REGIONS.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="aws-access-key" className="text-sm">Access Key ID</Label>
                      <Input
                        id="aws-access-key"
                        value={awsAccessKey}
                        onChange={(e) => setAwsAccessKey(e.target.value)}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="aws-secret-key" className="text-sm">Secret Access Key</Label>
                      <Input
                        id="aws-secret-key"
                        type="password"
                        value={awsSecretKey}
                        onChange={(e) => setAwsSecretKey(e.target.value)}
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="aws-session-token" className="text-sm">
                        Session Token{" "}
                        <span className="text-muted-foreground font-normal">(optional, for SSO)</span>
                      </Label>
                      <Input
                        id="aws-session-token"
                        type="password"
                        value={awsSessionToken}
                        onChange={(e) => setAwsSessionToken(e.target.value)}
                        placeholder="Temporary session token"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={discover}
                    disabled={!awsAccessKey || !awsSecretKey || !awsRegion}
                    className="w-full"
                  >
                    <CloudDownload className="h-4 w-4 mr-2" />
                    Discover Resources
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Discovering phase */}
          {phase === "discovering" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Scanning resources across 24 AWS services...
              </p>
            </div>
          )}

          {/* Results phase */}
          {phase === "results" && (
            <>
              {/* Partial error banner */}
              {partialErrors.length > 0 && (
                <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {partialErrors.length} service(s) returned errors (no permission or not supported). Others were scanned successfully.
                  </span>
                </div>
              )}

              {/* Select all / none controls */}
              <div className="flex items-center justify-between px-6 pt-3 pb-2">
                <span className="text-xs text-muted-foreground">
                  {totalCount} resource(s) found
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSelectedIds(
                        new Set(services.flatMap((s) => s.resources.map((r) => r.id)))
                      )
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground text-xs">·</span>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1 px-6 pb-2">
                <div className="space-y-1 pb-2">
                  {services.map((svc) => (
                    <ServiceSection
                      key={svc.service}
                      svc={svc}
                      selectedIds={selectedIds}
                      expanded={expandedServices.has(svc.service)}
                      onToggleExpand={() => toggleExpand(svc.service)}
                      onToggleService={() => toggleService(svc)}
                      onToggleResource={toggleResource}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={importSelected} disabled={selectedCount === 0}>
                  <CloudDownload className="h-4 w-4 mr-2" />
                  Import{selectedCount > 0
                    ? ` ${selectedCount} resource(s)${relevantEdgeCount > 0 ? ` + ${relevantEdgeCount} connection(s)` : ""}`
                    : ""}
                </Button>
              </div>
            </>
          )}

          {/* Error phase */}
          {phase === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Failed to fetch infrastructure</p>
                <p className="text-xs text-muted-foreground max-w-sm">{errorMsg}</p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Try again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      <BedrockAuthDialog
        open={showBedrockAuth}
        onClose={() => setShowBedrockAuth(false)}
        onSuccess={() => {
          setShowBedrockAuth(false);
          // Auto-fill credentials from the newly configured Bedrock session
          const cfg = useDiagramStore.getState().bedrockConfig;
          if (cfg) {
            setAwsRegion(cfg.region ?? "us-east-1");
            setAwsAccessKey(cfg.credentials.accessKeyId ?? "");
            setAwsSecretKey(cfg.credentials.secretAccessKey ?? "");
            setAwsSessionToken(cfg.credentials.sessionToken ?? "");
          }
        }}
      />
    </Dialog>
  );
}

interface ServiceSectionProps {
  svc: DiscoveredService;
  selectedIds: Set<string>;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleService: () => void;
  onToggleResource: (id: string) => void;
}

function ServiceSection({
  svc,
  selectedIds,
  expanded,
  onToggleExpand,
  onToggleService,
  onToggleResource,
}: ServiceSectionProps) {
  const allSelected =
    svc.resources.length > 0 && svc.resources.every((r) => selectedIds.has(r.id));
  const someSelected = svc.resources.some((r) => selectedIds.has(r.id));
  const hasResources = svc.resources.length > 0;

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Service header */}
      <button
        onClick={hasResources ? onToggleExpand : undefined}
        disabled={!hasResources}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm bg-muted/40 hover:bg-muted/70 transition-colors",
          !hasResources && "cursor-default opacity-60"
        )}
      >
        {/* Checkbox */}
        {hasResources && (
          <div
            role="checkbox"
            aria-checked={allSelected ? true : someSelected ? "mixed" : false}
            onClick={(e) => {
              e.stopPropagation();
              onToggleService();
            }}
            className={cn(
              "h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors",
              allSelected
                ? "bg-primary border-primary"
                : someSelected
                ? "bg-primary/30 border-primary"
                : "border-border bg-background"
            )}
          >
            {allSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            {!allSelected && someSelected && (
              <div className="h-1.5 w-1.5 rounded-sm bg-primary" />
            )}
          </div>
        )}
        {!hasResources && <div className="h-4 w-4 shrink-0" />}

        <span className="font-medium flex-1 text-left">{svc.label}</span>

        {svc.error ? (
          <span className="text-xs text-yellow-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            No access
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{svc.resources.length}</span>
        )}

        {hasResources &&
          (expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ))}
      </button>

      {/* Resources list */}
      {expanded && hasResources && (
        <div className="divide-y divide-border">
          {svc.resources.map((resource) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              selected={selectedIds.has(resource.id)}
              onToggle={() => onToggleResource(resource.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ResourceRowProps {
  resource: DiscoveredResource;
  selected: boolean;
  onToggle: () => void;
}

function ResourceRow({ resource, selected, onToggle }: ResourceRowProps) {
  let Icon: React.ComponentType<{ className?: string }> | null = null;
  try {
    const ic = getServiceIcon("aws", resource.service, "");
    Icon = ic as React.ComponentType<{ className?: string }>;
  } catch {
    // no icon available
  }

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors text-left"
    >
      <div
        className={cn(
          "h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors",
          selected ? "bg-primary border-primary" : "border-border bg-background"
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>

      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}

      <span className="flex-1 truncate font-mono text-xs">{resource.name}</span>

      {resource.arn && (
        <span className="text-xs text-muted-foreground truncate max-w-[160px] hidden sm:block">
          {resource.arn.split(":").slice(-1)[0] || resource.arn}
        </span>
      )}

      {resource.metadata?.runtime != null && (
        <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded shrink-0">
          {String(resource.metadata.runtime)}
        </span>
      )}
    </button>
  );
}
