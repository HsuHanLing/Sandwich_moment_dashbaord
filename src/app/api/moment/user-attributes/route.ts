import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getUserAttributesQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [rows] = await bigquery.query({ query: getUserAttributesQuery(days) });
    const data = rows as { metric_type: string; attr: string; users: number; share: number }[];
    return NextResponse.json({
      device: data.filter((r) => r.metric_type === "device").map((r) => ({ attr: r.attr, users: Number(r.users), share: Number(r.share) })),
      language: data.filter((r) => r.metric_type === "language").slice(0, 15).map((r) => ({ attr: r.attr, users: Number(r.users), share: Number(r.share) })),
    });
  } catch (error) {
    console.error("User attributes error:", error);
    return NextResponse.json({ device: [], language: [] }, { status: 500 });
  }
}
