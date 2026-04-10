"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type DailyRow = {
  date: string;
  dau: number;
  chatters: number;
  total_messages: number;
  sessions: number;
  avg_msgs_per_session: number;
  d1_retention_rate: number;
  revenue: number;
  [key: string]: unknown;
};

export function DailyTrendChart({ data }: { data: DailyRow[] }) {
  if (!data.length) return <p className="text-xs text-[var(--secondary-text)]">No data</p>;

  return (
    <div style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
          <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="left" type="monotone" dataKey="dau" stroke="var(--accent)" name="DAU" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="chatters" stroke="#6366f1" name="Chatters" dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#10b981" name="Sessions" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="d1_retention_rate" stroke="#ef4444" name="D1 Ret %" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
