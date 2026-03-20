import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import {
  getScratchDistributionQuery,
  getRewardDistributionQuery,
  getWithdrawTotalsQuery,
  getWithdrawDistributionQuery,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const scratchBucketOrder = ["0", "1", "2", "3", "4", "5-9", "10+"];
const rewardCountBucketOrder = ["0", "0.5", "500", "1", "2", "3-4", "5-9", "10+"];
const rewardDiamondsBucketOrder = ["0", "1-1k", "1k-5k", "5k-10k", "10k-20k"];
const withdrawBucketOrder = ["1-10", "10-50", "50-100", "100+"];

function toDistribution(
  raw: { bucket: string; user_count: number }[],
  bucketOrder: string[],
  totalUsers: number
) {
  return bucketOrder.map((b) => {
    const row = raw.find((r) => r.bucket === b);
    const count = Number(row?.user_count ?? 0);
    return {
      bucket: b,
      user_count: count,
      pct: totalUsers > 0 ? Math.round((count / totalUsers) * 1000) / 10 : 0,
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);

  try {
    const [scratchRows, rewardRows, withdrawTotalsRows, withdrawDistRows] = await Promise.all([
      bigquery.query({ query: getScratchDistributionQuery(days) }).then(([r]) => r as { bucket: string; user_count: number }[]),
      bigquery.query({ query: getRewardDistributionQuery(days) }).then(([r]) => r as { metric_type: string; bucket: string; user_count: number }[]),
      bigquery.query({ query: getWithdrawTotalsQuery(days) }).then(([r]) => r as { withdraw_users: number; withdraw_events: number; total_amount_usd: number }[]),
      bigquery.query({ query: getWithdrawDistributionQuery(days) }).then(([r]) => r as { bucket: string; user_count: number }[]),
    ]);

    const scratchRaw = scratchRows ?? [];
    const scratchTotal = scratchRaw.reduce((s, x) => s + Number(x.user_count ?? 0), 0);
    const scratch_distribution = toDistribution(scratchRaw, scratchBucketOrder, scratchTotal);

    const rewardRaw = rewardRows ?? [];
    const countRows = rewardRaw.filter((r) => r.metric_type === "count");
    const diamondsRows = rewardRaw.filter((r) => r.metric_type === "diamonds");
    const rewardCountTotal = countRows.reduce((s, x) => s + Number(x.user_count ?? 0), 0);
    const rewardDiamondsTotal = diamondsRows.reduce((s, x) => s + Number(x.user_count ?? 0), 0);
    const reward_count_distribution = toDistribution(
      countRows.map((r) => ({ bucket: r.bucket, user_count: r.user_count })),
      rewardCountBucketOrder,
      rewardCountTotal
    );
    const reward_diamonds_distribution = toDistribution(
      diamondsRows.map((r) => ({ bucket: r.bucket, user_count: r.user_count })),
      rewardDiamondsBucketOrder,
      rewardDiamondsTotal
    );

    const totals = (withdrawTotalsRows as { withdraw_users: number; withdraw_events: number; total_amount_usd: number }[])?.[0] ?? {
      withdraw_users: 0,
      withdraw_events: 0,
      total_amount_usd: 0,
    };
    const withdrawDistRaw = withdrawDistRows ?? [];
    const withdrawDistTotal = withdrawDistRaw.reduce((s, x) => s + Number(x.user_count ?? 0), 0);
    const withdraw_distribution = toDistribution(withdrawDistRaw, withdrawBucketOrder, withdrawDistTotal);

    return NextResponse.json({
      days,
      scratch_distribution,
      scratch_total_users: scratchTotal,
      reward_count_distribution,
      reward_diamonds_distribution,
      reward_total_users: rewardCountTotal,
      withdraw: {
        withdraw_users: Number(totals.withdraw_users ?? 0),
        withdraw_events: Number(totals.withdraw_events ?? 0),
        total_amount_usd: Number(totals.total_amount_usd ?? 0),
      },
      withdraw_distribution,
    });
  } catch (error) {
    console.error("Growth behavior error:", error);
    return NextResponse.json(
      {
        days,
        scratch_distribution: [],
        scratch_total_users: 0,
        reward_count_distribution: [],
        reward_diamonds_distribution: [],
        reward_total_users: 0,
        withdraw: { withdraw_users: 0, withdraw_events: 0, total_amount_usd: 0 },
        withdraw_distribution: [],
      },
      { status: 500 }
    );
  }
}
