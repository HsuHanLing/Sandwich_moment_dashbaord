import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getCreatorSupplyQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface CreatorRow {
  creator_type: string;
  sup_exposure: number;
  sup_exposure_uv: number;
  sup_click_play: number;
  sup_click_play_uv: number;
  sup_click_play_rate: number;
  up_exposure: number;
  up_exposure_uv: number;
  up_click_unlock: number;
  up_click_unlock_uv: number;
  up_unlock_success: number;
  up_unlock_success_uv: number;
  up_click_unlock_rate: number;
  up_unlock_success_rate: number;
  up_overall_conversion_rate: number;
  up_revenue: number;
  profile_exposure: number;
  profile_exposure_uv: number;
  circle_events: number;
  explore_events: number;
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

function pct(v: unknown): number {
  return Math.round(Number(v ?? 0) * 10) / 10;
}

function toMetrics(r: CreatorRow) {
  return {
    sup_exposure: num(r.sup_exposure),
    sup_exposure_uv: num(r.sup_exposure_uv),
    sup_click_play: num(r.sup_click_play),
    sup_click_play_uv: num(r.sup_click_play_uv),
    sup_click_play_rate: pct(r.sup_click_play_rate),
    up_exposure: num(r.up_exposure),
    up_exposure_uv: num(r.up_exposure_uv),
    up_click_unlock: num(r.up_click_unlock),
    up_click_unlock_uv: num(r.up_click_unlock_uv),
    up_unlock_success: num(r.up_unlock_success),
    up_unlock_success_uv: num(r.up_unlock_success_uv),
    up_click_unlock_rate: pct(r.up_click_unlock_rate),
    up_unlock_success_rate: pct(r.up_unlock_success_rate),
    up_overall_conversion_rate: pct(r.up_overall_conversion_rate),
    up_revenue: Math.round(num(r.up_revenue) * 100) / 100,
    profile_exposure: num(r.profile_exposure),
    profile_exposure_uv: num(r.profile_exposure_uv),
    circle_events: num(r.circle_events),
    explore_events: num(r.explore_events),
  };
}

const EMPTY_METRICS = toMetrics({} as CreatorRow);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const [rows] = await bigquery.query({ query: getCreatorSupplyQuery(days) });
    const typed = (rows as CreatorRow[]) || [];

    const kol = typed.find((r) => r.creator_type === "KOL");
    const inf = typed.find((r) => r.creator_type === "Influencer");

    const kolMetrics = kol ? toMetrics(kol) : EMPTY_METRICS;
    const infMetrics = inf ? toMetrics(inf) : EMPTY_METRICS;

    const chart = [
      { metric: "SUP Exposure", KOL: kolMetrics.sup_exposure, Influencer: infMetrics.sup_exposure },
      { metric: "SUP Click Play", KOL: kolMetrics.sup_click_play, Influencer: infMetrics.sup_click_play },
      { metric: "$UP Exposure", KOL: kolMetrics.up_exposure, Influencer: infMetrics.up_exposure },
      { metric: "$UP Click Unlock", KOL: kolMetrics.up_click_unlock, Influencer: infMetrics.up_click_unlock },
      { metric: "$UP Unlock Success", KOL: kolMetrics.up_unlock_success, Influencer: infMetrics.up_unlock_success },
      { metric: "Profile Exposure", KOL: kolMetrics.profile_exposure, Influencer: infMetrics.profile_exposure },
    ];

    return NextResponse.json({
      chart,
      data: { KOL: kolMetrics, Influencer: infMetrics },
    });
  } catch (error) {
    console.error("BigQuery creator-supply error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
