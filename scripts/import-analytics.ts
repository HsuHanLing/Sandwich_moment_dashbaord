import { readFile } from "node:fs/promises";
import { validateFeed } from "../src/lib/analytics/contracts.ts";

const args = process.argv.slice(2); const file = args.find(a => !a.startsWith("--"));
if (!file) throw new Error("Usage: npm run import:analytics -- feed.json [--send]");
const payload = JSON.parse(await readFile(file, "utf8"));
if (Array.isArray(payload.pending) && payload.pending.length) throw new Error("Resolve all reconciliation exceptions before ingestion or advancing coverage");
if (!Array.isArray(payload.rows)) throw new Error("Expected {feed,rows}");
const chunks = [];
for (let i = 0; i < payload.rows.length; i += 250) chunks.push(validateFeed({ feed: payload.feed, rows: payload.rows.slice(i, i + 250) }));
console.log(`Validated ${payload.rows.length} ${payload.feed} rows. ${args.includes("--send") ? "Sending." : "Dry run; no data written."}`);
if (args.includes("--send")) {
  const base = process.env.MOMENT_INGEST_URL; const secret = process.env.MOMENT_INGEST_SECRET;
  if (!base || !secret) throw new Error("Configure MOMENT_INGEST_URL and MOMENT_INGEST_SECRET");
  const url = new URL(base);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Use HTTPS for remote ingestion");
  for (const chunk of chunks) {
    const response = await fetch(url, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` }, body: JSON.stringify(chunk) });
    if (!response.ok) throw new Error(`Ingestion returned ${response.status}; retry identical batches after resolving the error`);
  }
  console.log("All batches accepted.");
}
