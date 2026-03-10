import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoRetentionQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoRetentionQuery(days) });
    return NextResponse.json({ chart: rows });
  } catch (error) {
    console.error("Glimmo retention error:", error);
    return NextResponse.json({ chart: [] }, { status: 500 });
  }
}
