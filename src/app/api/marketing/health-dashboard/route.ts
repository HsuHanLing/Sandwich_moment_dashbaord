import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import {
  getFlywheelQuery,
  getReferralRewardQuery,
  getUnlockD7RetentionQuery,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function tableFilter(days: number) {
  return `_TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

const dataset = () => process.env.BIGQUERY_DATASET || "analytics_233462855";
const table = () => process.env.BIGQUERY_TABLE || "events_*";

async function getRevenue30d(): Promise<number> {
  const q = `
    SELECT COALESCE(SUM(event_value_in_usd), 0) as revenue
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(30)}
      AND event_name IN ('purchase','in_app_purchase','app_store_subscription_convert','app_store_subscription_renew')
  `;
  const [rows] = await bigquery.query({ query: q });
  const r = (rows as { revenue: number }[])[0];
  return Number(r?.revenue ?? 0);
}

export async function GET() {
  try {
    const days30 = 30;
    const days7 = 7;

    const [fwRows, refRows, unlockRows] = await Promise.all([
      bigquery.query({ query: getFlywheelQuery(days30) }).then(([r]) => r as Record<string, unknown>[]),
      bigquery.query({ query: getReferralRewardQuery(days7) }).then(([r]) => r as Record<string, unknown>[]),
      bigquery.query({ query: getUnlockD7RetentionQuery(days30) }).then(([r]) => r as Record<string, unknown>[]),
    ]);

    const revenue = await getRevenue30d();

    const fw = fwRows[0] || {};
    const n = (v: unknown) => Number(v ?? 0);
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

    const firstOpen = n(fw.first_open_users);
    const registered = n(fw.registered_users);
    const firstUnlock = n(fw.first_unlock_users);
    const totalUnlockers = n(fw.total_unlockers);
    const loopUsers = n(fw.loop_users);
    const scratchUsers = n(fw.scratch_users);
    const scratchShareUsers = n(fw.scratch_share_users);
    const totalActive = n(fw.total_active);
    const payers = n(fw.payers);

    const regRate = pct(registered, firstOpen);
    const unlockRate = pct(firstUnlock, registered);
    const loopRate = pct(loopUsers, totalUnlockers);
    const shareRate = scratchUsers > 0 ? pct(scratchShareUsers, scratchUsers) : 0;
    const payRate = pct(payers, totalActive);

    const ref = refRows[0] || {};
    const referralRegs7d = n(ref.referral_registrations);

    const ur = unlockRows[0] || {};
    const totalUnlock = n(ur.total_unlock_users);
    const d7Retained = n(ur.d7_retained);
    const d7RetentionUnlock = totalUnlock > 0 ? Math.round((d7Retained / totalUnlock) * 1000) / 10 : 0;

    return NextResponse.json({
      reg_rate: regRate,
      unlock_rate: unlockRate,
      loop_rate: loopRate,
      share_rate: shareRate,
      referral_regs_7d: referralRegs7d,
      d7_retention_unlock: d7RetentionUnlock,
      pay_rate: payRate,
      revenue_30d: Math.round(revenue * 100) / 100,
      as_of: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("Health dashboard error:", error);
    return NextResponse.json(
      {
        reg_rate: 0,
        unlock_rate: 0,
        loop_rate: 0,
        share_rate: 0,
        referral_regs_7d: 0,
        d7_retention_unlock: 0,
        pay_rate: 0,
        revenue_30d: 0,
        as_of: new Date().toISOString().slice(0, 10),
        error: String(error),
      },
      { status: 200 }
    );
  }
}
