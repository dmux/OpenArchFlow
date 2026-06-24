// AWS Glue operations for MiniStack — browser-compatible (no Node.js APIs).
// Covers the Data Catalog (databases, tables, partitions) and ETL jobs
// (Spark / PySpark) with script storage in the local S3 emulator.
// MiniStack supports CORS; import freely from any "use client" component.

import { getGlueClient, getIAMClient, getS3Client } from "./client";
import type { MiniStackConfig, MiniStackDeployResult } from "./types";
import type { DeployNodeInput, TeardownNodeInput, TeardownResult } from "./browser-actions";

import {
  GetDatabasesCommand, GetDatabaseCommand, CreateDatabaseCommand, DeleteDatabaseCommand,
  GetTablesCommand, GetTableCommand, CreateTableCommand, UpdateTableCommand, DeleteTableCommand,
  GetPartitionsCommand, CreatePartitionCommand, DeletePartitionCommand,
  GetJobsCommand, CreateJobCommand, UpdateJobCommand, DeleteJobCommand,
  StartJobRunCommand, GetJobRunCommand, GetJobRunsCommand, BatchStopJobRunCommand,
  type Column as GlueSdkColumn, type WorkerType,
} from "@aws-sdk/client-glue";
import { GetRoleCommand, CreateRoleCommand } from "@aws-sdk/client-iam";
import { HeadBucketCommand, CreateBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";

// ── Constants ───────────────────────────────────────────────────────────────

export const GLUE_ROLE_NAME = "openarchflow-glue-role";
export const GLUE_SCRIPTS_BUCKET = "openarchflow-glue-scripts";

// ── Public types ──────────────────────────────────────────────────────────────

export interface GlueDatabaseInfo {
  name: string;
  description?: string;
}

export interface GlueColumn {
  name: string;
  type: string;
  comment?: string;
}

export type GlueClassification = "parquet" | "json" | "csv";

export interface GlueTableInfo {
  name: string;
  columns: GlueColumn[];
  partitionKeys: GlueColumn[];
  location?: string;
  classification?: GlueClassification;
}

export interface GlueJobInfo {
  name: string;
  role?: string;
  glueVersion?: string;
  workerType?: string;
  numberOfWorkers?: number;
  scriptLocation?: string;
  commandName?: string;
}

export type GlueJobRunState =
  | "STARTING" | "RUNNING" | "STOPPING" | "STOPPED"
  | "SUCCEEDED" | "FAILED" | "TIMEOUT" | "ERROR" | "WAITING";

export interface GlueJobRunInfo {
  id: string;
  state: GlueJobRunState;
  startedOn?: number;
  completedOn?: number;
  executionTimeSeconds?: number;
  errorMessage?: string;
}

// ── Name sanitization ─────────────────────────────────────────────────────────

// Glue database / table names allow lowercase letters, digits and underscores
// only — hyphens are rejected, so we cannot reuse sanitizeResourceName here.
export function sanitizeGlueName(label: string, suffix?: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50) || "catalog";
  const safeBase = /^[a-z_]/.test(base) ? base : `db_${base}`;
  return suffix ? `${safeBase}_${suffix.slice(0, 8)}` : safeBase;
}

// ── Storage descriptor formats ──────────────────────────────────────────────

interface SerdeFormat {
  inputFormat: string;
  outputFormat: string;
  serializationLibrary: string;
}

const SERDE_FORMATS: Record<GlueClassification, SerdeFormat> = {
  parquet: {
    inputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
    outputFormat: "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
    serializationLibrary: "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe",
  },
  json: {
    inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
    outputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
    serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
  },
  csv: {
    inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
    outputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
    serializationLibrary: "org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe",
  },
};

function toSdkColumns(columns: GlueColumn[]): GlueSdkColumn[] {
  return columns
    .filter((c) => c.name.trim())
    .map((c) => ({ Name: c.name.trim(), Type: c.type || "string", Comment: c.comment || undefined }));
}

function fromSdkColumns(columns?: GlueSdkColumn[]): GlueColumn[] {
  return (columns ?? []).map((c) => ({ name: c.Name ?? "", type: c.Type ?? "string", comment: c.Comment }));
}

// ── IAM role & scripts bucket ───────────────────────────────────────────────

