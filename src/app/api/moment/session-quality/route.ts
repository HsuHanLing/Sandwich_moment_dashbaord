import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getSessionQualityQuery, getMessageDistributionQuery, getDurationDistributionQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [summaryRows, msgRows, durRows] = await Promise.all([
      bigquery.query({ query: getSessionQualityQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getMessageDistributionQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getDurationDistributionQuery(days) }).then(([r]) => r),
    ]);
    const s = (summaryRows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);
    return NextResponse.json({
      summary: {
        total_sessions: n(s.total_sessions),
        avg_messages: Math.round(n(s.avg_messages) * 10) / 10,
        avg_duration_sec: Math.round(n(s.avg_duration_sec)),
        deep_conversation_rate: Math.round(n(s.deep_conversation_rate) * 1000) / 10,
        shallow_rate: Math.round(n(s.shallow_rate) * 1000) / 10,
        deep_sessions: n(s.deep_sessions),
        shallow_sessions: n(s.shallow_sessions),
        valid_sessions: n(s.valid_sessions),
        valid_session_rate: Math.round(n(s.valid_session_rate) * 1000) / 10,
        median_messages: n(s.median_messages),
        median_duration_sec: n(s.median_duration_sec),
        dispose_swipe: n(s.dispose_swipe),
        dispose_popup: n(s.dispose_popup),
      },
      message_distribution: (msgRows as Record<string, unknown>[]).map((r) => ({
        bucket: String(r.bucket),
        session_count: n(r.session_count),
      })),
      duration_distribution: (durRows as Record<string, unknown>[]).map((r) => ({
        bucket: String(r.bucket),
        session_count: n(r.session_count),
      })),
    });
  } catch (error) {
    console.error("Session quality error:", error);
    return NextResponse.json({ summary: {}, message_distribution: [], duration_distribution: [] }, { status: 500 });
  }
}
