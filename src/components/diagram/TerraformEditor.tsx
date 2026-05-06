"use client";

import React, { useRef, useEffect } from "react";
import Editor, { loader, useMonaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
});

function registerHcl(monaco: any) {
  // Always define themes — idempotent, safe to call on every mount.
  // Must run before the language guard because themes live in Monaco's global
  // registry, which persists across HMR reloads, and setTheme fails silently
  // if the theme was never defined in the current page session.
  monaco.editor.defineTheme("terraform-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "c792ea", fontStyle: "bold" },
      { token: "identifier", foreground: "82aaff" },
      { token: "string", foreground: "c3e88d" },
      { token: "number", foreground: "f78c6c" },
      { token: "comment", foreground: "546e7a", fontStyle: "italic" },
      { token: "operator", foreground: "89ddff" },
      { token: "delimiter.bracket", foreground: "ffcb6b" },
    ],
    colors: {
      "editor.background": "#1a1a2e",
      "editor.foreground": "#eeffff",
      "editorLineNumber.foreground": "#4a4a6a",
      "editorLineNumber.activeForeground": "#7B42BC",
      "editor.selectionBackground": "#7B42BC55",
      "editor.lineHighlightBackground": "#7B42BC22",
      "editorCursor.foreground": "#7B42BC",
      "editorGutter.background": "#1a1a2e",
    },
  });

  monaco.editor.defineTheme("terraform-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "7B42BC", fontStyle: "bold" },
      { token: "identifier", foreground: "1565c0" },
      { token: "string", foreground: "2e7d32" },
      { token: "number", foreground: "e65100" },
      { token: "comment", foreground: "9e9e9e", fontStyle: "italic" },
      { token: "operator", foreground: "0097a7" },
    ],
    colors: {
      "editor.background": "#faf5ff",
      "editor.foreground": "#1a1a1a",
      "editorLineNumber.activeForeground": "#7B42BC",
      "editor.selectionBackground": "#7B42BC33",
      "editor.lineHighlightBackground": "#7B42BC11",
      "editorCursor.foreground": "#7B42BC",
    },
  });

  // Language registration is a one-time operation — the registry persists.
  const languages = monaco.languages.getLanguages();
  if (languages.some((l: any) => l.id === "hcl")) return;

  monaco.languages.register({ id: "hcl", extensions: [".tf", ".hcl"], aliases: ["HCL", "Terraform"] });

  monaco.languages.setMonarchTokensProvider("hcl", {
    defaultToken: "",
    tokenPostfix: ".hcl",
    keywords: [
      "terraform", "provider", "resource", "data", "variable", "output",
      "locals", "module", "backend", "required_providers", "required_version",
      "depends_on", "lifecycle", "count", "for_each", "source", "version",
      "true", "false", "null", "var", "local", "self", "each", "path",
    ],
    operators: ["=", "!=", ">=", "<=", ">", "<", "&&", "||", "!"],
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],
        [/\$\{/, { token: "delimiter.bracket", next: "@interpolation" }],
        [/[{}[\]()]/, "@brackets"],
        [/[=><!]+/, "operator"],
        [/\b(true|false|null)\b/, "keyword"],
        [/\b\d+(\.\d+)?\b/, "number"],
        [/[a-zA-Z_][\w-]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
      string: [
        [/[^\\"$]+/, "string"],
        [/\$\{/, { token: "delimiter.bracket", next: "@interpolation" }],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"],
      ],
      interpolation: [
        [/\}/, { token: "delimiter.bracket", next: "@pop" }],
        { include: "root" },
      ],
    },
  });

  monaco.languages.setLanguageConfiguration("hcl", {
    comments: { lineComment: "#", blockComment: ["/*", "*/"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    indentationRules: {
      increaseIndentPattern: /^.*\{[^}"']*$/,
      decreaseIndentPattern: /^(.*\*\/)?\s*\}[;\s]*$/,
    },
  });

  monaco.languages.registerCompletionItemProvider("hcl", {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn, endColumn: word.endColumn,
      };
      const suggestions = [
        { label: "resource", insertText: 'resource "${1:aws_service}" "${2:name}" {\n  ${3}\n}', detail: "Terraform resource block" },
        { label: "variable", insertText: 'variable "${1:name}" {\n  description = "${2}"\n  type        = ${3:string}\n  default     = "${4}"\n}', detail: "Input variable" },
        { label: "output", insertText: 'output "${1:name}" {\n  description = "${2}"\n  value       = ${3}\n}', detail: "Output value" },
        { label: "locals", insertText: "locals {\n  ${1}\n}", detail: "Local values" },
        { label: "data", insertText: 'data "${1:source}" "${2:name}" {\n  ${3}\n}', detail: "Data source" },
        { label: "module", insertText: 'module "${1:name}" {\n  source = "${2}"\n  ${3}\n}', detail: "Module block" },
        { label: "lifecycle", insertText: "lifecycle {\n  ${1:prevent_destroy = true}\n}", detail: "Lifecycle meta-argument" },
        { label: "depends_on", insertText: "depends_on = [${1}]", detail: "Explicit dependency" },
      ].map((s) => ({
        label: s.label,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: s.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: s.detail,
        range,
      }));
      return { suggestions };
    },
  });

}

export type EditorThemeMode = "app" | "terraform-dark" | "terraform-light" | "vs-dark" | "vs";

interface TerraformEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  themeMode?: EditorThemeMode;
}

export default function TerraformEditor({
  value,
  onChange,
  readOnly = true,
  height = "100%",
  themeMode = "app",
}: TerraformEditorProps) {
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  // Register language + themes as soon as monaco is available
  useEffect(() => {
    if (!monaco) return;
    registerHcl(monaco);
  }, [monaco]);

  // Sync theme whenever app theme or themeMode changes
  useEffect(() => {
    if (!monaco) return;
    const resolved =
      themeMode === "app"
        ? resolvedTheme === "dark"
          ? "terraform-dark"
          : "terraform-light"
        : themeMode;
    monaco.editor.setTheme(resolved);
  }, [monaco, resolvedTheme, themeMode]);

  const initialTheme =
    themeMode === "app"
      ? resolvedTheme === "dark"
        ? "terraform-dark"
        : "terraform-light"
      : themeMode;

  return (
    <Editor
      height={height}
      language="hcl"
      value={value}
      theme={initialTheme}
      onChange={(val) => onChange?.(val ?? "")}
      onMount={(editor) => { editorRef.current = editor; }}
      options={{
        readOnly,
        minimap: { enabled: true, scale: 1 },
        folding: true,
        lineNumbers: "on",
        wordWrap: "on",
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
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
      }}
    />
  );
}
