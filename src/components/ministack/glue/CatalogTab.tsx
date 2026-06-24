"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Database, Plus, RefreshCw, Loader2, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MiniStackConfig } from "@/lib/ministack/types";
import {
  glueListDatabases, glueCreateDatabase, glueDeleteDatabase, sanitizeGlueName,
  type GlueDatabaseInfo,
} from "@/lib/ministack/glue-actions";

interface CatalogTabProps {
  config: MiniStackConfig;
  activeDatabase: string;
  onSelectDatabase: (name: string) => void;
}

export function CatalogTab({ config, activeDatabase, onSelectDatabase }: CatalogTabProps) {
  const [databases, setDatabases] = useState<GlueDatabaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDatabases(await glueListDatabases(config));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list databases");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const name = sanitizeGlueName(newName.trim());
    if (!newName.trim()) { toast.error("Enter a database name"); return; }
    setCreating(true);
    try {
      await glueCreateDatabase(config, name, "Created from OpenArchFlow Glue Studio");
      toast.success(`Database "${name}" created`);
      setNewName("");
      onSelectDatabase(name);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await glueDeleteDatabase(config, name);
      toast.success(`Database "${name}" deleted`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" /> Data Catalog databases
        </p>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          placeholder="new_database_name"
          className="h-8 flex-1 text-xs rounded border border-border bg-background px-2 font-mono"
        />
        <Button size="sm" onClick={handleCreate} disabled={creating} className="h-8 gap-1.5 text-xs">
          {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Create
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 rounded border border-border">
        <div className="p-1.5 space-y-1">
          {databases.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-6">
              {loading ? "Loading…" : "No databases yet — create one above."}
            </p>
          )}
          {databases.map((db) => {
            const active = db.name === activeDatabase;
            return (
              <div
                key={db.name}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 cursor-pointer border transition-colors",
                  active ? "border-purple-500/50 bg-purple-500/10" : "border-transparent hover:bg-accent",
                )}
                onClick={() => onSelectDatabase(db.name)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono font-medium truncate flex items-center gap-1.5">
                    {active && <Check className="w-3 h-3 text-purple-500 shrink-0" />}
                    {db.name}
                  </p>
                  {db.description && (
                    <p className="text-[10px] text-muted-foreground truncate">{db.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(db.name); }}
                  className="text-muted-foreground hover:text-destructive shrink-0 p-1"
                  title="Delete database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
