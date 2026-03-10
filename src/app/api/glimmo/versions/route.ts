import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoVersionsQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoVersionsQuery() });
    const versions = (rows as { version: string }[]).map((r) => r.version).filter(Boolean);
    return NextResponse.json(versions);
  } catch (error) {
    console.error("Glimmo versions error:", error);
    return NextResponse.json([]);
  }
}
