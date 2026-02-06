"use client";

import { METRIC_FORMULAS } from "@/lib/metric-formulas";
import { useState } from "react";

type Row = {
  date: string;
  new_users: number;
  dau: number;
  d1: string;
  unlock_users: number;
  unlock_ge2: number;
  payers: number;
  revenue: number;
  withdrawal: number;
};

function formatNum(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m}-${day}`;
}

const HEADER_METRIC_KEYS: Record<string, string> = {
  NEW: "NEW",
  DAU: "DAU",
  D1: "D1_RETENTION",
  "UNLOCK USERS": "UNLOCK_USERS",
  "UNLOCK≥2": "UNLOCK_GE2",
  PAYERS: "PAYERS",
  REVENUE: "REVENUE",
  WITHDRAWAL: "WITHDRAWAL",
};

function ThWithTooltip({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  const metricKey = HEADER_METRIC_KEYS[label];
  const info = metricKey ? METRIC_FORMULAS[metricKey] : null;

  return (
    <th
      className="relative px-3 py-2 text-right font-semibold text-[var(--secondary-text)]"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dashed border-transparent hover:border-[var(--border)]">{label}</span>
      {show && info && (
        <div
          className="absolute bottom-full right-0 z-50 mb-1 w-56 rounded-xl bg-[var(--card-bg)] px-3 py-2.5 text-[10px] leading-snug"
          style={{ boxShadow: "var(--shadow-tooltip)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p className="font-medium text-[var(--accent)]">{info.formula}</p>
          <p className="mt-1.5 text-[var(--secondary-text)]">{info.description}</p>
        </div>
      )}
    </th>
  );
}

function CellWithTooltip({
  value,
  metricKey,
}: {
  value: string | number;
  metricKey: string;
}) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];

  return (
    <td
      className="relative px-3 py-2 text-right text-[11px] text-[var(--foreground)]"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dashed border-[var(--border)]">{value}</span>
      {show && info && (
        <div
          className="absolute bottom-full right-0 z-50 mb-1 w-56 rounded-xl bg-[var(--card-bg)] px-3 py-2.5 text-[10px] leading-snug"
          style={{ boxShadow: "var(--shadow-tooltip)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p className="font-medium text-[var(--accent)]">{info.formula}</p>
          <p className="mt-1.5 text-[var(--secondary-text)]">{info.description}</p>
        </div>
      )}
    </td>
  );
}

export function DailyTrendTable({ data }: { data: Row[] }) {
  const display = data.slice(-7).reverse();

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]">
            <th className="px-3 py-2 text-left font-semibold text-[var(--secondary-text)]">DATE</th>
            <ThWithTooltip label="NEW" />
            <ThWithTooltip label="DAU" />
            <ThWithTooltip label="D1" />
            <ThWithTooltip label="UNLOCK USERS" />
            <ThWithTooltip label="UNLOCK≥2" />
            <ThWithTooltip label="PAYERS" />
            <ThWithTooltip label="REVENUE" />
            <ThWithTooltip label="WITHDRAWAL" />
          </tr>
        </thead>
        <tbody>
          {display.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]"
            >
              <td className="px-3 py-2 font-medium text-[var(--foreground)]">{formatDate(row.date)}</td>
              <CellWithTooltip value={formatNum(row.new_users)} metricKey="NEW" />
              <CellWithTooltip value={formatNum(row.dau)} metricKey="DAU" />
              <CellWithTooltip value={row.d1} metricKey="D1_RETENTION" />
              <CellWithTooltip value={formatNum(row.unlock_users)} metricKey="UNLOCK_USERS" />
              <CellWithTooltip value={formatNum(row.unlock_ge2)} metricKey="UNLOCK_GE2" />
              <CellWithTooltip value={formatNum(row.payers)} metricKey="PAYERS" />
              <CellWithTooltip value={formatCurrency(row.revenue)} metricKey="REVENUE" />
              <CellWithTooltip value={formatCurrency(row.withdrawal)} metricKey="WITHDRAWAL" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
