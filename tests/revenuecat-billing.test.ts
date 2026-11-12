import test from "node:test";
import assert from "node:assert/strict";
import { summarizeBilling, fetchBillingSnapshot, type BillingSnapshot } from "../src/lib/analytics/revenuecat-billing.ts";
import type { RevenueCatSource } from "../src/lib/analytics/revenuecat-source.ts";
import { dates } from "../src/lib/analytics/context.ts";

const c = { start: "2026-11-03", end: "2026-11-10", days: 8, timezone: "UTC" };
function setup() {
  const snapshot: BillingSnapshot = { fetched_at: "2026-11-10T12:00:00Z", customer_count: 2,
    products: [{ id: "weekly", app_id: "app1", store_identifier: "week", type: "subscription", subscription: { duration: "P1W" } }, { id: "coins", app_id: "app1", store_identifier: "coins", type: "consumable", subscription: null }],
    purchases: [{ id: "purchase", customer_id: "coin-customer", original_customer_id: "coin-customer", product_id: "coins", country: "US", store: "app_store", environment: "production", ownership: "purchased", status: "owned", purchased_at: Date.parse("2026-11-05T10:00:00Z"), store_purchase_identifier: "coin-tx", revenue_in_usd: { currency: "USD", gross: 3.99 } }],
    subscriptions: [{ subscription: { id: "sub", customer_id: "billing-customer", original_customer_id: "billing-customer", product_id: "weekly", country: "US", store: "app_store", environment: "production", ownership: "purchased", status: "expired", starts_at: Date.parse("2026-11-03T10:00:00Z") }, transactions: [
      { id: "first", purchased_at: Date.parse("2026-11-03T10:00:00Z"), product_store_identifier: "week", revenue_in_usd: { currency: "USD", gross: 2.99 } },
      { id: "renew", purchased_at: Date.parse("2026-11-10T10:00:00Z"), product_store_identifier: "week", revenue_in_usd: { currency: "USD", gross: 2.99 } },
      { id: "free", purchased_at: Date.parse("2026-11-10T11:00:00Z"), product_store_identifier: "week", revenue_in_usd: { currency: "USD", gross: 0 } },
    ] }],
  };
  const chart: RevenueCatSource = { source: "revenuecat_chart", status: "ready", timezone: "UTC", accounting: "refund_recorded_date", revenue: 9.97,
    daily: dates(c).map(date => ({ date, revenue: date === "2026-11-05" ? 3.99 : [c.start, c.end].includes(date) ? 2.99 : 0, transactions: [c.start, "2026-11-05", c.end].includes(date) ? 1 : 0, incomplete: false })) };
  return { snapshot, chart };
}

test("billing uses canonical RC customer sets, counts inactive renewals and excludes zero-value adjustments", () => {
  const { snapshot, chart } = setup(); const r = summarizeBilling(snapshot, c, chart);
  assert.equal(r.payers, 2); assert.equal(r.arppu, 4.985); assert.equal(r.subscription_users, 1);
  assert.equal(r.subscriptions![0].initial_users, 1); assert.equal(r.subscriptions![0].renewal_users, 1); assert.equal(r.subscriptions![0].users, 1);
  assert.equal(r.subscriptions![0].purchases, 2); assert.equal(r.subscriptions![1].users, 0);
  assert.equal(r.products.length, 1); assert.equal(r.products[0].product_id, "week");
  assert.equal(r.amounts.find(a => a.kind === "recharge")?.revenue, 3.99);
  assert.equal(r.amounts.find(a => a.kind === "bundle")?.revenue, 0);
  assert.equal(r.amounts.find(a => a.kind === "subscription")?.revenue, 5.98);
  assert.equal(r.amounts.find(a => a.kind === "unknown")?.revenue, 0);
  assert.ok(!JSON.stringify(r).includes("billing-customer")); assert.equal(r.missing.app_identity_mapping, true);
});

test("one-time products split into first-purchase packs, coin recharge, and unclassified", () => {
  const { snapshot, chart } = setup();
  snapshot.products.push(
    { id: "first", app_id: "app1", store_identifier: "moment_firstpack", type: "consumable", subscription: null },
    { id: "other", app_id: "app1", store_identifier: "sticker", type: "consumable", subscription: null },
  );
  const purchase = snapshot.purchases[0];
  snapshot.purchases.push(
    { ...purchase, id: "first-purchase", product_id: "first", store_purchase_identifier: "first-tx", revenue_in_usd: { currency: "USD", gross: 1.99 } },
    { ...purchase, id: "other-purchase", product_id: "other", store_purchase_identifier: "other-tx", customer_id: "other-customer", original_customer_id: "other-customer", revenue_in_usd: { currency: "USD", gross: 0.99 } },
  );
  const day = chart.daily.find(d => d.date === "2026-11-05")!;
  day.revenue = 6.97; day.transactions = 3; chart.revenue = 12.95;
  const amounts = Object.fromEntries(summarizeBilling(snapshot, c, chart).amounts.map(a => [a.kind, a.revenue]));
  assert.equal(amounts.recharge, 3.99); assert.equal(amounts.bundle, 1.99); assert.equal(amounts.unknown, 0.99); assert.equal(amounts.subscription, 5.98);
});
test("duplicate transactions deduplicate, but conflicting owners block a false payer count", () => {
  const { snapshot, chart } = setup(); snapshot.purchases.push({ ...snapshot.purchases[0] });
  assert.equal(summarizeBilling(snapshot, c, chart).payers, 2);
  snapshot.purchases[1].customer_id = "different-owner";
  assert.throws(() => summarizeBilling(snapshot, c, chart), /Conflicting/);
});

test("a provisional current day does not hide payer counts when completed days reconcile", () => {
  const { snapshot, chart } = setup();
  chart.daily[chart.daily.length - 1].incomplete = true;
  chart.daily[chart.daily.length - 1].revenue = 0;
  chart.daily[chart.daily.length - 1].transactions = 0;
  const r = summarizeBilling(snapshot, c, chart);
  assert.equal(r.payers, 2);
  assert.equal(r.revenue, 9.97);
});
test("daily reconciliation rejects refunds, omitted transactions and offsetting day errors", () => {
  const { snapshot, chart } = setup(); chart.daily[0].revenue = 0; chart.daily[1].revenue = 2.99;
  assert.throws(() => summarizeBilling(snapshot, c, chart), /reconcile/);
  chart.daily[0].revenue = 2.99; chart.daily[1].revenue = 0; chart.daily[0].transactions = 2;
  assert.throws(() => summarizeBilling(snapshot, c, chart), /reconcile/);
});

test("purchase-time version and unknown product periods are not guessed from current customer metadata or SKU", () => {
  const { snapshot, chart } = setup();
  assert.throws(() => summarizeBilling(snapshot, { ...c, version: "0.0.19" }, chart), /version/);
  snapshot.products[0].subscription!.duration = null;
  const r = summarizeBilling(snapshot, c, chart);
  assert.equal(r.payers, 2); assert.equal(r.subscriptions, null); assert.equal(r.products[0].period, null);
});

test("billing pagination cannot send the credential to a foreign origin", async () => {
  const urls: string[] = [];
  await assert.rejects(fetchBillingSnapshot({ REVENUECAT_PROJECT_ID: "test", REVENUECAT_API_KEY: "test-only-pagination-key" }, (async (url: string | URL | Request) => {
    urls.push(String(url)); return Response.json({ items: [], next_page: "https://example.org/leak" });
  }) as typeof fetch), /pagination/);
  assert.ok(urls.length > 0); assert.ok(urls.every(url => new URL(url).origin === "https://api.revenuecat.com"));
});
