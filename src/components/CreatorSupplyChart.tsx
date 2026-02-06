"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useLocale } from "@/contexts/LocaleContext";

type WeeklyRow = { week: string; kol_earnings: number; regular_earnings: number };
export function CreatorSupplyChart({
  weekly,
  metrics,
}: {
  weekly: WeeklyRow[];
  metrics: Record<string, number>;
}) {
  const { t } = useLocale();
  const kolLabel = t("kolEarnings");
  const regularLabel = t("regularCreatorEarnings");
  return (
    <div>
      <div className="mb-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={weekly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(0)}
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
              formatter={(value, name) => [
                `$${Number(value ?? 0).toFixed(0)}`,
                String(name) === "kol_earnings" ? kolLabel : regularLabel,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 9 }}
              iconSize={8}
              formatter={(value) =>
                value === "kol_earnings" ? kolLabel : regularLabel
              }
            />
            <Area
              type="monotone"
              dataKey="kol_earnings"
              stackId="1"
              stroke="#4285f4"
              fill="#4285f4"
              fillOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="regular_earnings"
              stackId="1"
              stroke="#34a853"
              fill="#34a853"
              fillOpacity={0.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-[var(--border)]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">METRIC</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">VALUE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2">Active creators (Total)</td>
              <td className="px-3 py-2 text-right tabular-nums">{metrics.active_creators ?? "-"}</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2">L KOL creators</td>
              <td className="px-3 py-2 text-right tabular-nums">{metrics.kol_creators ?? "-"}</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2">L Regular creators</td>
              <td className="px-3 py-2 text-right tabular-nums">{metrics.regular_creators ?? "-"}</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2">New KOL creators (7d)</td>
              <td className="px-3 py-2 text-right tabular-nums">{metrics.new_kol_7d ?? "-"}</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2">Earnings (7d) KOL creator earnings</td>
              <td className="px-3 py-2 text-right tabular-nums">${metrics.kol_earnings_7d ?? "-"}</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2">Earnings (7d) Regular creator earnings</td>
              <td className="px-3 py-2 text-right tabular-nums">${metrics.regular_earnings_7d ?? "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--secondary-text)]">Chart type: Stacked area chart</p>
    </div>
  );
}
