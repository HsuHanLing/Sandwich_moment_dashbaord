"use client";

import { useState } from "react";
import type { TranslationKey } from "@/lib/i18n";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

type FunnelStep = { step: string; users: number; fromTop: number };
type ChannelRow = { channel: string; clicked: number; success: number; failure: number };
type NoActionDebug = {
  app_open: number;
  app_open_no_action: number;
  has_auth_entry_click: number;
  has_auth_nickname_next: number;
  has_auth_submit_result: number;
  has_auth_oauth_or_switch: number;
  has_legacy_success: number;
  has_reg: number;
  has_click_signup?: number;
  has_enter_main?: number;
  has_click_google?: number;
  has_click_apple?: number;
  has_click_email?: number;
  has_click_phone?: number;
  has_reg_google?: number;
  has_reg_apple?: number;
  has_reg_email?: number;
  has_reg_phone?: number;
  has_watch_video?: number;
  has_add_friend?: number;
  has_profile_view?: number;
  has_shooting?: number;
};
type ChannelsByCountry = Record<string, { google: number; apple: number; email: number; phone: number }>;
type FunnelData = { funnel: FunnelStep[]; channels: ChannelRow[]; channelsByCountry?: ChannelsByCountry | null; noActionDebug?: NoActionDebug | null };

type Props = {
  data: FunnelData | null;
  loading: boolean;
  analyticsDays: number;
  t: (key: TranslationKey) => string;
};

const FUNNEL_COLORS = ["#60a5fa", "#93c5fd", "#3b82f6", "#8b5cf6", "#6d28d9", "#4f46e5"];

const FUNNEL_LABEL_KEYS: Record<string, TranslationKey> = {
  app_open: "regFunnelAppOpen",
  app_open_no_action: "regFunnelAppOpenNoClick",
  auth_entry_click: "regFunnelFirstEntry",
  click_signup: "regFunnelClickSignup",
  registered: "regFunnelRegistered",
  enter_main: "regFunnelLanded",
};

const STEP_METRIC_KEYS: Record<string, string> = {
  app_open: "REG_APP_OPEN",
  app_open_no_action: "REG_APP_OPEN_NO_CLICK",
  auth_entry_click: "REG_AUTH_ENTRY_CLICK",
  click_signup: "REG_CLICK_SIGNUP",
  registered: "REG_REGISTERED",
  enter_main: "REG_ENTER_MAIN",
};

const CHANNEL_LABEL_KEYS: Record<string, TranslationKey> = {
  google: "regMethodGoogle",
  apple: "regMethodApple",
  email: "regMethodEmail",
  phone: "regMethodPhone",
};

const CHANNEL_SUCCESS_METRIC_KEYS: Record<string, string> = {
  google: "REG_METHOD_GOOGLE",
  apple: "REG_METHOD_APPLE",
  email: "REG_METHOD_EMAIL",
  phone: "REG_METHOD_PHONE",
};

const CHANNEL_COLORS: Record<string, string> = {
  google: "#34a853",
  apple: "#a1a1aa",
  email: "#3b82f6",
  phone: "#f59e0b",
};

const cardStyle = { border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" } as const;

function getFormulaDisplay(
  mk: string | undefined,
  info: { formula: string } | null,
  t: (k: TranslationKey) => string
): string {
  if (!mk) return info?.formula ?? "";
  if (mk === "REG_APP_OPEN_NO_CLICK") return t("metricFormula_REG_APP_OPEN_NO_CLICK");
  return info?.formula ?? "";
}

function StepWithTooltip({ stepLabel, step, t }: { stepLabel: string; step: string; t: (k: TranslationKey) => string }) {
  const [show, setShow] = useState(false);
  const mk = STEP_METRIC_KEYS[step];
  const info = mk ? METRIC_FORMULAS[mk] : null;
  const desc = mk ? t(`metricDesc_${mk}` as TranslationKey) : "";
  return (
    <td
      className="relative px-3 py-2 text-[11px] text-[var(--foreground)]"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dashed border-[var(--border)]">{stepLabel}</span>
      {show && info && (
        <div
          className="absolute left-0 bottom-full z-[100] mb-1 w-[360px] max-w-[90vw] rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-1.5 py-1 text-[9px] leading-snug"
          style={{ boxShadow: "var(--shadow-tooltip)" }}
        >
          <p className="font-medium text-[var(--accent)]">{getFormulaDisplay(mk, info, t)}</p>
          {desc && <p className="mt-0.5 text-[var(--secondary-text)]">{desc}</p>}
        </div>
      )}
    </td>
  );
}

function CellWithTooltip({ value, metricKey, t }: { value: string | number; metricKey: string; t: (k: TranslationKey) => string }) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];
  const desc = t(`metricDesc_${metricKey}` as TranslationKey);
  return (
    <td
      className="relative px-3 py-2 text-[11px] text-[var(--foreground)] tabular-nums text-right"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dashed border-[var(--border)]">{value}</span>
      {show && info && (
        <div
          className="absolute right-0 bottom-full z-[100] mb-1 w-56 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-1.5 py-1 text-[9px] leading-snug"
          style={{ boxShadow: "var(--shadow-tooltip)" }}
        >
          <p className="font-medium text-[var(--accent)]">{getFormulaDisplay(metricKey, info, t)}</p>
          {desc && <p className="mt-0.5 text-[var(--secondary-text)]">{desc}</p>}
        </div>
      )}
    </td>
  );
}

