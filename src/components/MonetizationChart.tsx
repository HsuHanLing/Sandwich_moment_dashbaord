"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";

type MonetRow = {
  revenue_stream: string;
  revenue: number;
  share: number;
  roi: number;
};

const COLORS = ["#4285f4", "#34a853"];

export function MonetizationChart({ data }: { data: MonetRow[] }) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<"All" | "Paid" | "Organic">("All");
  const chartData = data.map((d) => ({ name: d.revenue_stream, value: d.revenue }));
  const legendLabel = (v: string) => (v === "Unlock Pack" ? t("unlockPack") : t("subscription"));

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-xl bg-[var(--background)] p-1">
        {(["All", "Paid", "Organic"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="mb-4 h-[220px] w-full min-w-0 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
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
              formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, "Revenue"]}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} formatter={(value) => legendLabel(String(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">REVENUE STREAM</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">REVENUE</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-14">SHARE</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-12">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.revenue_stream} className="border-b border-[var(--border)]">
                <td className="px-3 py-2">
                  {row.revenue_stream === "Unlock Pack" ? t("unlockPack") : t("subscription")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">${row.revenue.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.share.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.roi.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--secondary-text)]">Chart type: Donut chart · rev_mix - roi_by_channel</p>
    </div>
  );
}
