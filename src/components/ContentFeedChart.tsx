"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type DailyRow = { date: string; sup: number; up: number; sequel: number };

type SupMetrics = {
  exposure: number;
  exposure_uv: number;
  click_play: number;
  click_play_uv: number;
  click_rate: number;
  like_count: number;
  like_uv: number;
  like_rate: number;
};

type UpMetrics = {
  exposure: number;
  exposure_uv: number;
  click_unlock: number;
  click_unlock_uv: number;
  unlock_success: number;
  unlock_success_uv: number;
  click_unlock_rate: number;
  unlock_success_rate: number;
  revenue: number;
  like_count: number;
  like_uv: number;
  like_rate: number;
};

export type ContentFeedData = {
  daily: DailyRow[];
  sup: SupMetrics;
  up: UpMetrics;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ContentFeedChart({ data }: { data: ContentFeedData }) {
  const { daily, sup, up } = data;

  const supRows: { label: string; value: string }[] = [
    { label: "Click Play (events)", value: fmt(sup.click_play) },
    { label: "Click Play (UV)", value: fmt(sup.click_play_uv) },
    { label: "Like Count", value: fmt(sup.like_count) },
    { label: "Like UV", value: fmt(sup.like_uv) },
    { label: "Like Rate (like / click play)", value: `${sup.like_rate}%` },
  ];

  const upRows: { label: string; value: string }[] = [
    { label: "Click Unlock (events)", value: fmt(up.click_unlock) },
    { label: "Click Unlock (UV)", value: fmt(up.click_unlock_uv) },
    { label: "Unlock Success (events)", value: fmt(up.unlock_success) },
    { label: "Unlock Success (UV)", value: fmt(up.unlock_success_uv) },
    { label: "Unlock success / click unlock %", value: `${up.unlock_success_rate}%` },
    { label: "Revenue", value: `$${up.revenue.toLocaleString()}` },
    { label: "Like Count", value: fmt(up.like_count) },
    { label: "Like UV", value: fmt(up.like_uv) },
    { label: "Like Rate (like / unlock success)", value: `${up.like_rate}%` },
  ];

  return (
    <div className="space-y-5">
      {/* Daily Post Count Line Chart */}
      <div>
        <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">Daily Post Count</h4>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
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
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
              <Line type="monotone" dataKey="sup" name="SUP" stroke="#4285f4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="up" name="$UP" stroke="#ea4335" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sequel" name="Sequel" stroke="#34a853" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SUP Metrics Table */}
      <MetricTable title="SUP Metrics (Free Content)" rows={supRows} />

      {/* $UP Metrics Table */}
      <MetricTable title="$UP Metrics (Paid Content)" rows={upRows} />
    </div>
  );
}

function MetricTable({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl" style={{ border: "1px solid var(--card-stroke)" }}>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]">
            <th className="px-3 py-2 text-left font-semibold text-[var(--secondary-text)]" colSpan={2}>{title}</th>
          </tr>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]">
            <th className="px-3 py-1.5 text-left font-medium text-[var(--secondary-text)]">METRIC</th>
            <th className="px-3 py-1.5 text-right font-medium text-[var(--secondary-text)]">VALUE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-[var(--border)]">
              <td className="px-3 py-2">{r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
