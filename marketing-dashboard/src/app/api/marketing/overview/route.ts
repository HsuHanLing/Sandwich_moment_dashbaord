import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getOverviewQuery } from "@/lib/queries";
import { getMockOverview } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const useMock = process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(getMockOverview());
  }

  try {
    const [rows] = await bigquery.query({
      query: getOverviewQuery(days),
    });
    const row = (rows as Record<string, unknown>[])[0] || {};
    return NextResponse.json({
      total_spend: 0,
      total_impressions: Number(row.total_impressions ?? 0),
      total_clicks: Number(row.total_clicks ?? 0),
      total_engagement: Number(row.total_engagement ?? 0),
      total_app_opens: Number(row.total_app_opens ?? 0),
      total_sessions: Number(row.total_sessions ?? 0),
      total_conversions: Number(row.total_conversions ?? 0),
      total_revenue: Number(row.total_revenue ?? 0),
    });
  } catch (error) {
    console.error("BigQuery overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview", details: String(error) },
      { status: 500 }
    );
  }
}
