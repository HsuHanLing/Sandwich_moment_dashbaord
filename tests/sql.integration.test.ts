import test from "node:test";
import assert from "node:assert/strict";
import { eventQuery, identifier, queryParameters } from "../src/lib/analytics/sql.ts";

// Opt in with a project that grants bigquery.jobs.create and Google credentials.
// Only literal fixture rows are queried: no private tables or billable scans.
test("BigQuery executes the full event query, including device/language UNION and install cohorts", {
  skip: !process.env.MOMENT_SQL_TEST_PROJECT,
  timeout: 60000,
}, async () => {
  const { BigQuery } = await import("@google-cloud/bigquery");
  const client = new BigQuery({
    projectId: process.env.MOMENT_SQL_TEST_PROJECT,
    ...(process.env.GOOGLE_SERVICE_ACCOUNT ? { credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT) } : {}),
  });
  const table = "fixture_project.fixture_dataset.events_*";
  const fixture = `SELECT r.suffix AS _TABLE_SUFFIX,r.date AS event_date,r.event AS event_name,
    UNIX_MICROS(TIMESTAMP(r.time)) AS event_timestamp,r.install AS user_pseudo_id,
    CAST(NULL AS STRING) AS user_id,'IOS' AS platform,STRUCT(r.version AS version) AS app_info,
    STRUCT('United States' AS country) AS geo,STRUCT('mobile' AS category,'en' AS language) AS device,
    ARRAY(SELECT AS STRUCT key,STRUCT(value AS string_value,CAST(NULL AS INT64) AS int_value,
      CAST(NULL AS FLOAT64) AS double_value,CAST(NULL AS FLOAT64) AS float_value) AS value
      FROM UNNEST([STRUCT('result' AS key,r.result AS value),STRUCT('event_id',r.id)])) AS event_params
    FROM UNNEST([
      STRUCT('20261109' AS suffix,'20261109' AS date,'first_open' AS event,'2026-11-09 10:00:00+00' AS time,'a' AS install,'1' AS version,CAST(NULL AS STRING) AS result,'open-a' AS id),
      STRUCT('20261109','20261109','message_send','2026-11-09 11:00:00+00','a','1','success','send-a'),
      STRUCT('20261109','20261109','message_send','2026-11-09 11:00:00+00','a','1','success','send-a'),
      STRUCT('20261109','20261109','first_open','2026-11-09 12:00:00+00','b','1',NULL,'open-b'),
      STRUCT('intraday_20261109','20261109','message_send','2026-11-09 13:00:00+00','stale','2','success','stale'),
      STRUCT('intraday_20261110','20261110','message_send','2026-11-10 10:00:00+00','b','1','success','send-b')
    ]) r`;
  const generated = eventQuery(table).replace(`FROM ${identifier(table)}`, "FROM fixture");
  const query = `WITH fixture AS (${fixture}), ${generated.slice("WITH ".length)}`;
  const params = queryParameters({ start: "2026-11-09", end: "2026-11-10", days: 2, timezone: "UTC" });
  const [rows] = await client.query({ query, params, maximumBytesBilled: "1000000", location: "US" });
  const r = rows[0];
  assert.deepEqual(r.attributes.sort((a: { type: string }, b: { type: string }) => a.type.localeCompare(b.type)), [
    { type: "device", attribute: "mobile", users: 2 }, { type: "language", attribute: "en", users: 2 },
  ]);
  assert.deepEqual(r.installs.sort((a: { install_key: string }, b: { install_key: string }) => a.install_key.localeCompare(b.install_key)), [
    { install_key: "a", date: "2026-11-09", sent_dates: ["2026-11-09"] },
    { install_key: "b", date: "2026-11-09", sent_dates: ["2026-11-10"] },
  ]);
  assert.equal(r.events.reduce((n: number, e: { count: number }) => n + e.count, 0), 4);
  // Daily must win before filtering: stale intraday version 2 cannot reappear.
  const [filtered] = await client.query({ query, params: { ...params, version: "2" }, maximumBytesBilled: "1000000", location: "US" });
  assert.deepEqual(filtered[0].events, []);
  assert.deepEqual(filtered[0].attributes, []);
});
