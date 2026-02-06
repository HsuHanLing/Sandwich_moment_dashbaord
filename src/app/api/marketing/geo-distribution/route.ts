import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getGeoDistributionQuery } from "@/lib/queries";
import { getMockGeoDistribution } from "@/lib/mock-data";

const COUNTRY_MAP: Record<string, { code: string; name: string }> = {
  "United States": { code: "US", name: "美国" },
  US: { code: "US", name: "美国" },
  "United Kingdom": { code: "GB", name: "英国" },
  GB: { code: "GB", name: "英国" },
  Canada: { code: "CA", name: "加拿大" },
  CA: { code: "CA", name: "加拿大" },
  Singapore: { code: "SG", name: "新加坡" },
  SG: { code: "SG", name: "新加坡" },
  Australia: { code: "AU", name: "澳大利亚" },
  AU: { code: "AU", name: "澳大利亚" },
  Germany: { code: "DE", name: "德国" },
  DE: { code: "DE", name: "德国" },
  France: { code: "FR", name: "法国" },
  FR: { code: "FR", name: "法国" },
  Indonesia: { code: "ID", name: "印度尼西亚" },
  Japan: { code: "JP", name: "日本" },
  India: { code: "IN", name: "印度" },
  Brazil: { code: "BR", name: "巴西" },
  Mexico: { code: "MX", name: "墨西哥" },
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const useMock =
    process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(getMockGeoDistribution());
  }

  try {
    const [rows] = await bigquery.query({
      query: getGeoDistributionQuery(days),
    });
    const r = (rows as { region: string; users: number }[]) || [];
    const total = r.reduce((s, x) => s + Number(x.users), 0);
    const mapped = r.map((x) => {
      const m = COUNTRY_MAP[x.region];
      const code = m?.code ?? (x.region?.length <= 3 ? x.region : x.region?.slice(0, 2).toUpperCase() ?? "??");
      const name = m?.name ?? x.region ?? "Other";
      return {
        region: code,
        region_name: name,
        users: Number(x.users),
        share: total ? (Number(x.users) / total) * 100 : 0,
      };
    });
    return NextResponse.json(mapped);
  } catch (error) {
    console.error("BigQuery geo-distribution error:", error);
    return NextResponse.json(getMockGeoDistribution());
  }
}
