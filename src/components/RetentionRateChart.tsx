"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";

type RetentionRow = { day: string; retained: number; cohort_size: number; rate: number };

export function RetentionRateChart({ chart }: { chart: RetentionRow[]; cohortType?: string }) {
  if (!chart.length) return <p className="text-xs text-[var(--secondary-text)]">No retention data</p>;

  return (
    <div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
            <YAxis unit="%" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }}
              formatter={(value: number, name: string, props: { payload: RetentionRow }) => [
                `${value}% (${props.payload.retained.toLocaleString()} / ${props.payload.cohort_size.toLocaleString()})`,
                "Retention",
              ]}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {chart.map((entry, idx) => (
                <Cell key={idx} fill={entry.rate >= 30 ? "#10b981" : entry.rate >= 15 ? "#f59e0b" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--secondary-text)]">
              <th className="px-3 py-2 font-medium">Day</th>
              <th className="px-3 py-2 font-medium text-right">Cohort</th>
              <th className="px-3 py-2 font-medium text-right">Retained</th>
              <th className="px-3 py-2 font-medium text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {chart.map((r) => (
              <tr key={r.day} className="border-b border-[var(--border)]">
                <td className="px-3 py-2 font-medium">{r.day}</td>
                <td className="px-3 py-2 text-right">{r.cohort_size.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{r.retained.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-medium">{r.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
