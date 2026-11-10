import test from "node:test";
import assert from "node:assert/strict";
import { reconcileRevenueCat, type Reconciliation } from "../src/lib/analytics/reconcile.ts";

function payload(): Reconciliation {
  return { events: [{ event: { id: "rc-purchase", type: "INITIAL_PURCHASE", app_user_id: "customer", store: "APP_STORE", product_id: "weekly", transaction_id: "order", environment: "PRODUCTION", purchased_at_ms: Date.parse("2026-10-08T06:21:31Z"), event_timestamp_ms: Date.parse("2026-10-08T06:22:31Z"), currency: "USD", price_in_purchased_currency: 3.99, price: 3.99, country_code: "IE" } }],
    identities: [{ source_id: "customer", user_key: "account:123", valid_from: "2026-01-01T00:00:00Z", valid_to: null }], contexts: [] };
}
test("Ireland does not convert an already-USD price; missing page remains unknown", () => {
  const r = reconcileRevenueCat(payload()); const row = r.rows[0];
  assert.ok("amount_usd" in row);
  assert.equal(row.amount_usd, 3.99); assert.equal(row.currency, "USD"); assert.equal(row.source_page, null); assert.equal(r.pending.length, 0);
});
test("duplicate webhook IDs are idempotent and ordinary cancellations do not erase a payment", () => {
  const p = payload(); p.events.push(p.events[0], { event: { ...p.events[0].event, id: "cancel", type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE" } });
  assert.equal(reconcileRevenueCat(p).rows.length, 1);
});
test("known negative refund creates a new effective state, preserving the original purchase", () => {
  const p = payload(); p.events.push({ event: { ...p.events[0].event, id: "refund", type: "CANCELLATION", price: -1, cancel_reason: "CUSTOMER_SUPPORT", event_timestamp_ms: Date.parse("2026-10-10T10:00:00Z") } });
  const r = reconcileRevenueCat(p); assert.equal(r.rows.length, 2); const [original, refund] = r.rows;
  assert.ok("refund_usd" in original && "refund_usd" in refund);
  assert.equal(original.refund_usd, 0); assert.equal(refund.refund_usd, 1); assert.equal(r.pending.length, 0);
});
test("ambiguous refunds, unmapped identities and refund reversals require reconciliation", () => {
  const p = payload(); p.identities = []; assert.equal(reconcileRevenueCat(p).pending.length, 1);
  const q = payload(); q.events.push({ event: { ...q.events[0].event, id: "refund", type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT" } });
  assert.equal(reconcileRevenueCat(q).pending.length, 1);
});
