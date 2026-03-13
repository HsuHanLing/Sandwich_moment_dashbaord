"use client";

import { useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type D7Retention = {
  total_unlock_users: number;
  d7_retained: number;
  rate: number;
};

type DistBucket = {
  bucket: string;
  user_count: number;
  pct: number;
};

type Meta = {
  days: number;
  cohort_start: string;
  cohort_end: string;
  distribution_total_users: number;
} | null;

type Props = {
  d7Retention: D7Retention | null;
  distribution: DistBucket[];
  meta: Meta;
  analyticsDays: number;
  t: (key: string) => string;
};

const BAR_COLORS = [
  "var(--chart-1, #6366f1)",
  "var(--chart-2, #8b5cf6)",
  "var(--chart-3, #a78bfa)",
  "var(--chart-4, #c4b5fd)",
  "var(--chart-5, #ddd6fe)",
  "var(--chart-6, #ede9fe)",
  "var(--chart-7, #f5f3ff)",
];

function InfoTooltip({ metricKey }: { metricKey: string }) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];
  if (!info) return null;

  return (
    <span
      className="relative ml-1 inline-flex cursor-help items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-[var(--secondary-text)]">
        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
      </svg>
      {show && (
        <span
          className="absolute bottom-full left-1/2 z-[100] mb-2 w-[260px] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
        >
          <span className="block font-semibold text-[var(--accent)]">{info.formula}</span>
          <span className="mt-1 block text-[var(--secondary-text)]">{info.description}</span>
        </span>
      )}
    </span>
  );
}

const badgeStyle = { backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" } as const;

export function UnlockInsightsSection({ d7Retention, distribution, meta, analyticsDays, t }: Props) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{t("unlockInsights")}</h2>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={badgeStyle}>
          {t("unlockCohort")}: {analyticsDays}{t("days")}
          {meta ? ` (${meta.cohort_start} ~ ${meta.cohort_end})` : ""}
        </span>
      </div>
      <p className="mt-0.5 mb-4 text-xs text-[var(--secondary-text)]">{t("unlockInsightsDesc")}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* D7 Retention KPI */}
        <div
          className="relative flex flex-col justify-between rounded-xl bg-[var(--card-bg)] p-4"
          style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
        >
          <div>
            <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
              {t("unlockD7Retention")}
              <InfoTooltip metricKey="UNLOCK_D7_RETENTION" />
            </p>
            <p className="mt-2">
              <span className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {d7Retention ? `${d7Retention.rate}%` : "—"}
              </span>
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-[var(--secondary-text)]">{t("unlockTotalUsers")}</p>
              <p className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
                {d7Retention ? d7Retention.total_unlock_users.toLocaleString() : "—"}
              </p>
              <p className="mt-1 text-[9px] text-[var(--secondary-text)] opacity-90">
                {t("unlockD7CohortHint").replace("{days}", String(analyticsDays))}
              </p>
            </div>
            <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
              <p className="text-[10px] text-[var(--secondary-text)]">{t("unlockRetainedUsers")}</p>
              <p className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
                {d7Retention ? d7Retention.d7_retained.toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Unlock Distribution Chart */}
        <div
          className="col-span-1 lg:col-span-2 rounded-xl bg-[var(--card-bg)] p-4"
          style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
                {t("unlockDistribution")}
                <InfoTooltip metricKey="UNLOCK_7D_DISTRIBUTION" />
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--secondary-text)]">{t("unlockDistributionDesc")}</p>
            </div>
            {meta && meta.distribution_total_users > 0 && (
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium" style={badgeStyle} title={t("signupCohortHint")}>
                {t("signupCohort")}: {meta.distribution_total_users.toLocaleString()} {t("users").toLowerCase()}
              </span>
            )}
          </div>

          {distribution.length > 0 ? (
            <>
              <div className="mt-3" style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={distribution} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                      label={{ value: t("unlockBucket"), position: "insideBottom", offset: -2, style: { fontSize: 9, fill: "var(--secondary-text)" } }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} axisLine={false} tickLine={false} width={48} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                      formatter={(value, _name, entry) => [
                        `${Number(value ?? 0).toLocaleString()} users (${(entry?.payload as DistBucket)?.pct ?? 0}%)`,
                        t("unlockBucket"),
                      ]}
                      labelFormatter={(label) => `Unlock count: ${String(label ?? "")} times`}
                    />
                    <Bar dataKey="user_count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                      {distribution.map((_entry, idx) => (
                        <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-2 py-1.5 text-left font-medium text-[var(--secondary-text)]">{t("unlockBucket")}</th>
                      <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("unlockUserCount")}</th>
                      <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("unlockUserPct")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribution.map((row) => (
                      <tr key={row.bucket} className="border-b border-[var(--border)]/50">
                        <td className="px-2 py-1.5 font-medium text-[var(--foreground)]">
                          {row.bucket === "0" ? "0 (Never)" : `${row.bucket} times`}
                        </td>
                        <td className="px-2 py-1.5 text-right text-[var(--foreground)]">{row.user_count.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right text-[var(--secondary-text)]">{row.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-8 text-center text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
