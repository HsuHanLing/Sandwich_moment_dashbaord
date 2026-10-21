import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import {
  getMonetisationOverviewQuery,
  getRechargeFunnelQuery,
  getMembershipFunnelQuery,
  getGiftFunnelQuery,
  getRevenueDailyQuery,
} from "@/lib/queries";
import {
  getDailySubscriptionRevenue,
  getNewPaidSubscriptionsTotal,
  getSubscriptionRevenueByProduct,
  revenueByDateMap,
} from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  const rcFilters = {
    platform: searchParams.get("platform") || undefined,
    geo: searchParams.get("geo") || undefined,
  };
  try {
    const [
      overviewRows,
      rechargeRows,
      membershipRows,
      giftRows,
      revenueRows,
      rcDaily,
      rcSubscribers,
      rcProducts,
    ] = await Promise.all([
      bigquery.query({ query: getMonetisationOverviewQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getRechargeFunnelQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getMembershipFunnelQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getGiftFunnelQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getRevenueDailyQuery(days) }).then(([r]) => r),
      getDailySubscriptionRevenue(days, rcFilters),
      getNewPaidSubscriptionsTotal(days, rcFilters),
      getSubscriptionRevenueByProduct(days, rcFilters),
    ]);
    const n = (v: unknown) => Number(v ?? 0);
    const ov = (overviewRows as Record<string, unknown>[])[0] || {};
    const rc = (rechargeRows as Record<string, unknown>[])[0] || {};
    const mb = (membershipRows as Record<string, unknown>[])[0] || {};
    const gf = (giftRows as Record<string, unknown>[])[0] || {};

    const membershipRevenue =
      Math.round(rcDaily.reduce((s, r) => s + r.revenue, 0) * 100) / 100;
    const rcMap = revenueByDateMap(rcDaily);

    return NextResponse.json({
      overview: {
        recharge_payers: n(ov.recharge_payers),
        recharge_revenue: Math.round(n(ov.recharge_revenue) * 100) / 100,
        membership_subscribers: rcSubscribers,
        membership_revenue: membershipRevenue,
        gift_users: n(ov.gift_users),
        gift_count: n(ov.gift_count),
        npc_gift_users: n(ov.npc_gift_users),
        npc_gift_count: n(ov.npc_gift_count),
        total_active_users: n(ov.total_active_users),
        ad_charge_users: n(ov.ad_charge_users),
        ad_charges: n(ov.ad_charges),
        ad_completions: n(ov.ad_completions),
        arpu: n(ov.total_active_users) > 0
          ? Math.round(((n(ov.recharge_revenue) + membershipRevenue) / n(ov.total_active_users)) * 100) / 100
          : 0,
      },
      recharge_funnel: [
        { step: "topup_entry", label: "Top-up Entry", users: n(rc.topup_entry) },
        { step: "recharge_page", label: "Recharge Page", users: n(rc.recharge_page) },
        { step: "option_clicked", label: "Option Selected", users: n(rc.option_clicked) },
        { step: "purchase_success", label: "Purchase Success", users: n(rc.purchase_success) },
      ],
      recharge_cancel: n(rc.purchase_cancel),
      recharge_fail: n(rc.purchase_fail),
      membership_funnel: [
        { step: "membership_views", label: "Membership Page", users: n(mb.membership_views) },
        { step: "plan_selected", label: "Plan Selected", users: n(mb.plan_selected) },
        { step: "purchase_clicked", label: "Purchase Clicked", users: n(mb.purchase_clicked) },
        { step: "purchase_success", label: "Subscribed", users: n(mb.purchase_success) },
      ],
      membership_extras: {
        cancelled: n(mb.purchase_cancelled),
        promo_shown: n(mb.promo_shown),
        promo_clicked: n(mb.promo_clicked),
        vip_gate_hits: n(mb.vip_gate_hits),
      },
      membership_products: rcProducts.map((product) => ({
        product_id: product.product_id,
        country: "(all)",
        plan_price_usd: 0,
        subscribers: 0,
        purchases: product.purchases,
        revenue_usd: product.revenue_usd,
      })),
      gift_funnel: [
        { step: "popup_opened", label: "Gift Popup", users: n(gf.popup_opened) },
        { step: "item_clicked", label: "Item Selected", users: n(gf.item_clicked) },
        { step: "item_purchased", label: "Gift Sent", users: n(gf.item_purchased) },
      ],
      npc_gift: {
        shown: n(gf.npc_request_shown),
        clicked: n(gf.npc_request_clicked),
        confirmed: n(gf.npc_confirmed),
        cancelled: n(gf.npc_cancelled),
      },
      revenue_daily: (() => {
        const byDate = new Map<string, {
          date: string;
          recharge_revenue: number;
          membership_revenue: number;
          gifts_sent: number;
          ad_views: number;
        }>();
        for (const r of revenueRows as Record<string, unknown>[]) {
          const date = String(r.date);
          byDate.set(date, {
            date,
            recharge_revenue: Math.round(n(r.recharge_revenue) * 100) / 100,
            membership_revenue: 0,
            gifts_sent: n(r.gifts_sent),
            ad_views: n(r.ad_views),
          });
        }
        for (const [date, membership_revenue] of rcMap) {
          const existing = byDate.get(date);
          if (existing) {
            existing.membership_revenue = Math.round(membership_revenue * 100) / 100;
          } else {
            byDate.set(date, {
              date,
              recharge_revenue: 0,
              membership_revenue: Math.round(membership_revenue * 100) / 100,
              gifts_sent: 0,
              ad_views: 0,
            });
          }
        }
        return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      })(),
    });
  } catch (error) {
    console.error("Monetisation error:", error);
    return NextResponse.json({ overview: {}, recharge_funnel: [], membership_funnel: [], membership_products: [], gift_funnel: [], npc_gift: {}, revenue_daily: [] }, { status: 500 });
  }
}
