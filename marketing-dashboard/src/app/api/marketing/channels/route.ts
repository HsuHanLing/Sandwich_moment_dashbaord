import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getChannelPerformanceQuery } from "@/lib/queries";
import { getMockChannels } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const useMock = process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(getMockChannels());
  }

  try {
    const [rows] = await bigquery.query({
      query: getChannelPerformanceQuery(days),
    });
    const data = (rows as Record<string, unknown>[]).map((r) => ({
      channel: String(r.channel ?? "Unknown"),
      spend: 0,
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      sessions: Number(r.sessions ?? 0),
      revenue: Number(r.revenue ?? 0),
      roas_pct: 0,
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error("BigQuery channels error:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels", details: String(error) },
      { status: 500 }
    );
  }
}
