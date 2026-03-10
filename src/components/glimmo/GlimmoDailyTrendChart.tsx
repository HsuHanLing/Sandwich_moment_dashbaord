"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type TrendRow = {
  date: string;
  dau: number;
  new_users: number;
  journal_entries: number;
  journal_users: number;
  ai_users: number;
  sub_viewers: number;
  collection_users: number;
  insight_users: number;
};

export function GlimmoDailyTrendChart({ data }: { data: TrendRow[] }) {
  const formatDate = (d: string) => {
    if (d.length === 8) return `${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const parts = d.split("-");
    return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : d;
  };

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: "var(--secondary-text)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} axisLine={false} tickLine={false} width={35} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 11,
            }}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="dau" stroke="#4285f4" strokeWidth={2} name="DAU" dot={false} />
          <Line type="monotone" dataKey="new_users" stroke="#34a853" strokeWidth={2} name="New Users" dot={false} />
          <Line type="monotone" dataKey="journal_users" stroke="#8b5cf6" strokeWidth={2} name="Writers" dot={false} />
          <Line type="monotone" dataKey="ai_users" stroke="#ec4899" strokeWidth={1.5} name="AI Users" dot={false} />
          <Line type="monotone" dataKey="sub_viewers" stroke="#f59e0b" strokeWidth={1.5} name="Sub Viewers" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
