import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getGeoDistributionQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [rows] = await bigquery.query({ query: getGeoDistributionQuery(days) });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Geo error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
