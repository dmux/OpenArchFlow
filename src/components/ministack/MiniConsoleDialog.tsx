"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { S3Console } from "./consoles/S3Console";
import { SQSConsole } from "./consoles/SQSConsole";
import { DynamoDBConsole } from "./consoles/DynamoDBConsole";
import { LambdaConsole } from "./consoles/LambdaConsole";
import { SNSConsole } from "./consoles/SNSConsole";
import { CloudWatchConsole } from "./consoles/CloudWatchConsole";
import { EventBridgeConsole } from "./consoles/EventBridgeConsole";
import { APIGatewayConsole } from "./consoles/APIGatewayConsole";

export interface MiniConsoleProps {
  config: MiniStackConfig;
  resourceId: string;
  resourceArn?: string;
  endpoint?: string;
}

const SERVICE_ICON: Record<string, string> = {
  s3: "🪣",
  sqs: "📨",
  dynamodb: "🗄️",
  lambda: "λ",
  sns: "📢",
  cloudwatch: "📊",
  eventbridge: "⚡",
  apigateway: "🌐",
  "api-gateway": "🌐",
};

const SERVICE_LABEL: Record<string, string> = {
  s3: "S3 Bucket",
  sqs: "SQS Queue",
  dynamodb: "DynamoDB Table",
  lambda: "Lambda Function",
  sns: "SNS Topic",
  cloudwatch: "CloudWatch Logs",
  eventbridge: "EventBridge Bus",
  apigateway: "API Gateway",
  "api-gateway": "API Gateway",
};

function ConsoleBody({
  service,
  props,
}: {
  service: string;
  props: MiniConsoleProps;
}) {
  const svc = service.toLowerCase();
  if (svc === "s3") return <S3Console {...props} />;
  if (svc === "sqs") return <SQSConsole {...props} />;
  if (svc === "dynamodb") return <DynamoDBConsole {...props} />;
  if (svc === "lambda") return <LambdaConsole {...props} />;
  if (svc === "sns") return <SNSConsole {...props} />;
  if (svc === "cloudwatch" || svc === "cloudwatchlogs") return <CloudWatchConsole config={props.config} />;
  if (svc === "eventbridge") return <EventBridgeConsole {...props} />;
  if (svc === "apigateway" || svc === "api-gateway") return <APIGatewayConsole {...props} />;
  return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Console not available for {service}
    </div>
  );
}

interface MiniConsoleDialogProps {
  open: boolean;
  onClose: () => void;
  service: string;
  nodeLabel: string;
  config: MiniStackConfig;
  resourceId: string;
  resourceArn?: string;
  endpoint?: string;
}

export function MiniConsoleDialog({
  open,
  onClose,
  service,
  nodeLabel,
  config,
  resourceId,
  resourceArn,
  endpoint,
}: MiniConsoleDialogProps) {
  const svc = service.toLowerCase();
  const icon = SERVICE_ICON[svc] ?? "⚡";
  const label = SERVICE_LABEL[svc] ?? service.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent aria-describedby={undefined} className={cn("h-[80vh] flex flex-col p-0 gap-0", svc === "lambda" ? "max-w-3xl" : "max-w-2xl")}>
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span>{icon}</span>
            <div>
              <span className="font-semibold">{nodeLabel}</span>
              <span className="text-muted-foreground font-normal ml-2 text-xs">— {label}</span>
            </div>
          </DialogTitle>
          {resourceId && (
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{resourceId}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-4">
          <ConsoleBody
            service={service}
            props={{ config, resourceId, resourceArn, endpoint }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
