import type { AnalyticsContext } from "./context";
import { dateInZone } from "./context.ts";
import { loadRevenueCat, type RevenueCatSource } from "./revenuecat-source.ts";

type Money = { currency: string; gross: number };
type Product = { id: string; app_id: string; store_identifier: string; type: string; subscription: { duration: string | null } | null };
type Sale = { id: string; customer_id: string; original_customer_id: string; product_id: string; country: string; store: string; environment: string; ownership: string; status: string; purchased_at: number; store_purchase_identifier: string; revenue_in_usd: Money };
type Subscription = Omit<Sale, "purchased_at" | "revenue_in_usd" | "store_purchase_identifier"> & { starts_at: number };
type Renewal = { id: string; purchased_at: number; product_store_identifier: string; revenue_in_usd: Money };
export type BillingSnapshot = { fetched_at: string; customer_count: number; products: Product[]; purchases: Sale[]; subscriptions: { subscription: Subscription; transactions: Renewal[] }[] };
type Environment = Record<string, string | undefined>;
const periods = { P1W: "weekly", P1M: "monthly", P1Y: "annual" } as const;

export function summarizeBilling(snapshot: BillingSnapshot, c: AnalyticsContext, chart: RevenueCatSource, apps?: string) {
  if (c.version) throw new Error("Purchase-time App version is not supplied by the customer transaction API; use the versioned transaction ledger");
  if (chart.status !== "ready" || chart.revenue === null) throw new Error("RevenueCat revenue reconciliation is unavailable");
  const products = new Map(snapshot.products.map(p => [p.id, p]));
  const appIds = apps ? new Set(apps.split(",").map(v => v.trim())) : null;
  const countries = new Intl.DisplayNames(["en"], { type: "region" });
  type Row = { key: string; store: string; owner: string; date: string; product: string; period: string | null; subscription: boolean; type: "initial" | "renewal" | "one_time"; usd: number };
  const rows = new Map<string, Row>();
  const eligible = (sale: Sale | Subscription) => {
    const p = products.get(sale.product_id);
    if (!p) throw new Error("A purchased product is absent from the RevenueCat catalog");
    if (sale.environment !== "production" || sale.ownership !== "purchased" || (appIds && !appIds.has(p.app_id))) return false;
    if (!["app_store", "play_store"].includes(sale.store)) return false;
    if (c.platform && sale.store !== ({ IOS: "app_store", ANDROID: "play_store" } as Record<string, string>)[c.platform]) return false;
    if (!/^[A-Z]{2}$/.test(sale.country)) throw new Error("A purchase has no usable purchase-country value");
    if (["CN", "HK", "SG"].includes(sale.country)) return false;
    return !c.geo || countries.of(sale.country) === c.geo || sale.country === c.geo.toUpperCase();
  };
  const add = (sale: Sale | Subscription, id: string, timestamp: number, money: Money, product: Product, type: Row["type"]) => {
    const date = dateInZone(new Date(timestamp), c.timezone);
    if (date < c.start || date > c.end) return;
    if (money?.currency !== "USD" || !Number.isFinite(money.gross)) throw new Error("A transaction has no verified USD amount");
    if (money.gross <= 0) return; // Free trials/zero-value adjustments are not payers.
    if (!id || !sale.customer_id) throw new Error("A transaction lacks a unique ID or customer identity");
    const key = `${sale.store}:${id}`;
    const row: Row = { key, store: sale.store, owner: sale.customer_id, date, product: product.store_identifier, period: product.subscription?.duration ? periods[product.subscription.duration as keyof typeof periods] || null : null, subscription: type !== "one_time", type, usd: money.gross };
    const previous = rows.get(key);
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw new Error("Conflicting duplicate transaction/owner; resolve RevenueCat transfers before counting users");
    rows.set(key, row);
  };
  for (const p of snapshot.purchases) if (eligible(p)) {
    if (p.status !== "owned") throw new Error("Purchase refund/status history requires ledger reconciliation");
    add(p, p.store_purchase_identifier, p.purchased_at, p.revenue_in_usd, products.get(p.product_id)!, "one_time");
  }
  for (const { subscription: s, transactions } of snapshot.subscriptions) if (eligible(s)) {
    const current = products.get(s.product_id)!;
    for (const t of transactions) {
      const product = snapshot.products.find(p => p.app_id === current.app_id && p.store_identifier === t.product_store_identifier);
      if (!product) throw new Error("A historical subscription product is absent from the catalog");
      add(s, t.id, t.purchased_at, t.revenue_in_usd, product, t.purchased_at === s.starts_at ? "initial" : "renewal");
    }
  }
  const all = [...rows.values()];
  // Check every date, not just the grand total: offsetting omissions/refunds may
  // otherwise cancel out. Any mismatch leaves billing metrics unavailable.
  for (const day of chart.daily) {
    const list = all.filter(r => r.date === day.date);
    if (day.revenue === null || day.transactions === null || Math.abs(list.reduce((n, r) => n + r.usd, 0) - day.revenue) > 0.005 || list.length !== day.transactions) throw new Error("Customer transaction counts/revenue do not reconcile to the filtered daily RevenueCat chart; historical refunds or country attribution need the ledger");
  }
  const unique = (list: Row[]) => new Set(list.map(r => r.owner)).size;
  const sum = (list: Row[]) => Math.round(list.reduce((n, r) => n + r.usd, 0) * 100) / 100;
  const subs = all.filter(r => r.subscription);
  const periodReady = subs.every(r => r.period);
  const subscriptions = periodReady ? Object.values(periods).map(period => {
    const list = subs.filter(r => r.period === period); const initial = list.filter(r => r.type === "initial"); const renewal = list.filter(r => r.type === "renewal");
    return { period, users: unique(list), initial_users: unique(initial), renewal_users: unique(renewal), purchases: list.length, revenue: sum(list) };
  }) : null;
  return { source: "revenuecat_customer_api" as const, fetched_at: snapshot.fetched_at, customer_count: snapshot.customer_count, identity_basis: "RevenueCat customer ID" as const, revenue: chart.revenue, daily: chart.daily,
    // No raw IDs leave the server. Cross-source App identity mapping is still
    // required for the canonical payer/active-user ratios and recharge matching.
    payers: unique(all), arppu: unique(all) ? chart.revenue / unique(all) : null, subscription_users: unique(subs), subscriptions,
    products: [...new Set(subs.map(r => `${r.store}:${r.product}`))].map(key => { const list = subs.filter(r => `${r.store}:${r.product}` === key); return { product_id: list[0].product, store: list[0].store, period: list[0].period, users: unique(list), initial_users: unique(list.filter(r => r.type === "initial")), renewal_users: unique(list.filter(r => r.type === "renewal")), purchases: list.length, revenue: sum(list) }; }),
    amounts: [{ kind: "subscription", revenue: sum(subs) }, { kind: "unknown", revenue: sum(all.filter(r => !r.subscription)) }],
    missing: { purchase_versions: true, purchase_pages: true, app_identity_mapping: true, product_periods: !periodReady },
  };
}

