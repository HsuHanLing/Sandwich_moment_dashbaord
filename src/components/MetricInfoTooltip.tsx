"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type Props = {
  metricKey: string;
  children: React.ReactNode;
};

export function MetricInfoTooltip({ metricKey, children }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const info = METRIC_FORMULAS[metricKey];

  const handleEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  }, []);

  if (!info) return <>{children}</>;

  return (
    <span
      ref={ref}
      className="cursor-help border-b border-dotted border-[var(--secondary-text)]"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] w-64 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2.5 text-left"
            style={{
              top: pos.top - 8,
              left: pos.left,
              transform: "translate(-50%, -100%)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <p className="text-[10px] font-semibold text-[var(--accent)]">{info.name}</p>
            <p className="mt-1 text-[9px] leading-relaxed text-[var(--secondary-text)]">{info.description}</p>
            <div className="mt-1.5 rounded bg-[var(--background)] px-1.5 py-1">
              <p className="font-mono text-[8px] leading-relaxed text-[var(--foreground)]">{info.formula}</p>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
