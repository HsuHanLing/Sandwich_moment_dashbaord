import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getContentFeedQuery } from "@/lib/queries";
import { getMockContentFeed } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const useMock =
    process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(getMockContentFeed());
  }

  try {
    const [rows] = await bigquery.query({
      query: getContentFeedQuery(days),
    });
    const r = (rows as { area: string; impressions: number; clicks: number; ctr: number }[]) || [];
    const circle = r.filter((x) =>
      ["好友", "ForYou", "Friend"].some((k) => x.area?.includes(k))
    ).slice(0, 3);
    const featureCards = r.filter((x) =>
      ["Sequel", "SUP", "引导", "创意", "邀请"].some((k) => x.area?.includes(k))
    ).slice(0, 5);
    const exclusives = r.filter((x) =>
      ["KOL", "creator", "创作者"].some((k) => x.area?.includes(k))
    ).slice(0, 2);
    const mapRow = (a: { area: string; impressions: number; clicks: number; ctr: number }) => ({
      area: a.area || "Other",
      impressions: Number(a.impressions),
      ctr: Number(a.ctr) || 0,
      completion: circle.some((c) => c.area === a.area) ? Number(a.ctr) * 2 : null,
      replay: circle.some((c) => c.area === a.area) ? Number(a.ctr) * 0.6 : null,
    });
    return NextResponse.json({
      circle: circle.map(mapRow),
      featureCards: featureCards.map((x) => ({ ...mapRow(x), completion: null, replay: null })),
      exclusives: exclusives.map(mapRow),
    });
  } catch (error) {
    console.error("BigQuery content-feed error:", error);
    return NextResponse.json(getMockContentFeed());
  }
}
