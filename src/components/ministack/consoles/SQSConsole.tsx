"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Send, Trash2, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { sqsGetQueue, sqsSendMessage, sqsDeleteMessage } from "@/lib/ministack/browser-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SQSMessage { messageId: string; body: string; receiptHandle: string }
interface QueueAttrs { ApproximateNumberOfMessages?: string; VisibilityTimeout?: string; QueueArn?: string }

export function SQSConsole({
  config,
  resourceId,
  endpoint,
}: {
  config: MiniStackConfig;
  resourceId: string;
  endpoint?: string;
}) {
  const queueUrl = endpoint ?? `${config.endpoint}/000000000000/${resourceId}`;
  const [attrs, setAttrs] = useState<QueueAttrs>({});
  const [messages, setMessages] = useState<SQSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageBody, setMessageBody] = useState('{"message": "hello from MiniStack"}');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sqsGetQueue(config, resourceId, queueUrl);
      setAttrs(data.attributes as QueueAttrs);
      setMessages(data.messages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read queue");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId, queueUrl]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    setSending(true);
    try {
      const messageId = await sqsSendMessage(config, queueUrl, messageBody);
      toast.success(`Message sent: ${messageId}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (receiptHandle: string) => {
    try {
      await sqsDeleteMessage(config, queueUrl, receiptHandle);
      toast.success("Message deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono truncate">{queueUrl}</span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs shrink-0">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Approx. Messages", value: attrs.ApproximateNumberOfMessages ?? "—" },
          { label: "Visibility Timeout", value: attrs.VisibilityTimeout ? `${attrs.VisibilityTimeout}s` : "—" },
          { label: "Status", value: "Active" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border p-2 text-center">
            <p className="text-lg font-bold">{item.value}</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-border">
        <div className="p-2 space-y-1.5">
          {messages.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-6">No messages visible</p>
          )}
          {messages.map((msg) => (
            <div key={msg.messageId} className="group flex items-start gap-2 p-2 rounded bg-muted/40 hover:bg-accent/50">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground mb-0.5 font-mono">{msg.messageId}</p>
                <p className="text-xs font-mono break-all line-clamp-3">{msg.body}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => handleDelete(msg.receiptHandle)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium">Send message</p>
        <textarea
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          className="w-full text-xs h-16 p-2 rounded border border-border bg-background resize-none font-mono"
        />
        <Button size="sm" onClick={handleSend} disabled={sending} className="gap-1.5 text-xs">
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Send
        </Button>
      </div>
    </div>
  );
}
