"use client";

import { useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type FunnelStep = { step: string; label: string; users: number };

type Props = {
  data: FunnelStep[];
  loading: boolean;
  days: number;
  t: (key: string) => string;
};

const STEP_FORMULA_MAP: Record<string, string> = {
  writers: "GLIMMO_FA_WRITERS",
  ai_companion: "GLIMMO_FA_AI_COMPANION",
  collection: "GLIMMO_FA_COLLECTION",
  insight: "GLIMMO_FA_INSIGHT",
  subscription: "GLIMMO_FA_SUBSCRIPTION",
};

function InfoTooltip({ metricKey }: { metricKey: string }) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];
  if (!info) return null;
  return (
    <span className="relative ml-1 inline-flex cursor-help items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-[var(--secondary-text)]">
        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
      </svg>
      {show && (
        <span className="absolute bottom-full left-1/2 z-[9999] mb-2 w-[260px] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug shadow-lg" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <span className="block font-semibold text-[var(--accent)]">{info.formula}</span>
          <span className="mt-1 block text-[var(--secondary-text)]">{info.description}</span>
        </span>
      )}
    </span>
  );
}

const cardStyle = { border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" } as const;
const badgeStyle = { backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" } as const;

const FEATURE_COLORS = [
  "#6366f1", // indigo - writers
  "#8b5cf6", // violet - AI companion
  "#ec4899", // pink - collection
  "#f59e0b", // amber - insight
  "#10b981", // emerald - subscription
];

export function GlimmoFeatureAdoption({ data, loading, days, t }: Props) {
  if (loading || !data.length) {
    return (
      <section className="mb-8 overflow-visible rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
        <div className="p-4 sm:p-5">
          <h2 className="text-base font-semibold tracking-tight">{t("glimmoFeatureAdoption")}</h2>
          <p className="mt-2 text-xs text-[var(--secondary-text)]">{t("loading")}</p>
        </div>
      </section>
    );
  }

  const maxUsers = Math.max(...data.map((d) => d.users), 1);

  return (
    <section className="mb-8 overflow-visible rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t("glimmoFeatureAdoption")}</h2>
            <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("glimmoFeatureAdoptionDesc")}</p>
          </div>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={badgeStyle}>
            {t("lastNDays").replace("{n}", String(days))}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {data.map((step, i) => {
            const pct = maxUsers > 0 ? (step.users / maxUsers) * 100 : 0;
            const adoptionRate = data[0].users > 0 ? Math.round((step.users / data[0].users) * 1000) / 10 : 0;

            return (
              <div key={step.step} className="flex items-center gap-4">
                <div className="w-[140px] shrink-0 text-right">
                  <p className="flex items-center justify-end text-[12px] font-semibold text-[var(--foreground)]">{step.label}{STEP_FORMULA_MAP[step.step] && <InfoTooltip metricKey={STEP_FORMULA_MAP[step.step]} />}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="h-8 overflow-hidden rounded-lg" style={{ backgroundColor: "var(--background)" }}>
                    <div
                      className="flex h-full min-w-[2rem] items-center rounded-lg px-2.5 text-[11px] font-semibold text-white transition-all"
                      style={{
                        width: `${Math.max(pct, 5)}%`,
                        backgroundColor: FEATURE_COLORS[i % FEATURE_COLORS.length],
                      }}
                    >
                      {step.users.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="w-[100px] shrink-0 text-right">
                  <p className="text-[13px] font-semibold tabular-nums text-[var(--foreground)]">{step.users.toLocaleString()}</p>
                  <p className="text-[12px] font-medium text-[var(--accent)]">{adoptionRate}% of writers</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
