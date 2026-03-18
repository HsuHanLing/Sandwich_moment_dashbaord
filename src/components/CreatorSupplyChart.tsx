"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type CreatorMetrics = {
  sup_exposure: number;
  sup_exposure_uv: number;
  sup_click_play: number;
  sup_click_play_uv: number;
  sup_click_play_rate: number;
  up_exposure: number;
  up_exposure_uv: number;
  up_click_unlock: number;
  up_click_unlock_uv: number;
  up_unlock_success: number;
  up_unlock_success_uv: number;
  up_click_unlock_rate: number;
  up_unlock_success_rate: number;
  up_overall_conversion_rate: number;
  up_revenue: number;
  profile_exposure: number;
  profile_exposure_uv: number;
  circle_events: number;
  explore_events: number;
};

type ChartRow = { metric: string; KOL: number; Influencer: number };

export type CreatorSupplyData = {
  chart: ChartRow[];
  data: { KOL: CreatorMetrics; Influencer: CreatorMetrics };
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function CreatorSupplyChart({ data }: { data: CreatorSupplyData }) {
  const { chart, data: d } = data;
  const kol = d.KOL;
  const inf = d.Influencer;

  const supRows: { label: string; kol: string; inf: string }[] = [
    { label: "Exposure (events)", kol: fmt(kol.sup_exposure), inf: fmt(inf.sup_exposure) },
    { label: "Exposure (UV)", kol: fmt(kol.sup_exposure_uv), inf: fmt(inf.sup_exposure_uv) },
    { label: "Click Play (events)", kol: fmt(kol.sup_click_play), inf: fmt(inf.sup_click_play) },
    { label: "Click Play (UV)", kol: fmt(kol.sup_click_play_uv), inf: fmt(inf.sup_click_play_uv) },
    { label: "Click Play Rate", kol: `${kol.sup_click_play_rate}%`, inf: `${inf.sup_click_play_rate}%` },
  ];

  const upRows: { label: string; kol: string; inf: string }[] = [
    { label: "Exposure (events)", kol: fmt(kol.up_exposure), inf: fmt(inf.up_exposure) },
    { label: "Exposure (UV)", kol: fmt(kol.up_exposure_uv), inf: fmt(inf.up_exposure_uv) },
    { label: "Click Unlock (events)", kol: fmt(kol.up_click_unlock), inf: fmt(inf.up_click_unlock) },
    { label: "Click Unlock (UV)", kol: fmt(kol.up_click_unlock_uv), inf: fmt(inf.up_click_unlock_uv) },
    { label: "Unlock Success (events)", kol: fmt(kol.up_unlock_success), inf: fmt(inf.up_unlock_success) },
    { label: "Unlock Success (UV)", kol: fmt(kol.up_unlock_success_uv), inf: fmt(inf.up_unlock_success_uv) },
    { label: "Click Unlock Rate", kol: `${kol.up_click_unlock_rate}%`, inf: `${inf.up_click_unlock_rate}%` },
    { label: "Unlock Success Rate", kol: `${kol.up_unlock_success_rate}%`, inf: `${inf.up_unlock_success_rate}%` },
    { label: "Overall Conversion", kol: `${kol.up_overall_conversion_rate}%`, inf: `${inf.up_overall_conversion_rate}%` },
    { label: "Revenue", kol: `$${kol.up_revenue.toLocaleString()}`, inf: `$${inf.up_revenue.toLocaleString()}` },
  ];

  const extraRows: { label: string; kol: string; inf: string }[] = [
    { label: "Profile Exposure", kol: fmt(kol.profile_exposure), inf: fmt(inf.profile_exposure) },
    { label: "Profile Exposure (UV)", kol: fmt(kol.profile_exposure_uv), inf: fmt(inf.profile_exposure_uv) },
    { label: "Circle Events", kol: fmt(kol.circle_events), inf: fmt(inf.circle_events) },
    { label: "Explore Events", kol: fmt(kol.explore_events), inf: fmt(inf.explore_events) },
  ];

  return (
    <div className="space-y-5">
      {/* Grouped bar chart */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmt(v)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card-bg)",
                padding: "4px 8px",
                fontSize: 11,
                lineHeight: 1.4,
              }}
              formatter={(value: number, name: string) => [fmt(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
            <Bar dataKey="KOL" fill="#4285f4" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Influencer" fill="#34a853" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SUP Metrics Table */}
      <MetricTable title="SUP Metrics (Free Content)" rows={supRows} />

      {/* $UP Metrics Table */}
      <MetricTable title="$UP Metrics (Paid Content)" rows={upRows} />

      {/* Extra: Profile & Source */}
      <MetricTable title="Profile & Source Breakdown" rows={extraRows} />
    </div>
  );
}

function MetricTable({ title, rows }: { title: string; rows: { label: string; kol: string; inf: string }[] }) {
  return (
    <div className="rounded-xl" style={{ border: "1px solid var(--card-stroke)" }}>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]">
            <th className="px-3 py-2 text-left font-semibold text-[var(--secondary-text)]" colSpan={3}>{title}</th>
          </tr>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]">
            <th className="px-3 py-1.5 text-left font-medium text-[var(--secondary-text)]">METRIC</th>
            <th className="px-3 py-1.5 text-right font-medium text-[var(--secondary-text)]">KOL</th>
            <th className="px-3 py-1.5 text-right font-medium text-[var(--secondary-text)]">Influencer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-[var(--border)]">
              <td className="px-3 py-2">{r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.kol}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.inf}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
