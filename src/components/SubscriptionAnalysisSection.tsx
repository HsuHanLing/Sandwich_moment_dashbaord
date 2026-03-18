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
  Legend,
  Cell,
} from "recharts";

type DailyRow = {
  date: string;
  exchange: number;
  auto_convert: number;
  manual_convert: number;
  paid: number;
  nonmember_hint: number;
  membership_entry: number;
  iap_start: number;
  iap_fail: number;
  topup_start: number;
  topup_success: number;
};

type FunnelStep = { step: string; label: string; users: number };
type ConvertMethod = { method: string; count: number };

type KPI = {
  total_exchange: number;
  auto_convert: number;
  manual_convert: number;
  total_paid: number;
  total_wallet_sub: number;
  paid_revenue: number;
  nonmember_hint: number;
  membership_entry: number;
  iap_start: number;
  iap_fail: number;
  topup_start: number;
  topup_success: number;
} | null;

type Props = {
  kpi: KPI;
  daily: DailyRow[];
  funnel: FunnelStep[];
  convertMethods: ConvertMethod[];
  analyticsDays: number;
  t: (key: string) => string;
};

const FUNNEL_COLORS = ["#8ab4f8", "#4285f4", "#34a853", "#fbbc04", "#ea4335"];

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
const subCardStyle = { backgroundColor: "var(--background)" } as const;

