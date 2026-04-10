"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MetricInfoTooltip } from "@/components/MetricInfoTooltip";

type Props = {
  data: {
    summary: Record<string, number>;
    message_distribution: { bucket: string; session_count: number }[];
    duration_distribution: { bucket: string; session_count: number }[];
  } | null;
  loading: boolean;
  t: (key: string) => string;
};

export function SessionQualitySection({ data, loading, t }: Props) {
  if (loading || !data) {
    return (
      <div className="mb-8 rounded-xl bg-[var(--card-bg)] p-6 text-center text-sm text-[var(--secondary-text)]" style={{ border: "1px solid var(--card-stroke)" }}>
        {t("loadingText")}
      </div>
    );
  }

  const s = data.summary;

  return (
    <>
      <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
        <div className="p-4 sm:p-5">
          <h2 className="text-base font-semibold tracking-tight">{t("sessionTitle")}</h2>
          <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("sessionDesc")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <SummaryCard label={t("totalSessions")} value={s.total_sessions?.toLocaleString() ?? "0"} metricKey="TOTAL_SESSIONS" />
            <SummaryCard label={t("avgMessages")} value={String(s.avg_messages ?? 0)} metricKey="AVG_MSGS_PER_SESSION" />
            <SummaryCard label={t("avgDuration")} value={`${s.avg_duration_sec ?? 0}s`} metricKey="AVG_SESSION_DURATION" />
            <SummaryCard label={t("deepRate")} value={`${s.deep_conversation_rate ?? 0}%`} accent metricKey="DEEP_CONVERSATION_RATE" />
            <SummaryCard label={t("shallowRate")} value={`${s.shallow_rate ?? 0}%`} metricKey="SHALLOW_RATE" />
            <SummaryCard label="Valid Sessions" value={`${s.valid_sessions?.toLocaleString() ?? 0} (${s.valid_session_rate ?? 0}%)`} metricKey="VALID_SESSION" />
            <SummaryCard label={t("medianMsgs")} value={String(s.median_messages ?? 0)} metricKey="MEDIAN_MESSAGES" />
            <SummaryCard label={t("medianDuration")} value={`${s.median_duration_sec ?? 0}s`} metricKey="MEDIAN_DURATION" />
            <SummaryCard label={t("disposeSwipe")} value={String(s.dispose_swipe ?? 0)} metricKey="DISPOSE_SWIPE" />
            <SummaryCard label={t("disposePopup")} value={String(s.dispose_popup ?? 0)} metricKey="DISPOSE_POPUP" />
          </div>
        </div>
      </section>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold">{t("msgDistribution")}</h3>
            <div className="mt-3" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.message_distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                  <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="session_count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
        <section className="rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold">{t("durDistribution")}</h3>
            <div className="mt-3" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.duration_distribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                  <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="session_count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function SummaryCard({ label, value, accent, metricKey }: { label: string; value: string; accent?: boolean; metricKey?: string }) {
  const card = (
    <div className="rounded-lg bg-[var(--background)] px-3 py-2.5" style={{ border: "1px solid var(--border)" }}>
      <p className="text-[10px] font-medium text-[var(--secondary-text)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>{value}</p>
    </div>
  );
  if (!metricKey) return card;
  return <MetricInfoTooltip metricKey={metricKey}>{card}</MetricInfoTooltip>;
}
