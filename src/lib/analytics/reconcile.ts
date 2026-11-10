import { validateFeed } from "./contracts.ts";
import type { Transaction } from "./model";

type Event = { id: string; type: string; store?: string; transaction_id?: string; app_user_id?: string; purchased_at_ms?: number; event_timestamp_ms?: number;
  environment?: string; product_id?: string; price?: number | null; price_in_purchased_currency?: number | null; currency?: string; country_code?: string; cancel_reason?: string };
type Identity = { source_id: string; user_key: string; valid_from: string; valid_to: string | null };
type PurchaseContext = { store: string; transaction_id: string; source_page: string | null; flow_id: string | null; platform: string; version: string; country: string };
export type Reconciliation = { events: { event: Event }[]; identities: Identity[]; contexts: PurchaseContext[] };

// Sources: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
// RC.price is USD; price_in_purchased_currency is NOT a dollar amount. No FX is
// inferred from country. Mutable subscriber attributes cannot attribute a sale.
export function reconcileRevenueCat(input: Reconciliation) {
  const pending: { event_id: string; reason: string }[] = []; const rows: Transaction[] = [];
  const unique = new Map<string, Event>();
  for (const wrapper of input.events) {
    const e = wrapper.event;
    if (!e?.id || !e.type) throw new Error("Invalid RevenueCat event");
    if (unique.has(e.id) && JSON.stringify(unique.get(e.id)) !== JSON.stringify(e)) throw new Error("Conflicting duplicate event ID");
    unique.set(e.id, e);
  }
  const groups = new Map<string, Event[]>();
  for (const e of unique.values()) {
    if (e.environment !== "PRODUCTION" || e.type === "TEST") continue;
    const refund = e.type === "CANCELLATION" && ((e.price ?? 0) < 0 || e.cancel_reason === "CUSTOMER_SUPPORT");
    if (!["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE", "REFUND_REVERSED"].includes(e.type) && !refund) continue;
    if (!e.store || !e.transaction_id) { pending.push({ event_id: e.id, reason: "Missing store/transaction ID" }); continue; }
    const key = `${e.store}:${e.transaction_id}`;
    if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(e);
  }
  for (const events of groups.values()) {
    const purchase = events.find(e => ["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"].includes(e.type));
    if (!purchase) { pending.push({ event_id: events[0].id, reason: "Refund/reversal without original verified purchase; obtain receipt history" }); continue; }
    if (typeof purchase.price !== "number" || typeof purchase.price_in_purchased_currency !== "number" || !purchase.currency || !purchase.purchased_at_ms || !purchase.app_user_id) {
      pending.push({ event_id: purchase.id, reason: "Incomplete price/currency/date/identity" }); continue;
    }
    if (purchase.price === 0) continue; // Free trials are not paying transactions.
    const purchased_at = new Date(purchase.purchased_at_ms).toISOString();
    const identities = input.identities.filter(i => i.source_id === purchase.app_user_id && Date.parse(i.valid_from) <= purchase.purchased_at_ms! && (!i.valid_to || Date.parse(i.valid_to) > purchase.purchased_at_ms!));
    if (identities.length !== 1) { pending.push({ event_id: purchase.id, reason: "Missing or overlapping canonical identity mapping" }); continue; }
    const context = input.contexts.find(c => c.store === purchase.store && c.transaction_id === purchase.transaction_id);
    const platform = context?.platform || ({ APP_STORE: "IOS", PLAY_STORE: "ANDROID", AMAZON: "ANDROID", STRIPE: "WEB", RC_BILLING: "WEB" } as Record<string, string>)[purchase.store!] || "UNKNOWN";
    const country = context?.country || (purchase.country_code ? new Intl.DisplayNames(["en"], { type: "region" }).of(purchase.country_code) : null);
    if (!country) { pending.push({ event_id: purchase.id, reason: "Missing purchase country for reporting filters" }); continue; }
    let state: Transaction = { store: purchase.store!, transaction_id: purchase.transaction_id!, user_key: identities[0].user_key, product_id: purchase.product_id!, purchased_at, updated_at: purchased_at,
      amount: purchase.price_in_purchased_currency, amount_usd: purchase.price, refund_usd: 0, currency: purchase.currency, verified: true, environment: "PRODUCTION", status: "paid",
      purchase_type: purchase.type === "INITIAL_PURCHASE" ? "initial" : purchase.type === "RENEWAL" ? "renewal" : "one_time",
      source_page: context?.source_page || null, flow_id: context?.flow_id || null, platform, version: context?.version || "", country };
    rows.push(state);
    for (const e of events.filter(e => e.type === "CANCELLATION" || e.type === "REFUND_REVERSED").sort((a, b) => (a.event_timestamp_ms || 0) - (b.event_timestamp_ms || 0))) {
      if (e.type === "REFUND_REVERSED" || typeof e.price !== "number" || e.price >= 0 || !e.event_timestamp_ms) {
        pending.push({ event_id: e.id, reason: "Refund amount/reversal requires store receipt reconciliation" }); continue;
      }
      const refund = (state.refund_usd || 0) + Math.abs(e.price);
      if (refund > state.amount_usd + 0.000001) { pending.push({ event_id: e.id, reason: "Refund exceeds purchase amount; inspect receipt adjustments" }); continue; }
      state = { ...state, refund_usd: Math.min(refund, state.amount_usd), status: refund >= state.amount_usd - 0.000001 ? "refunded" : "paid", updated_at: new Date(e.event_timestamp_ms).toISOString() };
      rows.push(state);
    }
  }
  const validated = rows.length ? validateFeed({ feed: "transactions", rows: rows.slice(0, 250).map(r => ({ ...r, usd_source: "RevenueCat webhook price (USD)" })) }) : null;
  // Validate every batch; don't truncate exports larger than an ingestion batch.
  const all = [...(validated?.rows || [])];
  for (let i = 250; i < rows.length; i += 250) all.push(...validateFeed({ feed: "transactions", rows: rows.slice(i, i + 250).map(r => ({ ...r, usd_source: "RevenueCat webhook price (USD)" })) }).rows);
  return { feed: "transactions", rows: all, pending };
}
