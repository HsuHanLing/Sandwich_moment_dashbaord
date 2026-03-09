import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getRegistrationFunnelQuery } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FUNNEL_STEPS = ["app_open", "registered", "onboarding_complete", "enter_main"] as const;
const METHOD_STEPS = ["reg_google", "reg_apple", "reg_email", "reg_phone"] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const [rows] = await bigquery.query({
      query: getRegistrationFunnelQuery(days),
    });
    const raw = (rows as { step: string; users: number }[]) || [];
    const map = Object.fromEntries(raw.map((r) => [r.step, Number(r.users ?? 0)]));

    const appOpen = map["app_open"] ?? 0;
    const registered = map["registered"] ?? 0;

    const funnel = FUNNEL_STEPS.map((step) => ({
      step,
      users: map[step] ?? 0,
      fromTop: appOpen > 0 ? Math.round(((map[step] ?? 0) / appOpen) * 1000) / 10 : 0,
    }));

    const methods = METHOD_STEPS.map((step) => ({
      step,
      users: map[step] ?? 0,
      share: registered > 0 ? Math.round(((map[step] ?? 0) / registered) * 1000) / 10 : 0,
    }));

    return NextResponse.json({ funnel, methods }, { status: 200 });
  } catch (error) {
    console.error("BigQuery registration-funnel error:", error);
    return NextResponse.json(
      { funnel: [], methods: [] },
      { status: 500 }
    );
  }
}
