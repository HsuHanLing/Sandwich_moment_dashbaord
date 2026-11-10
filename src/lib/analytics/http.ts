import { NextResponse } from "next/server";
import { parseContext, previousContext } from "./context";
import { loadReport } from "./service";
import { legacyResponse } from "./legacy";

export async function analyticsGET(request: Request) {
  let context;
  try { context = parseContext(new URL(request.url).searchParams); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid query" }, { status: 400 }); }
  try {
    const kind = new URL(request.url).pathname.split("/").pop() || "analytics";
    const [report, previous] = await Promise.all([loadReport(context, kind === "retention" ? 14 : 1), new URL(request.url).searchParams.get("compare") === "true" ? loadReport(previousContext(context)) : Promise.resolve(null)]);
    // Ledger revenue attributes refunds to the original purchase; Charts uses
    // refund posting dates. Never compute a change across different bases.
    const prior = previous && report.meta.revenue_source !== previous.meta.revenue_source
      ? { ...previous.summary, revenue: null, arpu: null } : previous?.summary ?? null;
    const body = new URL(request.url).searchParams.get("schema") === "2" || kind === "analytics"
      ? { ...report, previous: prior } : legacyResponse(kind, report, prior);
    return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store", "X-Moment-Data-Status": report.meta.status, "X-Moment-Timezone": context.timezone } });
  } catch (e) {
    console.error("Moment analytics failed", e instanceof Error ? e.message : "Unknown error");
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }
}
