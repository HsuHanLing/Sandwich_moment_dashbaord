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
  sup_like_count: number;
  sup_like_uv: number;
  sup_like_rate: number;
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
  up_like_count: number;
  up_like_uv: number;
  up_like_rate: number;
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

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export function CreatorSupplyChart({ data }: { data: CreatorSupplyData }) {
  const { data: d } = data;
  const kol = d.KOL;
  const inf = d.Influencer;

  const volumeChart: ChartRow[] = [
    { metric: "SUP Click Play", KOL: kol.sup_click_play, Influencer: inf.sup_click_play },
    { metric: "SUP Likes", KOL: kol.sup_like_count, Influencer: inf.sup_like_count },
    { metric: "$UP Click Unlock", KOL: kol.up_click_unlock, Influencer: inf.up_click_unlock },
    { metric: "$UP Unlock Success", KOL: kol.up_unlock_success, Influencer: inf.up_unlock_success },
  ];

  const revenueChart: ChartRow[] = [
    { metric: "$UP Revenue", KOL: kol.up_revenue, Influencer: inf.up_revenue },
  ];

  const rateData = [
    { name: "SUP like / click play", KOL: Math.min(100, Math.max(0, kol.sup_like_rate)), Influencer: Math.min(100, Math.max(0, inf.sup_like_rate)) },
    { name: "$UP unlock / click", KOL: Math.min(100, Math.max(0, kol.up_unlock_success_rate)), Influencer: Math.min(100, Math.max(0, inf.up_unlock_success_rate)) },
    { name: "$UP like / unlock", KOL: Math.min(100, Math.max(0, kol.up_like_rate)), Influencer: Math.min(100, Math.max(0, inf.up_like_rate)) },
  ];

  const supRows: { label: string; kol: string; inf: string }[] = [
    { label: "Click Play (events)", kol: fmt(kol.sup_click_play), inf: fmt(inf.sup_click_play) },
    { label: "Click Play (UV)", kol: fmt(kol.sup_click_play_uv), inf: fmt(inf.sup_click_play_uv) },
    { label: "Like Count", kol: fmt(kol.sup_like_count), inf: fmt(inf.sup_like_count) },
    { label: "Like UV", kol: fmt(kol.sup_like_uv), inf: fmt(inf.sup_like_uv) },
    { label: "Like Rate (like / click play)", kol: `${kol.sup_like_rate}%`, inf: `${inf.sup_like_rate}%` },
  ];

  const upRows: { label: string; kol: string; inf: string }[] = [
    { label: "Click Unlock (events)", kol: fmt(kol.up_click_unlock), inf: fmt(inf.up_click_unlock) },
    { label: "Click Unlock (UV)", kol: fmt(kol.up_click_unlock_uv), inf: fmt(inf.up_click_unlock_uv) },
    { label: "Unlock Success (events)", kol: fmt(kol.up_unlock_success), inf: fmt(inf.up_unlock_success) },
    { label: "Unlock Success (UV)", kol: fmt(kol.up_unlock_success_uv), inf: fmt(inf.up_unlock_success_uv) },
    { label: "Unlock success / click unlock %", kol: `${kol.up_unlock_success_rate}%`, inf: `${inf.up_unlock_success_rate}%` },
    { label: "Revenue", kol: fmtMoney(kol.up_revenue), inf: fmtMoney(inf.up_revenue) },
    { label: "Like Count", kol: fmt(kol.up_like_count), inf: fmt(inf.up_like_count) },
    { label: "Like UV", kol: fmt(kol.up_like_uv), inf: fmt(inf.up_like_uv) },
    { label: "Like Rate (like / unlock success)", kol: `${kol.up_like_rate}%`, inf: `${inf.up_like_rate}%` },
  ];

  const extraRows: { label: string; kol: string; inf: string }[] = [
    { label: "Circle Events", kol: fmt(kol.circle_events), inf: fmt(inf.circle_events) },
    { label: "Explore Events", kol: fmt(kol.explore_events), inf: fmt(inf.explore_events) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">Engagement volumes — KOL vs Influencer (events)</h4>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="metric"
                tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmt(v)}
              />
              <Tooltip {...chartTooltip} formatter={(value?: number, name?: string) => [fmt(value ?? 0), name ?? ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
              <Bar dataKey="KOL" fill="#4285f4" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Influencer" fill="#34a853" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">$UP revenue (USD) — KOL vs Influencer</h4>
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueChart} margin={{ top: 8, right: 10, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--secondary-text)" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtMoney(v)}
              />
              <Tooltip {...chartTooltip} formatter={(value?: number, name?: string) => [fmtMoney(value ?? 0), name ?? ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
              <Bar dataKey="KOL" fill="#4285f4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Influencer" fill="#34a853" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">Rates (%) — KOL vs Influencer</h4>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={rateData} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--secondary-text)" }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={168} tick={{ fontSize: 9, fill: "var(--secondary-text)" }} />
              <Tooltip {...chartTooltip} formatter={(value?: number, name?: string) => [`${Number(value ?? 0).toFixed(1)}%`, name ?? ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
              <Bar dataKey="KOL" fill="#4285f4" radius={[0, 3, 3, 0]} />
              <Bar dataKey="Influencer" fill="#34a853" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <MetricTable title="SUP Metrics (Free Content)" rows={supRows} />
      <MetricTable title="$UP Metrics (Paid Content)" rows={upRows} />
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
