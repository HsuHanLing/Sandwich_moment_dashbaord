/**
 * Verify RevenueCat Charts API shows ~$2.99 Play Store revenue on 2026-10-16.
 *
 * Usage (from repo root, with env set):
 *   node --env-file=.env.local scripts/verify-rc-oct16.mjs
 * or:
 *   set REVENUECAT_API_KEY=... & set REVENUECAT_PROJECT_ID=... & node scripts/verify-rc-oct16.mjs
 */

const key = process.env.REVENUECAT_API_KEY;
const projectId = process.env.REVENUECAT_PROJECT_ID;

if (!key || !projectId) {
  console.error(
    "Missing REVENUECAT_API_KEY or REVENUECAT_PROJECT_ID. Add them to .env.local and re-run."
  );
  process.exit(2);
}

const qs = new URLSearchParams({
  realtime: "true",
  resolution: "0",
  start_date: "2026-10-16",
  end_date: "2026-10-16",
  currency: "USD",
  selectors: JSON.stringify({ revenue_type: "revenue" }),
  filters: JSON.stringify([{ name: "store", values: ["play_store"] }]),
});

const url = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/charts/revenue?${qs}`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
});
const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("API error", res.status, JSON.stringify(body, null, 2).slice(0, 1000));
  process.exit(1);
}

const measures = body.measures || [];
const revIdx = measures.findIndex((m) => /revenue/i.test(m.display_name || ""));
const measureIdx = revIdx >= 0 ? revIdx : 0;
console.log(
  "measures:",
  measures.map((m, i) => `${i}:${m.display_name}`).join(", ") || "(none)"
);

let total = 0;
const values = body.values || [];
if (values.length && typeof values[0] === "object" && !Array.isArray(values[0])) {
  for (const pt of values) {
    if (pt.incomplete) continue;
    if (pt.measure != null && pt.measure !== measureIdx) continue;
    if (pt.segment != null && body.segments?.[pt.segment] && !body.segments[pt.segment].is_total) {
      // skip non-total segments if present
      if (body.segments.some((s) => s.is_total)) continue;
    }
    total += Number(pt.value || 0);
  }
} else {
  for (const row of values) {
    if (!Array.isArray(row)) continue;
    total += Number(row[measureIdx + 1] ?? row[1] ?? 0);
  }
}

console.log("2026-10-16 play_store revenue USD:", Math.round(total * 100) / 100);
if (Math.abs(total - 2.99) < 0.02) {
  console.log("OK: matches expected ~2.99");
  process.exit(0);
}
if (total > 0) {
  console.log("WARN: non-zero but not exactly 2.99 (other Play purchases that day?)");
  process.exit(0);
}
console.error("FAIL: expected ~2.99, got", total);
process.exit(1);
