import test from "node:test";
import assert from "node:assert/strict";
import { needsDefaultProject, resolveEventsTable, sourceFailure } from "../src/lib/analytics/config.ts";

test("legacy project.dataset does not get the billing project prepended twice", () => {
  assert.equal(resolveEventsTable({ GOOGLE_CLOUD_PROJECT: "billing-project", BIGQUERY_DATASET: "sandwich-original.analytics_474274728", BIGQUERY_TABLE: "events_*" }), "sandwich-original.analytics_474274728.events_*");
});
test("supports bare dataset, qualified tables, backticks and service-account default project", () => {
  assert.equal(resolveEventsTable({ GOOGLE_CLOUD_PROJECT: "sandwich-original", BIGQUERY_DATASET: "analytics_474274728" }), "sandwich-original.analytics_474274728.events_*");
  assert.equal(resolveEventsTable({ BIGQUERY_DATASET: "analytics_474274728" }, "sandwich-original"), "sandwich-original.analytics_474274728.events_*");
  assert.equal(resolveEventsTable({ MOMENT_EVENTS_TABLE: " `sandwich-original.analytics_474274728.events_*` " }), "sandwich-original.analytics_474274728.events_*");
  assert.equal(resolveEventsTable({ BIGQUERY_TABLE: "sandwich-original.analytics_474274728.events_*" }), "sandwich-original.analytics_474274728.events_*");
  assert.equal(resolveEventsTable({ GOOGLE_CLOUD_PROJECT: "sandwich-original", BIGQUERY_TABLE: "analytics_474274728.events_*" }), "sandwich-original.analytics_474274728.events_*");
  assert.equal(resolveEventsTable({ BIGQUERY_DATASET: "sandwich-original.analytics_474274728.events_*" }), "sandwich-original.analytics_474274728.events_*");
});
test("uses no default-project authentication when a cross-project dataset already specifies it", () => {
  assert.equal(needsDefaultProject({ BIGQUERY_DATASET: "sandwich-original.analytics_474274728" }), false);
  assert.equal(needsDefaultProject({ BIGQUERY_DATASET: "analytics_474274728" }), true);
  assert.equal(resolveEventsTable({}), undefined);
  assert.throws(() => resolveEventsTable({ MOMENT_EVENTS_TABLE: "project.dataset.events_*; DROP TABLE t" }), /TABLE_INVALID/);
});
test("classifies production failures without leaking raw credentials or SQL in UI metadata", () => {
  assert.equal(sourceFailure({ code: 403, message: "Access denied for service account" }).code, "access_denied");
  assert.equal(sourceFailure({ code: 400, message: "Correlated subqueries cannot be de-correlated" }).code, "query_invalid");
  assert.equal(sourceFailure(new Error("Queries in UNION ALL have mismatched column count; query 1 is value table with 1 column, query 2 has 3 columns at [44:17]")).code, "query_invalid");
  assert.equal(sourceFailure(new Error("EVENTS_TABLE_INVALID secret-example-value")).code, "table_invalid");
  assert.equal(sourceFailure({ code: 400, message: "Query exceeded maximumBytesBilled" }).code, "scan_limit");
  assert.equal(sourceFailure(new Error("Could not load the default credentials")).code, "credentials_missing");
  assert.ok(!sourceFailure(new Error("EVENTS_TABLE_INVALID secret-example-value")).message.includes("secret-example-value"));
});
