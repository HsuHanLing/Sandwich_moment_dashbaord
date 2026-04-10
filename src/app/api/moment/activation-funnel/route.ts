import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getActivationFunnelQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [rows] = await bigquery.query({ query: getActivationFunnelQuery(days) });
    const r = (rows as Record<string, unknown>[])[0] || {};
    const n = (v: unknown) => Number(v ?? 0);
    const funnel = [
      { step: "new_installs", label: "New Installs", users: n(r.new_installs) },
      { step: "persona_exposed", label: "Persona Exposed", users: n(r.persona_exposed) },
      { step: "persona_swiped", label: "Persona Swiped", users: n(r.persona_swiped) },
      { step: "chat_entered", label: "Chat Entered", users: n(r.chat_entered) },
      { step: "chat_viewed", label: "Chat Viewed", users: n(r.chat_viewed) },
      { step: "message_sent", label: "Message Sent", users: n(r.message_sent) },
      { step: "image_requested", label: "Image Requested", users: n(r.image_requested) },
      { step: "gift_sent", label: "Gift Sent", users: n(r.gift_sent) },
    ];
    const base = funnel[0].users || 1;
    return NextResponse.json(funnel.map((f) => ({
      ...f,
      conversion: Math.round((f.users / base) * 1000) / 10,
    })));
  } catch (error) {
    console.error("Activation funnel error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
