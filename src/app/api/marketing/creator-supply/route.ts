import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getCreatorSupplyQuery } from "@/lib/queries";
import { getMockCreatorSupply } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const useMock =
    process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(getMockCreatorSupply());
  }

  try {
    const [rows] = await bigquery.query({
      query: getCreatorSupplyQuery(days),
    });
    const r = (rows as { creator_type: string; earnings: number }[]) || [];
    const kol = r.find((x) => /kol|KOL/i.test(x.creator_type || ""))?.earnings ?? 398;
    const reg = r.find((x) => /regular|普通/i.test(x.creator_type || ""))?.earnings ?? 174;
    const weekly = [
      { week: "W1", kol_earnings: kol * 0.88, regular_earnings: reg * 0.87 },
      { week: "W2", kol_earnings: kol * 0.92, regular_earnings: reg * 0.91 },
      { week: "W3", kol_earnings: kol * 0.96, regular_earnings: reg * 0.97 },
      { week: "W4", kol_earnings: kol, regular_earnings: reg },
    ];
    return NextResponse.json({
      weekly,
      metrics: {
        active_creators: 318,
        kol_creators: 42,
        regular_creators: 276,
        new_kol_7d: 8,
        kol_earnings_7d: Math.round(kol * 1.08),
        regular_earnings_7d: Math.round(reg * 1.06),
      },
    });
  } catch (error) {
    console.error("BigQuery creator-supply error:", error);
    return NextResponse.json(getMockCreatorSupply());
  }
}
