import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { bigquery } from "@/lib/bigquery";
import { authorized, validateFeed } from "@/lib/analytics/contracts";
import { identifier } from "@/lib/analytics/sql";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!process.env.MOMENT_INGEST_SECRET) return NextResponse.json({ error: "Feed not configured" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), process.env.MOMENT_INGEST_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let feed;
  try {
    const raw = await request.text(); if (raw.length > 1000000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    feed = validateFeed(JSON.parse(raw));
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid feed" }, { status: 400 }); }
  const table = process.env[`MOMENT_${feed.feed.toUpperCase()}_TABLE`];
  if (!table) return NextResponse.json({ error: "Target table not configured" }, { status: 503 });
  try {
    identifier(table); const [project, dataset, name] = table.split(".");
    await bigquery.dataset(dataset, { projectId: project }).table(name).insert(feed.rows.map(row => ({ insertId: createHash("sha256").update(JSON.stringify({ ...row, ingested_at: undefined })).digest("hex"), json: row })), { raw: true, skipInvalidRows: false, ignoreUnknownValues: false });
    return NextResponse.json({ accepted: feed.rows.length });
  } catch (e) { console.error("Moment ingestion failed", e instanceof Error ? e.message : "Unknown error"); return NextResponse.json({ error: "Ingestion failed; safe to retry identical rows" }, { status: 503 }); }
}
