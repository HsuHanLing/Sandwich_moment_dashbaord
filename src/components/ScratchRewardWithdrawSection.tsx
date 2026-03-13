"use client";

import { useState } from "react";
import { METRIC_FORMULAS } from "@/lib/metric-formulas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function InfoTooltip({ metricKey }: { metricKey: string }) {
  const [show, setShow] = useState(false);
  const info = METRIC_FORMULAS[metricKey];
  if (!info) return null;
  return (
    <span
      className="relative ml-1 inline-flex cursor-help items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-[var(--secondary-text)]">
        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
      </svg>
      {show && (
        <span
          className="absolute bottom-full left-1/2 z-[100] mb-2 w-[260px] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2.5 py-2 text-[9px] leading-snug"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
        >
          <span className="block font-semibold text-[var(--accent)]">{info.formula}</span>
          <span className="mt-1 block text-[var(--secondary-text)]">{info.description}</span>
        </span>
      )}
    </span>
  );
}

type DistRow = { bucket: string; user_count: number; pct: number };

type Props = {
  scratchDistribution: DistRow[];
  scratchTotalUsers: number;
  rewardCountDistribution: DistRow[];
  rewardDiamondsDistribution: DistRow[];
  rewardTotalUsers: number;
  withdraw: { withdraw_users: number; withdraw_events: number; total_amount_usd: number };
  withdrawDistribution: DistRow[];
  analyticsDays: number;
  t: (key: string) => string;
};

const BAR_COLORS = [
  "var(--chart-1, #6366f1)",
  "var(--chart-2, #8b5cf6)",
  "var(--chart-3, #a78bfa)",
  "var(--chart-4, #c4b5fd)",
  "var(--chart-5, #ddd6fe)",
  "var(--chart-6, #ede9fe)",
  "var(--chart-7, #f5f3ff)",
];

const badgeStyle = {
  backgroundColor: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--secondary-text)",
} as const;

