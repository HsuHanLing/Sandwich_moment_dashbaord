import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getHealthDashboardQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [rows] = await bigquery.query({ query: getHealthDashboardQuery(days) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    const pct = (v: unknown) => Math.round(Number(v ?? 0) * 1000) / 10;
    const indicators = [
      { id: "activation_rate", label: "Activation Rate", value: pct(r.activation_rate), unit: "%", healthy: 40, warning: 20 },
      { id: "chat_engagement", label: "Chat Engagement", value: pct(r.chat_engagement_rate), unit: "%", healthy: 50, warning: 30 },
      { id: "persona_to_chat", label: "Persona → Chat", value: pct(r.persona_to_chat_rate), unit: "%", healthy: 30, warning: 15 },
      { id: "dispose_rate", label: "Dispose Rate", value: pct(r.dispose_rate), unit: "%", healthy: 60, warning: 40 },
      { id: "image_unlock", label: "Image Unlock Rate", value: pct(r.image_unlock_rate), unit: "%", healthy: 15, warning: 5 },
      { id: "pay_rate", label: "Pay Rate", value: pct(r.pay_rate), unit: "%", healthy: 3, warning: 1 },
      { id: "gift_rate", label: "Gift Rate", value: pct(r.gift_rate), unit: "%", healthy: 10, warning: 3 },
      { id: "membership_rate", label: "Membership Rate", value: pct(r.membership_rate), unit: "%", healthy: 2, warning: 0.5 },
    ];
    return NextResponse.json({
      indicators: indicators.map((ind) => ({
        ...ind,
        status: ind.value >= ind.healthy ? "healthy" : ind.value >= ind.warning ? "warning" : "danger",
      })),
      revenue: Math.round(Number(r.total_revenue ?? 0) * 100) / 100,
      dau_avg: Math.round(Number(r.dau_sum ?? 0) / Math.max(days, 1)),
    });
  } catch (error) {
    console.error("Health dashboard error:", error);
    return NextResponse.json({ indicators: [], revenue: 0, dau_avg: 0 }, { status: 500 });
  }
}
