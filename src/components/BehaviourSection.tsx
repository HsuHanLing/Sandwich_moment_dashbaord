"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Props = {
  data: {
    daily: Record<string, unknown>[];
    personas: Record<string, unknown>[];
  } | null;
  loading: boolean;
  t: (key: string) => string;
};

export function BehaviourSection({ data, loading, t }: Props) {
  if (loading || !data) {
    return (
      <div className="mb-8 rounded-xl bg-[var(--card-bg)] p-6 text-center text-sm text-[var(--secondary-text)]" style={{ border: "1px solid var(--card-stroke)" }}>
        {t("loadingText")}
      </div>
    );
  }

  const daily = data.daily as {
    date: string; dispose_rate: number; disposes: number; chat_entries: number;
    persona_swipes: number; swipe_users: number; restarts: number;
    greetings: number; fatigue_triggers: number; report_users: number;
  }[];

  const personas = data.personas as {
    virtual_id: string; chat_entries: number; messages: number; disposes: number;
    avg_msgs: number; avg_duration: number; unique_users: number;
  }[];

  return (
    <>
      <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
        <div className="p-4 sm:p-5">
          <h2 className="text-base font-semibold tracking-tight">{t("behaviourTitle")}</h2>
          <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("behaviourDesc")}</p>
          <div className="mt-4" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} unit="%" />
                <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="right" type="monotone" dataKey="dispose_rate" stroke="#ef4444" name="Dispose Rate %" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="persona_swipes" stroke="#6366f1" name="Persona Swipes" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="restarts" stroke="#f59e0b" name="Restarts" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="greetings" stroke="#10b981" name="Greetings" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--secondary-text)]">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">Dispose Rate</th>
                  <th className="px-3 py-2 font-medium text-right">Disposes</th>
                  <th className="px-3 py-2 font-medium text-right">Chats</th>
                  <th className="px-3 py-2 font-medium text-right">Swipes</th>
                  <th className="px-3 py-2 font-medium text-right">Restarts</th>
                  <th className="px-3 py-2 font-medium text-right">Greetings</th>
                  <th className="px-3 py-2 font-medium text-right">Fatigue</th>
                  <th className="px-3 py-2 font-medium text-right">Reports</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((r) => (
                  <tr key={r.date} className="border-b border-[var(--border)]">
                    <td className="px-3 py-2 font-medium">{r.date}</td>
                    <td className="px-3 py-2 text-right">{r.dispose_rate}%</td>
                    <td className="px-3 py-2 text-right">{r.disposes.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.chat_entries.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.persona_swipes.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.restarts.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.greetings.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.fatigue_triggers.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{r.report_users.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {personas.length > 0 && (
        <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">{t("personaTitle")}</h2>
            <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("personaDesc")}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--secondary-text)]">
                    <th className="px-3 py-2 font-medium">{t("virtualId")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("chatEntries")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("messages")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("disposes")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("avgMsgs")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("avgDur")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("uniqueUsers")}</th>
                  </tr>
                </thead>
                <tbody>
                  {personas.map((p) => (
                    <tr key={p.virtual_id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2 font-medium">{p.virtual_id}</td>
                      <td className="px-3 py-2 text-right">{p.chat_entries.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{p.messages.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{p.disposes.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{p.avg_msgs}</td>
                      <td className="px-3 py-2 text-right">{p.avg_duration}s</td>
                      <td className="px-3 py-2 text-right">{p.unique_users.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
