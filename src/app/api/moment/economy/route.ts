import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getEconomyHealthQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [rows] = await bigquery.query({ query: getEconomyHealthQuery(days) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);
    return NextResponse.json({
      battery: {
        charged: n(r.battery_charged),
        consumed: n(r.battery_consumed),
        users: n(r.battery_users),
      },
      coins: {
        earned: n(r.coins_earned),
        spent: n(r.coins_spent),
        users: n(r.coin_users),
        unlocks: n(r.coin_unlocks),
      },
      ads: {
        views: n(r.ad_views),
        users: n(r.ad_users),
        forced: n(r.forced_ads),
      },
      unlocks: {
        attempts: n(r.total_unlock_attempts),
        users: n(r.unlock_users),
        successful: n(r.successful_unlocks),
        balance_fails: n(r.balance_fails),
      },
    });
  } catch (error) {
    console.error("Economy error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