export async function ensureGlueRole(config: MiniStackConfig): Promise<string> {
  const iam = getIAMClient(config);
  const arn = `arn:aws:iam::${config.accountId}:role/${GLUE_ROLE_NAME}`;
  try {
    await iam.send(new GetRoleCommand({ RoleName: GLUE_ROLE_NAME }));
    return arn;
  } catch { /* create below */ }
  await iam.send(new CreateRoleCommand({
    RoleName: GLUE_ROLE_NAME,
    AssumeRolePolicyDocument: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Principal: { Service: "glue.amazonaws.com" }, Action: "sts:AssumeRole" }],
    }),
  }));
  return arn;
}

export async function ensureScriptsBucket(config: MiniStackConfig): Promise<string> {
  const s3 = getS3Client(config);
  try {
    await s3.send(new HeadBucketCommand({ Bucket: GLUE_SCRIPTS_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: GLUE_SCRIPTS_BUCKET }));
  }
  return GLUE_SCRIPTS_BUCKET;
}

// Uploads a PySpark script to the local S3 emulator and returns its s3:// URI.
export async function glueUploadScript(
  config: MiniStackConfig,
  jobName: string,
  code: string,
): Promise<string> {
  await ensureScriptsBucket(config);
  const key = `${jobName}.py`;
  await getS3Client(config).send(new PutObjectCommand({
    Bucket: GLUE_SCRIPTS_BUCKET,
    Key: key,
    Body: code,
    ContentType: "text/x-python",
  }));
  return `s3://${GLUE_SCRIPTS_BUCKET}/${key}`;
}

// ── Databases ─────────────────────────────────────────────────────────────────

export async function glueListDatabases(config: MiniStackConfig): Promise<GlueDatabaseInfo[]> {
  const res = await getGlueClient(config).send(new GetDatabasesCommand({}));
  return (res.DatabaseList ?? []).map((d) => ({ name: d.Name ?? "", description: d.Description }));
}

export async function glueCreateDatabase(
  config: MiniStackConfig,
  name: string,
  description?: string,
): Promise<void> {
  await getGlueClient(config).send(new CreateDatabaseCommand({
    DatabaseInput: { Name: name, Description: description },
  }));
}

export async function glueDeleteDatabase(config: MiniStackConfig, name: string): Promise<void> {
  await getGlueClient(config).send(new DeleteDatabaseCommand({ Name: name }));
}

// ── Tables ──────────────────────────────────────────────────────────────────

export async function glueGetTables(
  config: MiniStackConfig,
  databaseName: string,
): Promise<GlueTableInfo[]> {
  const res = await getGlueClient(config).send(new GetTablesCommand({ DatabaseName: databaseName }));
  return (res.TableList ?? []).map((t) => ({
    name: t.Name ?? "",
    columns: fromSdkColumns(t.StorageDescriptor?.Columns),
    partitionKeys: fromSdkColumns(t.PartitionKeys),
    location: t.StorageDescriptor?.Location,
    classification: (t.Parameters?.classification as GlueClassification) ?? undefined,
  }));
}

export async function glueGetTable(
  config: MiniStackConfig,
  databaseName: string,
  name: string,
): Promise<GlueTableInfo | null> {
  const res = await getGlueClient(config).send(new GetTableCommand({ DatabaseName: databaseName, Name: name }));
  const t = res.Table;
  if (!t) return null;
  return {
    name: t.Name ?? "",
    columns: fromSdkColumns(t.StorageDescriptor?.Columns),
    partitionKeys: fromSdkColumns(t.PartitionKeys),
    location: t.StorageDescriptor?.Location,
    classification: (t.Parameters?.classification as GlueClassification) ?? undefined,
  };
}

function buildTableInput(table: GlueTableInfo) {
  const classification: GlueClassification = table.classification ?? "parquet";
  const fmt = SERDE_FORMATS[classification];
  return {
    Name: table.name,
    TableType: "EXTERNAL_TABLE",
    Parameters: { classification, EXTERNAL: "TRUE" },
    PartitionKeys: toSdkColumns(table.partitionKeys),
    StorageDescriptor: {
      Columns: toSdkColumns(table.columns),
      Location: table.location || `s3://${GLUE_SCRIPTS_BUCKET}/tables/${table.name}/`,
      InputFormat: fmt.inputFormat,
      OutputFormat: fmt.outputFormat,
      SerdeInfo: { SerializationLibrary: fmt.serializationLibrary },
    },
  };
}

export async function glueCreateTable(
  config: MiniStackConfig,
  databaseName: string,
  table: GlueTableInfo,
): Promise<void> {
  await getGlueClient(config).send(new CreateTableCommand({
    DatabaseName: databaseName,
    TableInput: buildTableInput(table),
  }));
}

