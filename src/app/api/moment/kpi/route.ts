import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getKPIAndWowQuery } from "@/lib/queries";
import {
  getDailySubscriptionRevenue,
  revenueByDateMap,
} from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") || "today") as "today" | "7d" | "30d";
  const filters = {
    version: searchParams.get("version") || undefined,
    platform: searchParams.get("platform") || undefined,
    geo: searchParams.get("geo") || undefined,
  };
  try {
    const days = mode === "today" ? 8 : mode === "7d" ? 14 : 60;
    const [[rows], rcDaily] = await Promise.all([
      bigquery.query({ query: getKPIAndWowQuery(mode, filters) }),
      getDailySubscriptionRevenue(days, {
        platform: filters.platform,
        geo: filters.geo,
      }),
    ]);
    const data = rows as Record<string, unknown>[];
    if (!data.length) return NextResponse.json({ error: "No data" }, { status: 404 });

    const rcMap = revenueByDateMap(rcDaily);
    const withRevenue: Record<string, unknown>[] = data.map((r) => {
      const date = String(r.date_str ?? "");
      const recharge = Number(r.revenue ?? 0);
      const sub = rcMap.get(date) ?? 0;
      return { ...r, revenue: recharge + sub };
    });

    const n = (v: unknown) => Number(v ?? 0);
    const latest = withRevenue[0]!;
    const prev = (withRevenue.length >= 8 ? withRevenue[7] : withRevenue[withRevenue.length - 1])!;

    const dau = n(latest.dau);
    const totalSessions = n(latest.total_sessions);
    const sessionsPerUser = dau > 0 ? Math.round((totalSessions / dau) * 100) / 100 : 0;
    const avgMsgs = Math.round(n(latest.avg_msgs_per_session) * 10) / 10;
    const avgDuration = Math.round(n(latest.avg_session_duration));
    const disposeRate = totalSessions > 0
      ? Math.round((n(latest.disposed_sessions) / totalSessions) * 1000) / 10
      : 0;
    const guideUsers = n(latest.guide_users);
    const activatedUsers = n(latest.activated_users);
    const activationRate = guideUsers > 0
      ? Math.round((activatedUsers / guideUsers) * 1000) / 10
      : 0;
    const revenue = Math.round(n(latest.revenue) * 100) / 100;
    const arpu = dau > 0 ? Math.round((revenue / dau) * 100) / 100 : 0;
    const d1Cohort = n(latest.d1_cohort_size);
    const d1Retained = n(latest.retained_d1);
    const d1Retention = d1Cohort > 0 ? Math.round((d1Retained / d1Cohort) * 1000) / 10 : 0;

    const prevDau = n(prev.dau);
    const prevSessions = n(prev.total_sessions);
    const prevSessionsPerUser = prevDau > 0 ? Math.round((prevSessions / prevDau) * 100) / 100 : 0;
    const prevAvgMsgs = Math.round(n(prev.avg_msgs_per_session) * 10) / 10;
    const prevAvgDuration = Math.round(n(prev.avg_session_duration));
    const prevRevenue = Math.round(n(prev.revenue) * 100) / 100;
    const prevArpu = prevDau > 0 ? Math.round((prevRevenue / prevDau) * 100) / 100 : 0;
    const prevD1Cohort = n(prev.d1_cohort_size);
    const prevD1Retained = n(prev.retained_d1);
    const prevD1Retention = prevD1Cohort > 0 ? Math.round((prevD1Retained / prevD1Cohort) * 1000) / 10 : 0;
    const prevGuideUsers = n(prev.guide_users);
    const prevActivatedUsers = n(prev.activated_users);
    const prevActivationRate = prevGuideUsers > 0
      ? Math.round((prevActivatedUsers / prevGuideUsers) * 1000) / 10 : 0;

    return NextResponse.json({
      data_range_start: withRevenue[withRevenue.length - 1]?.date_str || "",
      data_range_end: latest.date_str || "",
      dau, new_users: n(latest.new_users), chatters: n(latest.chatters),
      sessions_per_user: sessionsPerUser,
      avg_msgs_per_session: avgMsgs,
      avg_session_duration: avgDuration,
      dispose_rate: disposeRate,
      activation_rate: activationRate,
      revenue, arpu,
      d1_retention: d1Retention,
      gift_users: n(latest.gift_users),
      valid_sessions: n(latest.valid_sessions),
      deep_sessions: n(latest.deep_sessions),
      wow_dau: prevDau,
      wow_sessions_per_user: prevSessionsPerUser,
      wow_avg_msgs: prevAvgMsgs,
      wow_avg_duration: prevAvgDuration,
      wow_revenue: prevRevenue,
      wow_arpu: prevArpu,
      wow_d1_retention: prevD1Retention,
      wow_activation_rate: prevActivationRate,
    });
  } catch (error) {
    console.error("KPI query error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
