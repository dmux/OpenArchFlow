"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { getServiceIcon } from "@/lib/registry";
import { useDiagramStore } from "@/lib/store";
import { Search, X } from "lucide-react";

const COMMON_NODES = [
  { label: "Lambda",         service: "lambda",          type: "aws-compute",     provider: "aws" },
  { label: "EC2",            service: "ec2",             type: "aws-compute",     provider: "aws" },
  { label: "ECS",            service: "ecs",             type: "aws-compute",     provider: "aws" },
  { label: "API Gateway",    service: "apigateway",      type: "aws-network",     provider: "aws" },
  { label: "RDS",            service: "rds",             type: "aws-database",    provider: "aws" },
  { label: "DynamoDB",       service: "dynamodb",        type: "aws-database",    provider: "aws" },
  { label: "S3",             service: "s3",              type: "aws-storage",     provider: "aws" },
  { label: "SQS",            service: "sqs",             type: "aws-integration", provider: "aws" },
  { label: "SNS",            service: "sns",             type: "aws-integration", provider: "aws" },
  { label: "ElastiCache",    service: "elasticache",     type: "aws-database",    provider: "aws" },
  { label: "CloudFront",     service: "cloudfront",      type: "aws-network",     provider: "aws" },
  { label: "ELB",            service: "elb",             type: "aws-network",     provider: "aws" },
  { label: "Step Functions", service: "stepfunctions",   type: "aws-integration", provider: "aws" },
  { label: "EKS",            service: "eks",             type: "aws-compute",     provider: "aws" },
  { label: "Fargate",        service: "fargate",         type: "aws-compute",     provider: "aws" },
  { label: "Cognito",        service: "cognito",         type: "aws-security",    provider: "aws" },
  { label: "Secrets Manager",service: "secretsmanager",  type: "aws-security",    provider: "aws" },
  { label: "EventBridge",    service: "eventbridge",     type: "aws-integration", provider: "aws" },
  { label: "Kinesis",        service: "kinesis",         type: "aws-analytics",   provider: "aws" },
  { label: "OpenSearch",     service: "opensearch",      type: "aws-analytics",   provider: "aws" },
  { label: "Client",         service: "Client",          type: "client",          provider: "generic" },
  { label: "Service",        service: "Service",         type: "generic",         provider: "generic" },
];

interface Props {
  sourceNodeId: string;
  direction: "top" | "bottom" | "left" | "right";
  anchorX: number;
  anchorY: number;
  onClose: () => void;
}

export function QuickAddPanel({ sourceNodeId, direction, anchorX, anchorY, onClose }: Props) {
  const addConnectedNode = useDiagramStore((s) => s.addConnectedNode);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const filtered = query.trim()
    ? COMMON_NODES.filter(
        (n) =>
          n.label.toLowerCase().includes(query.toLowerCase()) ||
          n.service.toLowerCase().includes(query.toLowerCase()),
      )
    : COMMON_NODES;

  const handleSelect = (node: typeof COMMON_NODES[number]) => {
    addConnectedNode(sourceNodeId, direction, node.service, node.label, node.type, node.provider);
    onClose();
  };

  // Position panel near anchor point, shifted based on direction
  const PANEL_W = 240;
  const PANEL_H = 320;
  const OFFSET = 10;
  let left = anchorX;
  let top = anchorY;

  if (direction === "right")  { left = anchorX + OFFSET;  top = anchorY - PANEL_H / 2; }
  if (direction === "left")   { left = anchorX - PANEL_W - OFFSET; top = anchorY - PANEL_H / 2; }
  if (direction === "bottom") { left = anchorX - PANEL_W / 2; top = anchorY + OFFSET; }
  if (direction === "top")    { left = anchorX - PANEL_W / 2; top = anchorY - PANEL_H - OFFSET; }

  // Keep within viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  left = Math.max(8, Math.min(left, vw - PANEL_W - 8));
  top  = Math.max(8, Math.min(top,  vh - PANEL_H - 8));

  const content = (
    <div
      ref={panelRef}
      className="fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={{ left, top, width: PANEL_W, maxHeight: PANEL_H }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border">
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search service…"
          className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Node grid */}
      <div className="overflow-y-auto p-2 grid grid-cols-3 gap-1">
        {filtered.map((node) => {
          const Icon = getServiceIcon(node.provider, node.service, node.type);
          return (
            <button
              key={`${node.provider}-${node.service}`}
              onClick={() => handleSelect(node)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all",
                "hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20",
                "text-muted-foreground focus:outline-none focus:bg-primary/10",
              )}
            >
              <Icon size={22} className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <span className="text-[10px] leading-tight font-medium break-words w-full">{node.label}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 py-4 text-center text-xs text-muted-foreground">No results</div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
