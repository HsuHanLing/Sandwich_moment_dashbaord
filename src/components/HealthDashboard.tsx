"use client";

import { MetricInfoTooltip } from "@/components/MetricInfoTooltip";

type Indicator = {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: string;
};

type Props = {
  data: {
    indicators: Indicator[];
    revenue: number;
    dau_avg: number;
  };
  t: (key: string) => string;
};

const statusColor: Record<string, string> = {
  healthy: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-rose-500",
};

const statusBg: Record<string, string> = {
  healthy: "bg-emerald-500/10",
  warning: "bg-amber-500/10",
  danger: "bg-rose-500/10",
};

const indicatorMetricKey: Record<string, string> = {
  activation_rate: "ACTIVATION_RATE",
  chat_engagement: "CHAT_ENGAGEMENT_RATE",
  persona_to_chat: "PERSONA_TO_CHAT_RATE",
  dispose_rate: "DISPOSE_RATE",
  image_unlock: "IMAGE_UNLOCK_RATE",
  pay_rate: "PAY_RATE",
  gift_rate: "GIFT_RATE",
  membership_rate: "MEMBERSHIP_RATE",
};

export function HealthDashboard({ data, t }: Props) {
  return (
    <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
      <div className="p-4 sm:p-5">
        <h2 className="text-base font-semibold tracking-tight">{t("healthTitle")}</h2>
        <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("healthDesc")}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.indicators.map((ind) => {
            const mKey = indicatorMetricKey[ind.id];
            const card = (
              <div
                className={`rounded-lg px-3 py-2.5 ${statusBg[ind.status] ?? ""}`}
                style={{ border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-[var(--secondary-text)]">{ind.label}</p>
                  <span className={`text-[9px] font-semibold uppercase ${statusColor[ind.status] ?? ""}`}>
                    {t(ind.status === "healthy" ? "healthHealthy" : ind.status === "warning" ? "healthWarning" : "healthDanger")}
                  </span>
                </div>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {ind.value}{ind.unit}
                </p>
              </div>
            );
            return mKey ? (
              <MetricInfoTooltip key={ind.id} metricKey={mKey}>{card}</MetricInfoTooltip>
            ) : (
              <div key={ind.id}>{card}</div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-4 text-xs text-[var(--secondary-text)]">
          <span>Avg DAU: <strong className="text-[var(--foreground)]">{data.dau_avg.toLocaleString()}</strong></span>
          <span>Total Revenue: <strong className="text-[var(--foreground)]">${data.revenue.toLocaleString()}</strong></span>
        </div>
      </div>
    </section>
  );
}