const CHANNEL_CLICKED_METRIC_KEYS: Record<string, string> = {
  google: "REG_CHANNEL_GOOGLE_CLICKED",
  apple: "REG_CHANNEL_APPLE_CLICKED",
  email: "REG_CHANNEL_EMAIL_CLICKED",
  phone: "REG_CHANNEL_PHONE_CLICKED",
};

function ChannelCellWithTooltip({ value, metricKey, className = "" }: { value: string | number; metricKey: string; className?: string }) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];
  return (
    <td
      className={`relative py-1.5 text-right text-[11px] tabular-nums ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dashed border-[var(--border)]">{value}</span>
      {show && info && (
        <div
          className="absolute right-0 bottom-full z-[100] mb-1 w-56 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-1.5 py-1 text-[9px] leading-snug"
          style={{ boxShadow: "var(--shadow-tooltip)" }}
        >
          <p className="font-medium text-[var(--accent)]">{info.formula}</p>
          <p className="mt-0.5 text-[var(--secondary-text)]">{info.description}</p>
          <p className="mt-0.5 tabular-nums">{value}</p>
        </div>
      )}
    </td>
  );
}

export function RegistrationFunnelSection({ data, loading, analyticsDays, t }: Props) {
  const [channelsExpanded, setChannelsExpanded] = useState(false);

  const funnel = (data?.funnel ?? []).map((s) => ({
    ...s,
    label: t(FUNNEL_LABEL_KEYS[s.step] ?? ("regFunnelAppOpen" as TranslationKey)),
  }));

  const channels = (data?.channels ?? []).map((c) => ({
    ...c,
    label: t(CHANNEL_LABEL_KEYS[c.channel] ?? ("regMethodGoogle" as TranslationKey)),
    color: CHANNEL_COLORS[c.channel] ?? "#999",
  }));

  const channelsWithSuccess = channels.filter((c) => c.success > 0);
  const maxUsers = Math.max(...funnel.map((d) => d.users), 1);

  return (
    <section className="mb-8">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: funnel chart + table + channels */}
        <div className="lg:col-span-2 overflow-visible rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
          <div className="overflow-visible p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">{t("regFunnelTitle")}</h2>
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}
              >
                {t("signupCohort")}: {analyticsDays}{t("days")}
              </span>
            </div>

            {loading ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("loading")}</div>
            ) : funnel.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("noData")}</div>
            ) : (
              <>
                {/* Bar chart */}
                <div className="mt-4 h-[200px] w-full overflow-visible">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, Math.ceil(maxUsers * 1.1)]}
                        tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={115}
                        tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload as (typeof funnel)[0];
                          const mk = STEP_METRIC_KEYS[d.step];
                          const info = mk ? METRIC_FORMULAS[mk] : null;
                          const desc = mk ? t(`metricDesc_${mk}` as TranslationKey) : "";
                          return (
                            <div className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 text-[10px] max-w-[380px]" style={{ boxShadow: "var(--shadow-tooltip)" }}>
                              <p className="font-semibold">{d.label}</p>
                              {info && <p className="mt-0.5 font-medium text-[var(--accent)]">{getFormulaDisplay(mk, info, t)}</p>}
                              {desc && <p className="mt-0.5 text-[var(--secondary-text)]">{desc}</p>}
                              <p className="mt-0.5 tabular-nums">{t("userCount")}: {d.users.toLocaleString()}</p>
                              <p className="tabular-nums text-[var(--secondary-text)]">{d.fromTop}%</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="users" radius={[0, 4, 4, 0]} maxBarSize={28} name="users">
                        {funnel.map((_, i) => (
                          <Cell key={funnel[i].step} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table with hover tooltips */}
                <div className="mt-4 overflow-x-auto overflow-y-visible rounded-xl" style={{ border: "1px solid var(--card-stroke)" }}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                        <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]" />
                        <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("userCount")}</th>
                        <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-24">{t("conversionRate")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.map((row) => (
                        <tr key={row.step} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)]">
                          <StepWithTooltip stepLabel={row.label} step={row.step} t={t} />
                          <CellWithTooltip value={row.users.toLocaleString()} metricKey={STEP_METRIC_KEYS[row.step] ?? "REG_APP_OPEN"} t={t} />
                          <CellWithTooltip value={`${row.fromTop}%`} metricKey="REG_REGISTERED" t={t} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* By channel: collapsed by default, click to expand; hover shows data details */}
                {channels.length > 0 && (
                  <div className="mt-4 rounded-xl bg-[var(--background)] p-3">
                    <button
                      type="button"
                      onClick={() => setChannelsExpanded((v) => !v)}
                      className="flex w-full items-center justify-between text-left text-[11px] font-medium text-[var(--secondary-text)] hover:text-[var(--foreground)]"
                      aria-expanded={channelsExpanded}
                      aria-label={channelsExpanded ? t("regChannelCollapse") : t("regChannelExpand")}
                    >
                      <span>{t("regFunnelChannelsTitle")}</span>
                      <span className="tabular-nums text-[10px]" aria-hidden>
                        {channelsExpanded ? "▼" : "▶"}
                      </span>
                    </button>
                    {channelsExpanded && (
                      <>
                      <table className="mt-2 w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="py-1.5 text-left font-medium text-[var(--secondary-text)]" />
                            <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("regChannelClicked")}</th>
                            <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("regChannelSuccess")}</th>
                            <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("regChannelFailure")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {channels.map((c) => {
                            const successPct = c.clicked > 0 ? Math.round((c.success / c.clicked) * 1000) / 10 : 0;
                            const failurePct = c.clicked > 0 ? Math.round((c.failure / c.clicked) * 1000) / 10 : 0;
                            return (
                              <tr key={c.channel} className="border-b border-[var(--border)] last:border-b-0">
                                <td className="py-1.5 text-[var(--foreground)]">
                                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                  {c.label}
                                </td>
                                <ChannelCellWithTooltip value={c.clicked.toLocaleString()} metricKey={CHANNEL_CLICKED_METRIC_KEYS[c.channel] ?? "REG_CHANNEL_GOOGLE_CLICKED"} />
                                <ChannelCellWithTooltip value={c.clicked > 0 ? `${c.success.toLocaleString()} (${successPct}%)` : c.success.toLocaleString()} metricKey={CHANNEL_SUCCESS_METRIC_KEYS[c.channel] ?? "REG_METHOD_GOOGLE"} />
                                <ChannelCellWithTooltip value={c.failure > 0 ? `${c.failure.toLocaleString()} (${failurePct}%)` : "—"} metricKey="REG_CHANNEL_FAILURE" className={c.failure > 0 ? "text-red-500" : ""} />
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {/* Core countries: registered users by channel */}
                      {(() => {
                        const byCountry = data?.channelsByCountry ?? {};
                        const coreOrder = ["US", "GB", "IN", "BR", "ID", "DE", "FR", "JP", "KR", "CA", "MX"];
                        const countriesWithData = coreOrder.filter((code) => {
                          const row = byCountry[code];
                          if (!row) return false;
                          const total = row.google + row.apple + row.email + row.phone;
                          return total > 0;
                        });
                        if (countriesWithData.length === 0) return null;
                        return (
                          <div className="mt-4 border-t border-[var(--border)] pt-3">
                            <p className="mb-2 text-[11px] font-medium text-[var(--secondary-text)]">{t("regCoreCountriesTitle")}</p>
                            <p className="mb-2 text-[10px] text-[var(--secondary-text)]">{t("regCoreCountriesDesc")}</p>
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="border-b border-[var(--border)]">
                                  <th className="py-1.5 text-left font-medium text-[var(--secondary-text)]">{t("region")}</th>
                                  <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("regMethodGoogle")}</th>
                                  <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("regMethodApple")}</th>
                                  <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("regMethodEmail")}</th>
                                  <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("regMethodPhone")}</th>
                                  <th className="py-1.5 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("userCount")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {countriesWithData.map((code) => {
                                  const row = byCountry[code];
                                  const total = row ? row.google + row.apple + row.email + row.phone : 0;
                                  const countryLabel = t(`country_${code}` as TranslationKey);
                                  return (
                                    <tr key={code} className="border-b border-[var(--border)] last:border-b-0">
                                      <td className="py-1.5 text-[var(--foreground)]">{countryLabel}</td>
                                      <td className="py-1.5 text-right tabular-nums">{row?.google.toLocaleString() ?? "0"}</td>
                                      <td className="py-1.5 text-right tabular-nums">{row?.apple.toLocaleString() ?? "0"}</td>
                                      <td className="py-1.5 text-right tabular-nums">{row?.email.toLocaleString() ?? "0"}</td>
                                      <td className="py-1.5 text-right tabular-nums">{row?.phone.toLocaleString() ?? "0"}</td>
                                      <td className="py-1.5 text-right tabular-nums font-medium">{total.toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Registered by channel pie */}
        <div className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
          <div className="overflow-visible p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">{t("regFunnelChannelsTitle")}</h2>

            {loading ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("loading")}</div>
            ) : channelsWithSuccess.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("noData")}</div>
            ) : (
              <>
                <div className="mt-4 flex justify-center">
                  <div className="h-[160px] w-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={channelsWithSuccess}
                          dataKey="success"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          strokeWidth={1}
                          stroke="var(--card-bg)"
                        >
                          {channelsWithSuccess.map((c) => (
                            <Cell key={c.channel} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload as (typeof channelsWithSuccess)[0];
                            const totalSuccess = channelsWithSuccess.reduce((s, c) => s + c.success, 0);
                            const pct = totalSuccess > 0 ? Math.round((d.success / totalSuccess) * 1000) / 10 : 0;
                            return (
                              <div className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 text-[10px]" style={{ boxShadow: "var(--shadow-tooltip)" }}>
                                <p className="font-semibold">{d.label}</p>
                                <p className="tabular-nums">{t("regChannelSuccess")}: {d.success.toLocaleString()} ({pct}%)</p>
                                <p className="tabular-nums text-[var(--secondary-text)]">{t("regChannelClicked")}: {d.clicked.toLocaleString()}</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Legend */}
                <div className="mt-3 space-y-1.5">
                  {channelsWithSuccess.map((c) => {
                    const totalSuccess = channelsWithSuccess.reduce((s, ch) => s + ch.success, 0);
                    const pct = totalSuccess > 0 ? Math.round((c.success / totalSuccess) * 1000) / 10 : 0;
                    return (
                      <div key={c.channel} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span>{c.label}</span>
                        </div>
                        <span className="tabular-nums text-[var(--secondary-text)]">
                          {c.success.toLocaleString()} <span className="text-[10px]">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Core countries: always visible in right column */}
                {(() => {
                  const byCountry = data?.channelsByCountry ?? {};
                  const coreOrder = ["US", "GB", "IN", "BR", "ID", "DE", "FR", "JP", "KR", "CA", "MX"];
                  const countriesWithData = coreOrder.filter((code) => {
                    const row = byCountry[code];
                    if (!row) return false;
                    return (row.google + row.apple + row.email + row.phone) > 0;
                  });
                  if (countriesWithData.length === 0) return null;
                  return (
                    <div className="mt-4 border-t border-[var(--border)] pt-3">
                      <p className="mb-2 text-[11px] font-medium text-[var(--foreground)]">{t("regCoreCountriesTitle")}</p>
                      <p className="mb-2 text-[10px] text-[var(--secondary-text)]">{t("regCoreCountriesDesc")}</p>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              <th className="py-1 text-left font-medium text-[var(--secondary-text)]">{t("region")}</th>
                              <th className="py-1 text-right font-medium text-[var(--secondary-text)] tabular-nums">G</th>
                              <th className="py-1 text-right font-medium text-[var(--secondary-text)] tabular-nums">A</th>
                              <th className="py-1 text-right font-medium text-[var(--secondary-text)] tabular-nums">E</th>
                              <th className="py-1 text-right font-medium text-[var(--secondary-text)] tabular-nums">P</th>
                              <th className="py-1 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("userCount")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {countriesWithData.map((code) => {
                              const row = byCountry[code];
                              const total = row ? row.google + row.apple + row.email + row.phone : 0;
                              const countryLabel = t(`country_${code}` as TranslationKey);
                              return (
                                <tr key={code} className="border-b border-[var(--border)] last:border-b-0">
                                  <td className="py-1 text-[var(--foreground)]">{countryLabel}</td>
                                  <td className="py-1 text-right tabular-nums">{row?.google.toLocaleString() ?? "0"}</td>
                                  <td className="py-1 text-right tabular-nums">{row?.apple.toLocaleString() ?? "0"}</td>
                                  <td className="py-1 text-right tabular-nums">{row?.email.toLocaleString() ?? "0"}</td>
                                  <td className="py-1 text-right tabular-nums">{row?.phone.toLocaleString() ?? "0"}</td>
                                  <td className="py-1 text-right tabular-nums font-medium">{total.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
