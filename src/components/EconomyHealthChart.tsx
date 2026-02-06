"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";

type ChartItem = { indicator: string; value: number; label: string };
type MetricRow = { indicator: string; value: string };

const COLORS = ["#4285f4", "#34a853", "#fbbc04"];

export function EconomyHealthChart({
  chart,
  metrics,
}: {
  chart: ChartItem[];
  metrics: MetricRow[];
}) {
  const { locale } = useLocale();
  const displayData = chart.map((d) => ({
    ...d,
    display: locale === "en" ? d.label.replace(/\s*%\s*$/, "") : d.indicator,
  }));
  return (
    <div>
      <div className="mb-4 h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="display"
              tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card-bg)",
                padding: "3px 6px",
                fontSize: 9,
                lineHeight: 1.3,
              }}
              formatter={(value, _name, props) => {
                const v = Number(value ?? 0);
                const item = (props as { payload?: ChartItem })?.payload;
                const label = locale === "en" ? (item?.label ?? "") : (item?.indicator ?? "");
                return [`${v.toFixed(1)}${label.includes("%") ? "%" : ""}`, label];
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {displayData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-[var(--border)]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">INDICATOR</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">VALUE</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row) => (
              <tr key={row.indicator} className="border-b border-[var(--border)]">
                <td className="px-3 py-2">{row.indicator}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--secondary-text)]">Chart type: Bar chart · economy_flow</p>
    </div>
  );
}
