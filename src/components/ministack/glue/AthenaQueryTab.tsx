"use client";

import React, { useState, useEffect, useRef } from "react";
import Editor, { loader, useMonaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Play, Loader2, Database, AlertCircle, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MiniStackConfig } from "@/lib/ministack/types";
import { glueGetTables, type GlueTableInfo } from "@/lib/ministack/glue-actions";
import { athenaRunQuery, type AthenaQueryResult } from "@/lib/ministack/athena-actions";

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
});

interface AthenaQueryTabProps {
  config: MiniStackConfig;
  databaseName: string;
}

let sqlSnippetsRegistered = false;

function registerSqlAutocompletion(monaco: any, tables: GlueTableInfo[]) {
  // Always register keyword completions. Re-registers on tables change if needed,
  // but to prevent multiples, we register dynamic completions based on the active closure.
  if (sqlSnippetsRegistered) return;
  sqlSnippetsRegistered = true;

  monaco.languages.registerCompletionItemProvider("sql", {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const sqlKeywords = [
        "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT",
        "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "ON", "AND", "OR",
        "AS", "COUNT", "SUM", "AVG", "MIN", "MAX", "DISTINCT", "CREATE", "TABLE",
        "SHOW", "DESCRIBE", "LIKE", "IN", "IS NULL", "IS NOT NULL"
      ];

      const suggestions: any[] = sqlKeywords.map((k) => ({
        label: k,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: k,
        detail: "SQL Keyword",
        range,
      }));

      // Add tables and columns from the global state/closure
      // We read window.athenaTables if set to allow dynamic updates without multiple registrations
      const activeTables: GlueTableInfo[] = (window as any).athenaTables || tables || [];
      
      activeTables.forEach((t) => {
        // Table suggestion
        suggestions.push({
          label: t.name,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: t.name,
          detail: `Glue Table (${t.columns.length} columns)`,
          range,
        });

        // Column suggestions
        t.columns.forEach((col) => {
          suggestions.push({
            label: col.name,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: col.name,
            detail: `${t.name}.${col.name} (${col.type})`,
            range,
          });
        });
      });

      return { suggestions };
    },
  });
}