const snapshots = new Map<string, { at: number; result: Promise<BillingSnapshot> }>();
export async function fetchBillingSnapshot(env: Environment = process.env, fetcher: typeof fetch = fetch): Promise<BillingSnapshot> {
  const project = env.REVENUECAT_PROJECT_ID; const key = env.REVENUECAT_API_KEY;
  if (!project || !key) throw new Error("RevenueCat project or API key not configured");
  const limit = Number(env.MOMENT_REVENUECAT_CUSTOMER_LIMIT || 500);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("Live billing customer limit must be between 1 and 500; larger projects require a scheduled ledger export");
  const cacheKey = JSON.stringify([project, key]); const previous = snapshots.get(cacheKey);
  if (previous && Date.now() - previous.at < 1800000) return previous.result;
  const base = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(project)}`;
  const abort = new AbortController();
  const deadline = AbortSignal.timeout(250000);
  let nextAt = 0;
  const list = async <T,>(path: string): Promise<T[]> => {
    const items: T[] = []; const visited = new Set<string>();
    while (path) {
      abort.signal.throwIfAborted(); deadline.throwIfAborted();
      const url = new URL(path.startsWith("/") ? `https://api.revenuecat.com${path}` : path, base + "/");
      if (url.origin !== "https://api.revenuecat.com" || !url.pathname.startsWith(`/v2/projects/${encodeURIComponent(project)}/`) || visited.has(url.href) || visited.size >= 100) throw new Error("Invalid or incomplete RevenueCat pagination");
      visited.add(url.href);
      const slot = Math.max(Date.now(), nextAt); nextAt = slot + 170;
      if (slot > Date.now()) await new Promise(resolve => setTimeout(resolve, slot - Date.now()));
      abort.signal.throwIfAborted();
      const r = await fetcher(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.any([abort.signal, deadline, AbortSignal.timeout(20000)]), cache: "no-store" });
      if (!r.ok) throw new Error(`RevenueCat billing HTTP ${r.status}; verify customer, purchase, subscription and product read permissions`);
      const d = await r.json();
      if (!Array.isArray(d.items)) throw new Error("Incomplete RevenueCat list response");
      items.push(...d.items); path = d.next_page || "";
      if (url.pathname.endsWith("/customers") && items.length > limit) throw new Error("RevenueCat customer count exceeds the bounded live-query limit; connect a scheduled ledger export");
    }
    return items;
  };
  const result = (async () => {
    const [products, customers] = await Promise.all([list<Product>(base + "/products?limit=100"), list<{ id: string }>(base + "/customers?limit=100")]);
    const snapshot: BillingSnapshot = { fetched_at: "", customer_count: customers.length, products, purchases: [], subscriptions: [] };
    let cursor = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (cursor < customers.length) {
        const c = customers[cursor++];
        const path = `${base}/customers/${encodeURIComponent(c.id)}`;
        const [purchases, subscriptions] = await Promise.all([list<Sale>(path + "/purchases?limit=100&environment=production"), list<Subscription>(path + "/subscriptions?limit=100&environment=production")]);
        snapshot.purchases.push(...purchases);
        for (const subscription of subscriptions) snapshot.subscriptions.push({ subscription, transactions: await list<Renewal>(`${base}/subscriptions/${encodeURIComponent(subscription.id)}/transactions?limit=100`) });
      }
    }));
    snapshot.fetched_at = new Date().toISOString(); return snapshot;
  })().catch(error => { abort.abort(); snapshots.delete(cacheKey); throw error; });
  if (snapshots.size >= 3) snapshots.delete(snapshots.keys().next().value!);
  snapshots.set(cacheKey, { at: Date.now(), result });
  return result;
}

export async function loadBilling(c: AnalyticsContext) {
  if (c.version) throw new Error("Purchase-time App version requires the versioned transaction ledger");
  const [snapshot, chart] = await Promise.all([fetchBillingSnapshot(), loadRevenueCat(c)]);
  return summarizeBilling(snapshot, c, chart, process.env.MOMENT_REVENUECAT_APP_IDS);
}
export type BillingReport = ReturnType<typeof summarizeBilling>;
