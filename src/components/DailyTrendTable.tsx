"use client";

import { MetricInfoTooltip } from "@/components/MetricInfoTooltip";

type DailyRow = {
  date: string;
  dau: number;
  new_users: number;
  chatters: number;
  total_messages: number;
  sessions: number;
  disposed_sessions: number;
  avg_msgs_per_session: number;
  avg_session_duration_sec: number;
  activation_rate: number;
  dispose_rate: number;
  revenue: number;
  gift_users: number;
  d1_retention_rate: number;
  [key: string]: unknown;
};

function TH({ children, metricKey }: { children: React.ReactNode; metricKey?: string }) {
  const inner = (
    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">{children}</th>
  );
  if (!metricKey) return inner;
  return (
    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">
      <MetricInfoTooltip metricKey={metricKey}>{children}</MetricInfoTooltip>
    </th>
  );
}

export function DailyTrendTable({ data }: { data: DailyRow[] }) {
  if (!data.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--secondary-text)]">
            <th className="px-3 py-2 font-medium">Date</th>
            <TH metricKey="DAU">DAU</TH>
            <TH metricKey="NEW_USERS">New</TH>
            <TH>Chatters</TH>
            <TH metricKey="AVG_MSGS_PER_SESSION">Messages</TH>
            <TH metricKey="SESSIONS_PER_USER">Sessions</TH>
            <TH metricKey="DISPOSE_RATE">Disposed</TH>
            <TH metricKey="AVG_MSGS_PER_SESSION">Avg Msgs</TH>
            <TH metricKey="AVG_SESSION_DURATION">Avg Dur(s)</TH>
            <TH metricKey="ACTIVATION_RATE">Act %</TH>
            <TH metricKey="DISPOSE_RATE">Disp %</TH>
            <TH metricKey="D1_RETENTION_DAILY">D1 Ret %</TH>
            <TH metricKey="REVENUE">Revenue</TH>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.date} className="border-b border-[var(--border)] hover:bg-[var(--background)]">
              <td className="px-3 py-2 font-medium">{r.date}</td>
              <td className="px-3 py-2 text-right">{r.dau.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{r.new_users.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{r.chatters.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{r.total_messages.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{r.sessions.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{r.disposed_sessions.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{r.avg_msgs_per_session}</td>
              <td className="px-3 py-2 text-right">{r.avg_session_duration_sec}</td>
              <td className="px-3 py-2 text-right">{r.activation_rate}%</td>
              <td className="px-3 py-2 text-right">{r.dispose_rate}%</td>
              <td className="px-3 py-2 text-right font-medium text-[var(--accent)]">
                {r.d1_retention_rate > 0 ? `${r.d1_retention_rate}%` : "—"}
              </td>
              <td className="px-3 py-2 text-right">${r.revenue.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
