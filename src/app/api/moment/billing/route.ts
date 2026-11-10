import { NextResponse } from "next/server";
import { parseContext } from "@/lib/analytics/context";
import { loadBilling } from "@/lib/analytics/revenuecat-billing";

// Kept separate from GA4/KPI queries: the first complete customer sweep can
// take two minutes. No customer IDs, API keys or raw transactions are returned.
export const maxDuration = 300;
export async function GET(request: Request) {
  let c;
  try { c = parseContext(new URL(request.url).searchParams); }
  catch { return NextResponse.json({ error: "Invalid billing date range or filters" }, { status: 400 }); }
  try {
    return NextResponse.json(await loadBilling(c), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Billing data unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
