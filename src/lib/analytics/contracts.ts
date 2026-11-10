import { createHash, timingSafeEqual } from "node:crypto";

export type Feed = "conversations" | "transactions" | "products" | "identities" | "robot_aliases";
type RecordValue = Record<string, unknown>;
const allowed: Feed[] = ["conversations", "transactions", "products", "identities", "robot_aliases"];
const string = (r: RecordValue, key: string, nullable = false): string | null => {
  const v = r[key]; if (nullable && (v === null || v === undefined || v === "")) return null;
  if (typeof v !== "string" || !v.trim() || v.length > 500) throw new Error(`Invalid ${key}`);
  return v;
};
const timestamp = (r: RecordValue, key: string, nullable = false) => {
  const v = string(r, key, nullable); if (v === null) return null;
  if (!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v))) throw new Error(`Invalid timestamp: ${key}`);
  return new Date(v).toISOString();
};
const member = (r: RecordValue, key: string, values: string[], nullable = false) => {
  const v = string(r, key, nullable); if (v === null && nullable) return null;
  if (!values.includes(v!)) throw new Error(`Invalid ${key}`); return v;
};
const number = (r: RecordValue, key: string, fallback?: number) => {
  const v = r[key] ?? fallback; if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new Error(`Invalid ${key}`); return v;
};
export function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  return timingSafeEqual(createHash("sha256").update(header).digest(), createHash("sha256").update(`Bearer ${secret}`).digest());
}
export function validateFeed(payload: unknown, now = new Date()) {
  if (!payload || typeof payload !== "object") throw new Error("Expected feed and rows");
  const p = payload as RecordValue; if (!allowed.includes(p.feed as Feed)) throw new Error("Unknown feed");
  const feed = p.feed as Feed;
  if (!Array.isArray(p.rows) || !p.rows.length || p.rows.length > 250) throw new Error("Supply 1–250 rows");
  const rows = p.rows.map((raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected object row");
    const r = raw as RecordValue; const ingested_at = now.toISOString();
    const dimensions = () => ({ platform: member(r, "platform", ["IOS", "ANDROID", "WEB", "UNKNOWN"]), version: string(r, "version", true) || "", country: string(r, "country") });
    switch (feed) {
      case "conversations": {
        const event_type = member(r, "event_type", ["created", "opened", "user_message", "deleted"]);
        const message_id = string(r, "message_id", event_type !== "user_message");
        if (typeof r.history_complete !== "boolean") throw new Error("history_complete must be boolean");
        return { event_id: string(r, "event_id"), conversation_id: string(r, "conversation_id"), user_key: string(r, "user_key"), robot_id: string(r, "robot_id"),
          event_type, message_id, occurred_at: timestamp(r, "occurred_at"), history_complete: r.history_complete,
          environment: member(r, "environment", ["PRODUCTION", "SANDBOX"]), ...dimensions(), ingested_at };
      }
      case "transactions": {
        if (r.verified !== true) throw new Error("Only already-verified server transactions are accepted");
        const amount = number(r, "amount"); const amount_usd = number(r, "amount_usd"); const refund_usd = number(r, "refund_usd", 0);
        const currency = string(r, "currency")!; if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be ISO 4217, e.g. USD, not US");
        const purchased_at = timestamp(r, "purchased_at")!; const updated_at = timestamp(r, "updated_at")!;
        if (updated_at < purchased_at || refund_usd > amount_usd) throw new Error("Invalid transaction state");
        const status = member(r, "status", ["paid", "refunded"]);
        if (status === "refunded" && refund_usd !== amount_usd) throw new Error("Fully refunded state requires refund_usd=amount_usd");
        return { store: string(r, "store"), transaction_id: string(r, "transaction_id"), user_key: string(r, "user_key"), product_id: string(r, "product_id"),
          amount, amount_usd, refund_usd, currency, purchased_at, updated_at, status, verified: true,
          usd_source: string(r, "usd_source"), purchase_type: member(r, "purchase_type", ["initial", "renewal", "one_time"]),
          environment: member(r, "environment", ["PRODUCTION", "SANDBOX"]), source_page: string(r, "source_page", true), flow_id: string(r, "flow_id", true), ...dimensions(), ingested_at };
      }
      case "products": {
        const kind = member(r, "kind", ["subscription", "non_subscription"]);
        const period = member(r, "period", ["weekly", "monthly", "annual"], kind !== "subscription");
        if (kind !== "subscription" && period !== null) throw new Error("Non-subscription product has no subscription period");
        return { store: string(r, "store"), product_id: string(r, "product_id"), kind, period, ingested_at };
      }
      case "identities": {
        const valid_from = timestamp(r, "valid_from")!; const valid_to = timestamp(r, "valid_to", true);
        if (valid_to && valid_to <= valid_from) throw new Error("Invalid identity validity interval");
        return { source: member(r, "source", ["ga4", "revenuecat"]), source_id: string(r, "source_id"), user_key: string(r, "user_key"), valid_from, valid_to, ingested_at };
      }
      case "robot_aliases": return { virtual_id: string(r, "virtual_id"), robot_id: string(r, "robot_id"), ingested_at };
    }
  });
  return { feed, rows };
}
