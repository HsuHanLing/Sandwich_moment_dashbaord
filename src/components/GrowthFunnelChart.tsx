"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useLocale } from "@/contexts/LocaleContext";

export type ActivationFunnelRow = { step: string; label: string; users: number; conversion: number };

const COLORS = ["#93c5fd", "#60a5fa", "#3b82f6", "#a78bfa", "#8b5cf6", "#6d28d9", "#6366f1"];

export function GrowthFunnelChart({ data, days }: { data: ActivationFunnelRow[]; days?: number }) {
  const { t } = useLocale();

  const chartRows = data.map((d) => ({
    ...d,
    displayLabel: d.label,
  }));

  if (!chartRows.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-xs text-[var(--secondary-text)]">
        {t("noData")}
      </div>
    );
  }

  const maxUsers = Math.max(...chartRows.map((d) => d.users), 1);

  return (
    <div className="overflow-visible">
      <div className="mb-4 h-[220px] w-full overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} layout="vertical" margin={{ top: 5, right: 20, left: 8, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, Math.ceil(maxUsers * 1.1)]}
              tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
            />
            <YAxis
              type="category"
              dataKey="displayLabel"
              width={120}
              tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card-bg)",
                padding: "6px 8px",
                fontSize: 11,
              }}
              formatter={(value: number | undefined) => [value?.toLocaleString() ?? "0", t("userCount")]}
            />
            <Bar dataKey="users" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {chartRows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mb-2 overflow-x-auto overflow-y-visible rounded-xl" style={{ border: "1px solid var(--card-stroke)" }}>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">{t("step")}</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("userCount")}</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-20">{t("conversionRate")}</th>
            </tr>
          </thead>
          <tbody>
            {chartRows.map((row) => (
              <tr key={row.step} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)]">
                <td className="px-3 py-2 text-[var(--foreground)]">{row.label}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--foreground)]">{row.users.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--foreground)]">{row.conversion}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--secondary-text)]">
        {t("activationDesc")} · {days ?? 30}d
      </p>
    </div>
  );
}
