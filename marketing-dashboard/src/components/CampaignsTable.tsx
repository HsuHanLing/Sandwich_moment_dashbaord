"use client";

type Campaign = {
  campaign: string;
  spend?: number;
  impressions: number;
  clicks: number;
  sessions: number;
  revenue: number;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNum(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function CampaignsTable({ data }: { data: Campaign[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50">
            <th className="px-4 py-3 text-left font-semibold text-stone-700 dark:text-stone-300">
              Campaign
            </th>
            <th className="px-4 py-3 text-right font-semibold text-stone-700 dark:text-stone-300">
              Sessions
            </th>
            <th className="px-4 py-3 text-right font-semibold text-stone-700 dark:text-stone-300">
              Impressions
            </th>
            <th className="px-4 py-3 text-right font-semibold text-stone-700 dark:text-stone-300">
              Clicks
            </th>
            <th className="px-4 py-3 text-right font-semibold text-stone-700 dark:text-stone-300">
              Revenue
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-stone-100 last:border-0 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/30"
            >
              <td className="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                {row.campaign}
              </td>
              <td className="px-4 py-3 text-right text-stone-700 dark:text-stone-300">
                {formatNum(row.sessions)}
              </td>
              <td className="px-4 py-3 text-right text-stone-600 dark:text-stone-400">
                {formatNum(row.impressions)}
              </td>
              <td className="px-4 py-3 text-right text-stone-600 dark:text-stone-400">
                {formatNum(row.clicks)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(row.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
