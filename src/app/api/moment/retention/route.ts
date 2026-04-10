import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getRetentionQuery, getReturningSessionsQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [retRows, retSessionRows] = await Promise.all([
      bigquery.query({ query: getRetentionQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getReturningSessionsQuery(days) }).then(([r]) => r),
    ]);
    const n = (v: unknown) => Number(v ?? 0);
    return NextResponse.json({
      retention: (retRows as Record<string, unknown>[]).map((r) => ({
        day: `D${r.day_n}`,
        retained: n(r.retained),
        cohort_size: n(r.cohort_size),
        rate: n(r.cohort_size) > 0 ? Math.round((n(r.retained) / n(r.cohort_size)) * 1000) / 10 : 0,
      })),
      returning_sessions: (retSessionRows as Record<string, unknown>[]).map((r) => ({
        date: String(r.date),
        active_users: n(r.active_users),
        returning_users: n(r.returning_users),
        total_sessions: n(r.total_sessions),
        returning_sessions: n(r.returning_sessions),
      })),
    });
  } catch (error) {
    console.error("Retention error:", error);
    return NextResponse.json({ retention: [], returning_sessions: [] }, { status: 500 });
  }
}