export async function glueUpdateTable(
  config: MiniStackConfig,
  databaseName: string,
  table: GlueTableInfo,
): Promise<void> {
  await getGlueClient(config).send(new UpdateTableCommand({
    DatabaseName: databaseName,
    TableInput: buildTableInput(table),
  }));
}

export async function glueDeleteTable(
  config: MiniStackConfig,
  databaseName: string,
  name: string,
): Promise<void> {
  await getGlueClient(config).send(new DeleteTableCommand({ DatabaseName: databaseName, Name: name }));
}

// ── Partitions ────────────────────────────────────────────────────────────────

export async function glueGetPartitions(
  config: MiniStackConfig,
  databaseName: string,
  tableName: string,
): Promise<{ values: string[] }[]> {
  const res = await getGlueClient(config).send(new GetPartitionsCommand({
    DatabaseName: databaseName,
    TableName: tableName,
  }));
  return (res.Partitions ?? []).map((p) => ({ values: p.Values ?? [] }));
}

export async function glueCreatePartition(
  config: MiniStackConfig,
  databaseName: string,
  table: GlueTableInfo,
  values: string[],
): Promise<void> {
  const classification: GlueClassification = table.classification ?? "parquet";
  const fmt = SERDE_FORMATS[classification];
  const suffix = values.join("/");
  await getGlueClient(config).send(new CreatePartitionCommand({
    DatabaseName: databaseName,
    TableName: table.name,
    PartitionInput: {
      Values: values,
      StorageDescriptor: {
        Columns: toSdkColumns(table.columns),
        Location: `${(table.location || `s3://${GLUE_SCRIPTS_BUCKET}/tables/${table.name}/`).replace(/\/$/, "")}/${suffix}/`,
        InputFormat: fmt.inputFormat,
        OutputFormat: fmt.outputFormat,
        SerdeInfo: { SerializationLibrary: fmt.serializationLibrary },
      },
    },
  }));
}

