import type { AnalyticsContext } from "./context";
import { dates, dateInZone, shiftDate } from "./context.ts";
import type { RevenueCatSource } from "./revenuecat-source";

export type Rollup = {
  date: string; event: string; user_key: string | null; install_key: string | null;
  robot_id: string | null; conversation_id: string | null; ga_session_id: string | null;
  result: string | null; action: string | null; flow_id: string | null; source_page: string | null;
  product_id?: string | null; price?: number | null; currency?: string | null;
  count: number; engagement_sec: number; battery_delta: number | null; coin_delta: number | null;
  missing_message_ids: number; missing_event_ids: number; first_at: string; last_at: string;
};
export type Install = { install_key: string; date: string; sent_dates: string[] };
export type Conversation = {
  conversation_id: string; user_key: string; robot_id: string; created_at: string | null;
  deleted_at: string | null; activity_dates: string[]; message_dates: string[];
  message_ids: string[]; history_complete: boolean;
  lifetime_messages?: number;
  platform: string; version: string; country: string;
};
export type Transaction = {
  store: string; transaction_id: string; user_key: string; product_id: string;
  purchased_at: string; updated_at: string; amount: number; currency: string;
  amount_usd: number; refund_usd?: number; verified: boolean; environment: "PRODUCTION" | "SANDBOX";
  status: "paid" | "refunded"; purchase_type: "initial" | "renewal" | "one_time";
  source_page: string | null; flow_id: string | null; platform: string; version: string; country: string;
};
export type Product = { store: string; product_id: string; kind: "subscription" | "non_subscription"; period: "weekly" | "monthly" | "annual" | null };
export type Availability = {
  events: boolean; conversations: boolean; transactions: boolean; products: boolean;
  reasons: string[]; verified_events: string[]; demo: boolean;
  errors?: { source: string; code: string; message: string }[];
};
export type Input = {
  events: Rollup[]; installs: Install[]; conversations: Conversation[];
  transactions: Transaction[]; products: Product[]; availability: Availability;
  robot_names?: Record<string, string>;
  geo?: { region: string; users: number }[];
  attributes?: { type: string; attribute: string; users: number }[];
  revenuecat?: RevenueCatSource;
};
export const RECHARGE_PAGES = ["coin_store", "coin_topup_modal"];
export const coverageSteps = [
  ["first_open", "新安裝", "New install"], ["discover_card_exposure", "卡片曝光", "Card exposure"],
  ["profile_swipe_photo", "切換角色", "Switch persona"], ["chat_page_view", "進入聊天頁", "Chat page viewed"],
  ["message_send", "發送訊息", "Message sent"], ["battery_status_change", "電量變化", "Energy changed"],
  ["virtual_profile_entry", "角色主頁", "Persona profile"], ["image_unlock_confirm", "成功解鎖", "unlock_successed"],
  ["gift_popup_open", "禮物列表", "Gift list"],
  ["gift_item_click", "選擇禮物", "Gift selected"], ["gift_send_click", "點擊贈送", "Send gift clicked"],
  ["chat_session_dispose", "刪除聊天框", "Conversation deleted"],
] as const;
const successEvents = new Set(["image_unlock_result", "gift_send_result"]);
export const sum = <T,>(rows: T[], value: (r: T) => number) => rows.reduce((n, r) => n + value(r), 0);
const unique = (values: (string | null | undefined)[]) => new Set(values.filter((v): v is string => Boolean(v))).size;
export const ratio = (numerator: number, denominator: number): number | null => denominator > 0 ? numerator / denominator * 100 : null;
export const divide = (a: number, b: number): number | null => b > 0 ? a / b : null;
export const change = (a: number | null, b: number | null): number | null => a !== null && b !== null && b !== 0 ? (a - b) / Math.abs(b) * 100 : null;
export function retention(events: Rollup[], c: AnalyticsContext) {
  const byUser = new Map<string, Set<string>>();
  for (const r of events) if (r.user_key && r.date <= c.end) {
    if (!byUser.has(r.user_key)) byUser.set(r.user_key, new Set());
    byUser.get(r.user_key)!.add(r.date);
  }
  const cohorts = [...byUser.values()].map(d => ({ days: d, first: [...d].sort()[0] }));
  return {
    cohorts: [0, 1, 3, 7, 14].map(n => {
      const eligible = cohorts.filter(v => shiftDate(v.first, n) <= c.end);
      const retained = eligible.filter(v => v.days.has(shiftDate(v.first, n))).length;
      return { day: `D${n}`, cohort_size: eligible.length, retained, rate: ratio(retained, eligible.length) };
    }),
    returning: dates(c).map(date => {
      const active = [...byUser.entries()].filter(([, d]) => d.has(date));
      const returned = active.filter(([, d]) => { const before = [...d].filter(v => v < date).sort().pop(); return before && before <= shiftDate(date, -2); });
      return { date, active_users: active.length, returning_users: returned.length,
        chat_views: sum(events.filter(r => r.date === date && r.event === "chat_page_view"), r => r.count),
        returning_chat_views: sum(events.filter(r => r.date === date && r.event === "chat_page_view" && returned.some(([u]) => u === r.user_key)), r => r.count) };
    }),
  };
}
function median(values: number[]): number | null {
  const v = [...values].sort((a, b) => a - b); const n = v.length;
  return n ? n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2 : null;
}
// Legacy message_send is defined as a successful send in the supplied event
// contract (Sandwitch version Event!C25:F25); result was not a required field.
// Explicit failure results are still excluded. These are reported App events,
// not a claim of unique messages verified against the backend.
function valid(r: Rollup) { return successEvents.has(r.event) ? r.result === "success" : r.event === "message_send" ? r.result === null || r.result === "success" : true; }
function matches(row: { platform: string; version: string; country: string }, c: AnalyticsContext) {
  return (!c.platform || row.platform === c.platform) && (!c.version || row.version === c.version) && (!c.geo || row.country === c.geo) && !["China", "Hong Kong", "Singapore"].includes(row.country);
}
const inRange = (date: string, c: AnalyticsContext) => date >= c.start && date <= c.end;

