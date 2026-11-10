import { NextResponse } from "next/server";
import { authorized } from "@/lib/analytics/contracts";
import { identifier } from "@/lib/analytics/sql";
import { bigquery } from "@/lib/bigquery";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET; const target = process.env.MOMENT_REVENUECAT_INBOX_TABLE;
  if (!secret || !target || !process.env.MOMENT_REVENUECAT_APP_ID) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try {
    const raw = await request.text(); if (raw.length > 1000000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    body = JSON.parse(raw);
    if (!body.event || typeof body.event.id !== "string" || typeof body.event.type !== "string" || body.event.app_id !== process.env.MOMENT_REVENUECAT_APP_ID) throw new Error("Invalid webhook or App ID");
  } catch { return NextResponse.json({ error: "Invalid webhook" }, { status: 400 }); }
  try {
    identifier(target); const [project, dataset, table] = target.split(".");
    await bigquery.dataset(dataset, { projectId: project }).table(table).insert([{ insertId: body.event.id, json: { event_id: body.event.id, event_type: body.event.type, payload: JSON.stringify(body), received_at: new Date().toISOString() } }], { raw: true });
    // Durable inbox only: promotion requires canonical identity, transaction
    // attribution and refund reconciliation. Never infer purchase source from
    // mutable subscriber attributes or credit a cancellation as a new purchase.
    return NextResponse.json({ received: true, reconciliation_required: true });
  } catch (e) { console.error("RevenueCat inbox failed", e instanceof Error ? e.message : "Unknown error"); return NextResponse.json({ error: "Inbox unavailable; retry" }, { status: 503 }); }
}
