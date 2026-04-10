import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getBehaviourQuery, getPersonaPopularityQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [dailyRows, personaRows] = await Promise.all([
      bigquery.query({ query: getBehaviourQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getPersonaPopularityQuery(days) }).then(([r]) => r),
    ]);
    const n = (v: unknown) => Number(v ?? 0);
    return NextResponse.json({
      daily: (dailyRows as Record<string, unknown>[]).map((r) => ({
        date: String(r.date),
        dispose_rate: Math.round(n(r.dispose_rate) * 1000) / 10,
        disposes: n(r.disposes),
        chat_entries: n(r.chat_entries),
        persona_swipes: n(r.persona_swipes),
        swipe_users: n(r.swipe_users),
        restarts: n(r.restarts),
        greetings: n(r.greetings),
        fatigue_triggers: n(r.fatigue_triggers),
        report_users: n(r.report_users),
      })),
      personas: (personaRows as Record<string, unknown>[]).map((r) => ({
        virtual_id: String(r.virtual_id ?? ""),
        chat_entries: n(r.chat_entries),
        messages: n(r.messages),
        disposes: n(r.disposes),
        avg_msgs: Math.round(n(r.avg_msgs) * 10) / 10,
        avg_duration: Math.round(n(r.avg_duration)),
        unique_users: n(r.unique_users),
      })),
    });
  } catch (error) {
    console.error("Behaviour error:", error);
    return NextResponse.json({ daily: [], personas: [] }, { status: 500 });
  }
}
