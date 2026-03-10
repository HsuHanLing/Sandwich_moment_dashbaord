"use client";

import { useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type FlywheelNode = {
  id: string;
  name: string;
  nameCn: string;
  metrics: Record<string, number>;
  status: "healthy" | "warning" | "broken";
  score: number;
  conversion: number | null;
  conversion_num?: number | null;
  conversion_denom?: number | null;
  benchmark: string;
};

type Props = {
  nodes: FlywheelNode[];
  overallScore: number;
  summary: { total_active?: number; new_users?: number; writers?: number; entries?: number };
  days: number;
  t: (key: string) => string;
};

const NODE_I18N: Record<string, { en: string; zh: string }> = {
  discovery: { en: "Discovery", zh: "发现" },
  onboarding: { en: "Onboarding", zh: "新手引导" },
  first_entry: { en: "First Entry", zh: "首次日记" },
  ai_engagement: { en: "AI Engagement", zh: "AI 互动" },
  habit_loop: { en: "Habit Loop", zh: "习惯养成" },
  emotional_value: { en: "Emotional Value", zh: "情感价值" },
  share: { en: "Share / Social", zh: "社交分享" },
  premium: { en: "Premium", zh: "订阅转化" },
};

const STATUS_DOT: Record<string, string> = {
  healthy: "#34a853",
  warning: "#fbbc04",
  broken: "#ea4335",
};

const STATUS_LABEL: Record<string, { en: string; zh: string }> = {
  healthy: { en: "Healthy", zh: "健康" },
  warning: { en: "Warning", zh: "警告" },
  broken: { en: "Broken", zh: "异常" },
};

const METRIC_LABELS: Record<string, string> = {
  first_open: "First Opens",
  first_open_7d: "Last 7d",
  wow_change: "WoW %",
  daily_avg: "Daily Avg",
  completed: "Completed",
  rate: "Conversion",
  first_posters: "Writers",
  total_entries: "Entries",
  ai_users: "AI Users",
  bot_reply_users: "Bot Reply Users",
  bot_replies: "Bot Replies",
  companion_creators: "Companion Creators",
  habit_users: "Habit Users (3+ days)",
  total_writers: "Total Writers",
  users: "Users",
  new_collection_users: "New Collections",
  insight_writers: "Insight Writers",
  share_users: "Share Users",
  viewers: "Viewers",
};

const NODE_FORMULA_MAP: Record<string, string> = {
  discovery: "GLIMMO_FW_DISCOVERY",
  onboarding: "GLIMMO_FW_ONBOARDING",
  first_entry: "GLIMMO_FW_FIRST_ENTRY",
  ai_engagement: "GLIMMO_FW_AI_ENGAGEMENT",
  habit_loop: "GLIMMO_FW_HABIT_LOOP",
  emotional_value: "GLIMMO_FW_EMOTIONAL_VALUE",
  share: "GLIMMO_FW_SHARE",
  premium: "GLIMMO_FW_PREMIUM",
};

const METRIC_FORMULA_MAP: Record<string, Record<string, string>> = {
  discovery: { first_open: "GLIMMO_FW_DISCOVERY", first_open_7d: "GLIMMO_FW_DISCOVERY", wow_change: "GLIMMO_FW_DISCOVERY", daily_avg: "GLIMMO_FW_DISCOVERY" },
  onboarding: { completed: "GLIMMO_FW_ONBOARDING", rate: "GLIMMO_FW_ONBOARDING" },
  first_entry: { first_posters: "GLIMMO_FW_FIRST_ENTRY", rate: "GLIMMO_FW_FIRST_ENTRY", total_entries: "GLIMMO_ENTRIES" },
  ai_engagement: { ai_users: "GLIMMO_FW_AI_ENGAGEMENT", rate: "GLIMMO_FW_AI_ENGAGEMENT", bot_reply_users: "GLIMMO_AI_USERS", bot_replies: "GLIMMO_AI_USERS", companion_creators: "GLIMMO_AI_USERS" },
  habit_loop: { habit_users: "GLIMMO_FW_HABIT_LOOP", rate: "GLIMMO_FW_HABIT_LOOP", total_writers: "GLIMMO_FA_WRITERS" },
  emotional_value: { users: "GLIMMO_FW_EMOTIONAL_VALUE", rate: "GLIMMO_FW_EMOTIONAL_VALUE", new_collection_users: "GLIMMO_FA_COLLECTION", insight_writers: "GLIMMO_FA_INSIGHT" },
  share: { share_users: "GLIMMO_FW_SHARE", rate: "GLIMMO_FW_SHARE" },
  premium: { viewers: "GLIMMO_FW_PREMIUM", rate: "GLIMMO_FW_PREMIUM" },
};

function InfoTooltip({ metricKey, placement = "below" }: { metricKey: string; placement?: "below" | "right" }) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];
  if (!info) return null;
  const tooltipClass = placement === "right"
    ? "absolute left-full top-1/2 z-[9999] ml-2 w-[280px] -translate-y-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug shadow-lg"
    : "absolute left-1/2 top-full z-[9999] mt-2 w-[280px] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug shadow-lg";
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
        <span className={tooltipClass} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>
          <span className="block font-semibold text-[var(--accent)]">{info.formula}</span>
          <span className="mt-1 block text-[var(--secondary-text)]">{info.description}</span>
        </span>
      )}
    </span>
  );
}

