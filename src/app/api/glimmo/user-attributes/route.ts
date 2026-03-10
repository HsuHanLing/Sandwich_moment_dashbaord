import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoUserAttributesQuery, getGlimmoLanguageDistQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  try {
    const [[deviceRows], [langRows]] = await Promise.all([
      glimmoBigquery.query({ query: getGlimmoUserAttributesQuery(days) }),
      glimmoBigquery.query({ query: getGlimmoLanguageDistQuery(days) }),
    ]);

    return NextResponse.json({
      device: deviceRows,
      language: langRows,
    });
  } catch (error) {
    console.error("Glimmo user-attributes error:", error);
    return NextResponse.json({ device: [], language: [] }, { status: 500 });
  }
}
