import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getDailyTrendQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);
  const filters = {
    version: searchParams.get("version") || undefined,
    platform: searchParams.get("platform") || undefined,
    geo: searchParams.get("geo") || undefined,
  };
  try {
    const [rows] = await bigquery.query({ query: getDailyTrendQuery(days, filters) });
    const data = (rows as Record<string, unknown>[]).map((r) => ({
      date: String(r.date ?? ""),
      dau: Number(r.dau ?? 0),
      new_users: Number(r.new_users ?? 0),
      guide_users: Number(r.guide_users ?? 0),
      chatters: Number(r.chatters ?? 0),
      total_messages: Number(r.total_messages ?? 0),
      sessions: Number(r.sessions ?? 0),
      disposed_sessions: Number(r.disposed_sessions ?? 0),
      valid_sessions: Number(r.valid_sessions ?? 0),
      deep_sessions: Number(r.deep_sessions ?? 0),
      avg_msgs_per_session: Math.round(Number(r.avg_msgs_per_session ?? 0) * 10) / 10,
      avg_session_duration_sec: Math.round(Number(r.avg_session_duration_sec ?? 0)),
      activated_users: Number(r.activated_users ?? 0),
      activation_rate: Math.round(Number(r.activation_rate ?? 0) * 1000) / 10,
      dispose_rate: Math.round(Number(r.dispose_rate ?? 0) * 1000) / 10,
      revenue: Math.round(Number(r.revenue ?? 0) * 100) / 100,
      gift_users: Number(r.gift_users ?? 0),
      d1_cohort_size: Number(r.d1_cohort_size ?? 0),
      retained_d1: Number(r.retained_d1 ?? 0),
      d1_retention_rate: Math.round(Number(r.d1_retention_rate ?? 0) * 1000) / 10,
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Daily trend error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
