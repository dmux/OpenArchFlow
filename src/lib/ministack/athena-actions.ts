import { getAthenaClient } from "./client";
import type { MiniStackConfig } from "./types";
import {
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-athena";

export interface AthenaQueryResult {
  columns: string[];
  rows: Record<string, string>[];
}

export async function athenaRunQuery(
  config: MiniStackConfig,
  databaseName: string,
  queryString: string,
): Promise<AthenaQueryResult> {
  const athena = getAthenaClient(config);

  // Athena requires OutputLocation to store result files in S3
  const OutputLocation = `s3://openarchflow-glue-scripts/query-results/`;

  const startRes = await athena.send(new StartQueryExecutionCommand({
    QueryString: queryString,
    QueryExecutionContext: { Database: databaseName },
    ResultConfiguration: { OutputLocation },
  }));

  const queryExecutionId = startRes.QueryExecutionId;
  if (!queryExecutionId) throw new Error("Failed to start query execution");

  // Poll for query completion
  let status = "RUNNING";
  let tries = 0;
  while ((status === "RUNNING" || status === "QUEUED") && tries < 60) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const statusRes = await athena.send(new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId }));
    status = statusRes.QueryExecution?.Status?.State ?? "FAILED";
    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(statusRes.QueryExecution?.Status?.StateChangeReason || "Query execution failed or cancelled");
    }
    tries++;
  }

  if (status !== "SUCCEEDED") {
    throw new Error("Query timed out or failed to complete");
  }

  // Fetch results
  const resultsRes = await athena.send(new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId }));
  const resultSet = resultsRes.ResultSet;
  if (!resultSet || !resultSet.Rows || resultSet.Rows.length === 0) {
    return { columns: [], rows: [] };
  }

  const rows = resultSet.Rows;
  // First row is the headers/columns definition
  const headerRow = rows[0].Data ?? [];
  const columns = headerRow.map((d) => d.VarCharValue ?? "");

  const records: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const data = rows[i].Data ?? [];
    const record: Record<string, string> = {};
    for (let j = 0; j < columns.length; j++) {
      record[columns[j]] = data[j]?.VarCharValue ?? "";
    }
    records.push(record);
  }

  return { columns, rows: records };
}
