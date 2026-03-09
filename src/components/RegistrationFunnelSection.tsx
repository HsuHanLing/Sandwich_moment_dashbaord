"use client";

import { useState, useEffect } from "react";
import type { TranslationKey } from "@/lib/i18n";
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
type MethodStep = { step: string; users: number; share: number };
type FunnelData = { funnel: FunnelStep[]; methods: MethodStep[] };

type Props = {
  analyticsDays: number;
  t: (key: TranslationKey) => string;
};

const FUNNEL_COLORS = ["#60a5fa", "#3b82f6", "#8b5cf6", "#6d28d9"];
const METHOD_COLORS: Record<string, string> = {
  reg_google: "#34a853",
  reg_apple: "#a1a1aa",
  reg_email: "#3b82f6",
  reg_phone: "#f59e0b",
};

const STEP_LABEL_KEYS: Record<string, TranslationKey> = {
  app_open: "regFunnelAppOpen",
  registered: "regFunnelRegistered",
  onboarding_complete: "regFunnelOnboarding",
  enter_main: "regFunnelEnterMain",
};

const METHOD_LABEL_KEYS: Record<string, TranslationKey> = {
  reg_google: "regMethodGoogle",
  reg_apple: "regMethodApple",
  reg_email: "regMethodEmail",
  reg_phone: "regMethodPhone",
};

const cardStyle = { border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" } as const;

export function RegistrationFunnelSection({ analyticsDays, t }: Props) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/marketing/registration-funnel?days=${analyticsDays}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analyticsDays]);

  const funnel = (data?.funnel ?? []).map((s) => ({
    ...s,
    label: t(STEP_LABEL_KEYS[s.step] ?? ("regFunnelAppOpen" as TranslationKey)),
  }));

  const methods = (data?.methods ?? []).filter((m) => m.users > 0).map((m) => ({
    ...m,
    label: t(METHOD_LABEL_KEYS[m.step] ?? ("regMethodGoogle" as TranslationKey)),
    color: METHOD_COLORS[m.step] ?? "#999",
  }));

  const maxUsers = Math.max(...funnel.map((d) => d.users), 1);

  return (
    <section className="mb-8">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Funnel chart - 2 cols */}
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
            <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("regFunnelDesc")}</p>

            {loading ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("loading")}</div>
            ) : funnel.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("noData")}</div>
            ) : (
              <>
                {/* Horizontal bar chart */}
                <div className="mt-4 h-[200px] w-full overflow-visible">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
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
                        width={95}
                        tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload as (typeof funnel)[0];
                          return (
                            <div className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 text-[10px]" style={{ boxShadow: "var(--shadow-tooltip)" }}>
                              <p className="font-semibold">{d.label}</p>
                              <p className="tabular-nums">{t("userCount")}: {d.users.toLocaleString()}</p>
                              <p className="tabular-nums text-[var(--secondary-text)]">{t("conversionRate")}: {d.fromTop}%</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="users" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        {funnel.map((_, i) => (
                          <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Step-by-step table */}
                <div className="mt-4 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--card-stroke)" }}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                        <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">{t("step")}</th>
                        <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("userCount")}</th>
                        <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-24">{t("conversionRate")}</th>
                        <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-24">{t("regFunnelStepRate")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.map((row, i) => {
                        const prev = i > 0 ? funnel[i - 1].users : row.users;
                        const stepRate = prev > 0 ? Math.round((row.users / prev) * 1000) / 10 : 100;
                        return (
                          <tr key={row.step} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)]">
                            <td className="px-3 py-2 text-[var(--foreground)]">{row.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.users.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row.fromTop}%</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {i === 0 ? "—" : `${stepRate}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Registration method breakdown - 1 col */}
        <div className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
          <div className="overflow-visible p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">{t("regMethodTitle")}</h2>
            <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("regMethodDesc")}</p>

            {loading ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("loading")}</div>
            ) : methods.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-xs text-[var(--secondary-text)]">{t("noData")}</div>
            ) : (
              <>
                <div className="mt-4 flex justify-center">
                  <div className="h-[160px] w-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={methods}
                          dataKey="users"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          strokeWidth={1}
                          stroke="var(--card-bg)"
                        >
                          {methods.map((m) => (
                            <Cell key={m.step} fill={m.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload as (typeof methods)[0];
                            return (
                              <div className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 text-[10px]" style={{ boxShadow: "var(--shadow-tooltip)" }}>
                                <p className="font-semibold">{d.label}</p>
                                <p className="tabular-nums">{d.users.toLocaleString()} ({d.share}%)</p>
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
                  {methods.map((m) => (
                    <div key={m.step} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                        <span>{m.label}</span>
                      </div>
                      <span className="tabular-nums text-[var(--secondary-text)]">
                        {m.users.toLocaleString()} <span className="text-[10px]">({m.share}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