export function AthenaQueryTab({ config, databaseName }: AthenaQueryTabProps) {
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<AthenaQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<GlueTableInfo[]>([]);
  const [copied, setCopied] = useState(false);

  // Load tables for autocompletion
  useEffect(() => {
    if (!databaseName) return;
    glueGetTables(config, databaseName)
      .then((tList) => {
        setTables(tList);
        (window as any).athenaTables = tList; // Store globally for autocomplete closure
        if (tList.length > 0 && !query) {
          // Provide a friendly default query
          setQuery(`SELECT * FROM ${tList[0].name} LIMIT 10;`);
        }
      })
      .catch(() => {});
  }, [config, databaseName]);

  // Register Monaco SQL snippets
  useEffect(() => {
    if (!monaco) return;
    registerSqlAutocompletion(monaco, tables);
  }, [monaco, tables]);

  const handleRunQuery = async () => {
    if (!query.trim() || !databaseName) return;
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await athenaRunQuery(config, databaseName, query);
      setResults(res);
      toast.success("Query executed successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute query");
      toast.error("Query failed");
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    if (!results) return;
    const text = [
      results.columns.join("\t"),
      ...results.rows.map((r) => results.columns.map((c) => r[c]).join("\t"))
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Results copied as TSV");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    if (!results) return;
    const csvContent = [
      results.columns.map(c => `"${c.replace(/"/g, '""')}"`).join(","),
      ...results.rows.map((r) => results.columns.map((c) => `"${(r[c] || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `query_results_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file downloaded!");
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Editor & Sidebar layout */}
      <div className="grid grid-cols-4 gap-3 h-[45%] min-h-0 shrink-0">
        {/* SQL editor */}
        <div className="col-span-3 border border-border rounded-lg overflow-hidden flex flex-col bg-background">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted flex-shrink-0">
            <span className="text-[10px] font-mono font-medium text-muted-foreground flex items-center gap-1">
              <Database size={12} /> {databaseName || "default"}.sql
            </span>
            <Button
              size="sm"
              onClick={handleRunQuery}
              disabled={running || !query.trim() || !databaseName}
              className="h-6 gap-1 text-[11px] bg-purple-600 hover:bg-purple-700 text-white font-medium px-2.5"
            >
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
              Run Query
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="sql"
              value={query}
              onChange={(val) => setQuery(val ?? "")}
              theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
              options={{
                fontSize: 12.5,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                renderLineHighlight: "all",
                wordWrap: "on",
                padding: { top: 8, bottom: 8 },
                scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                quickSuggestions: { other: true, comments: false, strings: false },
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>
        </div>

        {/* Database catalog tables list sidebar */}
        <div className="border border-border rounded-lg p-2.5 flex flex-col bg-background min-h-0">
          <div className="flex items-center gap-1.5 pb-2 border-b border-border mb-2 flex-shrink-0">
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs font-semibold truncate">Tables ({tables.length})</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2.5">
              {tables.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">No tables found.</p>
              )}
              {tables.map((t) => (
                <div key={t.name} className="space-y-0.5">
                  <span
                    className="text-[11px] font-mono font-medium hover:underline text-foreground cursor-pointer block truncate"
                    onClick={() => setQuery((q) => `${q.replace(/;?\s*$/, "")}\nSELECT * FROM ${t.name} LIMIT 10;`)}
                    title="Click to build select query"
                  >
                    📝 {t.name}
                  </span>
                  <div className="pl-4 space-y-0.5 border-l border-border/80">
                    {t.columns.map((col) => (
                      <div key={col.name} className="flex justify-between text-[9px] font-mono text-muted-foreground truncate">
                        <span>{col.name}</span>
                        <span className="text-[8px] opacity-75">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Query output and results view */}
      <div className="flex-1 min-h-0 border border-border rounded-lg flex flex-col bg-background overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted flex-shrink-0">
          <span className="text-xs font-medium">Results</span>
          {results && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground mr-1">
                {results.rows.length} row{results.rows.length !== 1 ? "s" : ""}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 px-2 w-auto gap-1 text-[10px]"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-2.5 h-2.5 text-green-500" /> : <Copy className="w-2.5 h-2.5" />}
                Copy TSV
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 px-2 w-auto gap-1 text-[10px]"
                onClick={handleDownloadCsv}
              >
                <Download className="w-2.5 h-2.5" />
                CSV
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 z-10 gap-2">
              <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
              <span className="text-xs text-muted-foreground">Athena executing SQL query via DuckDB…</span>
            </div>
          )}

          {error && (
            <div className="p-4 flex gap-2 items-start text-destructive bg-destructive/5 h-full overflow-auto">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold">Query Execution Error</p>
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">{error}</pre>
              </div>
            </div>
          )}

          {!results && !error && !running && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-1 px-4 text-center">
              <p>Execute an Athena SQL query above to query catalog tables.</p>
              <p className="opacity-75">Autocomplete includes catalog tables and column schemas dynamically.</p>
            </div>
          )}

          {results && !error && (
            <ScrollArea className="h-full w-full">
              <div className="min-w-max">
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      {results.columns.map((c) => (
                        <th key={c} className="p-2 border-r border-border font-semibold text-foreground select-all">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.length === 0 ? (
                      <tr>
                        <td colSpan={results.columns.length} className="p-4 text-center text-muted-foreground">
                          Query returned 0 rows.
                        </td>
                      </tr>
                    ) : (
                      results.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-border/60 hover:bg-muted/30">
                          {results.columns.map((c) => (
                            <td key={c} className="p-2 border-r border-border text-muted-foreground select-all max-w-sm truncate" title={row[c]}>
                              {row[c] !== "" ? row[c] : <span className="opacity-40 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
