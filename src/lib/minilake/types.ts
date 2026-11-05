export interface MinilakeConfig {
  /** Base URL of the minilake server, e.g. http://localhost:8000 */
  host: string;
  /** Bearer token. minilake does not enforce auth, but SDK-style clients send one. */
  token: string;
}

export const DEFAULT_MINILAKE_CONFIG: MinilakeConfig = {
  host: "http://localhost:8000",
  token: "dapi-local",
};

export type RunLifeCycleState =
  | "QUEUED"
  | "PENDING"
  | "RUNNING"
  | "TERMINATING"
  | "TERMINATED"
  | "SKIPPED"
  | "INTERNAL_ERROR"
  | "BLOCKED"
  | "WAITING_FOR_RETRY";

export type RunResultState =
  | "SUCCESS"
  | "FAILED"
  | "TIMEDOUT"
  | "CANCELED"
  | "UPSTREAM_FAILED";

export interface DatabricksRunState {
  life_cycle_state: RunLifeCycleState;
  result_state?: RunResultState;
  state_message?: string;
}

export interface DatabricksRun {
  run_id: number;
  run_name?: string;
  state: DatabricksRunState;
  start_time?: number;
  end_time?: number;
  run_page_url?: string;
  /** Run id of the first task, needed for get-output on multi-task runs. */
  tasks?: { run_id: number; task_key: string; state: DatabricksRunState }[];
}

export interface DatabricksRunOutput {
  logs?: string;
  logs_truncated?: boolean;
  error?: string;
  error_trace?: string;
}
