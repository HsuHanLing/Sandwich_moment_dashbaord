import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getEconomyHealthQuery } from "@/lib/queries";
import { getMockEconomyHealth } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const useMock =
    process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(getMockEconomyHealth());
  }

  try {
    const [rows] = await bigquery.query({
      query: getEconomyHealthQuery(days),
    });
    const r = (rows as { metric: string; value: number }[]) || [];
    const unlock = r.find((x) => x.metric === "unlock")?.value ?? 0;
    const scratch = r.find((x) => x.metric === "scratch")?.value ?? 0;
    const upgrade = r.find((x) => x.metric === "upgrade")?.value ?? 0;
    const maxV = Math.max(unlock, scratch, upgrade, 1);
    const chart = [
      { indicator: "解锁消耗", value: (unlock / maxV) * 100, label: "Avg unlocks/user/day" },
      { indicator: "刮刮卡", value: (scratch / maxV) * 100, label: "Scratch card open rate %" },
      { indicator: "升级卡", value: (upgrade / maxV) * 100, label: "Upgrade card usage rate %" },
    ];
    const metrics = [
      { indicator: "Avg unlocks / user / day", value: (unlock / 1000).toFixed(1) },
      { indicator: "Scratch card open rate", value: `${Math.min(100, (scratch / 1000) * 10).toFixed(1)}%` },
      { indicator: "Upgrade card usage rate", value: `${Math.min(100, (upgrade / 1000) * 5).toFixed(1)}%` },
      { indicator: "Avg reward per scratch", value: "$0.42" },
    ];
    return NextResponse.json({ chart, metrics });
  } catch (error) {
    console.error("BigQuery economy-health error:", error);
    return NextResponse.json(getMockEconomyHealth());
  }
}
