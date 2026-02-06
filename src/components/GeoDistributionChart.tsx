"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";
import { REGION_NAMES_EN } from "@/lib/region-names";

type GeoItem = { region: string; region_name: string; users: number; share: number };

function formatPct(n: number) {
  return `${Number(n).toFixed(1)}%`;
}

/* Google-inspired palette */
const COLORS = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#8ab4f8", "#f28b82", "#fdd663", "#81c995"];

export function GeoDistributionChart({ data }: { data: GeoItem[] }) {
  const { locale } = useLocale();
  const getRegionLabel = (row: GeoItem) =>
    locale === "en" ? REGION_NAMES_EN[row.region] ?? row.region : row.region_name;
  const chartData = data.map((d) => ({ name: getRegionLabel(d), value: d.users }));

  return (
    <div className="overflow-visible">
      <div className="mb-4 h-[240px] w-full min-w-0 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={70}
              paddingAngle={1}
              dataKey="value"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card-bg)",
                padding: "3px 6px",
                fontSize: 9,
                lineHeight: 1.3,
              }}
              formatter={(value, name) => [
                `${Number(value ?? 0).toLocaleString()} users`,
                String(name ?? ""),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} iconType="square" />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">REGION</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">USERS</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-16">SHARE</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.region} className="border-b border-[var(--border)]">
                <td className="px-3 py-2">{getRegionLabel(row)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.users.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--secondary-text)]">Chart type: Pie chart · user_geo_info</p>
    </div>
  );
}
