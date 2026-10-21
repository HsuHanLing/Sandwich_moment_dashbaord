/**
 * RevenueCat Charts API v2 client for subscription revenue metrics.
 * Docs: https://www.revenuecat.com/docs/api-v2/charts-and-metrics
 */

import { unstable_cache } from "next/cache";

const RC_BASE = "https://api.revenuecat.com/v2";
const CACHE_SEC = 120;

export type RcFilters = {
  platform?: string;
  geo?: string;
};

type ChartFilter = { name: string; values: string[] };

type ChartMeasure = {
  display_name?: string;
  unit?: string;
  description?: string;
};

type ChartSegment = {
  display_name?: string;
  is_total?: boolean;
  is_other?: boolean;
};

type ChartValuePoint = {
  cohort?: number;
  measure?: number;
  value?: number | null;
  incomplete?: boolean;
  segment?: number;
};

type ChartDataResponse = {
  object?: string;
  measures?: ChartMeasure[];
  segments?: ChartSegment[];
  values?: ChartValuePoint[] | number[][];
  resolution?: string;
};

function apiKey(): string | undefined {
  return process.env.REVENUECAT_API_KEY || undefined;
}

function projectId(): string | undefined {
  return process.env.REVENUECAT_PROJECT_ID || undefined;
}

export function isRevenueCatConfigured(): boolean {
  return Boolean(apiKey() && projectId());
}

/** Map dashboard platform filter → RevenueCat store filter values. */
function storeFilterValues(platform?: string): string[] | null {
  if (!platform || platform === "all") return null;
  const p = platform.toUpperCase();
  if (p === "ANDROID") return ["play_store"];
  if (p === "IOS") return ["app_store"];
  return null;
}

/** Map GA4-style country names (and ISO codes) → ISO-3166 alpha-2 for RC. */
const COUNTRY_TO_ISO: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "GB",
  "South Africa": "ZA",
  Canada: "CA",
  India: "IN",
  Hungary: "HU",
  Japan: "JP",
  France: "FR",
  Germany: "DE",
  Philippines: "PH",
  Ukraine: "UA",
  Mexico: "MX",
  Australia: "AU",
  Argentina: "AR",
  Chile: "CL",
  Thailand: "TH",
  "Saudi Arabia": "SA",
  Nigeria: "NG",
  Iran: "IR",
  Ireland: "IE",
  Brazil: "BR",
  Spain: "ES",
  Italy: "IT",
  "South Korea": "KR",
  Korea: "KR",
  Taiwan: "TW",
  "Hong Kong": "HK",
  China: "CN",
  Singapore: "SG",
};

function countryIso(geo?: string): string | null {
  if (!geo || geo === "all") return null;
  if (/^[A-Z]{2}$/i.test(geo)) return geo.toUpperCase();
  return COUNTRY_TO_ISO[geo] || null;
}

function buildFilters(filters?: RcFilters): ChartFilter[] {
  const out: ChartFilter[] = [];
  const stores = storeFilterValues(filters?.platform);
  if (stores) out.push({ name: "store", values: stores });
  const iso = countryIso(filters?.geo);
  if (iso) out.push({ name: "country", values: [iso] });
  return out;
}

function dateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - Math.max(days - 1, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function cohortToDate(cohort: number): string {
  // cohort is Unix seconds (or ms) of period start
  const ms = cohort > 1e12 ? cohort : cohort * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function findMeasureIndex(measures: ChartMeasure[] | undefined, patterns: RegExp[]): number {
  if (!measures?.length) return 0;
  for (const re of patterns) {
    const i = measures.findIndex((m) => re.test(m.display_name || ""));
    if (i >= 0) return i;
  }
  return 0;
}

async function fetchChartRaw(params: {
  chart: string;
  startDate: string;
  endDate: string;
  resolution?: string;
  currency?: string;
  selectors?: Record<string, string>;
  filters?: ChartFilter[];
  segment?: string;
}): Promise<ChartDataResponse | null> {
  const key = apiKey();
  const pid = projectId();
  if (!key || !pid) return null;

  const qs = new URLSearchParams();
  qs.set("realtime", "true");
  qs.set("resolution", params.resolution ?? "0");
  qs.set("start_date", params.startDate);
  qs.set("end_date", params.endDate);
  qs.set("currency", params.currency ?? "USD");
  if (params.selectors) qs.set("selectors", JSON.stringify(params.selectors));
  if (params.filters?.length) qs.set("filters", JSON.stringify(params.filters));
  if (params.segment) qs.set("segment", params.segment);

  const url = `${RC_BASE}/projects/${encodeURIComponent(pid)}/charts/${encodeURIComponent(params.chart)}?${qs}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    next: { revalidate: CACHE_SEC },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`RevenueCat chart ${params.chart} failed:`, res.status, body.slice(0, 500));
    return null;
  }
  return (await res.json()) as ChartDataResponse;
}

function cachedChartFetch(
  cacheKey: string[],
  params: Parameters<typeof fetchChartRaw>[0]
): Promise<ChartDataResponse | null> {
  return unstable_cache(
    async () => fetchChartRaw(params),
    ["revenuecat-chart", ...cacheKey],
    { revalidate: CACHE_SEC }
  )();
}

function parseDailyMeasure(
  data: ChartDataResponse | null,
  measurePatterns: RegExp[]
): Map<string, number> {
  const map = new Map<string, number>();
  if (!data?.values || !Array.isArray(data.values)) return map;

  const measureIdx = findMeasureIndex(data.measures, measurePatterns);
  const values = data.values;

  // Flat object points (Charts v3)
  if (values.length > 0 && typeof values[0] === "object" && !Array.isArray(values[0])) {
    const hasSegments = Boolean(data.segments?.length);
    const hasTotal = hasSegments && data.segments!.some((s) => s.is_total);
    for (const pt of values as ChartValuePoint[]) {
      if (pt.incomplete) continue;
      if (pt.measure != null && pt.measure !== measureIdx) continue;
      if (pt.cohort == null || pt.value == null || Number.isNaN(Number(pt.value))) continue;
      if (hasSegments && pt.segment != null) {
        const seg = data.segments![pt.segment];
        if (hasTotal) {
          if (!seg?.is_total) continue;
        } else if (seg?.is_other) {
          continue;
        }
      }
      map.set(cohortToDate(pt.cohort), Number(pt.value));
    }
    return map;
  }

  // Legacy nested arrays: [[ts, v0, v1, ...], ...]
  for (const row of values as number[][]) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const [ts, ...rest] = row;
    const v = rest[measureIdx] ?? rest[0];
    if (ts == null || v == null || Number.isNaN(Number(v))) continue;
    map.set(cohortToDate(Number(ts)), Number(v));
  }
  return map;
}

/** Sum measure values per segment (skip Total / Other). */
function parseSegmentedTotals(
  data: ChartDataResponse | null,
  measurePatterns: RegExp[],
  transactionPatterns?: RegExp[]
): { product_id: string; revenue_usd: number; purchases: number }[] {
  if (!data?.values || !data.segments?.length) return [];

  const revIdx = findMeasureIndex(data.measures, measurePatterns);
  const txIdx = transactionPatterns
    ? findMeasureIndex(data.measures, transactionPatterns)
    : -1;

  const revenueBySeg = new Map<number, number>();
  const txBySeg = new Map<number, number>();

  const values = data.values;
  if (values.length > 0 && typeof values[0] === "object" && !Array.isArray(values[0])) {
    for (const pt of values as ChartValuePoint[]) {
      if (pt.incomplete || pt.segment == null || pt.value == null) continue;
      const seg = data.segments[pt.segment];
      if (!seg || seg.is_total || seg.is_other) continue;
      if (pt.measure === revIdx) {
        revenueBySeg.set(pt.segment, (revenueBySeg.get(pt.segment) || 0) + Number(pt.value));
      } else if (txIdx >= 0 && pt.measure === txIdx) {
        txBySeg.set(pt.segment, (txBySeg.get(pt.segment) || 0) + Number(pt.value));
      }
    }
  }

  const rows: { product_id: string; revenue_usd: number; purchases: number }[] = [];
  for (const [segIdx, revenue] of revenueBySeg) {
    const name = data.segments[segIdx]?.display_name || `(segment ${segIdx})`;
    rows.push({
      product_id: name,
      revenue_usd: Math.round(revenue * 100) / 100,
      purchases: Math.round(txBySeg.get(segIdx) || 0),
    });
  }
  rows.sort((a, b) => b.revenue_usd - a.revenue_usd);
  return rows;
}

function mapToSortedRows(map: Map<string, number>, valueKey: "revenue" | "count") {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) =>
      valueKey === "revenue"
        ? { date, revenue: Math.round(value * 100) / 100 }
        : { date, count: Math.round(value) }
    );
}

export async function getDailySubscriptionRevenue(
  days: number,
  filters?: RcFilters
): Promise<{ date: string; revenue: number }[]> {
  if (!isRevenueCatConfigured()) return [];
  const { startDate, endDate } = dateRange(days);
  const chartFilters = buildFilters(filters);
  const data = await cachedChartFetch(
    ["revenue", startDate, endDate, JSON.stringify(chartFilters)],
    {
      chart: "revenue",
      startDate,
      endDate,
      resolution: "0",
      currency: "USD",
      selectors: { revenue_type: "revenue" },
      filters: chartFilters,
    }
  );
  const map = parseDailyMeasure(data, [/^revenue$/i, /gross/i, /revenue/i]);
  return mapToSortedRows(map, "revenue") as { date: string; revenue: number }[];
}

export async function getDailyNewPaidSubscriptions(
  days: number,
  filters?: RcFilters
): Promise<{ date: string; count: number }[]> {
  if (!isRevenueCatConfigured()) return [];
  const { startDate, endDate } = dateRange(days);
  const chartFilters = buildFilters(filters);
  const data = await cachedChartFetch(
    ["actives_new", startDate, endDate, JSON.stringify(chartFilters)],
    {
      chart: "actives_new",
      startDate,
      endDate,
      resolution: "0",
      currency: "USD",
      filters: chartFilters,
    }
  );
  const map = parseDailyMeasure(data, [
    /new\s*paid/i,
    /new\s*paying/i,
    /actives?\s*new/i,
    /subscriptions?/i,
  ]);
  return mapToSortedRows(map, "count") as { date: string; count: number }[];
}

export async function getSubscriptionRevenueByProduct(
  days: number,
  filters?: RcFilters
): Promise<{ product_id: string; revenue_usd: number; purchases: number }[]> {
  if (!isRevenueCatConfigured()) return [];
  const { startDate, endDate } = dateRange(days);
  const chartFilters = buildFilters(filters);
  const data = await cachedChartFetch(
    ["revenue-by-product", startDate, endDate, JSON.stringify(chartFilters)],
    {
      chart: "revenue",
      startDate,
      endDate,
      resolution: "0",
      currency: "USD",
      selectors: { revenue_type: "revenue" },
      filters: chartFilters,
      segment: "product_id",
    }
  );
  return parseSegmentedTotals(
    data,
    [/^revenue$/i, /gross/i, /revenue/i],
    [/transaction/i, /purchases?/i, /#/]
  );
}

/** Sum subscription revenue over the last `days` (inclusive window). */
export async function getSubscriptionRevenueTotal(
  days: number,
  filters?: RcFilters
): Promise<number> {
  const rows = await getDailySubscriptionRevenue(days, filters);
  return Math.round(rows.reduce((s, r) => s + r.revenue, 0) * 100) / 100;
}

/** Sum new paid subscriptions over the last `days`. */
export async function getNewPaidSubscriptionsTotal(
  days: number,
  filters?: RcFilters
): Promise<number> {
  const rows = await getDailyNewPaidSubscriptions(days, filters);
  return rows.reduce((s, r) => s + r.count, 0);
}

/** Lookup helper: merge RC daily revenue into a Map for join by date. */
export function revenueByDateMap(
  rows: { date: string; revenue: number }[]
): Map<string, number> {
  return new Map(rows.map((r) => [r.date, r.revenue]));
}
