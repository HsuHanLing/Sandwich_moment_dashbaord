import { bigquery } from "@/lib/bigquery";
import { buildReport, type Availability, type Input, type Rollup, type Install, type Conversation, type Product, type Transaction } from "./model";
import type { AnalyticsContext } from "./context";
import { eventQuery, conversationQuery, transactionQuery, identifier, queryParameters } from "./sql";
import robotNames from "./robot-names.json";
import { demoInput } from "./demo";

function covers(prefix: string, c: AnalyticsContext): boolean {
  const from = process.env[`${prefix}_COMPLETE_FROM`]; const through = process.env[`${prefix}_COMPLETE_THROUGH`];
  return Boolean(from && through && from <= c.start && through >= c.end);
}
async function load(c: AnalyticsContext, historyDays: number) {
  if (process.env.MOMENT_DEMO === "true") return buildReport(c, demoInput(c));
  const a: Availability = { events: false, conversations: false, transactions: false, products: false, reasons: [], verified_events: covers("MOMENT_VERIFIED_EVENTS", c) ? (process.env.MOMENT_VERIFIED_EVENTS || "").split(",").filter(Boolean) : [], demo: false };
  if (!process.env.MOMENT_REPORT_TIME_ZONE) a.reasons.push("Report timezone not configured; UTC assumed");
  const input: Input = { events: [], installs: [], conversations: [], transactions: [], products: [], availability: a, robot_names: robotNames };
  const query = async <T,>(sql: string) => (await bigquery.query({ query: sql, params: queryParameters(c, historyDays), maximumBytesBilled: process.env.MOMENT_MAXIMUM_BYTES_BILLED || "2000000000" }))[0] as T[];
  const task = async (name: string, fn: () => Promise<void>) => { try { await fn(); } catch (e) { console.error(`Moment ${name} query failed`, e instanceof Error ? e.message : "Unknown error"); a.reasons.push(`${name} source unavailable; check server logs and configuration`); } };
  const eventTable = process.env.MOMENT_EVENTS_TABLE || (process.env.GOOGLE_CLOUD_PROJECT && process.env.BIGQUERY_DATASET ? `${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.${process.env.BIGQUERY_TABLE || "events_*"}` : undefined);
  await Promise.all([
    task("Events", async () => {
      if (!eventTable) { a.reasons.push("GA4 events table not configured"); return; }
      const [r] = await query<{ events: Rollup[]; installs: Install[]; geo: Input["geo"]; attributes: Input["attributes"] }>(eventQuery(eventTable, process.env.MOMENT_IDENTITIES_TABLE, process.env.MOMENT_ROBOT_ALIASES_TABLE));
      input.events = r?.events || []; input.installs = r?.installs || []; input.geo = r?.geo || []; input.attributes = r?.attributes || []; a.events = true;
    }),
    task("Conversations", async () => {
      const table = process.env.MOMENT_CONVERSATIONS_TABLE;
      if (!table || !covers("MOMENT_CONVERSATIONS", c)) return;
      input.conversations = await query<Conversation>(conversationQuery(table)); a.conversations = true;
    }),
    task("Transactions", async () => {
      const table = process.env.MOMENT_TRANSACTIONS_TABLE;
      if (!table || !covers("MOMENT_TRANSACTIONS", c)) return;
      input.transactions = await query<Transaction>(transactionQuery(table));
      if (input.transactions.some(t => !Number.isFinite(t.amount_usd) || !t.user_key || (c.version && !t.version))) throw new Error("Incomplete transaction amounts, identity or version");
      a.transactions = true;
    }),
    task("Products", async () => {
      const table = process.env.MOMENT_PRODUCTS_TABLE;
      if (!table) return;
      input.products = await query<Product>(`SELECT store,product_id,kind,period FROM ${identifier(table)} QUALIFY ROW_NUMBER() OVER(PARTITION BY store,product_id ORDER BY ingested_at DESC)=1`); a.products = true;
    }),
  ]);
  return buildReport(c, input);
}

const cache = new Map<string, { at: number; result: ReturnType<typeof load> }>();
export function loadReport(c: AnalyticsContext, historyDays = 1) {
  const key = JSON.stringify([c, historyDays]); const existing = cache.get(key);
  if (existing && Date.now() - existing.at < 30000) return existing.result;
  if (cache.size >= 20) cache.delete(cache.keys().next().value!);
  const result = load(c, historyDays).catch(e => { cache.delete(key); throw e; });
  cache.set(key, { at: Date.now(), result }); return result;
}
