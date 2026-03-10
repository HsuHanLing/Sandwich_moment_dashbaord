import { BigQuery } from "@google-cloud/bigquery";

const projectId = process.env.GLIMMO_GOOGLE_CLOUD_PROJECT;
const dataset = process.env.GLIMMO_BIGQUERY_DATASET;
const table = process.env.GLIMMO_BIGQUERY_TABLE;

if (!projectId) {
  console.warn("GLIMMO_GOOGLE_CLOUD_PROJECT not set - Glimmo BigQuery will use default project");
}

function getCredentials(): object | undefined {
  const json = process.env.GLIMMO_GOOGLE_SERVICE_ACCOUNT;
  if (json) {
    try {
      return JSON.parse(json) as object;
    } catch {
      console.warn("GLIMMO_GOOGLE_SERVICE_ACCOUNT invalid JSON");
    }
  }
  return undefined;
}

const credentials = getCredentials();
const glimmoBigquery = new BigQuery({
  projectId: projectId || undefined,
  ...(credentials
    ? { credentials }
    : { keyFilename: process.env.GLIMMO_GOOGLE_APPLICATION_CREDENTIALS || undefined }),
});

export { glimmoBigquery, projectId, dataset, table };
