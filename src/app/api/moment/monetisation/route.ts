import { NextResponse } from "next/server";
import { bigquery } from "@/lib/bigquery";
import {
  getMonetisationOverviewQuery,
  getRechargeFunnelQuery,
  getMembershipFunnelQuery,
  getGiftFunnelQuery,
  getRevenueDailyQuery,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  try {
    const [overviewRows, rechargeRows, membershipRows, giftRows, revenueRows] = await Promise.all([
      bigquery.query({ query: getMonetisationOverviewQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getRechargeFunnelQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getMembershipFunnelQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getGiftFunnelQuery(days) }).then(([r]) => r),
      bigquery.query({ query: getRevenueDailyQuery(days) }).then(([r]) => r),
    ]);
    const n = (v: unknown) => Number(v ?? 0);
    const ov = (overviewRows as Record<string, unknown>[])[0] || {};
    const rc = (rechargeRows as Record<string, unknown>[])[0] || {};
    const mb = (membershipRows as Record<string, unknown>[])[0] || {};
    const gf = (giftRows as Record<string, unknown>[])[0] || {};

    return NextResponse.json({
      overview: {
        recharge_payers: n(ov.recharge_payers),
        recharge_revenue: Math.round(n(ov.recharge_revenue) * 100) / 100,
        membership_subscribers: n(ov.membership_subscribers),
        membership_revenue: Math.round(n(ov.membership_revenue) * 100) / 100,
        gift_users: n(ov.gift_users),
        gift_count: n(ov.gift_count),
        npc_gift_users: n(ov.npc_gift_users),
        npc_gift_count: n(ov.npc_gift_count),
        total_active_users: n(ov.total_active_users),
        ad_charge_users: n(ov.ad_charge_users),
        ad_charges: n(ov.ad_charges),
        ad_completions: n(ov.ad_completions),
        arpu: n(ov.total_active_users) > 0
          ? Math.round(((n(ov.recharge_revenue) + n(ov.membership_revenue)) / n(ov.total_active_users)) * 100) / 100
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
      revenue_daily: (revenueRows as Record<string, unknown>[]).map((r) => ({
        date: String(r.date),
        recharge_revenue: Math.round(n(r.recharge_revenue) * 100) / 100,
        membership_revenue: Math.round(n(r.membership_revenue) * 100) / 100,
        gifts_sent: n(r.gifts_sent),
        ad_views: n(r.ad_views),
      })),
    });
  } catch (error) {
    console.error("Monetisation error:", error);
    return NextResponse.json({ overview: {}, recharge_funnel: [], membership_funnel: [], gift_funnel: [], npc_gift: {}, revenue_daily: [] }, { status: 500 });
  }
}
