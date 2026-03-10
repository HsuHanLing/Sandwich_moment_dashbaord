import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoDailyTrendQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);
  const filters = {
    version: searchParams.get("version") || undefined,
    geo: searchParams.get("geo") || undefined,
  };

  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoDailyTrendQuery(days, filters) });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Glimmo daily-trend error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
