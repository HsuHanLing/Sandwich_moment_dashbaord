import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoHealthDashboardQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoHealthDashboardQuery(days) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);

    const newUsers = n(r.new_users);
    const totalActive = n(r.total_active);
    const homepageViewers = n(r.homepage_viewers);
    const writers = n(r.writers);
    const aiUsers = n(r.ai_users);
    const emotionalUsers = n(r.emotional_users);
    const subViewers = n(r.sub_viewers);

    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

    const metrics = [
      { metric: "Onboarding Rate", value: `${pct(homepageViewers, newUsers)}%`, status: pct(homepageViewers, newUsers) >= 70 ? "healthy" : pct(homepageViewers, newUsers) >= 40 ? "warning" : "broken" },
      { metric: "Writing Rate", value: `${pct(writers, totalActive)}%`, status: pct(writers, totalActive) >= 30 ? "healthy" : pct(writers, totalActive) >= 15 ? "warning" : "broken" },
      { metric: "AI Usage Rate", value: `${pct(aiUsers, totalActive)}%`, status: pct(aiUsers, totalActive) >= 20 ? "healthy" : pct(aiUsers, totalActive) >= 8 ? "warning" : "broken" },
      { metric: "Emotional Value", value: `${pct(emotionalUsers, totalActive)}%`, status: pct(emotionalUsers, totalActive) >= 25 ? "healthy" : pct(emotionalUsers, totalActive) >= 10 ? "warning" : "broken" },
      { metric: "Premium Funnel", value: `${pct(subViewers, totalActive)}%`, status: pct(subViewers, totalActive) >= 15 ? "healthy" : pct(subViewers, totalActive) >= 5 ? "warning" : "broken" },
    ];

    return NextResponse.json({ metrics, summary: { new_users: newUsers, total_active: totalActive, writers } });
  } catch (error) {
    console.error("Glimmo health-dashboard error:", error);
    return NextResponse.json({ metrics: [], summary: {} }, { status: 500 });
  }
}
