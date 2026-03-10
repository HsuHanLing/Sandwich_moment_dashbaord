"use client";

import { useEffect, useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type HealthMetric = { metric: string; value: string; status: string };
type HealthSummary = { new_users: number; total_active: number; writers: number };

type Props = {
  t: (key: string) => string;
};

const cardStyle = { border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" } as const;

const HEALTH_FORMULA_MAP: Record<string, string> = {
  "Onboarding Rate": "GLIMMO_HEALTH_ONBOARDING",
  "Writing Rate": "GLIMMO_HEALTH_WRITING",
  "AI Usage Rate": "GLIMMO_HEALTH_AI",
  "Emotional Value": "GLIMMO_HEALTH_EMOTIONAL",
  "Premium Funnel": "GLIMMO_HEALTH_PREMIUM",
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
        <span className="absolute left-full top-1/2 z-[9999] ml-2 w-[280px] -translate-y-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug shadow-lg" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          <span className="block font-semibold text-[var(--accent)]">{info.formula}</span>
          <span className="mt-1 block text-[var(--secondary-text)]">{info.description}</span>
        </span>
      )}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "#34a853",
  warning: "#fbbc04",
  broken: "#ea4335",
};

export function GlimmoHealthDashboard({ t }: Props) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/glimmo/health-dashboard?days=30")
      .then((r) => r.json())
      .then((d) => {
        if (d.metrics) setMetrics(d.metrics);
        if (d.summary) setSummary(d.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mb-8 overflow-hidden rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
        <div className="p-4 sm:p-5">
          <h2 className="text-base font-semibold tracking-tight">{t("glimmoHealthTitle")}</h2>
          <p className="mt-2 text-xs text-[var(--secondary-text)]">{t("loading")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 overflow-visible rounded-xl bg-[var(--card-bg)]" style={cardStyle}>
      <div className="p-4 sm:p-5 overflow-visible">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{t("glimmoHealthTitle")}</h2>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
            {t("lastNDays").replace("{n}", "30")}
          </span>
        </div>

        {summary && (
          <div className="mt-3 mb-4 flex flex-wrap gap-4 text-[11px] text-[var(--secondary-text)]">
            <span>{t("glimmoFwActiveUsers")}: <strong className="text-[var(--foreground)]">{summary.total_active.toLocaleString()}</strong></span>
            <span>{t("glimmoFwNewUsers")}: <strong className="text-[var(--foreground)]">{summary.new_users.toLocaleString()}</strong></span>
            <span>{t("glimmoFwWriters")}: <strong className="text-[var(--foreground)]">{summary.writers.toLocaleString()}</strong></span>
          </div>
        )}

        <div className="overflow-x-auto overflow-visible">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-2 text-left font-medium text-[var(--secondary-text)]">{t("glimmoHealthMetric")}</th>
                <th className="pb-2 text-right font-medium text-[var(--secondary-text)]">{t("glimmoHealthValue")}</th>
                <th className="pb-2 text-center font-medium text-[var(--secondary-text)]">{t("glimmoHealthStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.metric} className="border-b border-[var(--border)]/50">
                  <td className="py-2 text-[var(--foreground)]">
                    <span className="flex items-center">{m.metric}{HEALTH_FORMULA_MAP[m.metric] && <InfoTooltip metricKey={HEALTH_FORMULA_MAP[m.metric]} />}</span>
                  </td>
                  <td className="py-2 text-right font-medium text-[var(--foreground)]">{m.value}</td>
                  <td className="py-2 text-center">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[m.status] || "#888" }} />
                      <span className="text-[10px] capitalize" style={{ color: STATUS_COLORS[m.status] || "var(--secondary-text)" }}>{m.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
