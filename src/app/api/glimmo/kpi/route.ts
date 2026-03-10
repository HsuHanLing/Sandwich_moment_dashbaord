import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoKPIQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") || "today") as "today" | "7d" | "30d";
  const filters = {
    version: searchParams.get("version") || undefined,
    geo: searchParams.get("geo") || undefined,
  };

  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoKPIQuery(mode, filters) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);

    return NextResponse.json({
      dau: n(r.dau),
      new_users: n(r.new_users),
      d1_retention: n(r.d1_retention),
      journal_entries: n(r.journal_entries),
      ai_users: n(r.ai_users),
      sub_viewers: n(r.sub_viewers),
      wow_dau: n(r.wow_dau),
      wow_new_users: n(r.wow_new_users),
      wow_journal_entries: n(r.wow_journal_entries),
      wow_ai_users: n(r.wow_ai_users),
      wow_sub_viewers: n(r.wow_sub_viewers),
      d1_cohort: n(r.d1_cohort),
      d1_retained: n(r.d1_retained),
      data_updated_at: new Date().toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Glimmo KPI error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
