"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Table2, Plus, RefreshCw, Loader2, Trash2, Save, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MiniStackConfig } from "@/lib/ministack/types";
import {
  glueGetTables, glueCreateTable, glueUpdateTable, glueDeleteTable, sanitizeGlueName,
  type GlueTableInfo, type GlueColumn, type GlueClassification,
} from "@/lib/ministack/glue-actions";

const COLUMN_TYPES = ["string", "int", "bigint", "double", "float", "boolean", "timestamp", "date", "array<string>", "struct<>"];
const CLASSIFICATIONS: GlueClassification[] = ["parquet", "json", "csv"];

interface TablesTabProps {
  config: MiniStackConfig;
  databaseName: string;
}

function emptyTable(): GlueTableInfo {
  return { name: "", columns: [{ name: "id", type: "string" }], partitionKeys: [], classification: "parquet", location: "" };
}

function ColumnRows({
  columns, onChange, label,
}: {
  columns: GlueColumn[];
  onChange: (cols: GlueColumn[]) => void;
  label: string;
}) {
  const update = (i: number, patch: Partial<GlueColumn>) =>
    onChange(columns.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</label>
        <button onClick={() => onChange([...columns, { name: "", type: "string" }])} className="text-[10px] text-purple-500 hover:underline">
          + Add column
        </button>
      </div>
      {columns.length === 0 && <p className="text-[10px] text-muted-foreground italic">None.</p>}
      {columns.map((col, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input
            value={col.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="column_name"
            className="h-7 flex-1 text-xs rounded border border-border bg-background px-2 font-mono"
          />
          <select
            value={COLUMN_TYPES.includes(col.type) ? col.type : "string"}
            onChange={(e) => update(i, { type: e.target.value })}
            className="h-7 w-28 text-xs rounded border border-border bg-background px-1"
          >
            {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            value={col.comment ?? ""}
            onChange={(e) => update(i, { comment: e.target.value })}
            placeholder="comment"
            className="h-7 w-24 text-xs rounded border border-border bg-background px-2"
          />
          <button onClick={() => onChange(columns.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive shrink-0 px-1 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}

export function TablesTab({ config, databaseName }: TablesTabProps) {
  const [tables, setTables] = useState<GlueTableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<GlueTableInfo | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!databaseName) return;
    setLoading(true);
    try {
      setTables(await glueGetTables(config, databaseName));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to list tables");
    } finally {
      setLoading(false);
    }
  }, [config, databaseName]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editing) return;
    const table: GlueTableInfo = { ...editing, name: sanitizeGlueName(editing.name) };
    if (!editing.name.trim()) { toast.error("Enter a table name"); return; }
    setSaving(true);
    try {
      if (isNew) await glueCreateTable(config, databaseName, table);
      else await glueUpdateTable(config, databaseName, table);
      toast.success(`Table "${table.name}" saved`);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await glueDeleteTable(config, databaseName, name);
      toast.success(`Table "${name}" deleted`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (!databaseName) {
    return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Select a database in the Catalog tab first.</div>;
  }

  if (editing) {
    return (
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center justify-between shrink-0">
          <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 gap-1.5 text-xs">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {isNew ? "Create table" : "Update table"}
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-3 pr-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Table name</label>
                <input
                  value={editing.name}
                  disabled={!isNew}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="my_table"
                  className="h-7 w-full text-xs rounded border border-border bg-background px-2 font-mono disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Format</label>
                <select
                  value={editing.classification ?? "parquet"}
                  onChange={(e) => setEditing({ ...editing, classification: e.target.value as GlueClassification })}
                  className="h-7 w-full text-xs rounded border border-border bg-background px-1"
                >
                  {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">S3 location</label>
              <input
                value={editing.location ?? ""}
                onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                placeholder="s3://bucket/prefix/"
                className="h-7 w-full text-xs rounded border border-border bg-background px-2 font-mono"
              />
            </div>
            <ColumnRows label="Columns" columns={editing.columns} onChange={(cols) => setEditing({ ...editing, columns: cols })} />
            <ColumnRows label="Partition keys" columns={editing.partitionKeys} onChange={(cols) => setEditing({ ...editing, partitionKeys: cols })} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Table2 className="w-3.5 h-3.5" /> Tables in <span className="font-mono">{databaseName}</span>
        </p>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 gap-1 text-xs">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditing(emptyTable()); setIsNew(true); }} className="h-7 gap-1.5 text-xs">
            <Plus className="w-3 h-3" /> New table
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0 rounded border border-border">
        <div className="p-1.5 space-y-1">
          {tables.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-6">
              {loading ? "Loading…" : "No tables yet — create one."}
            </p>
          )}
          {tables.map((t) => (
            <div key={t.name} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-accent">
              <button className="min-w-0 text-left" onClick={() => { setEditing({ ...t, partitionKeys: t.partitionKeys ?? [] }); setIsNew(false); }}>
                <p className="text-xs font-mono font-medium truncate">{t.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {t.columns.length} cols · {t.partitionKeys.length} partitions · {t.classification ?? "parquet"}
                </p>
              </button>
              <button onClick={() => handleDelete(t.name)} className="text-muted-foreground hover:text-destructive shrink-0 p-1" title="Delete table">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
