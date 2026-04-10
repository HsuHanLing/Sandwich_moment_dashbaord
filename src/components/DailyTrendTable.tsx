"use client";

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
  revenue: number;
  gift_users: number;
};

export function DailyTrendTable({ data }: { data: DailyRow[] }) {
  if (!data.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--secondary-text)]">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium text-right">DAU</th>
            <th className="px-3 py-2 font-medium text-right">New</th>
            <th className="px-3 py-2 font-medium text-right">Chatters</th>
            <th className="px-3 py-2 font-medium text-right">Messages</th>
            <th className="px-3 py-2 font-medium text-right">Sessions</th>
            <th className="px-3 py-2 font-medium text-right">Disposed</th>
            <th className="px-3 py-2 font-medium text-right">Avg Msgs</th>
            <th className="px-3 py-2 font-medium text-right">Avg Dur(s)</th>
            <th className="px-3 py-2 font-medium text-right">Revenue</th>
            <th className="px-3 py-2 font-medium text-right">Gift Users</th>
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
              <td className="px-3 py-2 text-right">${r.revenue.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{r.gift_users.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
