import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getTopEventsQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const limit = parseInt(searchParams.get("limit") || "15", 10);
  const useMock = process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json([
      { event: "screen_view", count: 188400930 },
      { event: "user_engagement", count: 68581775 },
      { event: "All_PageBehavior", count: 44940670 },
      { event: "Click_Sup", count: 18240977 },
      { event: "Open_app", count: 10559496 },
      { event: "session_start", count: 9831899 },
    ]);
  }

  try {
    const [rows] = await bigquery.query({
      query: getTopEventsQuery(days, limit),
    });
    const data = (rows as Record<string, unknown>[]).map((r) => ({
      event: String(r.event ?? "unknown"),
      count: Number(r.count ?? 0),
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error("BigQuery top-events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch top events", details: String(error) },
      { status: 500 }
    );
  }
}
