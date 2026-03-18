import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getDailyTrendQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7", 10);
  const channel = searchParams.get("channel") || undefined;
  const version = searchParams.get("version") || undefined;
  const userSegment = searchParams.get("userSegment") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const geo = searchParams.get("geo") || undefined;
  const filters = (channel || version || userSegment || platform || geo) ? { channel, version, userSegment, platform, geo } : undefined;

  try {
    const [rows] = await bigquery.query({ query: getDailyTrendQuery(days, filters) });
    const data = (rows as Record<string, unknown>[]).map((r) => {
      const cohortSize = Number(r.d1_cohort_size ?? 0);
      const retainedD1 = Number(r.retained_d1 ?? 0);
      const d1Pct = cohortSize > 0 ? Math.round((retainedD1 / cohortSize) * 1000) / 10 : null;

      return {
        date: String(r.date),
        new_users: Number(r.new_users ?? 0),
        registration: Number(r.registration ?? 0),
        pseudo_dau: Number(r.pseudo_dau ?? 0),
        dau: Number(r.dau ?? 0),
        d1: d1Pct !== null ? `${d1Pct}%` : "—",
        d1_detail: cohortSize > 0 ? `${retainedD1}/${cohortSize}` : null,
        unlock_users: Number(r.unlock_users ?? 0),
        unlock_ge2: Number(r.unlock_ge2 ?? 0),
        payers: Number(r.payers ?? 0),
        revenue: Math.round(Number(r.revenue ?? 0) * 100) / 100,
        withdrawal: Math.round(Number(r.withdrawal ?? 0) * 100) / 100,
      };
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Daily trend error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
