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
  BarChart,
  Bar,
  Cell,
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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const chartTooltip = {
  contentStyle: {
    borderRadius: "6px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--card-bg)",
    padding: "4px 8px",
    fontSize: 11,
    lineHeight: 1.4,
  },
} as const;

const funnelColors = { sup: "#4285f4", upUnlock: "#ea4335", upSuccess: "#fbbc04" };

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
    { label: "Revenue", value: formatCurrency(up.revenue) },
    { label: "Like Count", value: fmt(up.like_count) },
    { label: "Like UV", value: fmt(up.like_uv) },
    { label: "Like Rate (like / unlock success)", value: `${up.like_rate}%` },
  ];

  const supVolumeData = [
    { stage: "Click play", value: sup.click_play, fill: funnelColors.sup },
    { stage: "Likes", value: sup.like_count, fill: "#8ab4f8" },
  ];

  const upVolumeData = [
    { stage: "Click unlock", value: up.click_unlock, fill: funnelColors.upUnlock },
    { stage: "Unlock success", value: up.unlock_success, fill: funnelColors.upSuccess },
  ];

  const rateData = [
    { name: "SUP like / click play", pct: Math.min(100, Math.max(0, sup.like_rate)) },
    { name: "$UP unlock / click unlock", pct: Math.min(100, Math.max(0, up.unlock_success_rate)) },
    { name: "$UP like / unlock success", pct: Math.min(100, Math.max(0, up.like_rate)) },
  ];

  return (
    <div className="space-y-5">
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
              <Tooltip {...chartTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
              <Line type="monotone" dataKey="sup" name="SUP" stroke="#4285f4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="up" name="$UP" stroke="#ea4335" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sequel" name="Sequel" stroke="#34a853" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl p-3" style={{ border: "1px solid var(--card-stroke)" }}>
          <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">SUP — engagement volumes (period)</h4>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={supVolumeData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} tickFormatter={(v) => fmt(v)} />
                <YAxis type="category" dataKey="stage" width={88} tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                <Tooltip {...chartTooltip} formatter={(v: number) => [fmt(v), "Events"]} />
                <Bar dataKey="value" name="Events" radius={[0, 4, 4, 0]}>
                  {supVolumeData.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ border: "1px solid var(--card-stroke)" }}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-medium text-[var(--secondary-text)]">$UP — unlock funnel (period)</h4>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}>
              Revenue {formatCurrency(up.revenue)}
            </span>
          </div>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={upVolumeData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} tickFormatter={(v) => fmt(v)} />
                <YAxis type="category" dataKey="stage" width={88} tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                <Tooltip {...chartTooltip} formatter={(v: number) => [fmt(v), "Events"]} />
                <Bar dataKey="value" name="Events" radius={[0, 4, 4, 0]}>
                  {upVolumeData.map((e, i) => (
                    <Cell key={i} fill={e.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ border: "1px solid var(--card-stroke)" }}>
        <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">Conversion &amp; engagement rates (%)</h4>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={rateData} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--secondary-text)" }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 9, fill: "var(--secondary-text)" }} />
              <Tooltip {...chartTooltip} formatter={(v: number) => [`${Number(v).toFixed(1)}%`, "Rate"]} />
              <Bar dataKey="pct" name="Rate" fill="#9334e6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <MetricTable title="SUP Metrics (Free Content)" rows={supRows} />
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