export function SubscriptionAnalysisSection({ kpi, daily, funnel, convertMethods, analyticsDays, t }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  if (!kpi) {
    return (
      <section className="mb-8">
        <div className="overflow-visible rounded-xl bg-[var(--card-bg)] p-4 sm:p-5" style={cardStyle}>
          <h2 className="text-base font-semibold tracking-tight">{t("subAnalysis")}</h2>
          <p className="mt-2 text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
        </div>
      </section>
    );
  }

  const walletSub = kpi.total_wallet_sub ?? 0;
  const totalSubscribers = kpi.total_exchange + kpi.total_paid + walletSub;
  const exchangePct = totalSubscribers > 0 ? ((kpi.total_exchange / totalSubscribers) * 100).toFixed(1) : "0";
  const paidPct = totalSubscribers > 0 ? ((kpi.total_paid / totalSubscribers) * 100).toFixed(1) : "0";
  const walletPct = totalSubscribers > 0 ? ((walletSub / totalSubscribers) * 100).toFixed(1) : "0";
  const iapSuccessRate = kpi.iap_start > 0 ? ((kpi.total_paid / kpi.iap_start) * 100).toFixed(1) : "0";

  const methodLabels: Record<string, string> = {
    diamond: "Diamond → coin",
    cash: "Cash → coin",
    "Diamond → VIP": "Diamond → coin",
    "Cash → VIP": "Cash → coin",
    unknown: "Other",
  };

  return (
    <section className="mb-8">
      <div className="overflow-visible rounded-xl bg-[var(--card-bg)] p-4 sm:p-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{t("subAnalysis")}</h2>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
            {t("lastNDays").replace("{n}", String(analyticsDays))}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("subAnalysisDesc")}</p>

        {/* KPI Cards */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg p-3" style={subCardStyle}>
            <p className="text-[10px] font-medium text-[var(--secondary-text)]">
              {t("subTotalSubs")}
              <InfoTooltip metricKey="SUB_TOTAL" />
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{totalSubscribers.toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-3" style={subCardStyle}>
            <p className="text-[10px] font-medium text-[var(--secondary-text)]">
              {t("subExchange")}
              <InfoTooltip metricKey="SUB_EXCHANGE" />
            </p>
            <p className="mt-1 text-xl font-bold text-[#34a853]">{kpi.total_exchange.toLocaleString()}</p>
            <p className="mt-0.5 text-[9px] text-[var(--secondary-text)]">{exchangePct}% of total</p>
          </div>
          <div className="rounded-lg p-3" style={subCardStyle}>
            <p className="text-[10px] font-medium text-[var(--secondary-text)]">
              {t("subPaid")}
              <InfoTooltip metricKey="SUB_PAID" />
            </p>
            <p className="mt-1 text-xl font-bold text-[#4285f4]">{kpi.total_paid.toLocaleString()}</p>
            <p className="mt-0.5 text-[9px] text-[var(--secondary-text)]">{paidPct}% of total</p>
          </div>
          <div className="rounded-lg p-3" style={subCardStyle}>
            <p className="text-[10px] font-medium text-[var(--secondary-text)]">
              {t("subWallet")}
              <InfoTooltip metricKey="SUB_WALLET" />
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--secondary-text)]">{walletSub.toLocaleString()}</p>
            <p className="mt-0.5 text-[9px] text-[var(--secondary-text)]">{walletPct}% of total</p>
          </div>
          <div className="rounded-lg p-3" style={subCardStyle}>
            <p className="text-[10px] font-medium text-[var(--secondary-text)]">
              {t("subPaidRevenue")}
              <InfoTooltip metricKey="SUB_PAID_REVENUE" />
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
              ${kpi.paid_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg p-3" style={subCardStyle}>
            <p className="text-[10px] font-medium text-[var(--secondary-text)]">
              {t("subIapSuccess")}
              <InfoTooltip metricKey="SUB_IAP_SUCCESS" />
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{iapSuccessRate}%</p>
            <p className="mt-0.5 text-[9px] text-[var(--secondary-text)]">
              {kpi.total_paid} / {kpi.iap_start} started
            </p>
          </div>
        </div>

        {/* Exchange breakdown + Funnel side by side */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Subscription Funnel */}
          <div>
            <h3 className="mb-3 text-xs font-semibold text-[var(--foreground)]">{t("subFunnel")}</h3>
            <div className="space-y-1.5">
              {funnel.map((step, i) => {
                const maxUsers = funnel[0]?.users || 1;
                const widthPct = Math.max((step.users / maxUsers) * 100, 4);
                const convPct = funnel[0]?.users > 0 ? ((step.users / funnel[0].users) * 100).toFixed(1) : "0";
                return (
                  <div key={step.step} className="flex items-center gap-2">
                    <div className="w-[140px] shrink-0 text-right text-[10px] text-[var(--secondary-text)]">{step.label}</div>
                    <div className="flex-1">
                      <div
                        className="flex items-center rounded-sm px-2 py-1 text-[10px] font-medium text-white"
                        style={{ width: `${widthPct}%`, backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length], minWidth: 60 }}
                      >
                        {step.users.toLocaleString()}
                      </div>
                    </div>
                    <span className="w-[48px] shrink-0 text-right text-[10px] text-[var(--secondary-text)]">{convPct}%</span>
                  </div>
                );
              })}
            </div>
            {kpi.iap_fail > 0 && (
              <p className="mt-2 text-[9px] text-[var(--secondary-text)]">
                IAP failures: {kpi.iap_fail.toLocaleString()} users ({kpi.iap_start > 0 ? ((kpi.iap_fail / kpi.iap_start) * 100).toFixed(1) : 0}% of IAP starts)
              </p>
            )}
          </div>

          {/* Exchange Method Breakdown */}
          <div>
            <h3 className="mb-3 text-xs font-semibold text-[var(--foreground)]">{t("subExchangeBreakdown")}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg p-3" style={subCardStyle}>
                <p className="text-[10px] text-[var(--secondary-text)]">{t("subAutoConvert")}</p>
                <p className="mt-1 text-lg font-bold">{kpi.auto_convert.toLocaleString()}</p>
                <p className="text-[9px] text-[var(--secondary-text)]">
                  {kpi.total_exchange > 0 ? ((kpi.auto_convert / kpi.total_exchange) * 100).toFixed(1) : 0}% of exchanges
                </p>
              </div>
              <div className="rounded-lg p-3" style={subCardStyle}>
                <p className="text-[10px] text-[var(--secondary-text)]">{t("subManualConvert")}</p>
                <p className="mt-1 text-lg font-bold">{kpi.manual_convert.toLocaleString()}</p>
                <p className="text-[9px] text-[var(--secondary-text)]">
                  {kpi.total_exchange > 0 ? ((kpi.manual_convert / kpi.total_exchange) * 100).toFixed(1) : 0}% of exchanges
                </p>
              </div>
            </div>
            <p className="mt-2 text-[9px] text-[var(--secondary-text)] italic">{t("subConvertNote")}</p>
            {convertMethods.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-medium text-[var(--secondary-text)]">{t("subConvertMethod")}</p>
                {convertMethods.map((m) => (
                  <div key={m.method} className="flex items-center justify-between py-0.5 text-[10px]">
                    <span>{methodLabels[m.method] ?? m.method}</span>
                    <span className="font-medium">{m.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Trend Chart */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--foreground)]">{t("subDailyTrend")}</h3>
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="text-[10px] font-medium text-[var(--accent)] hover:underline"
            >
              {showDetail ? t("subShowSimple") : t("subShowDetail")}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <RechartsTooltip
                contentStyle={{ fontSize: 11, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {showDetail ? (
                <>
                  <Bar dataKey="auto_convert" name={t("subAutoConvert")} stackId="a" fill="#34a853" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="manual_convert" name={t("subManualConvert")} stackId="a" fill="#81c995" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="paid" name={t("subPaid")} fill="#4285f4" radius={[2, 2, 0, 0]} />
                </>
              ) : (
                <>
                  <Bar dataKey="exchange" name={t("subExchange")} fill="#34a853" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="paid" name={t("subPaid")} fill="#4285f4" radius={[2, 2, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily data table */}
        <div className="mt-3 max-h-[200px] overflow-auto rounded-lg" style={subCardStyle}>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-left text-[var(--secondary-text)]">
                <th className="sticky top-0 bg-[var(--background)] px-2 py-1.5 font-medium">{t("subDate")}</th>
                <th className="sticky top-0 bg-[var(--background)] px-2 py-1.5 font-medium text-right">{t("subExchange")}</th>
                {showDetail && (
                  <>
                    <th className="sticky top-0 bg-[var(--background)] px-2 py-1.5 font-medium text-right">{t("subAutoConvert")}</th>
                    <th className="sticky top-0 bg-[var(--background)] px-2 py-1.5 font-medium text-right">{t("subManualConvert")}</th>
                  </>
                )}
                <th className="sticky top-0 bg-[var(--background)] px-2 py-1.5 font-medium text-right">{t("subPaid")}</th>
                <th className="sticky top-0 bg-[var(--background)] px-2 py-1.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date} className="border-t border-[var(--border)]/30">
                  <td className="px-2 py-1">{d.date}</td>
                  <td className="px-2 py-1 text-right">{d.exchange}</td>
                  {showDetail && (
                    <>
                      <td className="px-2 py-1 text-right">{d.auto_convert}</td>
                      <td className="px-2 py-1 text-right">{d.manual_convert}</td>
                    </>
                  )}
                  <td className="px-2 py-1 text-right">{d.paid}</td>
                  <td className="px-2 py-1 text-right font-medium">{d.exchange + d.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
