"use client";

import React, { useRef, useEffect } from "react";
import Editor, { loader, useMonaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
});

// Default AWS Glue PySpark boilerplate (GlueContext + Job bookmarks).
export const DEFAULT_PYSPARK_SCRIPT = `import sys
import uuid
from pyspark.sql import functions as F
from pyspark.sql.types import StringType
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ["JOB_NAME"])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

row_count = 1000
base_df = spark.range(0, row_count).withColumn("value", F.rand())

uuid_udf = F.udf(lambda: str(uuid.uuid4()), StringType())
random_df = base_df.withColumn("id", uuid_udf()).select("id", "value")

random_df.show(10, truncate=False)

random_df.write.mode("overwrite").parquet(
    "s3://openarchflow-glue-scripts/tables/table/"
)

job.commit()
`;

function registerPythonThemes(monaco: any) {
  monaco.editor.defineTheme("python-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "ffcb6b", fontStyle: "bold" },
      { token: "identifier", foreground: "82aaff" },
      { token: "string", foreground: "c3e88d" },
      { token: "number", foreground: "f78c6c" },
      { token: "comment", foreground: "546e7a", fontStyle: "italic" },
      { token: "operator", foreground: "89ddff" },
      { token: "delimiter.bracket", foreground: "89ddff" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#484f58",
      "editorLineNumber.activeForeground": "#58a6ff",
      "editor.selectionBackground": "#58a6ff33",
      "editor.lineHighlightBackground": "#21262d55",
      "editorCursor.foreground": "#58a6ff",
      "editorGutter.background": "#0d1117",
    },
  });

  monaco.editor.defineTheme("python-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "005cc5", fontStyle: "bold" },
      { token: "identifier", foreground: "032f62" },
      { token: "string", foreground: "22863a" },
      { token: "number", foreground: "005cc5" },
      { token: "comment", foreground: "6a737d", fontStyle: "italic" },
      { token: "operator", foreground: "d73a49" },
    ],
    colors: {
      "editor.background": "#f6f8fa",
      "editor.foreground": "#24292e",
      "editorLineNumber.foreground": "#57606a",
      "editorLineNumber.activeForeground": "#0969da",
      "editor.selectionBackground": "#0969da22",
      "editor.lineHighlightBackground": "#eaeef2aa",
      "editorCursor.foreground": "#0969da",
    },
  });
}

let snippetsRegistered = false;

function registerPySparkSnippets(monaco: any) {
  if (snippetsRegistered) return;
  snippetsRegistered = true;

  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const items: { label: string; insertText: string; detail: string }[] = [
        {
          label: "glue_boilerplate",
          insertText: DEFAULT_PYSPARK_SCRIPT,
          detail: "Full AWS Glue PySpark job skeleton",
        },
        {
          label: "from_catalog",
          insertText:
            'glueContext.create_dynamic_frame.from_catalog(\n    database="${1:database}",\n    table_name="${2:table}",\n)',
          detail: "Read a DynamicFrame from the Glue Data Catalog",
        },
        {
          label: "write_from_options",
          insertText:
            'glueContext.write_dynamic_frame.from_options(\n    frame=${1:frame},\n    connection_type="s3",\n    connection_options={"path": "s3://${2:bucket}/${3:prefix}/"},\n    format="${4:parquet}",\n)',
          detail: "Write a DynamicFrame to S3",
        },
        {
          label: "spark_read",
          insertText: 'spark.read.${1:parquet}("s3://${2:bucket}/${3:path}/")',
          detail: "Read a Spark DataFrame from S3",
        },
        {
          label: "job_commit",
          insertText: "job.commit()",
          detail: "Commit the Glue job (finalizes bookmarks)",
        },
        {
          label: "df_select",
          insertText: 'df.select("${1:column}").show()',
          detail: "Select specific column and show DataFrame preview",
        },
        {
          label: "df_filter",
          insertText: 'df.filter(df["${1:column}"] == ${2:value})',
          detail: "Filter rows of a Spark DataFrame",
        },
        {
          label: "df_groupby",
          insertText: 'df.groupBy("${1:column}").count().show()',
          detail: "Group by column, count aggregates, and show results",
        },
        {
          label: "df_join",
          insertText: 'df.join(${1:other_df}, on="${2:column}", how="${3:inner}")',
          detail: "Join two Spark DataFrames",
        },
        {
          label: "df_with_column",
          insertText: 'df.withColumn("${1:new_column}", ${2:expression})',
          detail: "Add or replace a column in a Spark DataFrame",
        },
        {
          label: "spark_sql",
          insertText: 'spark.sql("SELECT * FROM ${1:table}")',
          detail: "Execute a Spark SQL query",
        },
        {
          label: "dynamic_frame_to_df",
          insertText: '${1:df} = ${2:dynamic_frame}.toDF()',
          detail: "Convert Glue DynamicFrame to Spark DataFrame",
        },
        {
          label: "df_to_dynamic_frame",
          insertText: 'from awsglue.dynamicframe import DynamicFrame\n${1:dynamic_frame} = DynamicFrame.fromDF(${2:df}, glueContext, "${3:name}")',
          detail: "Convert Spark DataFrame to Glue DynamicFrame",
        }
      ];
      return {
        suggestions: items.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: s.detail,
          range,
        })),
      };
    },
  });
}

export type EditorThemeMode = "app" | "python-dark" | "python-light" | "vs-dark" | "vs";

interface PySparkEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  themeMode?: EditorThemeMode;
}

export default function PySparkEditor({
  value,
  onChange,
  readOnly = false,
  height = "100%",
  themeMode = "app",
}: PySparkEditorProps) {
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  // Register themes and snippets when Monaco is loaded
  useEffect(() => {
    if (!monaco) return;
    registerPythonThemes(monaco);
    registerPySparkSnippets(monaco);
  }, [monaco]);

  // Sync theme when context theme changes
  useEffect(() => {
    if (!monaco) return;
    const resolved =
      themeMode === "app"
        ? resolvedTheme === "dark"
          ? "python-dark"
          : "python-light"
        : themeMode;
    monaco.editor.setTheme(resolved);
  }, [monaco, resolvedTheme, themeMode]);

  const initialTheme =
    themeMode === "app"
      ? resolvedTheme === "dark"
        ? "python-dark"
        : "python-light"
      : themeMode;

  return (
    <Editor
      height={height}
      language="python"
      value={value}
      theme={initialTheme}
      onChange={(val) => onChange?.(val ?? "")}
      onMount={(editor) => { editorRef.current = editor; }}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        minimap: { enabled: true, scale: 1 },
        folding: true,
        lineNumbers: "on",
        wordWrap: "on",
        renderLineHighlight: "all",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: "smooth",
        padding: { top: 12, bottom: 12 },
        overviewRulerBorder: false,
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        bracketPairColorization: { enabled: true },
        tabSize: 4,
      }}
    />
  );
}
