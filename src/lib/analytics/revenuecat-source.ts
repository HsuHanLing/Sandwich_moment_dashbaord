import type { AnalyticsContext } from "./context";
import { dates } from "./context.ts";

type Option = { id: string; display_name: string };
type Options = { filters?: { id: string; options: Option[] }[] };
type Chart = {
  yaxis_currency?: string; start_date?: number; end_date?: number;
  measures?: { display_name: string }[];
  unsupported_params?: { filters?: string[]; segment?: string } | null;
  values?: { cohort: number; measure: number; value: number | null; incomplete?: boolean; segment?: number }[];
};
export type RevenueCatSource = {
  source: "revenuecat_chart"; status: "ready" | "unavailable"; timezone: "UTC";
  accounting: "refund_recorded_date"; revenue: number | null; reason?: string;
  daily: { date: string; revenue: number | null; transactions: number | null; incomplete: boolean }[];
};
type Environment = Record<string, string | undefined>;
const EXCLUDED = new Set(["CN", "HK", "SG", "unknown"]);

export function revenueCatFilters(options: Options, c: AnalyticsContext, apps?: string) {
  const available = (id: string) => {
    const filter = options.filters?.find(f => f.id === id);
    if (!filter) throw new Error(`RevenueCat does not support the required ${id} filter`);
    return filter.options;
  };
  const countries = available("country");
  const selected = c.geo ? countries.find(o => o.display_name.toLowerCase() === c.geo!.trim().toLowerCase() || o.id === c.geo!.toUpperCase()) : null;
  if (c.geo && !selected) throw new Error("RevenueCat does not recognize the selected country");
  const countryIds = (selected ? [selected] : countries).map(o => o.id).filter(id => !EXCLUDED.has(id));
  if (!countryIds.length) return null; // The dashboard always excludes these countries.
  const filters = [{ name: "country", values: countryIds }];
  const add = (name: string, values: string[]) => {
    const supported = new Set(available(name).map(o => o.id));
    if (!values.every(v => supported.has(v))) throw new Error(`RevenueCat cannot apply the selected ${name} filter`);
    filters.push({ name, values });
  };
  // Charts contain ads as well as purchases; never count ads as IAP revenue.
  add("channel", ["Subscriptions", "One-Time Purchases"]);
  if (c.platform === "WEB") throw new Error("RevenueCat native-store source cannot represent the WEB filter");
  add("store", c.platform === "IOS" ? ["app_store"] : c.platform === "ANDROID" ? ["play_store"] : ["app_store", "play_store"]);
  if (c.version) add("app_version", [c.version]);
  if (apps) add("app_id", apps.split(",").map(v => v.trim()).filter(Boolean));
  return filters;
}

export function parseRevenueCat(chart: Chart, c: AnalyticsContext): RevenueCatSource {
  if (chart.yaxis_currency !== "USD") throw new Error("RevenueCat did not return USD");
  const day = (n?: number) => typeof n === "number" ? new Date(n * 1000).toISOString().slice(0, 10) : "";
  if (day(chart.start_date) !== c.start || day(chart.end_date) !== c.end) throw new Error("RevenueCat returned a different date range");
  if (chart.unsupported_params?.filters?.length || chart.unsupported_params?.segment) throw new Error("RevenueCat did not apply all requested filters");
  const revenueIndex = chart.measures?.findIndex(m => m.display_name === "Revenue") ?? -1;
  const countIndex = chart.measures?.findIndex(m => m.display_name === "Transactions") ?? -1;
  if (revenueIndex < 0 || countIndex < 0 || !Array.isArray(chart.values)) throw new Error("RevenueCat returned an unsupported revenue schema");
  const daily = dates(c).map(date => {
    const points = chart.values!.filter(p => day(p.cohort) === date);
    const value = (measure: number) => {
      const p = points.filter(p => p.measure === measure);
      if (p.length > 1 || p.some(v => v.segment !== undefined && v.segment !== null)) throw new Error("Unexpected segmented or duplicate RevenueCat values");
      return p.length === 1 && typeof p[0].value === "number" && Number.isFinite(p[0].value) ? p[0].value : null;
    };
    return { date, revenue: value(revenueIndex), transactions: value(countIndex), incomplete: points.some(p => p.incomplete) };
  });
  const revenue = daily.every(r => r.revenue !== null) ? Math.round(daily.reduce((n, r) => n + r.revenue!, 0) * 100) / 100 : null;
  return { source: "revenuecat_chart", status: revenue === null ? "unavailable" : "ready", timezone: "UTC", accounting: "refund_recorded_date", revenue, daily,
    ...(revenue === null ? { reason: "RevenueCat has missing daily revenue points" } : {}) };
}

