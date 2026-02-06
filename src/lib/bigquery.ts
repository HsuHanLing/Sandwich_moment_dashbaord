import { BigQuery } from "@google-cloud/bigquery";

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const dataset = process.env.BIGQUERY_DATASET;
const table = process.env.BIGQUERY_TABLE;

if (!projectId) {
  console.warn("GOOGLE_CLOUD_PROJECT not set - BigQuery will use default project");
}

// Vercel: use GOOGLE_SERVICE_ACCOUNT (JSON string). Local: use GOOGLE_APPLICATION_CREDENTIALS (file path)
function getCredentials(): object | undefined {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (json) {
    try {
      return JSON.parse(json) as object;
    } catch {
      console.warn("GOOGLE_SERVICE_ACCOUNT invalid JSON");
    }
  }
  return undefined;
}

const credentials = getCredentials();
const bigquery = new BigQuery({
  projectId: projectId || undefined,
  ...(credentials
    ? { credentials }
    : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined }),
});

export { bigquery, projectId, dataset, table };
