import { NextResponse } from "next/server";
import { glimmoBigquery } from "@/lib/glimmo-bigquery";
import { getGlimmoFlywheelQuery } from "@/lib/glimmo-queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  try {
    const [rows] = await glimmoBigquery.query({ query: getGlimmoFlywheelQuery(days) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

    const firstOpen = n(r.first_open_users);
    const onboardingComplete = n(r.onboarding_complete);
    const firstPosters = n(r.first_posters);
    const aiEngaged = n(r.ai_engaged);
    const habitUsers = n(r.habit_users);
    const emotionalValue = n(r.emotional_value);
    const shareUsers = n(r.share_users);
    const premiumViewers = n(r.premium_viewers);
    const totalActive = n(r.total_active);
    const firstOpen7d = n(r.first_open_7d);
    const firstOpenPrev7d = n(r.first_open_prev7d);

    const discoveryWoW = firstOpenPrev7d > 0
      ? Math.round(((firstOpen7d - firstOpenPrev7d) / firstOpenPrev7d) * 100)
      : 0;

    const classify = (val: number, good: number, warn: number): "healthy" | "warning" | "broken" => {
      if (val >= good) return "healthy";
      if (val >= warn) return "warning";
      return "broken";
    };

    const nodes = [
      {
        id: "discovery",
        name: "Discovery",
        nameCn: "发现",
        metrics: { first_open: firstOpen, first_open_7d: firstOpen7d, wow_change: discoveryWoW, daily_avg: Math.round(firstOpen / Math.max(days, 1)) },
        status: classify(firstOpen7d, 20, 5),
        score: Math.min(10, Math.round((firstOpen7d / 20) * 10)),
        conversion: null as number | null,
        conversion_num: null as number | null,
        conversion_denom: null as number | null,
        benchmark: "20+/week new users",
      },
      {
        id: "onboarding",
        name: "Onboarding",
        nameCn: "新手引导",
        metrics: { completed: onboardingComplete, rate: pct(onboardingComplete, firstOpen) },
        status: classify(pct(onboardingComplete, firstOpen), 70, 40),
        score: Math.min(10, Math.round((pct(onboardingComplete, firstOpen) / 80) * 10)),
        conversion: pct(onboardingComplete, firstOpen),
        conversion_num: onboardingComplete,
        conversion_denom: firstOpen,
        benchmark: "70%+ complete onboarding",
      },
      {
        id: "first_entry",
        name: "First Entry",
        nameCn: "首次日记",
        metrics: { first_posters: firstPosters, rate: pct(firstPosters, firstOpen), total_entries: n(r.total_entries) },
        status: classify(pct(firstPosters, firstOpen), 50, 25),
        score: Math.min(10, Math.round((pct(firstPosters, firstOpen) / 65) * 10)),
        conversion: pct(firstPosters, firstOpen),
        conversion_num: firstPosters,
        conversion_denom: firstOpen,
        benchmark: "50%+ of first open write first entry",
      },
      {
        id: "ai_engagement",
        name: "AI Engagement",
        nameCn: "AI 互动",
        metrics: { ai_users: aiEngaged, rate: pct(aiEngaged, firstOpen), bot_reply_users: n(r.bot_reply_users), bot_replies: n(r.bot_replies), companion_creators: n(r.companion_creators) },
        status: classify(pct(aiEngaged, firstOpen), 30, 15),
        score: Math.min(10, Math.round((pct(aiEngaged, firstOpen) / 40) * 10)),
        conversion: pct(aiEngaged, firstOpen),
        conversion_num: aiEngaged,
        conversion_denom: firstOpen,
        benchmark: "30%+ of first open use AI",
      },
      {
        id: "habit_loop",
        name: "Habit Loop",
        nameCn: "习惯养成",
        metrics: { habit_users: habitUsers, rate: pct(habitUsers, firstOpen), total_writers: n(r.total_writers) },
        status: classify(pct(habitUsers, firstOpen), 15, 5),
        score: Math.min(10, Math.round((pct(habitUsers, firstOpen) / 20) * 10)),
        conversion: pct(habitUsers, firstOpen),
        conversion_num: habitUsers,
        conversion_denom: firstOpen,
        benchmark: "15%+ of first open journal 3+ days",
      },
      {
        id: "emotional_value",
        name: "Emotional Value",
        nameCn: "情感价值",
        metrics: { users: emotionalValue, rate: pct(emotionalValue, firstOpen), new_collection_users: n(r.new_collection_users), insight_writers: n(r.insight_writers) },
        status: classify(pct(emotionalValue, firstOpen), 40, 20),
        score: Math.min(10, Math.round((pct(emotionalValue, firstOpen) / 50) * 10)),
        conversion: pct(emotionalValue, firstOpen),
        conversion_num: emotionalValue,
        conversion_denom: firstOpen,
        benchmark: "40%+ of first open use Insight/Collection",
      },
      {
        id: "share",
        name: "Share / Social",
        nameCn: "社交分享",
        metrics: { share_users: shareUsers, rate: pct(shareUsers, firstOpen) },
        status: classify(pct(shareUsers, firstOpen), 5, 1),
        score: Math.min(10, Math.round((pct(shareUsers, firstOpen) / 8) * 10)),
        conversion: pct(shareUsers, firstOpen),
        conversion_num: shareUsers,
        conversion_denom: firstOpen,
        benchmark: "5%+ of first open share socially",
      },
      {
        id: "premium",
        name: "Premium",
        nameCn: "订阅转化",
        metrics: { viewers: premiumViewers, rate: pct(premiumViewers, firstOpen) },
        status: classify(pct(premiumViewers, firstOpen), 30, 15),
        score: Math.min(10, Math.round((pct(premiumViewers, firstOpen) / 40) * 10)),
        conversion: pct(premiumViewers, firstOpen),
        conversion_num: premiumViewers,
        conversion_denom: firstOpen,
        benchmark: "30%+ of first open view subscription",
      },
    ];

    const overallScore = Math.round(nodes.reduce((s, nd) => s + nd.score, 0) / nodes.length);

    return NextResponse.json({
      nodes,
      overallScore,
      summary: { total_active: totalActive, new_users: firstOpen, writers: n(r.total_writers), entries: n(r.total_entries) },
      days,
    });
  } catch (error) {
    console.error("Glimmo flywheel error:", error);
    return NextResponse.json({ nodes: [], overallScore: 0, summary: {}, days, error: String(error) });
  }
}