// Cache complete contexts, including credential rotation. Failed requests are
// evicted so a permission/configuration fix can be retried immediately.
const cache = new Map<string, { at: number; result: Promise<RevenueCatSource> }>();
const optionsCache = new Map<string, { at: number; result: Promise<Options> }>();
export async function loadRevenueCat(c: AnalyticsContext, env: Environment = process.env, fetcher: typeof fetch = fetch): Promise<RevenueCatSource> {
  const unavailable = (reason: string): RevenueCatSource => ({ source: "revenuecat_chart", status: "unavailable", timezone: "UTC", accounting: "refund_recorded_date", revenue: null, daily: [], reason });
  if (!env.REVENUECAT_API_KEY || !env.REVENUECAT_PROJECT_ID) return unavailable("RevenueCat API key or project ID not configured");
  // UTC chart buckets cannot be relabelled as another report timezone.
  if (c.timezone !== "UTC") return unavailable("RevenueCat Charts uses UTC; the report timezone requires transaction-level timestamps");
  const key = JSON.stringify([c, env.REVENUECAT_PROJECT_ID, env.REVENUECAT_API_KEY, env.MOMENT_REVENUECAT_APP_IDS]);
  const prior = cache.get(key);
  if (prior && Date.now() - prior.at < 120000) return prior.result;
  const result = (async () => {
    const base = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(env.REVENUECAT_PROJECT_ID!)}/charts/revenue`;
    const get = async (url: string) => {
      const r = await fetcher(url, { headers: { Authorization: `Bearer ${env.REVENUECAT_API_KEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (!r.ok) throw new Error(`RevenueCat HTTP ${r.status}; check read permissions and project configuration`);
      return r.json();
    };
    const optionsKey = JSON.stringify([env.REVENUECAT_PROJECT_ID, env.REVENUECAT_API_KEY]);
    let optionEntry = optionsCache.get(optionsKey);
    if (!optionEntry || Date.now() - optionEntry.at > 3600000) {
      const optionRequest = get(`${base}/options`).catch(e => { optionsCache.delete(optionsKey); throw e; });
      optionEntry = { at: Date.now(), result: optionRequest };
      if (optionsCache.size >= 10) optionsCache.delete(optionsCache.keys().next().value!);
      optionsCache.set(optionsKey, optionEntry);
    }
    const filters = revenueCatFilters(await optionEntry.result, c, env.MOMENT_REVENUECAT_APP_IDS);
    if (filters === null) return { ...unavailable("Excluded country"), status: "ready" as const, revenue: 0, daily: dates(c).map(date => ({ date, revenue: 0, transactions: 0, incomplete: false })) };
    const params = new URLSearchParams({ realtime: "true", resolution: "0", start_date: c.start, end_date: c.end, currency: "USD", selectors: JSON.stringify({ revenue_type: "revenue" }), filters: JSON.stringify(filters) });
    return parseRevenueCat(await get(`${base}?${params}`), c);
  })().catch(error => {
    cache.delete(key);
    return unavailable(error instanceof Error ? error.message : "RevenueCat source unavailable");
  });
  if (cache.size >= 20) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), result });
  return result;
}
