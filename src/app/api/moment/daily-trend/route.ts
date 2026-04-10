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
      chatters: Number(r.chatters ?? 0),
      total_messages: Number(r.total_messages ?? 0),
      sessions: Number(r.sessions ?? 0),
      disposed_sessions: Number(r.disposed_sessions ?? 0),
      avg_msgs_per_session: Math.round(Number(r.avg_msgs_per_session ?? 0) * 10) / 10,
      avg_session_duration_sec: Math.round(Number(r.avg_session_duration_sec ?? 0)),
      revenue: Math.round(Number(r.revenue ?? 0) * 100) / 100,
      gift_users: Number(r.gift_users ?? 0),
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Daily trend error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
