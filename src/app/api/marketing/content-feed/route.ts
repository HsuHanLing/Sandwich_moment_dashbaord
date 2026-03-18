import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getContentFeedQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface RawRow {
  result_type: string;
  date_str: string | null;
  sup_posts: number;
  up_posts: number;
  sequel_posts: number;
  sup_exposure: number;
  sup_exposure_uv: number;
  sup_click_play: number;
  sup_click_play_uv: number;
  sup_click_rate: number;
  sup_like_count: number;
  sup_like_uv: number;
  sup_like_rate: number;
  up_exposure: number;
  up_exposure_uv: number;
  up_click_unlock: number;
  up_click_unlock_uv: number;
  up_unlock_success: number;
  up_unlock_success_uv: number;
  up_click_unlock_rate: number;
  up_unlock_success_rate: number;
  up_revenue: number;
  up_like_count: number;
  up_like_uv: number;
  up_like_rate: number;
}

function n(v: unknown): number {
  return Number(v ?? 0);
}

function pct(v: unknown): number {
  return Math.round(Number(v ?? 0) * 10) / 10;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const [rows] = await bigquery.query({ query: getContentFeedQuery(days) });
    const all = (rows as RawRow[]) || [];

    const dailyRows = all
      .filter((r) => r.result_type === "daily" && r.date_str)
      .sort((a, b) => (a.date_str! < b.date_str! ? -1 : 1));

    const daily = dailyRows.map((r) => ({
      date: r.date_str!,
      sup: n(r.sup_posts),
      up: n(r.up_posts),
      sequel: n(r.sequel_posts),
    }));

    const m = all.find((r) => r.result_type === "metrics");

    const sup = {
      exposure: n(m?.sup_exposure),
      exposure_uv: n(m?.sup_exposure_uv),
      click_play: n(m?.sup_click_play),
      click_play_uv: n(m?.sup_click_play_uv),
      click_rate: pct(m?.sup_click_rate),
      like_count: n(m?.sup_like_count),
      like_uv: n(m?.sup_like_uv),
      like_rate: pct(m?.sup_like_rate),
    };

    const up = {
      exposure: n(m?.up_exposure),
      exposure_uv: n(m?.up_exposure_uv),
      click_unlock: n(m?.up_click_unlock),
      click_unlock_uv: n(m?.up_click_unlock_uv),
      unlock_success: n(m?.up_unlock_success),
      unlock_success_uv: n(m?.up_unlock_success_uv),
      click_unlock_rate: pct(m?.up_click_unlock_rate),
      unlock_success_rate: pct(m?.up_unlock_success_rate),
      revenue: Math.round(n(m?.up_revenue) * 100) / 100,
      like_count: n(m?.up_like_count),
      like_uv: n(m?.up_like_uv),
      like_rate: pct(m?.up_like_rate),
    };

    return NextResponse.json({ daily, sup, up });
  } catch (error) {
    console.error("BigQuery content-feed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