export function buildReport(c: AnalyticsContext, input: Input) {
  const { availability: a } = input;
  const events = input.events.filter(r => inRange(r.date, c));
  const users = (event?: string, rows = events) => unique(rows.filter(r => (!event || r.event === event) && valid(r)).map(r => r.user_key));
  const count = (event: string, rows = events) => sum(rows.filter(r => r.event === event && valid(r)), r => Number(r.count));
  const supported = (event: string) => a.events && (a.verified_events.includes(event) || event === "gift_send_result" || !successEvents.has(event));
  const eventCount = (event: string, rows = events) => supported(event) ? count(event, rows) : null;
  const active = users();
  const eventUsers = (event: string) => new Set(events.filter(r => r.event === event && valid(r) && r.user_key).map(r => r.user_key!));
  const intersection = (left: Set<string>, right: Set<string>) => [...left].filter(u => right.has(u)).length;
  const chatUsers = eventUsers("message_send"); const exposedUsers = eventUsers("discover_card_exposure");
  const allDayUsers = (date: string) => new Set(input.events.filter(r => r.date === date && r.user_key).map(r => r.user_key!));
  const installs = input.installs.filter(r => inRange(r.date, c));
  const activated = unique(installs.filter(r => r.sent_dates.some(d => inRange(d, c))).map(r => r.install_key));
  const activationReady = a.events;
  const appSessions = new Map<string, number>();
  for (const r of events) if (r.install_key && r.ga_session_id) {
    const key = `${r.install_key}:${r.ga_session_id}`;
    appSessions.set(key, (appSessions.get(key) || 0) + Number(r.engagement_sec));
  }
  const conversations = input.conversations.filter(r => matches(r, c) && r.activity_dates.some(d => inRange(d, c)) && (!r.created_at || dateInZone(new Date(r.created_at), c.timezone) <= c.end));
  const sessionRows = conversations.map(r => ({ ...r, messages: r.lifetime_messages ?? unique(r.message_ids.filter((_, i) => r.message_dates[i] <= c.end)) }));
  const unknown = sessionRows.filter(r => !r.history_complete || !r.created_at).length;
  const completeSessions = a.conversations && unknown === 0;
  const disposed = conversations.filter(r => r.deleted_at && inRange(dateInZone(new Date(r.deleted_at), c.timezone), c));
  const sessionCount = a.conversations ? conversations.length : null;
  const sessionRate = (fn: (n: number) => boolean) => completeSessions ? ratio(sessionRows.filter(r => fn(r.messages)).length, conversations.length) : null;

  // One immutable transaction key, latest verified state as of the requested end.
  const txMap = new Map<string, Transaction>();
  for (const t of input.transactions) {
    if (!t.verified || t.environment !== "PRODUCTION" || dateInZone(new Date(t.updated_at), c.timezone) > c.end) continue;
    const key = `${t.store}:${t.transaction_id}`; const previous = txMap.get(key);
    if (!previous || Date.parse(t.updated_at) > Date.parse(previous.updated_at)) txMap.set(key, t);
  }
  const transactions = [...txMap.values()].filter(t => matches(t, c) && inRange(dateInZone(new Date(t.purchased_at), c.timezone), c) && t.amount_usd > 0);
  const net = (t: Transaction) => t.amount_usd - (t.refund_usd || 0);
  const paid = transactions.filter(t => t.status === "paid" && net(t) > 0);
  const catalog = new Map(input.products.map(p => [`${p.store}:${p.product_id}`, p]));
  const productReady = a.products && paid.every(t => { const p = catalog.get(`${t.store}:${t.product_id}`); return p && (p.kind !== "subscription" || p.period); });
  const classify = (t: Transaction) => {
    const product = catalog.get(`${t.store}:${t.product_id}`);
    if (!product) return "unknown";
    if (product.kind === "subscription") return "subscription";
    if (t.source_page && RECHARGE_PAGES.includes(t.source_page)) return "recharge";
    return t.source_page ? "bundle" : "unknown";
  };
  const paymentReady = a.transactions;
  const revenueSource = paymentReady ? "verified_ledger" : input.revenuecat?.status === "ready" ? "revenuecat_chart" : null;
  const revenue = paymentReady ? sum(paid, net) : input.revenuecat?.revenue ?? null;
  const payers = paymentReady ? unique(paid.map(t => t.user_key)) : null;
  const subs = paid.filter(t => classify(t) === "subscription");
  const subRows = (["weekly", "monthly", "annual"] as const).map(period => {
    const rows = subs.filter(t => catalog.get(`${t.store}:${t.product_id}`)?.period === period);
    const initial = rows.filter(t => t.purchase_type === "initial");
    const renewal = rows.filter(t => t.purchase_type === "renewal");
    return { period, users: unique(rows.map(t => t.user_key)), initial_users: unique(initial.map(t => t.user_key)), renewal_users: unique(renewal.map(t => t.user_key)),
      purchases: rows.length, initial_purchases: initial.length, renewal_purchases: renewal.length,
      conversion: ratio(unique(rows.map(t => t.user_key)), active), revenue: sum(rows, net) };
  });
  const productRows = [...new Set(subs.map(t => `${t.store}:${t.product_id}`))].map(key => {
    const rows = subs.filter(t => `${t.store}:${t.product_id}` === key); const product = catalog.get(key)!;
    return { ...product, users: unique(rows.map(t => t.user_key)), initial_users: unique(rows.filter(t => t.purchase_type === "initial").map(t => t.user_key)),
      renewal_users: unique(rows.filter(t => t.purchase_type === "renewal").map(t => t.user_key)), purchases: rows.length,
      initial_purchases: rows.filter(t => t.purchase_type === "initial").length, renewal_purchases: rows.filter(t => t.purchase_type === "renewal").length,
      revenue: sum(rows, net) };
  });
  const behaviours = (rows: Rollup[]) => ({
    gifts: eventCount("gift_send_result", rows), unlocks: eventCount("image_unlock_confirm", rows),
    chat_views: eventCount("chat_page_view", rows), messages: eventCount("message_send", rows),
    profile_views: eventCount("virtual_profile_entry", rows), swipes: eventCount("profile_swipe_photo", rows),
    reports: a.events ? sum(rows.filter(r => r.event === "profile_report_action" && r.action === "report"), r => r.count) : null,
  });
  const daily = dates(c).map(date => {
    const rows = events.filter(r => r.date === date); const di = installs.filter(r => r.date === date);
    const tx = paid.filter(t => dateInZone(new Date(t.purchased_at), c.timezone) === date);
    const ds = conversations.filter(s => s.activity_dates.includes(date));
    const prior = allDayUsers(shiftDate(date, -1)); const current = allDayUsers(date);
    const duration = new Map<string, number>();
    rows.forEach(r => { if (r.install_key && r.ga_session_id) { const k = `${r.install_key}:${r.ga_session_id}`; duration.set(k, (duration.get(k) || 0) + r.engagement_sec); } });
    return { date, active_users: a.events ? users(undefined, rows) : null, new_users: a.events ? unique(di.map(i => i.install_key)) : null,
      chatters: a.events ? users("message_send", rows) : null, ...behaviours(rows),
      activation_rate: activationReady ? ratio(unique(di.filter(i => i.sent_dates.includes(date)).map(i => i.install_key)), unique(di.map(i => i.install_key))) : null,
      avg_messages: a.events ? divide(count("message_send", rows.filter(r => r.user_key !== null)), users("message_send", rows)) : null,
      avg_app_duration: a.events ? divide(sum([...duration.values()], v => v), duration.size) : null,
      deletions: a.events ? sum(rows.filter(r => r.event === "chat_session_dispose"), r => Number(r.count)) : null,
      dispose_rate: a.conversations ? ratio(ds.filter(s => s.deleted_at && dateInZone(new Date(s.deleted_at), c.timezone) === date).length, ds.length) : null,
      d1_cohort: a.events ? prior.size : null, d1_returned: a.events ? [...prior].filter(u => current.has(u)).length : null,
      d1_retention: a.events ? ratio([...prior].filter(u => current.has(u)).length, prior.size) : null,
      revenue: paymentReady ? sum(tx, net) : input.revenuecat?.daily.find(r => r.date === date)?.revenue ?? null,
      recharge_revenue: paymentReady ? sum(tx.filter(t => classify(t) === "recharge"), net) : null,
      bundle_revenue: paymentReady ? sum(tx.filter(t => classify(t) === "bundle"), net) : null,
      subscription_revenue: paymentReady ? sum(tx.filter(t => classify(t) === "subscription"), net) : null,
      unknown_revenue: paymentReady ? sum(tx.filter(t => classify(t) === "unknown"), net) : null };
  });
  const coverage = coverageSteps.map(([event, zh, en]) => ({ event, zh, en, users: supported(event) ? users(event) : null, conversion: supported(event) ? ratio(users(event), active) : null }));
  const personas = [...new Set(events.map(r => r.robot_id).filter((id): id is string => Boolean(id)))].map(robot_id => {
    const rows = events.filter(r => r.robot_id === robot_id);
    return { robot_id, name: input.robot_names?.[robot_id] || robot_id, users: users(undefined, rows), ...behaviours(rows) };
  });
  const stepUsers = (event: string, successOnly = false) => a.events ? unique(events.filter(r => r.event === event && (!successOnly || r.result === "success")).map(r => r.user_key)) : null;
  const rechargeFunnel = [
    ["click_mcoin_topup_entry", "Top-up Entry", false],
    ["coin_recharge_page_view", "Recharge Page", false],
    ["recharge_option_click", "Option Selected", false],
    ["coin_purchase_result", "Purchase Success", true],
  ].map(([event, step, successOnly]) => {
    const users = stepUsers(String(event), Boolean(successOnly));
    return { step: String(step), users, conversion: users === null ? null : ratio(users, active) };
  });
  const reasons = [...a.reasons];
  if (!completeSessions) reasons.push(a.conversations ? `${unknown} conversations have incomplete history` : "Conversation history not connected");
  if (!paymentReady) reasons.push("Verified transaction ledger not connected or coverage incomplete");
  if (revenueSource === "revenuecat_chart") reasons.push("Revenue and ARPU use RevenueCat IAP Charts (UTC, refunds on the date recorded); unique payers and purchase-page classification still require the transaction ledger");
  if (input.revenuecat?.reason && input.revenuecat.status !== "ready") reasons.push(input.revenuecat.reason);
  if (input.revenuecat?.daily.some(r => r.incomplete)) reasons.push("RevenueCat includes provisional current-day data");
  if (!a.products) reasons.push("Product catalog not connected");
  else if (!productReady) reasons.push("Some purchased products or subscription periods are missing from the catalog");
  if (events.some(r => r.event === "message_send" && r.missing_message_ids > 0)) reasons.push("Legacy message events lack unique message IDs; counts are reported telemetry");
  if (events.some(r => r.event === "message_send" && r.result === null)) reasons.push("Legacy message_send uses the documented successful-send event; no result field was required. Backend message verification remains unavailable");
  if (events.some(r => !r.robot_id && ["message_send", "chat_page_view"].includes(r.event))) reasons.push("Some persona IDs are unmapped");
  if (events.some(r => !r.user_key)) reasons.push("Some event user identities are missing; excluded from per-user averages");
  const missingCapabilities = a.events ? coverageSteps.filter(([e]) => !supported(e)).map(([e]) => e) : [];
  if (missingCapabilities.length) reasons.push(`Unverified result events: ${missingCapabilities.join(", ")}`);
  const purchases = events.filter(r => r.event === "coin_purchase_result" && r.result === "success");
  const usdPrice = (r: Rollup) => {
    if (r.price == null || !Number.isFinite(r.price)) return null;
    const currency = (r.currency || "").toUpperCase();
    // This event stores a country code (US, CN) in `currency`; the price text is already a USD amount.
    return currency === "" || currency === "USD" || /^[A-Z]{2}$/.test(currency) ? r.price : null;
  };
  const purchaseRevenue = (rows: Rollup[]) => {
    if (!a.events) return null;
    if (rows.some(r => usdPrice(r) === null)) return null;
    return Math.round(sum(rows, r => usdPrice(r)! * Number(r.count)) * 100) / 100;
  };
  const nonSubscriptionKind = (id: string | null | undefined) => /first/i.test(id || "") ? "bundle" : /coin/i.test(id || "") ? "recharge" : "unknown";
  const gaAmounts = { recharge: purchaseRevenue(purchases.filter(r => nonSubscriptionKind(r.product_id) === "recharge")), bundle: purchaseRevenue(purchases.filter(r => nonSubscriptionKind(r.product_id) === "bundle")) };
  const amounts = ["recharge", "bundle", "subscription", "unknown"].map(kind => ({ kind, revenue: kind === "recharge" || kind === "bundle" ? gaAmounts[kind] : paymentReady ? sum(paid.filter(t => classify(t) === kind), net) : null }));
  const ledgers = (prefix: string) => events.filter(r => r.event === prefix);
  const flow = (event: string, field: "battery_delta" | "coin_delta", direction: 1 | -1) => {
    if (!a.events || !a.verified_events.includes(event)) return null;
    const rows = ledgers(event);
    // Missing numeric fields are unknown, never zero-valued ledger entries.
    if (rows.some(r => r[field] === null || !Number.isFinite(r[field]))) return null;
    return sum(rows, r => Math.max(direction * r[field]!, 0));
  };
  const rewards = ledgers("coins_rewarded");
  return {
    meta: { start: c.start, end: c.end, days: c.days, timezone: c.timezone, filters: { version: c.version, platform: c.platform, geo: c.geo }, updated_at: new Date().toISOString(), demo: a.demo,
      status: reasons.length ? "partial" : "complete", reasons: [...new Set(reasons)], source_errors: a.errors || [], availability: a, revenue_source: revenueSource,
      missing: { user_keys: sum(events.filter(r => !r.user_key), r => r.count), message_ids: sum(events, r => Number(r.missing_message_ids)), event_ids: sum(events, r => Number(r.missing_event_ids)), conversation_history: a.conversations ? unknown : null,
        unmapped_persona_events: sum(events.filter(r => !r.robot_id && ["message_send", "chat_page_view"].includes(r.event)), r => r.count),
        transactions_without_source: paymentReady ? paid.filter(t => !t.source_page).length : null } },
    summary: { active_users: a.events ? active : null, dau: a.events ? sum(daily, r => r.active_users || 0) / c.days : null,
      new_users: a.events ? unique(installs.map(i => i.install_key)) : null, messages: eventCount("message_send"), chatters: a.events ? users("message_send") : null,
      avg_messages: a.events ? divide(count("message_send", events.filter(r => r.user_key !== null)), users("message_send")) : null,
      avg_app_duration: a.events ? divide(sum([...appSessions.values()], v => v), appSessions.size) : null,
      median_app_duration: a.events ? median([...appSessions.values()]) : null,
      d1_retention: a.events ? ratio(sum(daily, r => r.d1_returned || 0), sum(daily, r => r.d1_cohort || 0)) : null,
      chat_engagement: a.events ? ratio(chatUsers.size, active) : null,
      persona_to_chat: a.events ? ratio(intersection(exposedUsers, eventUsers("chat_page_view")), exposedUsers.size) : null,
      image_unlock_rate: supported("image_unlock_confirm") ? ratio(intersection(chatUsers, eventUsers("image_unlock_confirm")), chatUsers.size) : null,
      gift_rate: supported("gift_send_result") ? ratio(intersection(chatUsers, eventUsers("gift_send_result")), chatUsers.size) : null,
      activation_rate: activationReady ? ratio(activated, unique(installs.map(i => i.install_key))) : null,
      deletions: a.events ? sum(events.filter(r => r.event === "chat_session_dispose"), r => Number(r.count)) : null,
      dispose_rate: a.conversations ? ratio(disposed.length, conversations.length) : null,
      revenue, payers, arpu: revenue === null || !a.events ? null : divide(revenue, active), arppu: revenue === null || payers === null ? null : divide(revenue, payers),
      pay_rate: payers === null ? null : ratio(payers, active), membership_rate: paymentReady && productReady ? ratio(unique(subs.map(t => t.user_key)), active) : null },
    daily, coverage, behaviour: behaviours(events), personas,
    top_events: [...new Set(events.map(r => r.event))].map(event => ({ event, count: sum(events.filter(r => r.event === event), r => r.count), users: users(event) })).sort((a, b) => b.count - a.count).slice(0, 20),
    geo: input.geo || [], attributes: input.attributes || [], retention: a.events ? retention(input.events, c) : null,
    app_duration_distribution: [["<1m", 0, 60], ["1–5m", 60, 300], ["5–15m", 300, 900], ["15–30m", 900, 1800], ["30m+", 1800, Infinity]].map(([bucket, lo, hi]) => ({ bucket: String(bucket), session_count: a.events ? [...appSessions.values()].filter(n => n >= Number(lo) && n < Number(hi)).length : null })),
    chats: (() => {
      if (!a.events) return null;
      const perUser = new Map<string, number>();
      let total = 0;
      for (const r of events) if (r.event === "message_send" && valid(r)) {
        total += Number(r.count);
        if (r.user_key) perUser.set(r.user_key, (perUser.get(r.user_key) || 0) + Number(r.count));
      }
      const counts = [...perUser.values()];
      const band = (lo: number, hi: number) => counts.filter(n => n >= lo && n < hi).length;
      return { total, users: perUser.size, median: median(counts),
        light_rate: ratio(band(1, 5), perUser.size), medium_rate: ratio(band(5, 10), perUser.size), heavy_rate: ratio(counts.filter(n => n >= 10).length, perUser.size),
        distribution: [...Array.from({ length: 10 }, (_, i) => String(i + 1)), ">10"].map(bucket => ({ bucket, user_count: counts.filter(n => bucket === ">10" ? n > 10 : n === Number(bucket)).length })) };
    })(),
    sessions: { total: sessionCount, unknown: a.conversations ? unknown : null, valid: completeSessions ? sessionRows.filter(r => r.messages >= 1).length : null,
      shallow_rate: sessionRate(n => n >= 1 && n < 5), medium_rate: sessionRate(n => n >= 5 && n < 10), deep_rate: sessionRate(n => n >= 10), valid_rate: sessionRate(n => n >= 1),
      median_messages: completeSessions ? median(sessionRows.map(r => r.messages)) : null,
      distribution: [...Array.from({ length: 11 }, (_, i) => String(i)), ">10"].map(bucket => ({ bucket, session_count: completeSessions ? sessionRows.filter(r => bucket === ">10" ? r.messages > 10 : r.messages === Number(bucket)).length : null })) },
    payments: { ready: paymentReady, catalog_ready: productReady, revenuecat: input.revenuecat ?? null, amounts, subscriptions: paymentReady && productReady ? subRows : null,
      membership_funnel: [
        ...["membership_enter", "membership_select_plan", "membership_click_purchase"].map((event, i) => ({ step: ["Membership Page", "Plan Selected", "Purchase Clicked"][i], users: a.events ? users(event) : null, conversion: a.events ? ratio(users(event), active) : null })),
        { step: "Subscribed", users: paymentReady && productReady ? unique(subs.map(t => t.user_key)) : null, conversion: paymentReady && productReady ? ratio(unique(subs.map(t => t.user_key)), active) : null },
      ],
      membership_extras: ["subscription_toast_cancel", "membership_promotion_popup", "membership_promotion_click", "chat_vip_click_locked"].map(event => ({ event, users: a.events ? users(event) : null })),
      gift_funnel: ["gift_popup_open", "gift_item_click", "gift_send_result"].map((event, i) => ({ step: ["Gift Popup", "Item Selected", "Gift Delivered"][i], users: supported(event) ? users(event) : null, conversion: supported(event) ? ratio(users(event), active) : null })),
      products: paymentReady && productReady ? productRows : null, recharge_funnel: rechargeFunnel,
      missing_entry_users: null,
      refunded_transactions: paymentReady ? transactions.filter(t => t.status === "refunded").length : null },
    economy: {
      battery_charged: flow("battery_status_change", "battery_delta", 1),
      battery_consumed: flow("battery_status_change", "battery_delta", -1),
      coins_earned: flow("coin_balance_change", "coin_delta", 1),
      coins_spent: flow("coin_balance_change", "coin_delta", -1),
      // Legacy reward grants cover one purpose only; do not pass them off as
      // complete coin inflows or add them to a canonical balance-change ledger.
      reported_coin_rewards: a.events && rewards.every(r => r.coin_delta !== null && Number.isFinite(r.coin_delta)) ? sum(rewards, r => Math.max(r.coin_delta!, 0)) : null,
      ad_completions: eventCount("ad_completion"),
      ad_forced: eventCount("ad_forced_trigger"),
      unlock_attempts: eventCount("image_unlock_attempt"), unlock_successes: eventCount("image_unlock_result"),
      balance_fails: eventCount("balance_array_fail"),
    },
  };
}
export type Report = ReturnType<typeof buildReport>;
