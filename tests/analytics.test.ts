import test from "node:test";
import assert from "node:assert/strict";
import { buildReport, change, type Rollup } from "../src/lib/analytics/model.ts";
import { demoInput } from "../src/lib/analytics/demo.ts";
import { dateInZone, dates, parseContext, previousContext, type AnalyticsContext } from "../src/lib/analytics/context.ts";
import { authorized, validateFeed } from "../src/lib/analytics/contracts.ts";
import { identifier } from "../src/lib/analytics/sql.ts";

const context: AnalyticsContext = { start: "2026-10-29", end: "2026-11-04", days: 7, timezone: "UTC" };
const setup = () => demoInput(context);

test("seven and thirty calendar days have exact inclusive boundaries, including DST", () => {
  process.env.MOMENT_REPORT_TIME_ZONE = "Europe/London";
  const c = parseContext(new URLSearchParams("days=7&end=2026-11-04"), new Date("2026-11-10T12:00:00Z"));
  assert.equal(c.start, "2026-10-29"); assert.equal(dates(c).length, 7);
  assert.equal(previousContext(c).end, "2026-10-28"); assert.equal(dates(previousContext(c)).length, 7);
  assert.equal(dates(parseContext(new URLSearchParams("days=30"), new Date("2026-11-10T12:00:00Z"))).length, 30);
  assert.equal(dateInZone(new Date("2026-06-01T23:30:00Z"), "Europe/London"), "2026-06-02");
});
test("query validation rejects invalid dates, future dates, oversized ranges and invalid platforms", () => {
  for (const query of ["days=0", "days=1.5", "days=91", "end=2026-02-30", "end=2099-01-01", "platform=INVALID", "start=2026-11-05&end=2026-11-04"]) assert.throws(() => parseContext(new URLSearchParams(query), new Date("2026-11-10T12:00:00Z")));
  assert.throws(() => identifier("project.dataset.events_*`; DROP TABLE t"));
});
test("new-install activation includes later messages from that cohort, never old chatters", () => {
  const d = buildReport(context, setup());
  assert.equal(d.summary.new_users, 1); assert.equal(d.summary.activation_rate, 100);
  assert.equal(d.daily[0].activation_rate, 0); assert.equal(d.daily[6].activation_rate, null);
  assert.equal(d.summary.avg_messages, 9); assert.equal(d.summary.messages, 18);
  assert.equal(d.summary.dau, 3 / 7);
});
test("missing first_open and zero denominators stay unknown, not fake zero rates", () => {
  const input = setup(); input.installs = [];
  assert.equal(buildReport(context, input).summary.activation_rate, null);
  assert.equal(change(3, 0), null); assert.equal(change(0, 0), null); assert.equal(change(null, 1), null);
});
test("legacy successful-send contract does not require an undocumented result parameter", () => {
  const input = setup(); input.events.find(r => r.event === "message_send")!.result = null;
  const d = buildReport(context, input);
  assert.equal(d.summary.activation_rate, 100);
  assert.ok(d.meta.reasons.some(r => r.startsWith("Legacy message_send uses")));
});
test("old users without a result parameter never suppress a new-install cohort", () => {
  const input = setup(); input.installs[0].sent_dates = [];
  const oldSend = input.events.find(r => r.event === "message_send" && r.user_key === "returning-user")!;
  oldSend.result = null;
  const d = buildReport(context, input);
  assert.equal(d.summary.activation_rate, 0);
  assert.equal(d.daily[0].activation_rate, 0);
});
test("explicit failed sends are excluded from message counts and chatting users", () => {
  const input = setup(); const send = input.events.find(r => r.event === "message_send")!;
  input.events.push({ ...send, user_key: "failed-only", install_key: "failed-only", result: "fail", count: 500 });
  const d = buildReport(context, input);
  assert.equal(d.summary.messages, 18);
  assert.equal(d.summary.chatters, 2);
});
test("conversation quality uses lifetime totals including messages before the selected start", () => {
  const d = buildReport(context, setup());
  assert.equal(d.sessions.total, 3); assert.equal(d.sessions.valid, 2); assert.equal(d.sessions.median_messages, 6);
  assert.ok(Math.abs(d.sessions.medium_rate! - 33.3333333333) < 1e-8); assert.ok(Math.abs(d.sessions.deep_rate! - 33.3333333333) < 1e-8);
  assert.ok(Math.abs(d.sessions.shallow_rate! + d.sessions.medium_rate! + d.sessions.deep_rate! - d.sessions.valid_rate!) < 1e-8);
  assert.equal(d.sessions.distribution.reduce((n, r) => n + r.session_count!, 0), 3);
  assert.equal(d.sessions.distribution[0].session_count, 1); assert.equal(d.sessions.distribution[11].session_count, 1);
  assert.ok(Math.abs(d.summary.dispose_rate! - 33.3333333333) < 1e-8);
});
test("future messages do not change a past conversation snapshot; message IDs deduplicate retries", () => {
  const input = setup(); const c = input.conversations[0];
  c.message_ids.push(c.message_ids[0], "future"); c.message_dates.push(context.start, "2026-11-05");
  assert.ok(Math.abs(buildReport(context, input).sessions.deep_rate! - 33.3333333333) < 1e-8);
  assert.equal(buildReport(context, input).sessions.distribution[11].session_count, 1);
});
test("delete and recreate produce distinct conversations and preserve zero-message samples", () => {
  const input = setup(); input.conversations.push({ ...input.conversations[2], conversation_id: "recreated", deleted_at: null });
  const d = buildReport(context, input); assert.equal(d.sessions.total, 4); assert.equal(d.summary.dispose_rate, 25); assert.equal(d.sessions.distribution[0].session_count, 2);
});
test("missing creation/history does not get treated as zero or crash", () => {
  const input = setup(); input.conversations[0].created_at = null;
  const d = buildReport(context, input); assert.equal(d.sessions.unknown, 1); assert.equal(d.sessions.median_messages, null); assert.equal(d.sessions.deep_rate, null);
  assert.ok(d.sessions.distribution.every(r => r.session_count === null));
});
test("sandbox, unverified and duplicate notifications do not inflate revenue", () => {
  const input = setup(); const t = input.transactions[0]; input.transactions.push({ ...t }, { ...t, transaction_id: "sandbox", environment: "SANDBOX" }, { ...t, transaction_id: "unverified", verified: false });
  const d = buildReport(context, input); assert.ok(Math.abs(d.summary.revenue! - 9.97) < 1e-9); assert.equal(d.summary.payers, 2);
  assert.ok(Math.abs(d.summary.arppu! - 4.985) < 1e-9);
});
test("transaction key includes store, not just transaction ID", () => {
  const input = setup(); input.transactions.push({ ...input.transactions[0], store: "PLAY_STORE" });
  assert.ok(Math.abs(buildReport(context, input).summary.revenue! - 13.96) < 1e-9);
});
test("initial and renewal users are separate sets; total is their union", () => {
  const input = setup(); input.transactions[2].user_key = "new-user";
  const r = buildReport(context, input).payments.subscriptions![0];
  assert.equal(r.initial_users, 1); assert.equal(r.renewal_users, 1); assert.equal(r.users, 1); assert.equal(r.purchases, 2);
});
test("inactive renewals remain in purchasers and rates may exceed 100 percent", () => {
  const input = setup(); input.transactions.push({ ...input.transactions[2], transaction_id: "renewal2", user_key: "another-inactive" });
  const d = buildReport(context, input); assert.equal(d.summary.membership_rate, 150); assert.equal(d.payments.subscriptions![0].conversion, 150);
});
test("classification is based on verified page provenance; unknown is not silently a bundle", () => {
  const input = setup(); const t = input.transactions[0]; input.transactions.push({ ...t, transaction_id: "bundle", source_page: "firstpack_offer" }, { ...t, transaction_id: "unknown", source_page: null });
  const d = buildReport(context, input); const a = Object.fromEntries(d.payments.amounts.map(r => [r.kind, r.revenue]));
  assert.equal(a.recharge, 3.99); assert.equal(a.bundle, 3.99); assert.equal(a.unknown, 3.99);
  assert.ok(Math.abs(d.payments.amounts.reduce((n, r) => n + r.revenue!, 0) - d.summary.revenue!) < 1e-9);
  assert.ok(Math.abs(d.daily.reduce((n, r) => n + r.recharge_revenue! + r.bundle_revenue! + r.subscription_revenue! + r.unknown_revenue!, 0) - d.summary.revenue!) < 1e-9);
});
test("refund snapshots select the latest state effective before the period cutoff", () => {
  const input = setup(); const t = input.transactions[0];
  input.transactions.push({ ...t, status: "refunded", refund_usd: t.amount_usd, updated_at: "2026-11-04T19:00:00Z" });
  assert.ok(Math.abs(buildReport(context, input).summary.revenue! - 5.98) < 1e-9);
  input.transactions[3].updated_at = "2026-11-05T01:00:00Z";
  assert.ok(Math.abs(buildReport(context, input).summary.revenue! - 9.97) < 1e-9);
});
test("partial refunds reduce revenue without losing a still-paying purchaser", () => {
  const input = setup(); input.transactions[0].refund_usd = 1;
  const d = buildReport(context, input); assert.ok(Math.abs(d.summary.revenue! - 8.97) < 1e-9); assert.equal(d.summary.payers, 2);
});
test("missing catalog periods hide subscription totals rather than inventing a plan", () => {
  const input = setup(); input.products[0].period = null;
  const d = buildReport(context, input); assert.equal(d.payments.subscriptions, null); assert.equal(d.summary.membership_rate, null); assert.ok(d.summary.revenue! > 0);
});
test("missing financial/conversation sources remain null throughout the report", () => {
  const input = setup(); input.availability.transactions = false; input.availability.conversations = false;
  const d = buildReport(context, input); assert.equal(d.summary.revenue, null); assert.equal(d.summary.arppu, null); assert.equal(d.summary.dispose_rate, null);
  assert.equal(d.sessions.total, null); assert.ok(d.daily.every(r => r.revenue === null)); assert.ok(d.payments.amounts.every(r => r.revenue === null));
});
test("unavailable events are not shown as zero economy/report counters", () => {
  const input = setup(); input.availability.events = false; input.events = [];
  input.availability.errors = [{ source: "Events", code: "query_invalid", message: "BigQuery rejected the SQL" }];
  const d = buildReport(context, input); assert.equal(d.behaviour.reports, null); assert.equal(d.economy.battery_charged, null); assert.equal(d.summary.dau, null);
  assert.deepEqual(d.meta.source_errors, input.availability.errors);
  assert.ok(!d.meta.reasons.some(r => r.startsWith("Unverified result events:")));
});
test("missing user keys do not inflate per-chatter averages", () => {
  const input = setup(); const r = input.events.find(r => r.event === "message_send")!;
  input.events.push({ ...r, user_key: null, install_key: null, count: 900 });
  const d = buildReport(context, input); assert.equal(d.summary.avg_messages, 9); assert.equal(d.meta.missing.user_keys, 900);
});
test("success counters reject intent/cancel events and reports count events rather than users", () => {
  const input = setup(); const r = input.events.find(r => r.event === "image_unlock_result")!;
  input.events.push({ ...r, result: "fail", count: 50 }, { ...r, event: "image_unlock_confirm", count: 100 });
  const d = buildReport(context, input); assert.equal(d.economy.unlock_successes, 1); assert.equal(d.behaviour.unlocks, 100); assert.equal(d.behaviour.reports, 2);
  assert.equal(d.coverage.length, 14); assert.equal(d.coverage[8].users, 1);
});
test("conversation deletions count chat_session_dispose events without a connected history", () => {
  const input = setup();
  input.availability.conversations = false;
  input.availability.verified_events = input.availability.verified_events.filter(e => e !== "chat_session_dispose");
  const r = input.events[0];
  input.events.push({ ...r, event: "chat_session_dispose", result: null, count: 3 }, { ...r, event: "chat_session_dispose", result: "fail", count: 2 });
  const d = buildReport(context, input);
  assert.equal(d.summary.deletions, 5);
  assert.equal(d.summary.dispose_rate, null);
  assert.equal(d.daily.find(row => row.date === r.date)?.deletions, 5);
});
test("image unlock rate counts confirms; gift delivery stays on the unverified result", () => {
  const input = setup();
  input.availability.verified_events = input.availability.verified_events.filter(e => e !== "image_unlock_result" && e !== "gift_send_result");
  const r = input.events.find(e => e.event === "image_unlock_result")!;
  input.events.push({ ...r, event: "image_unlock_confirm", result: null, count: 4 });
  const d = buildReport(context, input);
  assert.equal(d.summary.image_unlock_rate, 50);
  assert.equal(d.behaviour.unlocks, 4);
  assert.equal(d.economy.unlock_successes, null);
  assert.equal(d.summary.gift_rate, null);
});
test("documented completion/trigger/failure events do not require a new capability manifest", () => {
  const input = setup(); input.availability.verified_events = [];
  const r = input.events[0];
  input.events.push({ ...r, event: "ad_completion", count: 3 }, { ...r, event: "ad_click_charge", count: 100 }, { ...r, event: "ad_forced_trigger", count: 2 }, { ...r, event: "balance_array_fail", count: 1 });
  const d = buildReport(context, input);
  assert.equal(d.economy.ad_completions, 3); assert.equal(d.economy.ad_forced, 2); assert.equal(d.economy.balance_fails, 1);
});
test("legacy coin rewards are separate from complete coin flows; missing deltas stay unknown", () => {
  const input = setup(); const r = input.events[0];
  input.events.push({ ...r, event: "coins_rewarded", coin_delta: 10 });
  let d = buildReport(context, input);
  assert.equal(d.economy.reported_coin_rewards, 10); assert.equal(d.economy.coins_spent, 20); assert.equal(d.economy.coins_earned, 0);
  input.events.find(r => r.event === "coin_balance_change")!.coin_delta = null;
  input.events.push({ ...r, event: "coins_rewarded", coin_delta: null });
  d = buildReport(context, input);
  assert.equal(d.economy.reported_coin_rewards, null); assert.equal(d.economy.coins_spent, null); assert.equal(d.economy.coins_earned, null);
});
test("recharge flow requires matching identity, source, flow and chronological ordering", () => {
  const input = setup(); assert.equal(buildReport(context, input).payments.recharge_funnel[3].users, 1);
  input.transactions[0].purchased_at = "2026-11-04T09:00:00Z";
  assert.equal(buildReport(context, input).payments.recharge_funnel[3].users, 0);
});
test("direct recharge-page visits are reported as missing entries, never synthesized", () => {
  const input = setup(); input.events = input.events.filter(r => r.event !== "click_mcoin_topup_entry");
  const d = buildReport(context, input); assert.equal(d.payments.missing_entry_users, 1); assert.equal(d.payments.recharge_funnel[3].users, 0);
});
test("daily and one-day summary use the same duration and activation calculations", () => {
  const c = { ...context, start: context.end, days: 1 }; const d = buildReport(c, setup());
  assert.equal(d.summary.avg_app_duration, d.daily[0].avg_app_duration); assert.equal(d.summary.activation_rate, d.daily[0].activation_rate);
});
test("feed authentication and validation reject unverified money, country codes as currency and missing IDs", () => {
  assert.equal(authorized("Bearer secret", "secret"), true); assert.equal(authorized("Bearer wrong", "secret"), false); assert.equal(authorized(null, undefined), false);
  const tx = { ...setup().transactions[0], usd_source: "RevenueCat.price", refund_usd: 0 };
  assert.equal(validateFeed({ feed: "transactions", rows: [tx] }).rows.length, 1);
  assert.throws(() => validateFeed({ feed: "transactions", rows: [{ ...tx, verified: false }] }));
  assert.throws(() => validateFeed({ feed: "transactions", rows: [{ ...tx, currency: "US" }] }));
  assert.throws(() => validateFeed({ feed: "conversations", rows: [{ event_type: "user_message" }] }));
});
test("D1 uses previous-day active users, not the installation cohort", () => {
  const input = setup(); const r = input.events[0];
  input.events.push({ ...r, event: "chat_page_view", date: "2026-11-03", user_key: "returning-user" } as Rollup);
  const d = buildReport(context, input); assert.equal(d.daily[6].d1_retention, 100);
});
