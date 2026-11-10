import { readFile, writeFile } from "node:fs/promises";
import { reconcileRevenueCat } from "../src/lib/analytics/reconcile.ts";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: npm run reconcile:revenuecat -- inbox-and-context.json normalized.json");
const data = reconcileRevenueCat(JSON.parse(await readFile(input, "utf8")));
await writeFile(output, JSON.stringify(data, null, 2));
console.log(`Reconciled ${data.rows.length} transaction state rows. Pending: ${data.pending.length}. No remote data written.`);
if (data.pending.length) process.exitCode = 2;
