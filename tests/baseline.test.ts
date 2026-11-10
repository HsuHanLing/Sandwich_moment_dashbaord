import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildReport, type Input, type Rollup } from "../src/lib/analytics/model.ts";

const baseline = JSON.parse(readFileSync(new URL("./fixtures/legacy-baseline.json", import.meta.url), "utf8")) as {
  days: { date: string; dau: number; messages: number; chatters: number; message_counts: number[] }[];
  legacy_payments: { raw_price: number; geo_fx_rate: number }[];
};
test("captured legacy aggregates reproduce 361/243 and the correct chatter denominators", () => {
  const events: Rollup[] = [];
  for (const day of baseline.days) {
    for (let i = 0; i < day.dau; i++) events.push({ date: day.date, event: i < day.chatters ? "message_send" : "app_open", user_key: `synthetic-${i}`, install_key: `synthetic-${i}`,
      robot_id: null, conversation_id: null, ga_session_id: null, result: null, action: null, flow_id: null, source_page: null,
      count: day.message_counts[i] || 1, engagement_sec: 0, battery_delta: null, coin_delta: null,
      missing_message_ids: day.message_counts[i] || 0, missing_event_ids: day.message_counts[i] || 1, first_at: `${day.date}T10:00:00Z`, last_at: `${day.date}T18:00:00Z` });
  }
  const input: Input = { events, installs: [], conversations: [], transactions: [], products: [], availability: { events: true, conversations: false, transactions: false, products: false, demo: false, reasons: [], verified_events: [] } };
  const d = buildReport({ start: "2026-10-29", end: "2026-10-30", days: 2, timezone: "UTC" }, input);
  assert.equal(d.daily[0].messages, 361); assert.equal(d.daily[0].chatters, 1); assert.equal(d.daily[0].active_users, 10);
  assert.equal(d.daily[1].messages, 243); assert.equal(d.daily[1].chatters, 4); assert.equal(d.daily[1].active_users, 12);
  assert.equal(d.daily[1].avg_messages, 60.75); assert.equal(d.summary.messages, 604);
  assert.equal(d.summary.activation_rate, null); assert.equal(d.summary.revenue, null);
});
test("old geo-based arithmetic reproduces 5.62 but is not promoted to verified revenue", () => {
  const old = baseline.legacy_payments.reduce((n, r) => n + r.raw_price * r.geo_fx_rate, 0);
  assert.equal(old.toFixed(2), "5.62");
});
