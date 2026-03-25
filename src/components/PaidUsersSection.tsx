"use client";

import { useState, useEffect } from "react";
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
  PieChart,
  Pie,
  Legend,
} from "recharts";

type D7Ret = { total_first_payers: number; d7_retained: number; rate: number };
type DistBucket = { bucket: string; user_count: number; pct: number };
type GeoRow = { country: string; country_name: string; payers: number; payer_share: number; revenue: number; revenue_share: number };

type RepurchaseData = {
  total_purchase_users: number;
  repurchasers: number;
  repurchase_rate_pct: number;
  avg_days_to_repurchase: number;
  repurchase_rate_7d_pct: number;
  repurchase_rate_30d_pct: number;
  eligible_first_for_7d: number;
  eligible_first_for_30d: number;
  daily: { date: string; first_purchase_users: number; second_purchase_users: number }[];
  platform_breakdown: { platform: string; total_users: number; repurchasers: number; repurchase_rate_pct: number }[];
  purchase_frequency: { bucket: string; users: number; pct: number }[];
};

type PaidData = {
  total_payers: number;
  total_revenue: number;
  subscription_revenue: number;
  arppu: number;
  avg_purchases: number;
  first_time_payers: number;
  repeat_payers: number;
  d7_retention: D7Ret;
  first_pay_distribution: DistBucket[];
} | null;

type Props = {
  data: PaidData;
  geo: GeoRow[];
  analyticsDays: number;
  t: (key: string) => string;
};

const BAR_COLORS = ["#34a853", "#4285f4", "#fbbc04", "#ea4335", "#9334e6", "#e040fb"];
const PIE_COLORS = ["#4285f4", "#ea4335", "#fbbc04", "#34a853", "#8ab4f8", "#f28b82", "#fdd663", "#81c995"];

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

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

