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
import { useLocale } from "@/contexts/LocaleContext";
import { areaToDisplay } from "@/lib/area-names";

type FeedRow = {
  area: string;
  impressions: number;
  ctr: number;
  completion: number | null;
  replay: number | null;
};

function formatPct(n: number | null) {
  return n != null ? `${Number(n).toFixed(1)}%` : "-";
}

export function ContentFeedChart({
  circle,
  featureCards,
  exclusives,
}: {
  circle: FeedRow[];
  featureCards: FeedRow[];
  exclusives: FeedRow[];
}) {
  const { t, locale } = useLocale();
  const completionLabel = `${t("completionRate")} %`;
  const chartData = [
    ...circle.map((r) => ({
      area: areaToDisplay(r.area, locale),
      ctr: r.ctr,
      completion: r.completion ?? 0,
    })),
    ...featureCards.map((r) => ({
      area: areaToDisplay(r.area, locale),
      ctr: r.ctr,
      completion: 0,
    })),
    ...exclusives.map((r) => ({
      area: areaToDisplay(r.area, locale),
      ctr: r.ctr,
      completion: r.completion ?? 0,
    })),
  ].filter((d) => d.ctr > 0 || d.completion > 0);

  return (
    <div>
      <div className="mb-4 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="area"
              angle={-45}
              textAnchor="end"
              height={60}
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
              formatter={(value, name) => [
                `${Number(value ?? 0).toFixed(1)}%`,
                String(name) === "ctr" ? "CTR %" : completionLabel,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} formatter={(v) => (v === "ctr" ? "CTR %" : completionLabel)} />
            <Bar dataKey="ctr" fill="#4285f4" radius={[2, 2, 0, 0]} name="ctr" />
            <Bar dataKey="completion" fill="#34a853" radius={[2, 2, 0, 0]} name="completion" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">Circle</h4>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">AREA</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">IMPRESSIONS</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-14">CTR</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-16">COMPLETION</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-14">REPLAY</th>
              </tr>
            </thead>
            <tbody>
              {circle.map((row) => (
                <tr key={row.area} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">{areaToDisplay(row.area, locale)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(row.impressions / 1000).toFixed(0)}k
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.ctr)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.completion)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.replay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">{t("featureCards")}</h4>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">AREA</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">IMPRESSIONS</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-14">CTR</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-16">COMPLETION</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-14">REPLAY</th>
              </tr>
            </thead>
            <tbody>
              {featureCards.map((row) => (
                <tr key={row.area} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">{areaToDisplay(row.area, locale)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(row.impressions / 1000).toFixed(1)}k
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.ctr)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">-</td>
                  <td className="px-3 py-2 text-right tabular-nums">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-medium text-[var(--secondary-text)]">{t("exclusives")}</h4>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">AREA</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">IMPRESSIONS</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-14">CTR</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-16">COMPLETION</th>
                <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-14">REPLAY</th>
              </tr>
            </thead>
            <tbody>
              {exclusives.map((row) => (
                <tr key={row.area} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">{areaToDisplay(row.area, locale)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(row.impressions / 1000).toFixed(0)}k
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.ctr)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.completion)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPct(row.replay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--secondary-text)]">
        feed_impression / feed_click / video_complete / feature_card_type
      </p>
    </div>
  );
}
