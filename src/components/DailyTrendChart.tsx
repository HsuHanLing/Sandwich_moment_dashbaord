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
  pseudo_dau: number;
  new_users: number;
  registration: number;
  unlock_users: number;
  payers: number;
  revenue: number;
};

export function DailyTrendChart({ data }: { data: TrendRow[] }) {
  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${m}-${day}`;
  };

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "6px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card-bg)",
              color: "var(--foreground)",
              padding: "3px 6px",
              fontSize: 9,
              lineHeight: 1.3,
            }}
            itemStyle={{ padding: "0 0 1px 0" }}
            labelStyle={{ padding: "0 0 2px 0", margin: 0 }}
            labelFormatter={(label) => formatDate(String(label ?? ""))}
          />
          <Legend
            wrapperStyle={{ fontSize: 9 }}
            iconSize={8}
            formatter={(value) => <span style={{ color: "var(--secondary-text)", fontSize: 9 }}>{value}</span>}
          />
          <Line type="monotone" dataKey="dau" stroke="#4285f4" strokeWidth={2} name="DAU" dot={false} />
          <Line type="monotone" dataKey="pseudo_dau" stroke="#00acc1" strokeWidth={2} name="Pseudo DAU" dot={false} />
          <Line type="monotone" dataKey="registration" stroke="#9c27b0" strokeWidth={2} name="Registration" dot={false} />
          <Line type="monotone" dataKey="unlock_users" stroke="#34a853" strokeWidth={2} name="Unlock users" dot={false} />
          <Line type="monotone" dataKey="payers" stroke="#fbbc04" strokeWidth={2} name="Paying users" dot={false} />
          <Line type="monotone" dataKey="revenue" stroke="#ea4335" strokeWidth={2} name="Revenue ($)" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
