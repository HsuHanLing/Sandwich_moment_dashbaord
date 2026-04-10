"use client";

import { useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type Props = {
  metricKey: string;
  children: React.ReactNode;
};

export function MetricInfoTooltip({ metricKey, children }: Props) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];
  if (!info) return <>{children}</>;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
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
