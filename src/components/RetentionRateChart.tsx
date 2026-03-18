"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLocale } from "@/contexts/LocaleContext";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";

type RetentionRow = { day: string; rate: number; wow: number };

const DAY_METRIC_KEYS: Record<string, string> = {
  D1: "RETENTION_D1",
  D3: "RETENTION_D3",
  D7: "RETENTION_D7",
  D14: "RETENTION_D14",
  D21: "RETENTION_D21",
  D30: "RETENTION_D30",
};

const TOOLTIP_BOX =
  "absolute bottom-full z-[100] mb-1 w-56 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-1.5 py-1 text-[9px] leading-snug";

function RetentionCellWithTooltip({
  children,
  metricKey,
  align = "left",
}: {
  children: React.ReactNode;
  metricKey: string;
  align?: "left" | "right";
}) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];

  return (
    <td
      className={`relative px-3 py-2 text-[11px] text-[var(--foreground)] tabular-nums ${align === "right" ? "text-right" : ""}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help border-b border-dashed border-[var(--border)]">{children}</span>
      {show && info && (
        <div
          className={`${TOOLTIP_BOX} ${align === "right" ? "right-0" : "left-0"}`}
          style={{ boxShadow: "var(--shadow-tooltip)" }}
        >
          <p className="font-medium text-[var(--accent)]">{info.formula}</p>
          <p className="mt-0.5 text-[var(--secondary-text)]">{info.description}</p>
        </div>
      )}
    </td>
  );
}

function DayWithTooltip({ day, rate, wow }: { day: string; rate: number; wow: number }) {
  const metricKey = DAY_METRIC_KEYS[day];

  return (
    <tr className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background)]">
      <RetentionCellWithTooltip metricKey={metricKey || "RETENTION_D1"} align="left">
        {day}
      </RetentionCellWithTooltip>
      <RetentionCellWithTooltip metricKey={metricKey || "RETENTION_D1"} align="right">
        {rate}%
      </RetentionCellWithTooltip>
      <RetentionCellWithTooltip metricKey="RETENTION_WOW" align="right">
        {wow >= 0 ? "+" : ""}{wow}%
      </RetentionCellWithTooltip>
    </tr>
  );
}

export function RetentionRateChart({ chart, cohortType = "signup" }: { chart: RetentionRow[]; cohortType?: "signup" | "unlock" }) {
  const { t } = useLocale();

  if (!chart.length) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[var(--secondary-text)] text-xs">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="overflow-visible">
      <div className="mb-4 h-[180px] min-h-[120px] w-full min-w-0 overflow-visible">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
          <AreaChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, "auto"]}
              tick={{ fontSize: 11, fill: "var(--secondary-text)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card-bg)",
                padding: "3px 6px",
                fontSize: 9,
                lineHeight: 1.3,
              }}
              wrapperStyle={{ outline: "none" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0] || !label) return null;
                const info = METRIC_FORMULAS[DAY_METRIC_KEYS[label]];
                return (
                  <div
                    className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-1.5 py-1 text-[9px] leading-snug"
                    style={{ boxShadow: "var(--shadow-tooltip)" }}
                  >
                    <p className="font-medium text-[var(--accent)]">{info?.formula ?? label}</p>
                    {info?.description && (
                      <p className="mt-0.5 text-[var(--secondary-text)]">{info.description}</p>
                    )}
                    <p className="mt-0.5 tabular-nums">{t("value")}: {Number(payload[0].value)}%</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#34a853"
              fill="#34a853"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mb-2 overflow-x-auto overflow-y-visible rounded-xl" style={{ border: "1px solid var(--card-stroke)" }}>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--secondary-text)]">{t("metric")}</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums">{t("value")}</th>
              <th className="px-3 py-2 text-right font-medium text-[var(--secondary-text)] tabular-nums w-16">{t("retentionWoW")}</th>
            </tr>
          </thead>
          <tbody>
            {chart.map((row) => (
              <DayWithTooltip key={row.day} day={row.day} rate={row.rate} wow={row.wow} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--secondary-text)]">{t("retentionSuggestedChart")}</p>
      <p className="text-[10px] text-[var(--secondary-text)] opacity-60">{t(cohortType === "unlock" ? "retentionCohortByUnlock" : "retentionCohortByRegistration")}</p>
    </div>
  );
}
