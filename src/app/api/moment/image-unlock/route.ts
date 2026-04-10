import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getImageUnlockFlowQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [rows] = await bigquery.query({ query: getImageUnlockFlowQuery(days) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);
    return NextResponse.json({
      request_users: n(r.request_users),
      total_requests: n(r.total_requests),
      attempt_users: n(r.attempt_users),
      confirmed_users: n(r.confirmed_users),
      coin_unlock_users: n(r.coin_unlock_users),
      battery_unlock_users: n(r.battery_unlock_users),
      ad_unlock_users: n(r.ad_unlock_users),
      auto_unlock_users: n(r.auto_unlock_users),
      balance_fails: n(r.balance_fails),
    });
  } catch (error) {
    console.error("Image unlock error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
