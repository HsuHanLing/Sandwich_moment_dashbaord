"use client";

import { useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type TrendRow = {
  date: string;
  dau: number;
  new_users: number;
  journal_entries: number;
  journal_users: number;
  ai_users: number;
  sub_viewers: number;
  collection_users: number;
  insight_users: number;
};

type Props = {
  data: TrendRow[];
  t: (key: string) => string;
};

function HeaderTooltip({ metricKey }: { metricKey: string }) {
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
          className="absolute left-1/2 top-full z-[9999] mt-1.5 w-[260px] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug shadow-lg"
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        >
          <span className="block font-semibold text-[var(--accent)]">{info.formula}</span>
          <span className="mt-1 block text-[var(--secondary-text)]">{info.description}</span>
        </span>
      )}
    </span>
  );
}

export function GlimmoDailyTrendTable({ data, t }: Props) {
  if (!data.length) return null;

  const formatDate = (d: string) => {
    if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    return d;
  };

  return (
    <div className="overflow-x-auto overflow-visible">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="py-2 text-left font-medium text-[var(--secondary-text)]">{t("glimmoDate")}</th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">DAU<HeaderTooltip metricKey="GLIMMO_DAU" /></span>
            </th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">{t("glimmoNewUsers")}<HeaderTooltip metricKey="GLIMMO_NEW_USERS" /></span>
            </th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">{t("glimmoEntries")}<HeaderTooltip metricKey="GLIMMO_ENTRIES" /></span>
            </th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">{t("glimmoWriters")}<HeaderTooltip metricKey="GLIMMO_FA_WRITERS" /></span>
            </th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">{t("glimmoAIUsers")}<HeaderTooltip metricKey="GLIMMO_AI_USERS" /></span>
            </th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">{t("glimmoSubViewers")}<HeaderTooltip metricKey="GLIMMO_SUB_VIEWERS" /></span>
            </th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">{t("glimmoCollectionUsers")}<HeaderTooltip metricKey="GLIMMO_FA_COLLECTION" /></span>
            </th>
            <th className="py-2 text-right font-medium text-[var(--secondary-text)]">
              <span className="inline-flex items-center justify-end">{t("glimmoInsightUsers")}<HeaderTooltip metricKey="GLIMMO_FA_INSIGHT" /></span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date} className="border-b border-[var(--border)]/50 hover:bg-[var(--background)]/50">
              <td className="py-1.5 text-[var(--foreground)]">{formatDate(row.date)}</td>
              <td className="py-1.5 text-right font-medium">{Number(row.dau).toLocaleString()}</td>
              <td className="py-1.5 text-right">{Number(row.new_users).toLocaleString()}</td>
              <td className="py-1.5 text-right">{Number(row.journal_entries).toLocaleString()}</td>
              <td className="py-1.5 text-right">{Number(row.journal_users).toLocaleString()}</td>
              <td className="py-1.5 text-right">{Number(row.ai_users).toLocaleString()}</td>
              <td className="py-1.5 text-right">{Number(row.sub_viewers).toLocaleString()}</td>
              <td className="py-1.5 text-right">{Number(row.collection_users).toLocaleString()}</td>
              <td className="py-1.5 text-right">{Number(row.insight_users).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
