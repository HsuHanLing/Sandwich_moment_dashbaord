import type { AnalyticsContext } from "./context";
import { shiftDate } from "./context.ts";
import type { Input, Rollup, Transaction } from "./model";

export function demoInput(c: AnalyticsContext): Input {
  const events: Rollup[] = [];
  const event = (name: string, user: string, day: string, count = 1, overrides: Partial<Rollup> = {}) => {
    events.push({ date: day, event: name, user_key: user, install_key: user, robot_id: "demo-persona", conversation_id: `chat-${user}`, ga_session_id: `${day}-${user}`,
      result: "success", action: null, flow_id: user, source_page: "coin_store", count, engagement_sec: 0, battery_delta: null, coin_delta: null,
      missing_message_ids: 0, missing_event_ids: 0, first_at: `${day}T10:00:00Z`, last_at: `${day}T10:01:00Z`, ...overrides });
  };
  event("first_open", "new-user", c.start); event("message_send", "new-user", c.end, 6, { engagement_sec: 125 });
  event("chat_page_view", "returning-user", c.end, 3, { engagement_sec: 180 });
  event("message_send", "returning-user", c.end, 12); event("profile_report_action", "new-user", c.end, 2, { action: "report" });
  event("discover_card_exposure", "new-user", c.start); event("discover_card_exposure", "returning-user", c.end);
  for (const [i, name] of ["click_mcoin_topup_entry", "coin_recharge_page_view", "recharge_option_click"].entries()) event(name, "new-user", c.end, 1, { first_at: `${c.end}T11:0${i}:00Z` });
  event("gift_send_result", "new-user", c.end, 2); event("image_unlock_result", "new-user", c.end);
  event("battery_status_change", "new-user", c.end, 1, { battery_delta: -6 });
  event("coin_balance_change", "new-user", c.end, 1, { coin_delta: -20 });
  const transaction = (id: string, product_id: string, user_key: string, purchase_type: Transaction["purchase_type"], amount_usd: number): Transaction => ({
    store: "APP_STORE", transaction_id: id, user_key, product_id, purchase_type, amount_usd, amount: amount_usd, currency: "USD", purchased_at: `${c.end}T12:00:00Z`, updated_at: `${c.end}T12:00:00Z`, verified: true, environment: "PRODUCTION", status: "paid", source_page: "coin_store", flow_id: user_key, platform: "IOS", version: "demo", country: "United Kingdom",
  });
  const eventFiltersMatch = (!c.platform || c.platform === "IOS") && (!c.version || c.version === "demo") && (!c.geo || c.geo === "United Kingdom");
  return { events: eventFiltersMatch ? events : [], installs: eventFiltersMatch ? [{ date: c.start, install_key: "new-user", sent_dates: [c.end] }] : [],
    conversations: [0, 1, 2].map(i => ({ conversation_id: `chat-${i}`, user_key: i ? "new-user" : "returning-user", robot_id: "demo-persona", created_at: `${shiftDate(c.start, -20)}T09:00:00Z`, deleted_at: i === 2 ? `${c.end}T16:00:00Z` : null,
      activity_dates: [c.end], message_ids: Array.from({ length: [12, 6, 0][i] }, (_, n) => `msg-${i}-${n}`), message_dates: Array.from({ length: [12, 6, 0][i] }, () => shiftDate(c.start, -1)), history_complete: true, platform: "IOS", version: "demo", country: "United Kingdom" })),
    transactions: [transaction("topup", "coins", "new-user", "one_time", 3.99), transaction("initial", "weekly", "new-user", "initial", 2.99), transaction("renewal", "weekly", "inactive-subscriber", "renewal", 2.99)],
    products: [{ store: "APP_STORE", product_id: "weekly", kind: "subscription", period: "weekly" }, { store: "APP_STORE", product_id: "coins", kind: "non_subscription", period: null }],
    robot_names: { "demo-persona": "Demo persona / 示範角色" },
    availability: { events: true, conversations: true, transactions: true, products: true, demo: true, reasons: [], verified_events: ["chat_session_dispose", "gift_send_result", "image_unlock_result", "gift_send_click", "coin_recharge_page_view", "recharge_option_click", "click_mcoin_topup_entry", "battery_status_change", "coin_balance_change", "ad_completion", "ad_forced_trigger", "balance_array_fail"] } };
}
