"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type EventRow = { event: string; count: number; users?: number };

export function TopEventsChart({ data }: { data: EventRow[] }) {
  if (!data.length) return <p className="text-xs text-[var(--secondary-text)]">No data</p>;

  return (
    <div>
      <div style={{ height: Math.max(260, data.length * 28) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
            <YAxis type="category" dataKey="event" tick={{ fontSize: 9, fill: "var(--secondary-text)" }} width={110} />
            <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }} />
            <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
