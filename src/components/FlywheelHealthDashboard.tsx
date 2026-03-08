"use client";

import { useState, useEffect } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type HealthData = {
  reg_rate: number;
  unlock_rate: number;
  loop_rate: number;
  share_rate: number;
  referral_regs_7d: number;
  d7_retention_unlock: number;
  pay_rate: number;
  revenue_30d: number;
  as_of: string;
};

type HealthRow = {
  id: string;
  labelKey: string;
  formulaKey: string;
  isNorthStar: boolean;
  healthy: string;
  warning: string;
  dangerous: string;
  current: number | string;
  unit: "pct" | "people" | "currency";
  status: "healthy" | "warning" | "dangerous";
};

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
        <span className="absolute bottom-full left-1/2 z-[100] mb-2 w-[260px] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
          <span className="block font-semibold text-[var(--accent)]">{info.formula}</span>
          <span className="mt-1 block text-[var(--secondary-text)]">{info.description}</span>
        </span>
      )}
    </span>
  );
}

const cardStyle = { border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" } as const;

function getStatus(
  value: number,
  healthyMin: number,
  warningMin: number
): "healthy" | "warning" | "dangerous" {
  if (value >= healthyMin) return "healthy";
  if (value >= warningMin) return "warning";
  return "dangerous";
}

function buildRows(data: HealthData | null): HealthRow[] {
  if (!data) return [];

  return [
    { id: "reg", labelKey: "healthRegRate", formulaKey: "HEALTH_REG_RATE", isNorthStar: false, healthy: "≥45%", warning: "40-44%", dangerous: "<40%", current: data.reg_rate, unit: "pct", status: getStatus(data.reg_rate, 45, 40) },
    { id: "unlock", labelKey: "healthUnlockRate", formulaKey: "HEALTH_UNLOCK_RATE", isNorthStar: false, healthy: "≥50%", warning: "37-50%", dangerous: "<37%", current: data.unlock_rate, unit: "pct", status: getStatus(data.unlock_rate, 50, 37) },
    { id: "loop", labelKey: "healthLoopRate", formulaKey: "HEALTH_LOOP_RATE", isNorthStar: false, healthy: "≥90%", warning: "80-89%", dangerous: "<80%", current: data.loop_rate, unit: "pct", status: getStatus(data.loop_rate, 90, 80) },
    { id: "share", labelKey: "healthShareRate", formulaKey: "HEALTH_SHARE_RATE", isNorthStar: false, healthy: "≥20%", warning: "8-19%", dangerous: "<8%", current: data.share_rate, unit: "pct", status: getStatus(data.share_rate, 20, 8) },
    { id: "referral", labelKey: "healthReferralWeek", formulaKey: "HEALTH_REFERRAL_WEEK", isNorthStar: true, healthy: "≥20", warning: "5-19", dangerous: "<5", current: Math.round(data.referral_regs_7d), unit: "people", status: getStatus(data.referral_regs_7d, 20, 5) },
    { id: "d7", labelKey: "healthD7Unlock", formulaKey: "HEALTH_D7_UNLOCK", isNorthStar: false, healthy: "≥15%", warning: "9-14%", dangerous: "<9%", current: data.d7_retention_unlock, unit: "pct", status: getStatus(data.d7_retention_unlock, 15, 9) },
    { id: "pay", labelKey: "healthPayRate", formulaKey: "HEALTH_PAY_RATE", isNorthStar: false, healthy: "≥1.5%", warning: "0.5-1.4%", dangerous: "<0.5%", current: data.pay_rate, unit: "pct", status: getStatus(data.pay_rate, 1.5, 0.5) },
    { id: "revenue", labelKey: "healthMonthlyRevenue", formulaKey: "HEALTH_MONTHLY_REVENUE", isNorthStar: false, healthy: "≥$500", warning: "$100-499", dangerous: "<$100", current: data.revenue_30d, unit: "currency", status: getStatus(data.revenue_30d, 500, 100) },
  ];
}

function formatCurrent(row: HealthRow): string {
  if (row.unit === "pct") return `${Number(row.current)}%`;
  if (row.unit === "people") return `~${row.current}`;
  if (row.unit === "currency") return `$${Number(row.current).toFixed(2)}`;
  return String(row.current);
}

type Props = {
  t: (key: string) => string;
};

export function FlywheelHealthDashboard({ t }: Props) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/marketing/health-dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d.error) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = buildRows(data);
  const dataRangeEnd = new Date();
  const dataRangeStart = new Date();
  dataRangeStart.setDate(dataRangeStart.getDate() - 30);
  const rangeStr = `${dataRangeStart.toISOString().slice(0, 10)} ~ ${dataRangeEnd.toISOString().slice(0, 10)}`;

  return (
    <section className="mb-8">
      <div className="overflow-hidden rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t("healthDashboardTitle")}</h2>
            <p className="mt-1 text-[10px] text-[var(--secondary-text)]">
              {t("dataRange")}: {rangeStr}
            </p>
          </div>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
            {t("lastNDays").replace("{n}", "30")}
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--secondary-text)]">
                    {t("healthIndicator")}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--secondary-text)]">
                    {t("healthHealthy")}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--secondary-text)]">
                    {t("healthWarning")}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--secondary-text)]">
                    {t("healthDangerous")}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--secondary-text)]">
                    {t("healthCurrent")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--background)]/50"
                  >
                    <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">
                      <span className="inline-flex items-center gap-1.5">
                        {t(row.labelKey)}
                        {row.isNorthStar && (
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "rgba(52,168,83,0.12)", color: "var(--accent)" }}>
                            {t("healthNorthStarTitle")}
                          </span>
                        )}
                        <InfoTooltip metricKey={row.formulaKey} />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--secondary-text)]">
                      <span className={row.status === "healthy" ? "font-bold" : undefined}>
                        {row.healthy}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--secondary-text)]">
                      <span className={row.status === "warning" ? "font-bold" : undefined}>
                        {row.warning}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--secondary-text)]">
                      <span className={row.status === "dangerous" ? "font-bold" : undefined}>
                        {row.dangerous}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="tabular-nums"
                        style={{
                          fontWeight: row.status === "dangerous" ? 700 : undefined,
                          color:
                            row.status === "healthy"
                              ? "var(--positive)"
                              : row.status === "warning"
                                ? "#b88a00"
                                : "var(--negative)",
                        }}
                      >
                        {formatCurrent(row)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
