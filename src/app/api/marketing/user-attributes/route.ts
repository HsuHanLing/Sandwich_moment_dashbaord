import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import { getUserAttributesQuery } from "@/lib/queries";
import { getMockUserAttributes } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const useMock =
    process.env.USE_MOCK_DATA === "true" || !process.env.GOOGLE_CLOUD_PROJECT;

  if (useMock) {
    return NextResponse.json(getMockUserAttributes());
  }

  try {
    const [rows] = await bigquery.query({
      query: getUserAttributesQuery(days),
    });
    const r = (rows as { type: string; attr: string; users: number }[]) || [];
    const age = r
      .filter((x) => x.type === "age")
      .map((x) => ({
        attr: x.attr === "18-24" ? "18-24岁" : x.attr === "25-34" ? "25-34岁" : "35+岁",
        users: Number(x.users),
      }));
    const device = r
      .filter((x) => x.type === "device")
      .map((x) => ({
        attr: x.attr === "IOS" ? "iOS" : x.attr,
        users: Number(x.users),
      }));
    const totalAge = age.reduce((s, a) => s + a.users, 0);
    const totalDevice = device.reduce((s, d) => s + d.users, 0);
    return NextResponse.json({
      age: age.map((a) => ({ ...a, share: totalAge ? (a.users / totalAge) * 100 : 0 })),
      device: device.map((d) => ({ ...d, share: totalDevice ? (d.users / totalDevice) * 100 : 0 })),
    });
  } catch (error) {
    console.error("BigQuery user-attributes error:", error);
    return NextResponse.json(getMockUserAttributes());
  }
}
