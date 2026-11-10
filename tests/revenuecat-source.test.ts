import test from "node:test";
import assert from "node:assert/strict";
import { loadRevenueCat, parseRevenueCat, revenueCatFilters } from "../src/lib/analytics/revenuecat-source.ts";
import { buildReport } from "../src/lib/analytics/model.ts";
import { demoInput } from "../src/lib/analytics/demo.ts";

const context = { start: "2026-11-09", end: "2026-11-10", days: 2, timezone: "UTC" };
const options = { filters: [
  { id: "country", options: ["US", "CN", "HK", "SG", "unknown"].map(id => ({ id, display_name: id === "US" ? "United States" : id })) },
  { id: "channel", options: ["Subscriptions", "One-Time Purchases", "Ads"].map(id => ({ id, display_name: id })) },
  { id: "store", options: ["app_store", "play_store"].map(id => ({ id, display_name: id })) },
  { id: "app_version", options: [{ id: "0.0.19", display_name: "0.0.19" }] },
  { id: "app_id", options: [{ id: "app-a", display_name: "App A" }] },
] };
const chart = () => ({ yaxis_currency: "USD", start_date: Date.parse(context.start) / 1000, end_date: Date.parse(context.end) / 1000,
  measures: [{ display_name: "Revenue" }, { display_name: "Transactions" }], unsupported_params: null,
  values: [
    { cohort: Date.parse(context.start) / 1000, measure: 0, value: 3.99 }, { cohort: Date.parse(context.start) / 1000, measure: 1, value: 2 },
    { cohort: Date.parse(context.end) / 1000, measure: 0, value: 0, incomplete: true }, { cohort: Date.parse(context.end) / 1000, measure: 1, value: 0, incomplete: true },
  ],
});

test("RC filters exclude restricted/unknown countries and ads, and apply native store/version/App", () => {
  const f = revenueCatFilters(options, { ...context, version: "0.0.19", platform: "IOS", geo: "United States" }, "app-a")!;
  assert.deepEqual(f, [{ name: "country", values: ["US"] }, { name: "channel", values: ["Subscriptions", "One-Time Purchases"] }, { name: "store", values: ["app_store"] }, { name: "app_version", values: ["0.0.19"] }, { name: "app_id", values: ["app-a"] }]);
  assert.deepEqual(revenueCatFilters(options, context)![0].values, ["US"]);
  assert.throws(() => revenueCatFilters(options, { ...context, geo: "unrecognized" }));
  assert.throws(() => revenueCatFilters(options, { ...context, version: "unrecognized" }));
  assert.throws(() => revenueCatFilters(options, { ...context, platform: "WEB" }));
  assert.equal(revenueCatFilters(options, { ...context, geo: "CN" }), null);
});

test("RC parsing retains real zero and provisional current day without substituting transaction counts for users", () => {
  const r = parseRevenueCat(chart(), context);
  assert.equal(r.revenue, 3.99); assert.equal(r.daily[1].revenue, 0); assert.equal(r.daily[1].incomplete, true);
  const input = demoInput(context); input.availability.transactions = false; input.availability.products = false; input.revenuecat = r;
  const d = buildReport(context, input);
  assert.equal(d.meta.revenue_source, "revenuecat_chart"); assert.equal(d.summary.revenue, 3.99); assert.equal(d.summary.arpu, 1.995);
  assert.equal(d.summary.arppu, null); assert.equal(d.summary.payers, null); assert.equal(d.summary.pay_rate, null); assert.equal(d.summary.membership_rate, null);
  assert.equal(d.payments.products, null); assert.equal(d.payments.subscriptions, null);
  assert.deepEqual(d.daily.map(r => r.revenue), [3.99, 0]);
  assert.ok(d.payments.amounts.every(r => r.revenue === null));
});

test("verified ledger takes precedence and is never added to RC Charts or GA purchase events", () => {
  const input = demoInput(context); input.revenuecat = parseRevenueCat(chart(), context);
  const d = buildReport(context, input);
  assert.equal(d.meta.revenue_source, "verified_ledger"); assert.ok(Math.abs(d.summary.revenue! - 9.97) < 1e-9);
});

test("missing daily points remain unknown; unsupported currencies, filters and ranges fail explicitly", () => {
  const missing = chart(); missing.values = missing.values.filter(v => v.cohort !== Date.parse(context.start) / 1000);
  assert.equal(parseRevenueCat(missing, context).revenue, null);
  assert.throws(() => parseRevenueCat({ ...chart(), yaxis_currency: "EUR" }, context));
  assert.throws(() => parseRevenueCat({ ...chart(), start_date: 0 }, context));
  assert.throws(() => parseRevenueCat({ ...chart(), unsupported_params: { filters: ["app_version"] } }, context));
  assert.throws(() => parseRevenueCat({ ...chart(), measures: [] }, context));
});

test("source fetch uses explicit inclusive dates and never silently ignores an unsupported timezone", async () => {
  const urls: string[] = [];
  const fetcher = (async (url: string | URL | Request) => { urls.push(String(url)); return Response.json(String(url).endsWith("/options") ? options : chart()); }) as typeof fetch;
  const env = { REVENUECAT_API_KEY: "test-only-source-key", REVENUECAT_PROJECT_ID: "test-project" };
  const r = await loadRevenueCat(context, env, fetcher);
  assert.equal(r.revenue, 3.99); const q = new URL(urls[1]);
  assert.equal(q.searchParams.get("start_date"), context.start); assert.equal(q.searchParams.get("end_date"), context.end);
  const unavailable = await loadRevenueCat({ ...context, timezone: "Asia/Taipei" }, env, fetcher);
  assert.equal(unavailable.revenue, null); assert.equal(urls.length, 2);
});

test("403 is a source error, not zero revenue; raw API bodies and keys are not returned", async () => {
  const r = await loadRevenueCat(context, { REVENUECAT_API_KEY: "test-only-denied-key", REVENUECAT_PROJECT_ID: "test-project" }, (async () => new Response("sensitive-example-body", { status: 403 })) as typeof fetch);
  assert.equal(r.revenue, null); assert.match(r.reason!, /HTTP 403/);
  assert.ok(!JSON.stringify(r).includes("sensitive-example-body")); assert.ok(!JSON.stringify(r).includes("test-only-denied-key"));
});
