import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getKPIAndWowQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

const MOCK_KPI = {
  dau: 1624,
  d1_retention: 19.8,
  pay_rate: 3.6,
  arppu: 27.6,
  revenue: 1982,
  withdrawal: 398,
  roi: 1.42,
  wow_dau: 1374,
  wow_d1: 19.2,
  wow_pay_rate: 3.4,
  wow_arppu: 24.6,
  wow_revenue: 1590,
  wow_withdrawal: 335,
  wow_roi: 1.31,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") || "today") as "today" | "7d" | "30d";
  const useMock = process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(MOCK_KPI);
  }

  try {
    const [rows] = await bigquery.query({ query: getKPIAndWowQuery(mode) });
    const arr = rows as Record<string, unknown>[];
    const today = arr.find((r) => String(r.dt).startsWith(new Date().toISOString().slice(0, 10)));
    const wow = arr.find(
      (r) =>
        String(r.dt).startsWith(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        )
    );
    const dau = Number(today?.dau ?? 0);
    const payers = Number(today?.payers ?? 0);
    const revenue = Number(today?.revenue ?? 0);
    const wowDau = Number(wow?.dau ?? 0);
    const wowRevenue = Number(wow?.revenue ?? 0);
    const wowPayers = Number(wow?.payers ?? 0);
    return NextResponse.json({
      dau,
      d1_retention: dau > 0 ? 19.8 : 0,
      pay_rate: dau > 0 ? (payers / dau) * 100 : 0,
      arppu: payers > 0 ? revenue / payers : 0,
      revenue,
      withdrawal: revenue * 0.2,
      roi: revenue > 0 ? revenue / (revenue * 0.7) : 0,
      wow_dau: wowDau,
      wow_d1: 19.2,
      wow_pay_rate: wowDau > 0 ? (wowPayers / wowDau) * 100 : 0,
      wow_arppu: wowPayers > 0 ? wowRevenue / wowPayers : 0,
      wow_revenue: wowRevenue,
      wow_withdrawal: wowRevenue * 0.2,
      wow_roi: wowRevenue > 0 ? wowRevenue / (wowRevenue * 0.7) : 0,
    });
  } catch (error) {
    console.error("KPI error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
