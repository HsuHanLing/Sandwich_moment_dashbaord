import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getKPIAndWowQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

function parseRow(r: Record<string, unknown>) {
  const dateStr = String(r.date_str ?? r.dt ?? "").slice(0, 10);
  const pseudoDau = Number(r.pseudo_dau ?? 0);
  const dau = Number(r.dau ?? 0);
  const newUsers = Number(r.new_users ?? 0);
  const payers = Number(r.payers ?? 0);
  const revenue = Number(r.revenue ?? 0);
  const retainedD1 = Number(r.retained_d1 ?? 0);
  const prevDayRegistrations = Number(r.prev_day_registrations ?? 0);
  const d1Retention = prevDayRegistrations > 0 ? (retainedD1 / prevDayRegistrations) * 100 : 0;
  return { dateStr, pseudoDau, dau, newUsers, payers, revenue, d1Retention };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") || "today") as "today" | "7d" | "30d";
  const channel = searchParams.get("channel") || undefined;
  const version = searchParams.get("version") || undefined;
  const userSegment = searchParams.get("userSegment") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const geo = searchParams.get("geo") || undefined;
  const filters = (channel || version || userSegment || platform || geo) ? { channel, version, userSegment, platform, geo } : undefined;

  try {
    const [rows] = await bigquery.query({ query: getKPIAndWowQuery(mode, filters) });
    const arr = (rows as Record<string, unknown>[]) || [];
    // Use max date from actual KPI data (not separate query) so Last updated matches chart/table
    const dataUpdatedAt = arr.length
      ? String(parseRow(arr[0]).dateStr)
      : null;
    if (!arr.length) {
      return NextResponse.json({ error: "No KPI data" }, { status: 500 });
    }

    const span = mode === "today" ? 1 : mode === "7d" ? 7 : 30;
    const currRows = arr.slice(0, span);
    const wowRows = mode === "today" ? arr.slice(6, 7) : arr.slice(span, span * 2);

    const sum = (list: { pseudoDau: number; dau: number; payers: number; revenue: number; d1Retention: number; newUsers: number }[]) => {
      const pseudoDau = list.reduce((s, x) => s + x.pseudoDau, 0);
      const dau = list.reduce((s, x) => s + x.dau, 0);
      const payers = list.reduce((s, x) => s + x.payers, 0);
      const revenue = list.reduce((s, x) => s + x.revenue, 0);
      const d1Avg = list.length ? list.reduce((s, x) => s + x.d1Retention, 0) / list.length : 0;
      return { pseudoDau, dau, payers, revenue, d1Retention: d1Avg };
    };

    const curr = sum(currRows.map(parseRow));
    const wow = sum(wowRows.map(parseRow));

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const start = new Date(now);
    if (mode === "today") start.setDate(start.getDate());
    else if (mode === "7d") start.setDate(start.getDate() - 6);
    else start.setDate(start.getDate() - 29);
    const rangeStart = start.toISOString().slice(0, 10);

    return NextResponse.json({
      data_range_start: rangeStart,
      data_range_end: today,
      data_updated_at: dataUpdatedAt,
      pseudo_dau: curr.pseudoDau,
      dau: curr.dau,
      d1_retention: Math.round(curr.d1Retention * 10) / 10,
      pay_rate: curr.dau > 0 ? Math.round((curr.payers / curr.dau) * 1000) / 10 : 0,
      arppu: curr.payers > 0 ? Math.round((curr.revenue / curr.payers) * 100) / 100 : 0,
      revenue: Math.round(curr.revenue * 100) / 100,
      withdrawal: Math.round(curr.revenue * 0.2 * 100) / 100,
      roi: curr.revenue > 0 ? Math.round((curr.revenue / (curr.revenue * 0.7)) * 100) / 100 : 0,
      wow_pseudo_dau: wow.pseudoDau,
      wow_dau: wow.dau,
      wow_d1: Math.round(wow.d1Retention * 10) / 10,
      wow_pay_rate: wow.dau > 0 ? Math.round((wow.payers / wow.dau) * 1000) / 10 : 0,
      wow_arppu: wow.payers > 0 ? Math.round((wow.revenue / wow.payers) * 100) / 100 : 0,
      wow_revenue: Math.round(wow.revenue * 100) / 100,
      wow_withdrawal: Math.round(wow.revenue * 0.2 * 100) / 100,
      wow_roi: wow.revenue > 0 ? Math.round((wow.revenue / (wow.revenue * 0.7)) * 100) / 100 : 0,
    });
  } catch (error) {
    console.error("KPI error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