function DistChart({ data, dataKey, xLabel }: { data: DistRow[]; dataKey: string; xLabel: string }) {
  return (
    <div className="mt-3" style={{ width: "100%", height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 10, fill: "var(--secondary-text)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            label={{ value: xLabel, position: "insideBottom", offset: -2, style: { fontSize: 9, fill: "var(--secondary-text)" } }}
          />
          <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} axisLine={false} tickLine={false} width={40} />
          <RechartsTooltip
            contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
            formatter={(value, _name, entry) => [
              `${Number(value ?? 0).toLocaleString()} (${(entry?.payload as DistRow)?.pct ?? 0}%)`,
              "",
            ]}
          />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DistTable({ data, bucketLabel, t }: { data: DistRow[]; bucketLabel: string; t: (k: string) => string }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-2 py-1.5 text-left font-medium text-[var(--secondary-text)]">{bucketLabel}</th>
            <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("unlockUserCount")}</th>
            <th className="px-2 py-1.5 text-right font-medium text-[var(--secondary-text)]">{t("unlockUserPct")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.bucket} className="border-b border-[var(--border)]/50">
              <td className="px-2 py-1.5 font-medium text-[var(--foreground)]">{row.bucket}</td>
              <td className="px-2 py-1.5 text-right text-[var(--foreground)]">{row.user_count.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right text-[var(--secondary-text)]">{row.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScratchRewardWithdrawSection({
  scratchDistribution,
  scratchTotalUsers,
  rewardCountDistribution,
  rewardDiamondsDistribution,
  rewardTotalUsers,
  withdraw,
  withdrawDistribution,
  analyticsDays,
  t,
}: Props) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{t("growthBehaviorTitle")}</h2>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={badgeStyle}>
          {t("lastNDays").replace("{n}", String(analyticsDays))}
        </span>
      </div>
      <p className="mt-0.5 mb-4 text-xs text-[var(--secondary-text)]">{t("growthBehaviorDesc")}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Scratch distribution */}
        <div
          className="rounded-xl bg-[var(--card-bg)] p-4"
          style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
        >
          <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
            {t("scratchDistTitle")}
            <InfoTooltip metricKey="GROWTH_SCRATCH_DIST" />
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--secondary-text)]">{t("scratchDistDesc")}</p>
          {scratchTotalUsers > 0 && (
            <span className="mt-1 inline-block text-[9px] text-[var(--secondary-text)]">
              {t("totalUsers")}: {scratchTotalUsers.toLocaleString()}
            </span>
          )}
          {scratchDistribution.length > 0 ? (
            <>
              <DistChart data={scratchDistribution} dataKey="user_count" xLabel={t("scratchBucket")} />
              <DistTable data={scratchDistribution} bucketLabel={t("scratchBucket")} t={t} />
            </>
          ) : (
            <p className="mt-6 text-center text-[10px] text-[var(--secondary-text)]">—</p>
          )}
        </div>

        {/* Reward distribution (count + diamonds) */}
        <div
          className="rounded-xl bg-[var(--card-bg)] p-4"
          style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
        >
          <p className="flex items-center text-[11px] font-medium text-[var(--secondary-text)]">
            {t("rewardDistTitle")}
            <InfoTooltip metricKey="GROWTH_REWARD_COUNT_DIST" />
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--secondary-text)]">{t("rewardDistDesc")}</p>
          {rewardTotalUsers > 0 && (
            <span className="mt-1 inline-block text-[9px] text-[var(--secondary-text)]">
              {t("totalUsers")}: {rewardTotalUsers.toLocaleString()}
            </span>
          )}
          {rewardCountDistribution.length > 0 ? (
            <>
              <p className="mt-3 flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("rewardByCount")}
                <InfoTooltip metricKey="GROWTH_REWARD_COUNT_DIST" />
              </p>
              <DistChart data={rewardCountDistribution} dataKey="user_count" xLabel={t("rewardCountBucket")} />
              <p className="mt-3 flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("rewardByDiamonds")}
                <InfoTooltip metricKey="GROWTH_REWARD_DIAMONDS_DIST" />
              </p>
              <DistChart data={rewardDiamondsDistribution} dataKey="user_count" xLabel={t("rewardDiamondsBucket")} />
              <DistTable data={rewardCountDistribution} bucketLabel={t("rewardCountBucket")} t={t} />
            </>
          ) : (
            <p className="mt-6 text-center text-[10px] text-[var(--secondary-text)]">—</p>
          )}
        </div>

        {/* Withdraw behavior & amount */}
        <div
          className="rounded-xl bg-[var(--card-bg)] p-4"
          style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
        >
          <p className="text-[11px] font-medium text-[var(--secondary-text)]">{t("withdrawTitle")}</p>
          <p className="mt-0.5 text-[10px] text-[var(--secondary-text)]">{t("withdrawDesc")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
              <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{t("withdrawUsers")}<InfoTooltip metricKey="GROWTH_WITHDRAW_USERS" /></p>
              <p className="mt-0.5 text-base font-semibold text-[var(--foreground)]">{withdraw.withdraw_users.toLocaleString()}</p>
            </div>
            <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
              <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{t("withdrawEvents")}<InfoTooltip metricKey="GROWTH_WITHDRAW_EVENTS" /></p>
              <p className="mt-0.5 text-base font-semibold text-[var(--foreground)]">{withdraw.withdraw_events.toLocaleString()}</p>
            </div>
            <div className="col-span-2 rounded-lg p-2.5" style={{ backgroundColor: "var(--background)" }}>
              <p className="flex items-center text-[10px] text-[var(--secondary-text)]">{t("withdrawAmount")}<InfoTooltip metricKey="GROWTH_WITHDRAW_AMOUNT" /></p>
              <p className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
                ${withdraw.total_amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          {withdrawDistribution.length > 0 && (
            <>
              <p className="mt-3 flex items-center text-[10px] font-medium text-[var(--secondary-text)]">
                {t("withdrawAmountDist")}
                <InfoTooltip metricKey="GROWTH_WITHDRAW_AMOUNT_DIST" />
              </p>
              <DistChart data={withdrawDistribution} dataKey="user_count" xLabel={t("withdrawBucket")} />
              <DistTable data={withdrawDistribution} bucketLabel={t("withdrawBucket")} t={t} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
