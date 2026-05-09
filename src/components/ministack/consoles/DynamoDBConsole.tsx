"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { dynamoScan, dynamoPutItem, type DynamoTableInfo } from "@/lib/ministack/browser-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DynamoDBConsole({ config, resourceId }: { config: MiniStackConfig; resourceId: string }) {
  const [tableInfo, setTableInfo] = useState<DynamoTableInfo | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState('{"id": {"S": "item-1"}, "data": {"S": "hello"}}');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dynamoScan(config, resourceId);
      setTableInfo(data.table);
      setItems(data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to scan table");
    } finally {
      setLoading(false);
    }
  }, [config, resourceId]);

  useEffect(() => { load(); }, [load]);

  const handlePutItem = async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(newItem); } catch { toast.error("Invalid JSON"); return; }
    setAdding(true);
    try {
      await dynamoPutItem(config, resourceId, parsed as Record<string, unknown>);
      toast.success("Item added");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Put item failed");
    } finally {
      setAdding(false);
    }
  };

  const hashKey = tableInfo?.keySchema?.find((k) => k.KeyType === "HASH")?.AttributeName ?? "id";

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-mono">{resourceId}</span>
          {tableInfo?.status && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
              tableInfo.status === "ACTIVE" ? "bg-green-500/15 text-green-600" : "bg-yellow-500/15 text-yellow-600"
            )}>
              {tableInfo.status}
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {tableInfo && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-lg font-bold">{tableInfo.itemCount}</p>
            <p className="text-[10px] text-muted-foreground">Items</p>
          </div>
          <div className="rounded-lg border border-border p-2 text-center">
            <p className="text-sm font-mono font-bold">{hashKey}</p>
            <p className="text-[10px] text-muted-foreground">Hash Key</p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 rounded-lg border border-border">
        <div className="p-2 space-y-1.5">
          {items.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground text-center py-6">Table is empty</p>
          )}
          {items.map((item, i) => (
            <div key={i} className="p-2 rounded bg-muted/40 hover:bg-accent/50">
              <pre className="text-[10px] font-mono whitespace-pre-wrap break-all line-clamp-4">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs font-medium">Put item (DynamoDB JSON format)</p>
        <textarea
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="w-full text-xs h-16 p-2 rounded border border-border bg-background resize-none font-mono"
        />
        <Button size="sm" onClick={handlePutItem} disabled={adding} className="gap-1.5 text-xs">
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Put Item
        </Button>
      </div>
    </div>
  );
}