export async function glueDeletePartition(
  config: MiniStackConfig,
  databaseName: string,
  tableName: string,
  values: string[],
): Promise<void> {
  await getGlueClient(config).send(new DeletePartitionCommand({
    DatabaseName: databaseName,
    TableName: tableName,
    PartitionValues: values,
  }));
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export interface GlueJobSpec {
  name: string;
  scriptLocation: string;
  glueVersion: string;          // "4.0" | "3.0"
  workerType: string;           // "G.1X" | "G.2X"
  numberOfWorkers: number;
  arguments?: Record<string, string>;
}

export async function glueListJobs(config: MiniStackConfig): Promise<GlueJobInfo[]> {
  const res = await getGlueClient(config).send(new GetJobsCommand({}));
  return (res.Jobs ?? []).map((j) => ({
    name: j.Name ?? "",
    role: j.Role,
    glueVersion: j.GlueVersion,
    workerType: j.WorkerType,
    numberOfWorkers: j.NumberOfWorkers,
    scriptLocation: j.Command?.ScriptLocation,
    commandName: j.Command?.Name,
  }));
}

function defaultJobArguments(extra?: Record<string, string>): Record<string, string> {
  return {
    "--job-language": "python",
    "--enable-glue-datacatalog": "true",
    "--enable-metrics": "true",
    // Bookmark persistence is not reliably implemented locally; leaving it
    // enabled makes job.commit() throw a py4j Java exception on MiniStack.
    "--job-bookmark-option": "job-bookmark-disable",
    "--TempDir": `s3://${GLUE_SCRIPTS_BUCKET}/tmp/`,
    ...extra,
  };
}

// Creates the job if it does not exist, otherwise updates it. Returns the role ARN used.
export async function glueUpsertJob(
  config: MiniStackConfig,
  spec: GlueJobSpec,
): Promise<string> {
  const glue = getGlueClient(config);
  const roleArn = await ensureGlueRole(config);
  const command = {
    Name: "glueetl",
    ScriptLocation: spec.scriptLocation,
    PythonVersion: "3",
  };
  const common = {
    Role: roleArn,
    Command: command,
    GlueVersion: spec.glueVersion,
    WorkerType: spec.workerType as WorkerType,
    NumberOfWorkers: spec.numberOfWorkers,
    DefaultArguments: defaultJobArguments(spec.arguments),
    MaxRetries: 0,
    Timeout: 60,
  };
  let exists = false;
  try {
    const jobs = await glue.send(new GetJobsCommand({}));
    exists = (jobs.Jobs ?? []).some((j) => j.Name === spec.name);
  } catch { /* assume not present */ }

  if (exists) {
    await glue.send(new UpdateJobCommand({ JobName: spec.name, JobUpdate: common }));
  } else {
    await glue.send(new CreateJobCommand({ Name: spec.name, ...common }));
  }
  return roleArn;
}

export async function glueDeleteJob(config: MiniStackConfig, jobName: string): Promise<void> {
  await getGlueClient(config).send(new DeleteJobCommand({ JobName: jobName }));
}

// ── Spark execution ──────────────────────────────────────────────────────────

export async function glueStartJobRun(
  config: MiniStackConfig,
  jobName: string,
  args?: Record<string, string>,
): Promise<string> {
  // Real Glue auto-injects --JOB_NAME; MiniStack does not, so the script's
  // getResolvedOptions(["JOB_NAME"]) fails unless we pass it explicitly.
  const res = await getGlueClient(config).send(new StartJobRunCommand({
    JobName: jobName,
    Arguments: { "--JOB_NAME": jobName, ...args },
  }));
  return res.JobRunId ?? "";
}

function toRunInfo(run: {
  Id?: string;
  JobRunState?: string;
  StartedOn?: Date;
  CompletedOn?: Date;
  ExecutionTime?: number;
  ErrorMessage?: string;
}): GlueJobRunInfo {
  return {
    id: run.Id ?? "",
    state: (run.JobRunState as GlueJobRunState) ?? "STARTING",
    startedOn: run.StartedOn ? run.StartedOn.getTime() : undefined,
    completedOn: run.CompletedOn ? run.CompletedOn.getTime() : undefined,
    executionTimeSeconds: run.ExecutionTime,
    errorMessage: run.ErrorMessage,
  };
}

export async function glueGetJobRun(
  config: MiniStackConfig,
  jobName: string,
  runId: string,
): Promise<GlueJobRunInfo | null> {
  const res = await getGlueClient(config).send(new GetJobRunCommand({ JobName: jobName, RunId: runId }));
  return res.JobRun ? toRunInfo(res.JobRun) : null;
}

export async function glueListJobRuns(
  config: MiniStackConfig,
  jobName: string,
): Promise<GlueJobRunInfo[]> {
  const res = await getGlueClient(config).send(new GetJobRunsCommand({ JobName: jobName }));
  return (res.JobRuns ?? []).map(toRunInfo);
}

export async function glueStopJobRun(
  config: MiniStackConfig,
  jobName: string,
  runId: string,
): Promise<void> {
  await getGlueClient(config).send(new BatchStopJobRunCommand({ JobName: jobName, JobRunIds: [runId] }));
}

const TERMINAL_STATES: GlueJobRunState[] = ["SUCCEEDED", "FAILED", "STOPPED", "TIMEOUT", "ERROR"];

export function isTerminalRunState(state: GlueJobRunState): boolean {
  return TERMINAL_STATES.includes(state);
}

// ── Deploy / teardown entry points (called from browser-actions) ─────────────

export async function deployGlue(
  node: DeployNodeInput,
  config: MiniStackConfig,
): Promise<MiniStackDeployResult> {
  const override = node.nodeConfig?.resourceNameOverride as string | undefined;
  const dbName = sanitizeGlueName(override || node.label, node.nodeId);

  // Prepare the Spark prerequisites so the Studio is ready to author jobs.
  try { await ensureGlueRole(config); } catch { /* role optional until first job */ }
  try { await ensureScriptsBucket(config); } catch { /* bucket created on first upload */ }

  const glue = getGlueClient(config);
  try {
    await glue.send(new GetDatabaseCommand({ Name: dbName }));
  } catch {
    await glue.send(new CreateDatabaseCommand({
      DatabaseInput: { Name: dbName, Description: `OpenArchFlow catalog database for ${node.label}` },
    }));
  }
  return {
    nodeId: node.nodeId,
    status: "deployed",
    resourceId: dbName,
    resourceArn: `arn:aws:glue:${config.region}:${config.accountId}:database/${dbName}`,
  };
}

// Deletes the catalog database (and its tables). ETL jobs are global Glue
// resources and are managed/removed from the Jobs tab, so they are left intact.
export async function teardownGlue(
  node: TeardownNodeInput,
  config: MiniStackConfig,
): Promise<TeardownResult> {
  const resourceId = node.ministack.resourceId ?? "";
  if (!resourceId) return { nodeId: node.nodeId, resourceId: "", ok: true };
  try {
    await getGlueClient(config).send(new DeleteDatabaseCommand({ Name: resourceId }));
    return { nodeId: node.nodeId, resourceId, ok: true };
  } catch (err) {
    return { nodeId: node.nodeId, resourceId, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
