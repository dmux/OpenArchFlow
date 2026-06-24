"use client";

import React, { useEffect } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";

// Default AWS Glue PySpark boilerplate (GlueContext + Job bookmarks).
export const DEFAULT_PYSPARK_SCRIPT = `import sys
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

# Read a table from the Glue Data Catalog
# source = glueContext.create_dynamic_frame.from_catalog(
#     database="my_database",
#     table_name="my_table",
# )

# Transform with Spark, then write back to S3 / the catalog
# source.toDF().show()
# glueContext.write_dynamic_frame.from_options(
#     frame=source,
#     connection_type="s3",
#     connection_options={"path": "s3://my-bucket/output/"},
#     format="parquet",
# )

job.commit()
`;

let snippetsRegistered = false;

function registerPySparkSnippets(monaco: NonNullable<ReturnType<typeof useMonaco>>) {
  if (snippetsRegistered) return;
  snippetsRegistered = true;

  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems: (model, position) => {
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

interface PySparkEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export default function PySparkEditor({
  value,
  onChange,
  readOnly = false,
  height = "100%",
}: PySparkEditorProps) {
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;
    registerPySparkSnippets(monaco);
  }, [monaco]);

  return (
    <Editor
      height={height}
      language="python"
      value={value}
      theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
      onChange={(val) => onChange?.(val ?? "")}
      options={{
        readOnly,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        minimap: { enabled: false },
        lineNumbers: "on",
        wordWrap: "on",
        scrollBeyondLastLine: false,
        padding: { top: 8, bottom: 8 },
        overviewRulerLanes: 0,
        renderLineHighlight: "gutter",
        tabSize: 4,
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
      }}
    />
  );
}
