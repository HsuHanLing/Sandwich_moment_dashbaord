type Environment = Record<string, string | undefined>;
const clean = (value?: string) => value?.trim().replace(/^`(.*)`$/, "$1");

/** Preserve both legacy project.dataset values and fully-qualified table values. */
export function resolveEventsTable(env: Environment, defaultProject?: string): string | undefined {
  const explicit = clean(env.MOMENT_EVENTS_TABLE);
  const table = clean(env.BIGQUERY_TABLE) || "events_*";
  const dataset = clean(env.BIGQUERY_DATASET);
  const project = clean(env.GOOGLE_CLOUD_PROJECT) || defaultProject;
  const candidate = explicit || (table.split(".").length === 3 ? table :
    table.split(".").length === 2 ? project ? `${project}.${table}` : undefined :
    dataset?.split(".").length === 3 ? dataset :
    dataset?.split(".").length === 2 ? `${dataset}.${table}` :
    dataset && project ? `${project}.${dataset}.${table}` : undefined);
  if (!candidate && !dataset && !explicit && table === "events_*") return undefined;
  if (!candidate) throw new Error("EVENTS_PROJECT_MISSING: Set a project ID or use project.dataset in BIGQUERY_DATASET");
  if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\*?$/.test(candidate)) throw new Error("EVENTS_TABLE_INVALID: Use project.dataset.table or project.dataset.events_*");
  return candidate;
}

export function needsDefaultProject(env: Environment): boolean {
  if (clean(env.GOOGLE_CLOUD_PROJECT) || clean(env.MOMENT_EVENTS_TABLE)) return false;
  const table = clean(env.BIGQUERY_TABLE) || "events_*";
  if (table.split(".").length === 3 || (clean(env.BIGQUERY_DATASET)?.split(".").length || 0) >= 2) return false;
  return Boolean(env.BIGQUERY_DATASET || table.split(".").length === 2);
}

export function sourceFailure(error: unknown): { code: string; message: string } {
  const e = error as { code?: number | string; message?: string; errors?: { reason?: string }[] } | null;
  const message = e?.message || ""; const reason = e?.errors?.[0]?.reason || "";
  if (/EVENTS_PROJECT_MISSING/.test(message)) return { code: "project_missing", message: "Set GOOGLE_CLOUD_PROJECT or a project-qualified dataset" };
  if (/EVENTS_TABLE_INVALID|fully qualified BigQuery/.test(message)) return { code: "table_invalid", message: "Invalid events table configuration; use project.dataset.events_*" };
  if (/maximumBytesBilled|bytes billed|billing tier|billingTierLimitExceeded/i.test(message + reason)) return { code: "scan_limit", message: "Query exceeds the configured scan limit; use a shorter period or review the limit" };
  if (Number(e?.code) === 403 || /accessDenied|permission|access denied/i.test(message + reason)) return { code: "access_denied", message: "The deployed service account needs BigQuery job and source-table read permissions" };
  if (Number(e?.code) === 404 || /notFound|not found/i.test(message + reason)) return { code: "table_not_found", message: "The configured events table was not found; check project, dataset and query location" };
  if (/default credentials|invalid_grant|invalid credential|private key|invalid JSON|unauthenticated/i.test(message + reason) || Number(e?.code) === 401) return { code: "credentials_missing", message: "Check the deployed Google service-account credentials" };
  if (Number(e?.code) === 400 || /invalidQuery|syntax error|unrecognized name|correlated subquer|mismatched column count/i.test(message + reason)) return { code: "query_invalid", message: "BigQuery rejected the SQL; inspect the matching server error for the query location" };
  return { code: "unavailable", message: "Source request failed; inspect the matching server error" };
}
