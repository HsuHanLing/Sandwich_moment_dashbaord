export type Filters = { version?: string; platform?: string; geo?: string };
export type AnalyticsContext = Filters & { start: string; end: string; timezone: string; days: number };

export function dateInZone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(k => parts.find(p => p.type === k)!.value).join("-");
}
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function dates(context: Pick<AnalyticsContext, "start" | "end">): string[] {
  const result: string[] = [];
  for (let d = context.start; d <= context.end; d = shiftDate(d, 1)) result.push(d);
  return result;
}
export function parseContext(params: URLSearchParams, now = new Date()): AnalyticsContext {
  const timezone = process.env.MOMENT_REPORT_TIME_ZONE || "UTC";
  const today = dateInZone(now, timezone); // Invalid configured zones fail loudly.
  const mode = params.get("mode");
  const rawDays = params.get("days") ?? (mode === "today" ? "1" : mode === "7d" ? "7" : "30");
  if (!/^\d+$/.test(rawDays)) throw new Error("days must be an integer");
  const requestedDays = Number(rawDays);
  if (requestedDays < 1 || requestedDays > 90) throw new Error("days must be between 1 and 90");
  const end = params.get("end") || today;
  const start = params.get("start") || shiftDate(end, 1 - requestedDays);
  for (const date of [start, end]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("Invalid date");
  }
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (days < 1 || days > 90 || end > today) throw new Error("Select 1–90 days, ending no later than today");
  const clean = (key: string) => { const v = params.get(key); if (v && v.length > 100) throw new Error("Invalid filter"); return v && v !== "all" ? v : undefined; };
  const platform = clean("platform");
  if (platform && !["IOS", "ANDROID", "WEB"].includes(platform)) throw new Error("Invalid platform");
  return { start, end, days, timezone, version: clean("version"), geo: clean("geo"), platform };
}
export function previousContext(context: AnalyticsContext): AnalyticsContext {
  const end = shiftDate(context.start, -1);
  return { ...context, end, start: shiftDate(end, 1 - context.days) };
}
