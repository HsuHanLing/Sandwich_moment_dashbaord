import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoOverviewQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);
  const filters = {
    version: searchParams.get("version") || undefined,
    geo: searchParams.get("geo") || undefined,
  };

  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoOverviewQuery(days, filters) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    return NextResponse.json(r);
  } catch (error) {
    console.error("Glimmo overview error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
