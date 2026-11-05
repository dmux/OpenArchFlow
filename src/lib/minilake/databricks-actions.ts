import type {
  DatabricksRun,
  DatabricksRunOutput,
  MinilakeConfig,
} from "./types";

/** Folder in the minilake workspace where OpenArchFlow scripts are uploaded. */
export const DATABRICKS_SCRIPTS_DIR = "/Workspace/openarchflow";

const TERMINAL_STATES = new Set(["TERMINATED", "SKIPPED", "INTERNAL_ERROR"]);

function baseUrl(config: MinilakeConfig): string {
  return config.host.replace(/\/+$/, "");
}

async function request<T>(
  config: MinilakeConfig,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl(config)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text || res.statusText;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? message;
    } catch { /* not JSON */ }
    throw new Error(`minilake ${res.status}: ${message}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export async function checkMinilakeHealth(
  config: MinilakeConfig,
): Promise<{ connected: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseUrl(config)}/_minilake/health`, {
      signal: AbortSignal.timeout(4000),
    });
    return { connected: res.ok };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

/** Make a job name safe to use as a workspace file name. */
export function scriptFileName(jobName: string): string {
  const safe = jobName.trim().replace(/[^a-zA-Z0-9._-]+/g, "_") || "job";
  return `${safe}.py`;
}

/** Upload a PySpark script to the workspace and return its path. */
export async function uploadScript(
  config: MinilakeConfig,
  jobName: string,
  code: string,
): Promise<string> {
  await request(config, "POST", "/api/2.0/workspace/mkdirs", { path: DATABRICKS_SCRIPTS_DIR });
  const path = `${DATABRICKS_SCRIPTS_DIR}/${scriptFileName(jobName)}`;
  await request(config, "POST", "/api/2.0/workspace/import", {
    path,
    format: "AUTO",
    language: "PYTHON",
    content: toBase64(code),
    overwrite: true,
  });
  return path;
}

/** Upload the script, then submit a one-shot run. Returns the new run id. */
export async function submitPythonRun(
  config: MinilakeConfig,
  jobName: string,
  code: string,
  parameters: string[] = [],
): Promise<number> {
  const pythonFile = await uploadScript(config, jobName, code);
  const res = await request<{ run_id: number }>(config, "POST", "/api/2.2/jobs/runs/submit", {
    run_name: jobName,
    tasks: [
      {
        task_key: "main",
        spark_python_task: { python_file: pythonFile, parameters },
      },
    ],
  });
  return res.run_id;
}

export async function getRun(config: MinilakeConfig, runId: number): Promise<DatabricksRun> {
  return request<DatabricksRun>(config, "GET", `/api/2.2/jobs/runs/get?run_id=${runId}`);
}

export async function listRuns(config: MinilakeConfig, limit = 25): Promise<DatabricksRun[]> {
  const res = await request<{ runs?: DatabricksRun[] }>(
    config,
    "GET",
    `/api/2.2/jobs/runs/list?limit=${limit}`,
  );
  return res.runs ?? [];
}

export async function cancelRun(config: MinilakeConfig, runId: number): Promise<void> {
  await request(config, "POST", "/api/2.2/jobs/runs/cancel", { run_id: runId });
}

/**
 * Fetch logs/errors for a run. Multi-task runs need the task's own run id, so we
 * resolve the first task when the run has one.
 */
export async function getRunOutput(
  config: MinilakeConfig,
  run: DatabricksRun,
): Promise<DatabricksRunOutput> {
  const id = run.tasks?.[0]?.run_id ?? run.run_id;
  return request<DatabricksRunOutput>(config, "GET", `/api/2.2/jobs/runs/get-output?run_id=${id}`);
}

export function isTerminalRunState(run: DatabricksRun): boolean {
  return TERMINAL_STATES.has(run.state.life_cycle_state);
}

/** Collapse life-cycle + result state into one label for the UI. */
export function runStatusLabel(run: DatabricksRun): string {
  return run.state.result_state ?? run.state.life_cycle_state;
}
