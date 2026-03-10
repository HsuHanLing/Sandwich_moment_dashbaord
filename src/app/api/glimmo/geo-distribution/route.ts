import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoGeoDistributionQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoGeoDistributionQuery(days) });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Glimmo geo-distribution error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
