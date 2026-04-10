"use client";

import { useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type KPICardProps = {
  title: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  metricKey: string;
  vsLabel?: string;
};

export function KPICard({ title, value, change, changePositive, metricKey, vsLabel = "vs 7d ago" }: KPICardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const info = METRIC_FORMULAS[metricKey];

  return (
    <div
      className="relative rounded-xl bg-[var(--card-bg)] p-3.5 transition"
      style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <p className="text-[11px] font-medium text-[var(--secondary-text)]">{title}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{value}</span>
        {change != null && (
          <span
            className={`text-xs font-medium ${changePositive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
          >
            {change}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--secondary-text)]">{vsLabel}</p>

      {showTooltip && info && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2.5 text-left shadow-lg"
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
        >
          <p className="text-[10px] font-semibold text-[var(--accent)]">{info.name}</p>
          <p className="mt-1 text-[9px] leading-relaxed text-[var(--secondary-text)]">{info.description}</p>
          <div className="mt-1.5 rounded bg-[var(--background)] px-1.5 py-1">
            <p className="font-mono text-[8px] leading-relaxed text-[var(--foreground)]">{info.formula}</p>
          </div>
        </div>
      )}
    </div>
  );
}
