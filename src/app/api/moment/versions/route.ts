import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getVersionsQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows] = await bigquery.query({ query: getVersionsQuery() });
    return NextResponse.json((rows as { version: string }[]).map((r) => r.version));
  } catch (error) {
    console.error("Versions error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