const cardStyle = { border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" } as const;
const badgeStyle = { backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" } as const;

function formatVal(key: string, val: number): string {
  if (key.includes("rate") || key === "rate" || key === "wow_change") return `${val}%`;
  return val.toLocaleString();
}

function getNodeLabel(id: string, locale: string): string {
  const node = NODE_I18N[id];
  if (!node) return id;
  return locale === "zh" ? node.zh : node.en;
}

function getStatusLabel(status: string, locale: string): string {
  const s = STATUS_LABEL[status];
  if (!s) return status;
  return locale === "zh" ? s.zh : s.en;
}

export function GlimmoFlywheelSection({ nodes, overallScore, summary, days, t }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const locale = t("glimmoTitle") === "Glimmo 面板" ? "zh" : "en";

  if (!nodes.length) {
    return (
      <section className="mb-8">
        <div className="overflow-visible rounded-xl bg-[var(--card-bg)] p-4 sm:p-5" style={cardStyle}>
          <h2 className="text-base font-semibold tracking-tight">{t("glimmoFwTitle")}</h2>
          <p className="mt-2 text-xs text-[var(--secondary-text)]">{t("loading")}</p>
        </div>
      </section>
    );
  }

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  function formatConversion(pct: number | null, num: number | null | undefined, denom: number | null | undefined): string {
    if (pct === null) return "—";
    const hasFrac = typeof num === "number" && typeof denom === "number" && denom > 0;
    return hasFrac ? `${pct}% (${num}/${denom})` : `${pct}%`;
  }

  return (
    <section className="mb-8 space-y-6">
      <div className="overflow-visible rounded-xl bg-neutral-100/50 p-4 sm:p-5 dark:bg-neutral-900/20" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t("glimmoFwTitle")}</h2>
            <p className="mt-0.5 text-[11px] text-[var(--secondary-text)]">{t("glimmoFwDesc")}</p>
          </div>
          <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={badgeStyle}>
            {t("lastNDays").replace("{n}", String(days))}
          </span>
        </div>

        {/* Summary KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
            <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{t("glimmoFwActiveUsers")}<InfoTooltip metricKey="FW_ACTIVE_USERS" /></p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">{(summary.total_active ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
            <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{t("glimmoFwNewUsers")}<InfoTooltip metricKey="GLIMMO_NEW_USERS" /></p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">{(summary.new_users ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
            <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{t("glimmoFwWriters")}<InfoTooltip metricKey="GLIMMO_FA_WRITERS" /></p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">{(summary.writers ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
            <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{t("glimmoFwScore")}<InfoTooltip metricKey="FW_SCORE" /></p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">{overallScore}/10</p>
          </div>
        </div>

        {/* Funnel diagram — pb-8 so below tooltips are not clipped */}
        <div className="mt-6 overflow-x-auto overflow-y-visible pb-8">
          <div className="flex min-w-0 flex-wrap items-stretch justify-center gap-0">
            {nodes.map((node, i) => {
              const mainVal = node.id === "discovery"
                ? (node.metrics.first_open ?? 0).toLocaleString()
                : formatConversion(node.conversion, node.conversion_num, node.conversion_denom);
              const dot = STATUS_DOT[node.status];
              return (
                <div key={node.id} className="flex items-center">
                  <div
                    className="flex min-w-[72px] max-w-[100px] flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-3 text-center sm:min-w-[84px] sm:px-3"
                    style={{ borderLeftWidth: 3, borderLeftColor: dot }}
                  >
                    <span className="flex items-center gap-0.5 text-[9px] font-medium leading-tight text-[var(--secondary-text)]">
                      {getNodeLabel(node.id, locale)}
                      {NODE_FORMULA_MAP[node.id] && <InfoTooltip metricKey={NODE_FORMULA_MAP[node.id]} placement="below" />}
                    </span>
                    <span className="mt-1 text-sm font-semibold tracking-tight text-[var(--foreground)]">
                      {mainVal}
                    </span>
                    <span className="mt-0.5 text-[8px] text-[var(--secondary-text)]">
                      {node.score}/10 · {getStatusLabel(node.status, locale)}
                    </span>
                  </div>
                  {i < nodes.length - 1 && (
                    <svg className="mx-0.5 shrink-0 text-[var(--secondary-text)]" width="14" height="24" viewBox="0 0 16 24" aria-hidden>
                      <path d="M2 12h10m-3-4l3 4-3 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Health tags */}
        {nodes.some((nd) => nd.status !== "healthy") && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            {nodes
              .filter((nd) => nd.status !== "healthy")
              .map((nd) => (
                <span key={nd.id} className="text-[10px]" style={{ color: STATUS_DOT[nd.status] }}>
                  {getNodeLabel(nd.id, locale)}: {getStatusLabel(nd.status, locale)}
                </span>
              ))}
          </div>
        )}

        {/* Collapsible details */}
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex w-full items-center justify-between py-2 text-left text-[12px] font-medium text-[var(--secondary-text)] hover:text-[var(--foreground)]"
          >
            {locale === "zh" ? "节点详情" : "Node Details"}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-4 w-4 shrink-0 transition-transform ${detailsOpen ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {detailsOpen && (
            <div className="mt-3 space-y-3">
              {nodes.map((node) => (
                <div key={node.id} className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ ...cardStyle, borderLeftWidth: 3, borderLeftColor: STATUS_DOT[node.status] }}>
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--background)]/50"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[12px] font-semibold">{getNodeLabel(node.id, locale)}</span>
                      {node.conversion !== null && (
                        <span className="text-[11px] text-[var(--secondary-text)]">
                          {locale === "zh" ? "转化" : "Conversion"}: {formatConversion(node.conversion, node.conversion_num, node.conversion_denom)}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--secondary-text)]">
                        {node.score}/10 · {getStatusLabel(node.status, locale)}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-4 w-4 shrink-0 text-[var(--secondary-text)] transition-transform ${expanded[node.id] ? "rotate-180" : ""}`}>
                      <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 011.06 0L8 8.94l2.72-2.72a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {expanded[node.id] && (
                    <div className="overflow-visible border-t border-[var(--border)] bg-[var(--background)]/30 px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                        {Object.entries(node.metrics).map(([key, val]) => {
                          const formulaMap = METRIC_FORMULA_MAP[node.id] || {};
                          return (
                          <div key={key}>
                            <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{METRIC_LABELS[key] || key}{formulaMap[key] && <InfoTooltip metricKey={formulaMap[key]} />}</p>
                            <p className="text-[12px] font-medium">{formatVal(key, val)}</p>
                          </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[9px] text-[var(--secondary-text)]">
                        Benchmark: {node.benchmark}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
