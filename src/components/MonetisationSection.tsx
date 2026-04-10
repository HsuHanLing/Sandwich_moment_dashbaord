"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type FunnelStep = { step: string; label: string; users: number };

type Props = {
  data: Record<string, unknown> | null;
  economyData: Record<string, unknown> | null;
  loading: boolean;
  t: (key: string) => string;
};

function FunnelChart({ title, steps, t }: { title: string; steps: FunnelStep[]; t: (key: string) => string }) {
  const base = steps[0]?.users || 1;
  return (
    <div className="rounded-lg bg-[var(--background)] p-3" style={{ border: "1px solid var(--border)" }}>
      <h4 className="mb-2 text-xs font-semibold">{title}</h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--secondary-text)]">
            <th className="px-2 py-1.5 font-medium">{t("step")}</th>
            <th className="px-2 py-1.5 font-medium text-right">{t("userCount")}</th>
            <th className="px-2 py-1.5 font-medium text-right">{t("conversionRate")}</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr key={s.step} className="border-b border-[var(--border)]">
              <td className="px-2 py-1.5">{s.label}</td>
              <td className="px-2 py-1.5 text-right font-medium">{s.users.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right text-[var(--secondary-text)]">{Math.round((s.users / base) * 1000) / 10}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonetisationSection({ data, economyData, loading, t }: Props) {
  if (loading || !data) {
    return (
      <div className="mb-8 rounded-xl bg-[var(--card-bg)] p-6 text-center text-sm text-[var(--secondary-text)]" style={{ border: "1px solid var(--card-stroke)" }}>
        {t("loadingText")}
      </div>
    );
  }

  const ov = (data.overview || {}) as Record<string, number>;
  const rechargeFunnel = (data.recharge_funnel || []) as FunnelStep[];
  const membershipFunnel = (data.membership_funnel || []) as FunnelStep[];
  const giftFunnel = (data.gift_funnel || []) as FunnelStep[];
  const npcGift = (data.npc_gift || {}) as Record<string, number>;
  const revenueDaily = (data.revenue_daily || []) as { date: string; recharge_revenue: number; membership_revenue: number; gifts_sent: number; ad_views: number }[];

  const eco = economyData as {
    battery?: { charged: number; consumed: number; users: number };
    coins?: { earned: number; spent: number; users: number; unlocks: number };
    ads?: { views: number; users: number; forced: number };
    unlocks?: { attempts: number; users: number; successful: number; balance_fails: number };
  } | null;

  return (
    <>
      {/* Overview KPIs */}
      <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
        <div className="p-4 sm:p-5">
          <h2 className="text-base font-semibold tracking-tight">{t("monetisationTitle")}</h2>
          <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("monetisationDesc")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <MetricBox label="Recharge Revenue" value={`$${(ov.recharge_revenue ?? 0).toLocaleString()}`} />
            <MetricBox label="Membership Revenue" value={`$${(ov.membership_revenue ?? 0).toLocaleString()}`} />
            <MetricBox label="ARPU" value={`$${ov.arpu ?? 0}`} accent />
            <MetricBox label="Gift Users" value={String(ov.gift_users ?? 0)} />
            <MetricBox label="Gifts Sent" value={String(ov.gift_count ?? 0)} />
            <MetricBox label="Ad Completions" value={String(ov.ad_completions ?? 0)} />
          </div>
        </div>
      </section>

      {/* Funnels */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <FunnelChart title={t("rechargeFunnel")} steps={rechargeFunnel} t={t} />
        <FunnelChart title={t("membershipFunnel")} steps={membershipFunnel} t={t} />
        <FunnelChart title={t("giftFunnel")} steps={giftFunnel} t={t} />
      </div>

      {/* NPC Gift */}
      <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
        <div className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold">{t("npcGiftTitle")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <MetricBox label="Request Shown" value={String(npcGift.shown ?? 0)} />
            <MetricBox label="Clicked" value={String(npcGift.clicked ?? 0)} />
            <MetricBox label="Confirmed" value={String(npcGift.confirmed ?? 0)} />
            <MetricBox label="Cancelled" value={String(npcGift.cancelled ?? 0)} />
          </div>
        </div>
      </section>

      {/* Revenue Daily */}
      {revenueDaily.length > 0 && (
        <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold">{t("revenueDailyTitle")}</h3>
            <div className="mt-3" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueDaily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--secondary-text)" }} />
                  <Tooltip contentStyle={{ fontSize: 11, backgroundColor: "var(--card-bg)", border: "1px solid var(--border)" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="recharge_revenue" name="Recharge" fill="var(--accent)" stackId="rev" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="membership_revenue" name="Membership" fill="#6366f1" stackId="rev" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Economy Health */}
      {eco && (
        <section className="mb-8 rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">{t("economyTitle")}</h2>
            <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("economyDesc")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-[var(--background)] p-3" style={{ border: "1px solid var(--border)" }}>
                <h4 className="text-[10px] font-medium text-[var(--secondary-text)] uppercase tracking-wide">Battery</h4>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span>Charged</span><span className="font-medium text-emerald-500">+{eco.battery?.charged?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Consumed</span><span className="font-medium text-rose-500">-{eco.battery?.consumed?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Users</span><span className="font-medium">{eco.battery?.users?.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="rounded-lg bg-[var(--background)] p-3" style={{ border: "1px solid var(--border)" }}>
                <h4 className="text-[10px] font-medium text-[var(--secondary-text)] uppercase tracking-wide">Coins</h4>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span>Earned</span><span className="font-medium text-emerald-500">+{eco.coins?.earned?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Spent</span><span className="font-medium text-rose-500">-{eco.coins?.spent?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Users</span><span className="font-medium">{eco.coins?.users?.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="rounded-lg bg-[var(--background)] p-3" style={{ border: "1px solid var(--border)" }}>
                <h4 className="text-[10px] font-medium text-[var(--secondary-text)] uppercase tracking-wide">Ads</h4>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span>Completions</span><span className="font-medium">{eco.ads?.views?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Forced</span><span className="font-medium text-amber-500">{eco.ads?.forced?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Users</span><span className="font-medium">{eco.ads?.users?.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="rounded-lg bg-[var(--background)] p-3" style={{ border: "1px solid var(--border)" }}>
                <h4 className="text-[10px] font-medium text-[var(--secondary-text)] uppercase tracking-wide">Image Unlocks</h4>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span>Attempts</span><span className="font-medium">{eco.unlocks?.attempts?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Successful</span><span className="font-medium text-emerald-500">{eco.unlocks?.successful?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Balance Fails</span><span className="font-medium text-rose-500">{eco.unlocks?.balance_fails?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function MetricBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--background)] px-3 py-2.5" style={{ border: "1px solid var(--border)" }}>
      <p className="text-[10px] font-medium text-[var(--secondary-text)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>{value}</p>
    </div>
  );
}