const badgeStyle = { backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" } as const;
const cardStyle = { border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" } as const;
const subCardStyle = { backgroundColor: "var(--background)" } as const;

export function PaidUsersSection({ data, geo, analyticsDays, t }: Props) {
  const [repurchase, setRepurchase] = useState<RepurchaseData | null>(null);
  useEffect(() => {
    let cancelled = false;
    setRepurchase(null);
    fetch(`/api/marketing/repurchase?days=${analyticsDays}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && typeof d.total_purchase_users === "number") {
          const r = d as RepurchaseData;
          setRepurchase({
            ...r,
            purchase_frequency: Array.isArray(r.purchase_frequency) ? r.purchase_frequency : [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) setRepurchase(null);
      });
    return () => {
      cancelled = true;
    };
  }, [analyticsDays]);

  const pieData = geo.slice(0, 8).map((g) => ({ name: g.country_name || g.country, value: g.payers }));

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{t("paidUsers")}</h2>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={badgeStyle}>
          {t("lastNDays").replace("{n}", String(analyticsDays))}
        </span>
      </div>
      <p className="mt-0.5 mb-4 text-xs text-[var(--secondary-text)]">{t("paidUsersDesc")}</p>

      {/* KPI Row */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Payers with first-time / repeat breakdown */}
        <div className="rounded-xl bg-[var(--card-bg)] p-3.5" style={cardStyle}>
          <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
            {t("paidTotalPayers")}<InfoTooltip metricKey="PAID_TOTAL_PAYERS" />
          </p>
          <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{data ? data.total_payers.toLocaleString() : "—"}</p>
          {data && (
            <div className="mt-2 flex gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#34a853" }} />
                {t("paidFirstTime")}: <span className="font-semibold">{data.first_time_payers.toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#4285f4" }} />
                {t("paidRepeat")}: <span className="font-semibold">{data.repeat_payers.toLocaleString()}</span>
              </span>
            </div>
          )}
        </div>
        {/* Revenue with subscription breakdown */}
        <div className="rounded-xl bg-[var(--card-bg)] p-3.5" style={cardStyle}>
          <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
            {t("paidRevenue")}<InfoTooltip metricKey="PAID_REVENUE_TOTAL" />
          </p>
          <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{data ? formatCurrency(data.total_revenue) : "—"}</p>
          {data && data.subscription_revenue > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-[var(--secondary-text)]">
              <span className="inline-flex items-center">
                {t("paidSubRevenue")}
                <InfoTooltip metricKey="SUB_PAID_REVENUE" />
                :
              </span>
              <span className="font-semibold">{formatCurrency(data.subscription_revenue)}</span>
              <span className="text-[9px]">
                ({data.total_revenue > 0 ? Math.round((data.subscription_revenue / data.total_revenue) * 1000) / 10 : 0}%)
              </span>
            </p>
          )}
        </div>
        {/* ARPPU + Avg Purchases */}
        <div className="rounded-xl bg-[var(--card-bg)] p-3.5" style={cardStyle}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
                ARPPU<InfoTooltip metricKey="PAID_ARPPU" />
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{data ? formatCurrency(data.arppu) : "—"}</p>
            </div>
            <div>
              <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
                {t("paidAvgPurchases")}<InfoTooltip metricKey="PAID_AVG_PURCHASES" />
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{data ? data.avg_purchases : "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Repurchase (lifetime) — loaded async from /api/marketing/repurchase */}
      {data && (
        <div className="mb-4 rounded-xl bg-[var(--card-bg)] p-4" style={cardStyle}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-[var(--foreground)]">{t("paidRepurchaseTitle")}</p>
              <p className="mt-0.5 text-[10px] text-[var(--secondary-text)]">{t("paidRepurchaseDesc")}</p>
            </div>
            <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={badgeStyle}>
              {t("lastNDays").replace("{n}", String(analyticsDays))} · daily
            </span>
          </div>
          {!repurchase ? (
            <p className="py-6 text-center text-[11px] text-[var(--secondary-text)]">{t("loadingText")}</p>
          ) : (
            <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("paidLifetimePayers")} <InfoTooltip metricKey="PAID_REPURCHASE_LIFETIME_BASE" />
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{repurchase.total_purchase_users.toLocaleString()}</p>
            </div>
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("paidRepurchasers")} <InfoTooltip metricKey="PAID_REPURCHASERS" />
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{repurchase.repurchasers.toLocaleString()}</p>
            </div>
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("paidRepurchaseRate")} <InfoTooltip metricKey="PAID_REPURCHASE_RATE" />
              </p>
              <p className="mt-1 text-lg font-semibold text-[#4285f4]">{repurchase.repurchase_rate_pct}%</p>
            </div>
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("paidAvgDaysRepurchase")} <InfoTooltip metricKey="PAID_AVG_DAYS_REPURCHASE" />
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{repurchase.avg_days_to_repurchase}</p>
            </div>
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("paidRepurchase7d")} <InfoTooltip metricKey="PAID_REPURCHASE_7D" />
              </p>
              <p className="mt-1 text-lg font-semibold text-[#34a853]">{repurchase.repurchase_rate_7d_pct}%</p>
              <p className="mt-0.5 text-[9px] text-[var(--secondary-text)]">
                n={repurchase.eligible_first_for_7d.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("paidRepurchase30d")} <InfoTooltip metricKey="PAID_REPURCHASE_30D" />
              </p>
              <p className="mt-1 text-lg font-semibold text-[#fbbc04]">{repurchase.repurchase_rate_30d_pct}%</p>
              <p className="mt-0.5 text-[9px] text-[var(--secondary-text)]">
                n={repurchase.eligible_first_for_30d.toLocaleString()}
              </p>
            </div>
          </div>
          {repurchase.purchase_frequency.length > 0 && (
            <div className="mb-4">
              <p className="mb-0.5 flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
                {t("paidRepurchaseFrequencyTitle")}
                <InfoTooltip metricKey="PAID_REPURCHASE_FREQUENCY_BUCKETS" />
              </p>
              <p className="mb-2 text-[10px] text-[var(--secondary-text)]">{t("paidRepurchaseFrequencyDesc")}</p>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={repurchase.purchase_frequency}
                    margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
                      tickFormatter={(v: string) => (v === "5+" ? "5+" : v)}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} allowDecimals={false} width={40} />
                    <RechartsTooltip
                      formatter={(value, _name, item) => {
                        const n = value == null ? 0 : Number(value);
                        const pct = (item?.payload as { pct?: number } | undefined)?.pct ?? 0;
                        return [`${n.toLocaleString()} (${pct}%)`, t("paidRepurchaseFrequencyUsers")];
                      }}
                      labelFormatter={(label) => `${t("paidRepurchaseFrequencyTotalPurchases")}: ${label}`}
                      contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <Bar dataKey="users" name={t("paidRepurchaseFrequencyUsers")} radius={[4, 4, 0, 0]}>
                      {repurchase.purchase_frequency.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {repurchase.daily.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[11px] font-medium text-[var(--secondary-text)]">{t("paidRepurchaseDaily")}</p>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={repurchase.daily} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--secondary-text)" }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} allowDecimals={false} width={36} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="first_purchase_users" name={t("paidFirstPurchaseUsers")} fill="#8ab4f8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="second_purchase_users" name={t("paidSecondPurchaseUsers")} fill="#4285f4" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {repurchase.platform_breakdown.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium text-[var(--secondary-text)]">{t("paidRepurchasePlatform")}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-2 py-1.5 text-left font-medium text-[var(--secondary-text)]">Platform</th>
                      <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("paidLifetimePayers")}</th>
                      <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("paidRepurchasers")}</th>
                      <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("paidRepurchaseRate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repurchase.platform_breakdown.map((row) => (
                      <tr key={row.platform} className="border-b border-[var(--border)]/50">
                        <td className="px-2 py-1.5 font-medium text-[var(--foreground)]">{row.platform}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{row.total_users.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{row.repurchasers.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{row.repurchase_rate_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* D7 Retention + First Pay Distribution */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-[var(--card-bg)] p-4" style={cardStyle}>
          <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
            {t("paidD7Retention")}<InfoTooltip metricKey="PAID_D7_RETENTION" />
          </p>
          <p className="mt-2">
            <span className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {data ? `${data.d7_retention.rate}%` : "—"}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="text-[10px] text-[var(--secondary-text)]">{t("paidFirstPayers")}</p>
              <p className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
                {data ? data.d7_retention.total_first_payers.toLocaleString() : "—"}
              </p>
            </div>
            <div className="rounded-lg p-2.5" style={subCardStyle}>
              <p className="text-[10px] text-[var(--secondary-text)]">{t("paidD7Retained")}</p>
              <p className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
                {data ? data.d7_retention.d7_retained.toLocaleString() : "—"}
              </p>
            </div>
          </div>
          {data && data.first_time_payers > data.d7_retention.total_first_payers && (
            <p className="mt-2 text-[9px] text-[var(--secondary-text)] opacity-70">
              {t("paidD7Note").replace("{total}", String(data.first_time_payers)).replace("{eligible}", String(data.d7_retention.total_first_payers)).replace("{recent}", String(data.first_time_payers - data.d7_retention.total_first_payers))}
            </p>
          )}
        </div>

        <div className="col-span-1 lg:col-span-2 rounded-xl bg-[var(--card-bg)] p-4" style={cardStyle}>
          <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
            {t("paidFirstPayDist")}<InfoTooltip metricKey="PAID_FIRST_PAY_DAY" />
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--secondary-text)]">{t("paidFirstPayDistDesc")}</p>
          {data && data.first_pay_distribution.length > 0 ? (
            <>
              <div className="mt-3" style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={data.first_pay_distribution} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} axisLine={false} tickLine={false} width={40} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                      formatter={(value, _name, entry) => [
                        `${Number(value ?? 0).toLocaleString()} users (${(entry?.payload as DistBucket)?.pct ?? 0}%)`,
                        t("paidFirstPayers"),
                      ]}
                      labelFormatter={(label) => `${t("paidDaysToFirstPay")}: ${String(label ?? "")}`}
                    />
                    <Bar dataKey="user_count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {data.first_pay_distribution.map((_e, idx) => (
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
                      <th className="px-2 py-1.5 text-left font-medium text-[var(--secondary-text)]">{t("paidDaysToFirstPay")}</th>
                      <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("unlockUserCount")}</th>
                      <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("unlockUserPct")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.first_pay_distribution.map((row) => (
                      <tr key={row.bucket} className="border-b border-[var(--border)]/50">
                        <td className="px-2 py-1.5 font-medium text-[var(--foreground)]">{row.bucket}</td>
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

      {/* Payer Geo Distribution */}
      {geo.length > 0 && (
        <div className="rounded-xl bg-[var(--card-bg)] p-4" style={cardStyle}>
          <p className="text-[11px] font-medium text-[var(--secondary-text)] mb-3">{t("paidGeoTitle")}</p>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-[220px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} paddingAngle={1} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 10 }}
                    formatter={(value) => [`${Number(value ?? 0).toLocaleString()} payers`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} iconType="square" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-2 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="px-2 py-1.5 text-left font-medium text-[var(--secondary-text)]">{t("paidGeoCountry")}</th>
                    <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("paidTotalPayers")}</th>
                    <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("share")}</th>
                    <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("revenue")}</th>
                    <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("paidGeoRevShare")}</th>
                  </tr>
                </thead>
                <tbody>
                  {geo.map((row) => (
                    <tr key={row.country} className="border-b border-[var(--border)]/50">
                      <td className="px-2 py-1.5 font-medium text-[var(--foreground)]">{row.country_name || row.country}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.payers.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--secondary-text)]">{row.payer_share}%</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--secondary-text)]">{row.revenue_share}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
