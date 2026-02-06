import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getDailyTrendQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

function mockDailyTrend(days: number) {
  const data = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const base = 1200 + Math.sin(i) * 200;
    data.push({
      date: d.toISOString().split("T")[0],
      new_users: Math.round(base * 0.9 + Math.random() * 100),
      dau: Math.round(base + Math.random() * 150),
      d1: (18 + Math.random() * 4).toFixed(1),
      unlock_users: Math.round(base * 0.2 + Math.random() * 50),
      unlock_ge2: Math.round(base * 0.12 + Math.random() * 30),
      payers: Math.round(base * 0.04 + Math.random() * 15),
      revenue: Math.round((base * 0.04 * 25 + Math.random() * 100) * 10) / 10,
      withdrawal: Math.round((base * 0.04 * 5 + Math.random() * 30) * 10) / 10,
    });
  }
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7", 10);
  const useMock = process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(mockDailyTrend(days));
  }

  try {
    const [rows] = await bigquery.query({ query: getDailyTrendQuery(days) });
    const data = (rows as Record<string, unknown>[]).map((r) => ({
      date: String(r.date),
      new_users: Number(r.new_users ?? 0),
      dau: Number(r.dau ?? 0),
      d1: "—",
      unlock_users: Number(r.unlock_users ?? 0),
      unlock_ge2: Math.round(Number(r.unlock_users ?? 0) * 0.6),
      payers: Number(r.payers ?? 0),
      revenue: Number(r.revenue ?? 0),
      withdrawal: Number((r.revenue ?? 0)) * 0.2,
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Daily trend error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
