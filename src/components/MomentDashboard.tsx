"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";
import type { Report } from "@/lib/analytics/model";
import { change } from "@/lib/analytics/model";
import type { BillingReport } from "@/lib/analytics/revenuecat-billing";

type Data = Report & { previous: Report["summary"] | null; billing?: BillingReport };
type Range = { days: number; end: string };
const RangeContext = createContext<{ ranges: Record<string, Range>; setRange: (key: string, range: Range) => void } | null>(null);
type Filters = { version: string; platform: string; geo: string };
type Row = Record<string, unknown>;
type Column = { key: string; title: string; format?: "money" | "percent" | "decimal"; note?: string };
const COLORS = ["#49a44c", "#818cf8", "#f59e0b", "#f472b6", "#38bdf8", "#a3e635", "#fb7185", "#94a3b8"];
const axisTick = { fontSize: 11, fill: "var(--secondary-text)" };
const tipStyle = { contentStyle: { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "var(--foreground)" } };
const memory = new Map<string, { data: Data; at: number }>();
const billingMemory = new Map<string, { data: BillingReport; at: number }>();
const labels = { overview: ["概覽", "Overview"], activation: ["行為覆蓋", "Behaviour coverage"], sessions: ["聊天次數", "Chat counts"], behaviour: ["行為", "Behaviour"], retention: ["留存", "Retention"], monetisation: ["商業化", "Monetisation"] };
type Tab = keyof typeof labels;

function useReport(endpoint: string, range: Range, filters: Filters, compare = false) {
  const key = useMemo(() => {
    const params = new URLSearchParams({ schema: "2", days: String(range.days), ...filters });
    if (range.end) params.set("end", range.end);
    if (compare) params.set("compare", "true");
    return `/api/moment/${endpoint}?${params}`;
  }, [endpoint, range.days, range.end, filters, compare]);
  const [state, setState] = useState<{ key: string; data: Data | null; error: string; loading: boolean }>({ key: "", data: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    const cached = memory.get(key);
    const request = cached && Date.now() - cached.at < 30000 ? Promise.resolve(cached.data) : fetch(key, { signal: controller.signal, cache: "no-store" }).then(async r => {
      const body = await r.json(); if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`); return body as Data;
    });
    request.then(data => { if (live) { memory.set(key, { data, at: Date.now() }); setState({ key, data, error: "", loading: false }); } })
      .catch(e => { if (live && e.name !== "AbortError") setState({ key, data: null, error: e.message, loading: false }); });
    return () => { live = false; controller.abort(); };
  }, [key]);
  return state.key === key ? state : { key, data: null, error: "", loading: true };
}
function fmt(value: unknown, kind?: Column["format"]) {
  if (value === null || value === undefined || typeof value === "number" && !Number.isFinite(value)) return "—";
  if (typeof value !== "number") return String(value);
  if (kind === "money") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
  if (kind === "percent") return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: kind === "decimal" ? 2 : 0 }).format(value);
}
function useBilling(report: Data | null, enabled: boolean) {
  const key = enabled && report?.meta.revenue_source === "revenuecat_chart" && !report.meta.demo
    ? `/api/moment/billing?${new URLSearchParams({ start: report.meta.start, end: report.meta.end, version: report.meta.filters.version || "", platform: report.meta.filters.platform || "", geo: report.meta.filters.geo || "" })}` : "";
  const [state, setState] = useState<{ key: string; data?: BillingReport; error?: string; loading: boolean }>({ key: "", loading: false });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController(); let live = true;
    const cached = billingMemory.get(key);
    const request = cached && Date.now() - cached.at < 300000 ? Promise.resolve(cached.data) : fetch(key, { signal: controller.signal, cache: "no-store" }).then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`); return body as BillingReport; });
    request.then(data => { if (live) { if (billingMemory.size >= 20) billingMemory.delete(billingMemory.keys().next().value!); billingMemory.set(key, { at: Date.now(), data }); setState({ key, data, loading: false }); } })
      .catch(error => { if (live && error.name !== "AbortError") setState({ key, error: error.message, loading: false }); });
    return () => { live = false; controller.abort(); };
  }, [key]);
  return state.key === key ? state : { key, loading: Boolean(key) };
}
function HoverNote({ text, className, children }: { text?: string; className?: string; children: React.ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  const place = () => {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect || !text) return;
    const width = 320;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const below = window.innerHeight - rect.bottom;
    setStyle(below >= 150
      ? { position: "fixed", top: rect.bottom + 6, left, width, zIndex: 80 }
      : { position: "fixed", top: Math.max(8, rect.top - 6), left, width, transform: "translateY(-100%)", zIndex: 80 });
  };
  useEffect(() => {
    if (!style) return;
    const close = () => setStyle(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [style]);
  return <span ref={anchor} className={className} onMouseEnter={place} onMouseLeave={() => setStyle(null)} onFocus={place} onBlur={() => setStyle(null)}>
    {children}
    {style && text && createPortal(<span role="tooltip" style={style} className="pointer-events-none whitespace-pre-line rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-left text-[11px] font-normal normal-case leading-relaxed text-[var(--secondary-text)] shadow-lg">{text}</span>, document.body)}
  </span>;
}
function Hint({ text }: { text?: string }) {
  if (!text) return null;
  return <HoverNote text={text}><span tabIndex={0} className="ml-1 cursor-help text-[10px] leading-none text-[var(--secondary-text)]">ⓘ</span></HoverNote>;
}
function RankList({ rows }: { rows: { name: string; value: number; share?: number | null; note: string }[] }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return <div className="space-y-1.5">{rows.map(r => <HoverNote key={r.name} text={r.note} className="grid grid-cols-[minmax(6.5rem,11rem)_1fr_auto] items-center gap-3 py-1 text-xs">
    <span className="truncate">{r.name}</span>
    <div className="h-2.5 overflow-hidden rounded bg-[var(--background)]"><div className="h-full rounded bg-[#49a44c]" style={{ width: `${r.value > 0 ? Math.max(r.value / max * 100, 2) : 0}%` }} /></div>
    <span className="tabular-nums text-[var(--secondary-text)]">{fmt(r.value)}{r.share == null ? "" : ` · ${fmt(r.share, "percent")}`}</span>
  </HoverNote>)}</div>;
}
function SharePie({ rows, sliceNote }: { rows: { name: string; users: number }[]; sliceNote: (name: string) => string }) {
  const data = rows.filter(r => r.users > 0);
  const total = data.reduce((n, r) => n + r.users, 0) || 1;
  return <div className="h-[360px]"><ResponsiveContainer width="100%" height="100%"><PieChart>
    <Pie data={data} dataKey="users" nameKey="name" cx="50%" cy="38%" innerRadius={48} outerRadius={78} paddingAngle={1}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
    <Tooltip content={(props: { active?: boolean; payload?: ReadonlyArray<{ name?: unknown; value?: unknown }> }) => {
      const row = props.payload?.[0];
      if (!props.active || row?.name == null) return null;
      const users = Number(row.value);
      return <div className="max-w-sm whitespace-pre-line rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-[11px] leading-relaxed text-[var(--secondary-text)] shadow-lg">{`${sliceNote(String(row.name))}\n${`結果：${fmt(users)}（${(users / total * 100).toFixed(1)}%）`}`}</div>;
    }} />
    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, lineHeight: "16px" }} />
  </PieChart></ResponsiveContainer></div>;
}
function ChartBox({ title, note, height = 280, children }: { title: string; note?: string; height?: number; children: React.ReactNode }) {
  return <div className="mt-6"><h3 className="flex items-center font-semibold">{title}<Hint text={note} /></h3><div className="mt-3" style={{ height }}>{children}</div></div>;
}
function Card({ label, value, kind, note, previous }: { label: string; value: unknown; kind?: Column["format"]; note?: string; previous?: number | null; unavailable?: string }) {
  const delta = previous === undefined ? undefined : change(typeof value === "number" ? value : null, previous);
  const body = <div className="h-full rounded-xl border border-[var(--card-stroke)] bg-[var(--card-bg)] p-4">
    <div className="flex items-start justify-between gap-2 text-xs text-[var(--secondary-text)]"><span>{label}</span>{note && <span className="cursor-help text-[10px]">ⓘ</span>}</div>
    <div className="mt-2 text-2xl font-semibold tabular-nums">{fmt(value, kind)}</div>
    {delta !== undefined && <div className="mt-1 text-xs text-[var(--secondary-text)]">{delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}</div>}
  </div>;
  return note ? <HoverNote text={note} className="block h-full">{body}</HoverNote> : body;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>; }
function Table({ rows, columns }: { rows: object[]; columns: Column[] }) {
  return <div className="my-4 overflow-auto rounded-xl border border-[var(--border)]"><table className="w-full whitespace-nowrap text-left text-xs"><thead className="bg-[var(--background)]"><tr>{columns.map(c => <th key={c.key} className="px-4 py-3 font-medium"><span className="inline-flex items-center">{c.title}<Hint text={c.note} /></span></th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((row, i) => <tr key={i} className="border-t border-[var(--border)]">{columns.map(c => <td key={c.key} className="px-4 py-3 tabular-nums">{fmt((row as Row)[c.key], c.format)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="p-4 text-[var(--secondary-text)]">—</td></tr>}</tbody></table></div>;
}
function Panel({ title, note, endpoint, initialDays, filters, zh, children, compare = false }: { title: string; note?: string; endpoint: string; initialDays: number; filters: Filters; zh: boolean; compare?: boolean; children: (data: Data) => React.ReactNode }) {
  const rangeState = useContext(RangeContext)!;
  const range = rangeState.ranges[endpoint] || { days: initialDays, end: "" };
  const setRange = (value: Range) => rangeState.setRange(endpoint, value);
  const state = useReport(endpoint, range, filters, compare);
  const billing = useBilling(state.data, ["kpi", "health-dashboard", "monetisation"].includes(endpoint));
  return <section className="mb-6 rounded-2xl border border-[var(--card-stroke)] bg-[var(--card-bg)] p-4 sm:p-6" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center text-lg font-semibold">{title}<Hint text={note} /></h2><div className="flex items-center gap-3 text-xs">
      <label>{zh ? "期間" : "Period"} <select aria-label={`${title} period`} value={range.days} onChange={e => setRange({ ...range, days: Number(e.target.value) })} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">{[1, 7, 14, 30, 90].map(n => <option key={n} value={n}>{n === 1 ? zh ? "今天" : "Today" : `${n} ${zh ? "天" : "days"}`}</option>)}</select></label>
      <label>{zh ? "截至" : "Ending"} <input aria-label={`${title} end date`} type="date" value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2" /></label>
    </div></div>
    {state.loading && <p role="status" className="py-8 text-sm text-[var(--secondary-text)]">{zh ? "載入中…" : "Loading…"}</p>}
    {state.error && <p role="alert" className="my-4 rounded-xl border border-rose-400/40 p-4 text-sm">{state.error}</p>}
    {state.data && <><div className="mt-2 text-xs text-[var(--secondary-text)]">{state.data.meta.start} → {state.data.meta.end} · {state.data.meta.timezone} · {zh ? "更新" : "Updated"} {new Date(state.data.meta.updated_at).toLocaleTimeString()} {state.data.meta.demo && <strong className="ml-2 text-amber-600">DEMO / 示範資料</strong>}</div>
      {state.data.meta.source_errors.length > 0 && <div role="alert" className="my-4 rounded-xl border border-rose-400/40 p-4 text-sm">{state.data.meta.source_errors.map(e => <p key={`${e.source}:${e.code}`}>{e.source}: {e.message}</p>)}</div>}
      {billing.error && <p role="alert" className="my-4 rounded-xl border border-rose-400/40 p-4 text-sm">{billing.error}</p>}
      {children(billing.data ? { ...state.data, billing: billing.data,
        summary: { ...state.data.summary, revenue: billing.data.revenue, arpu: state.data.summary.active_users ? billing.data.revenue / state.data.summary.active_users : null,
          arppu: billing.data.arppu,
          pay_rate: state.data.summary.active_users ? billing.data.payers / state.data.summary.active_users * 100 : null,
          membership_rate: state.data.summary.active_users ? billing.data.subscription_users / state.data.summary.active_users * 100 : null },
        daily: state.data.daily.map(r => ({ ...r, revenue: billing.data!.daily.find(day => day.date === r.date)?.revenue ?? r.revenue })),
        payments: { ...state.data.payments,
          membership_funnel: state.data.payments.membership_funnel.map(row => {
            const active = state.data?.summary.active_users;
            return row.step === "Subscribed" && billing.data ? { ...row, users: billing.data.subscription_users, conversion: active ? billing.data.subscription_users / active * 100 : null } : row;
          }),
          revenuecat: state.data.payments.revenuecat ? { ...state.data.payments.revenuecat, revenue: billing.data.revenue, daily: billing.data.daily } : null },
      } : state.data)}</>}
  </section>;
}
function Missing(_props: { zh?: boolean }) { return null; }
function SubscriptionTable({ d, columns, zh }: { d: Data; columns: Column[]; zh: boolean }) {
  const rows = d.payments.subscriptions ?? d.billing?.subscriptions?.map(r => ({ ...r, conversion: d.summary.active_users ? r.users / d.summary.active_users * 100 : null }));
  return !rows ? <Missing zh={zh} /> : <Table rows={rows.map(r => ({ ...r, period: zh ? ({ weekly: "週訂閱", monthly: "月訂閱", annual: "年訂閱" } as Record<string, string>)[r.period] : r.period }))} columns={columns} />;
}

export function MomentDashboard() {
  const { locale, setLocale } = useLocale(); const zh = locale === "zh"; const text = (cn: string, en: string) => zh ? cn : en;
  const calc = (event: string, formulaZh: string, formulaEn: string) => text(`埋點：${event}\n計算：${formulaZh}`, `Event: ${event}\nCalculation: ${formulaEn}`);
  const [ranges, setRanges] = useState<Record<string, Range>>({});
  const [tab, setTab] = useState<Tab>("overview"); const [filters, setFilters] = useState<Filters>({ version: "", platform: "", geo: "" }); const [draft, setDraft] = useState<Filters>(filters);
  const [authEnabled, setAuthEnabled] = useState(false);
  useEffect(() => { fetch("/api/auth/status").then(r => r.json()).then(r => setAuthEnabled(r.enabled === true)).catch(() => {}); }, []);
  const bcols: Column[] = [
    { key: "gifts", title: text("成功送禮", "Gifts delivered"), note: calc("gift_send_result", "count(gift_send_result) WHERE result = 'success'\n這是 App 回報次數，不是後端驗證。", "count(gift_send_result) WHERE result = 'success'\nApp-reported event count, not a backend check.") },
    { key: "unlocks", title: text("確認解鎖", "Unlock confirms"), note: calc("image_unlock_confirm", "count(image_unlock_confirm)\n不是 count(image_unlock_result)。", "count(image_unlock_confirm)\nNot count(image_unlock_result).") },
    { key: "chat_views", title: text("進入聊天頁", "Chat page views"), note: calc("chat_page_view", "count(chat_page_view)", "count(chat_page_view)") },
    { key: "messages", title: text("發送訊息", "Messages sent"), note: calc("message_send", "count(message_send) WHERE result IS NULL OR result = 'success'", "count(message_send) WHERE result IS NULL OR result = 'success'") },
    { key: "profile_views", title: text("角色主頁", "Profile views"), note: calc("virtual_profile_entry", "count(virtual_profile_entry)", "count(virtual_profile_entry)") },
    { key: "swipes", title: text("切換角色", "Persona switches"), note: calc("profile_swipe_photo", "count(profile_swipe_photo)", "count(profile_swipe_photo)") },
    { key: "reports", title: text("檢舉次數", "Report events"), note: calc("profile_report_action", "count(profile_report_action) WHERE action = 'report'", "count(profile_report_action) WHERE action = 'report'") },
  ];
  const subcols: Column[] = [
    { key: "period", title: text("週期", "Period"), note: text("訂閱商品週期：週、月或年。", "Subscription period: weekly, monthly or annual.") },
    { key: "users", title: text("去重合計人數", "Distinct purchasers"), note: text("初購與續訂的顧客聯集。同一人只算一次。", "Union of initial and renewal customers. Each person counts once.") },
    { key: "initial_users", title: text("初購人數", "Initial users"), note: text("期間內第一次購買該週期的顧客。", "Customers whose first purchase of this period is in range.") },
    { key: "renewal_users", title: text("續訂人數", "Renewal users"), note: text("期間內有自動或手動續訂的顧客。", "Customers with a renewal in the period.") },
    { key: "conversion", title: text("購買人數／活躍人數", "Purchasers / active users"), format: "percent", note: text("該週期去重顧客／App 期間活躍人數。兩套身分沒有對照。", "Distinct customers for this period / App active users. The ID systems are not linked.") },
  ];
  const subscriptionNote = text("初購、續訂包含未打開 App 者；合計取聯集，比例可超過 100%。兩類人數不可直接相加。", "Includes initial purchases and renewals without an App visit. Total users are a union; ratios may exceed 100%.");
  const economyNotes: Record<string, [string, string]> = {
    battery_charged: ["埋點：battery_status_change\n計算：sum(battery_delta) WHERE battery_delta > 0", "Event: battery_status_change\nCalculation: sum(battery_delta) WHERE battery_delta > 0"],
    battery_consumed: ["埋點：battery_status_change\n計算：sum(abs(battery_delta)) WHERE battery_delta < 0", "Event: battery_status_change\nCalculation: sum(abs(battery_delta)) WHERE battery_delta < 0"],
    coins_earned: ["埋點：coin_balance_change\n計算：sum(coin_delta) WHERE coin_delta > 0", "Event: coin_balance_change\nCalculation: sum(coin_delta) WHERE coin_delta > 0"],
    coins_spent: ["埋點：coin_balance_change\n計算：sum(abs(coin_delta)) WHERE coin_delta < 0", "Event: coin_balance_change\nCalculation: sum(abs(coin_delta)) WHERE coin_delta < 0"],
    reported_coin_rewards: ["埋點：coins_rewarded\n計算：sum(delta)\n不含購買入帳。", "Event: coins_rewarded\nCalculation: sum(delta)\nPurchases are not included."],
    ad_completions: ["埋點：ad_completion\n計算：count(ad_completion)", "Event: ad_completion\nCalculation: count(ad_completion)"],
    ad_forced: ["埋點：ad_forced_trigger\n計算：count(ad_forced_trigger)", "Event: ad_forced_trigger\nCalculation: count(ad_forced_trigger)"],
    unlock_attempts: ["埋點：image_unlock_attempt\n計算：count(image_unlock_attempt)", "Event: image_unlock_attempt\nCalculation: count(image_unlock_attempt)"],
    unlock_successes: ["埋點：image_unlock_result\n計算：count(image_unlock_result) WHERE result = 'success'\n沒有這個事件時顯示 —。", "Event: image_unlock_result\nCalculation: count(image_unlock_result) WHERE result = 'success'\nShows — when that event is absent."],
    balance_fails: ["埋點：balance_array_fail\n計算：count(balance_array_fail)", "Event: balance_array_fail\nCalculation: count(balance_array_fail)"],
  };
  const stats = (d: Data, health = false) => <>
    <Grid>
      {!health && <><Card label={text("平均日活", "Average DAU")} value={d.summary.dau} kind="decimal" previous={d.previous?.dau} note={calc("任一事件", "sum(每天 count(distinct user_key)) / 天數", "sum(daily count(distinct user_key)) / days")} /><Card label={text("新安裝用戶", "New installs")} value={d.summary.new_users} note={calc("first_open", "count(distinct install_key) WHERE first_open 落在期間內", "count(distinct install_key) WHERE first_open is inside the period")} /><Card label={text("每位聊天使用者平均訊息數", "Messages per chatting user")} value={d.summary.avg_messages} kind="decimal" previous={d.previous?.avg_messages} note={calc("message_send", "count(message_send) / count(distinct user_key)\nWHERE result IS NULL OR result = 'success'", "count(message_send) / count(distinct user_key)\nWHERE result IS NULL OR result = 'success'")} /><Card label={text("平均 App 參與會話時長（秒）", "Average App engagement / GA session (s)")} value={d.summary.avg_app_duration} kind="decimal" previous={d.previous?.avg_app_duration} note={calc("engagement_time_msec", "sum(engagement_time_msec) / 1000 / count(distinct ga_session_id)", "sum(engagement_time_msec) / 1000 / count(distinct ga_session_id)")} /></>}
      <Card label={text("新安裝激活率", "New-install activation")} value={d.summary.activation_rate} kind="percent" note={calc("first_open ∩ message_send", "count(distinct install_key WHERE 期間內有成功 message_send) / count(distinct 新安裝 install_key)", "count(distinct new install_key with a successful message_send) / count(distinct new install_key)")} unavailable={d.summary.new_users === 0 ? text("本期沒有新安裝實例", "No new installs in this period") : text("安裝與發送事件尚不可用", "Install and send events unavailable")} />
      {!health && <Card label={text("活躍用戶 D1 回訪率", "Active-user D1 return rate")} value={d.summary.d1_retention} kind="percent" note={calc("任一事件", "count(distinct user_key 前一天有事件且當天也有) / count(distinct user_key 前一天有事件)\n期間按每日隊列人數加權", "count(distinct user_key active yesterday and today) / count(distinct user_key active yesterday)\nWeighted by each day's cohort")} />}
      <Card label={text("會話刪除次數", "Conversation deletions")} value={d.summary.deletions} note={calc("chat_session_dispose", "count(chat_session_dispose)\n不看 result，也不是去重人數。", "count(chat_session_dispose)\nresult is not filtered, and this is not a distinct-user count.")} unavailable={text("事件來源尚不可用", "Events source unavailable")} />
      <Card label={text("內購收入", "In-app purchase revenue")} value={d.summary.revenue} kind="money" previous={d.previous?.revenue} note={d.meta.revenue_source === "revenuecat_chart" ? d.billing ? text("RevenueCat 內購收入（USD、UTC），已逐日對帳；退款按記帳日扣除，當日數字暫定。", "RevenueCat IAP (USD, UTC), reconciled by day; refunds deducted when recorded. Current day is provisional.") : text("來源：RevenueCat 內購圖表（USD、UTC）；退款按記帳日扣除，當日數字暫定。付款明細正在讀取或待核對。", "Source: RevenueCat IAP Charts (USD, UTC); refunds deducted when recorded. Current day is provisional. Billing details loading or awaiting reconciliation.") : text("已驗證生產交易；含充值、禮包、訂閱、待歸類，扣除退款", "Verified production purchases across all categories, net of refunds")} unavailable={text("收入來源尚未可用，詳見資料狀態", "Revenue source unavailable; see data status")} />
      <Card label="ARPU" value={d.summary.arpu} kind="money" note={calc("收入 ÷ 活躍使用者", "sum(內購收入) / count(distinct user_key)", "sum(IAP revenue) / count(distinct user_key)")} unavailable={d.summary.active_users === 0 ? text("本期沒有活躍使用者", "No active users in this period") : text("收入或活躍使用者資料尚不可用", "Revenue or active-user source unavailable")} />
      <Card label="ARPPU" value={d.summary.arppu ?? d.billing?.arppu} kind="money" note={d.billing ? calc("RevenueCat", "sum(內購收入) / count(distinct 付費顧客 ID)", "sum(IAP revenue) / count(distinct paying customer ID)") : calc("收入 ÷ 付費使用者", "sum(內購收入) / count(distinct 付費使用者)", "sum(IAP revenue) / count(distinct paying user)")} unavailable={d.payments.ready || d.billing ? text("本期沒有付費使用者", "No paying users in this period") : text("付款明細待讀取／對帳", "Billing details awaiting load/reconciliation")} />
      {d.billing && <Card label={text("去重付費顧客（RevenueCat ID）", "Distinct paying customers (RevenueCat IDs)")} value={d.billing.payers} note={calc("RevenueCat 顧客", "count(distinct customer_id) WHERE 期間內購金額 > 0\n排除 China、Hong Kong、Singapore", "count(distinct customer_id) WHERE period IAP > 0\nExclude China, Hong Kong and Singapore")} />}
      <Card label={text("付費人數／活躍人數", "Payers / active users")} value={d.summary.pay_rate} kind="percent" note={d.billing ? calc("RevenueCat 顧客 ÷ App 使用者", "count(distinct 付費顧客 ID) / count(distinct user_key)\n兩套身分沒有對照", "count(distinct paying customer ID) / count(distinct user_key)\nThe two ID systems are not linked") : undefined} unavailable={d.payments.ready || d.billing ? text("本期沒有活躍使用者", "No active users in this period") : text("尚缺可去重的交易使用者明細", "Transaction-level payer identities not connected")} />
      <Card label={text("訂閱購買人數／活躍人數", "Subscription purchasers / active users")} value={d.summary.membership_rate} kind="percent" note={d.billing ? calc("RevenueCat 訂閱顧客 ÷ App 使用者", "count(distinct 訂閱顧客 ID) / count(distinct user_key)\n兩套身分沒有對照", "count(distinct subscription customer ID) / count(distinct user_key)\nThe two ID systems are not linked") : undefined} unavailable={d.payments.ready || d.billing ? text("本期沒有活躍使用者", "No active users in this period") : text("需要訂閱交易、產品週期與使用者明細", "Requires subscription transactions, product periods and payer identities")} />
      {health && <><Card label={text("聊天覆蓋率", "Chat engagement")} value={d.summary.chat_engagement} kind="percent" note={calc("message_send", "count(distinct user_key WHERE message_send) / count(distinct user_key)", "count(distinct user_key WHERE message_send) / count(distinct user_key)")} /><Card label={text("卡片曝光後進入聊天頁", "Exposed users entering chat")} value={d.summary.persona_to_chat} kind="percent" note={calc("discover_card_exposure ∩ chat_page_view", "count(distinct user_key 兩邊都有) / count(distinct user_key WHERE discover_card_exposure)\n不看先後", "count(distinct user_key in both) / count(distinct user_key WHERE discover_card_exposure)\nNo ordering")} /><Card label={text("聊天者確認解鎖率", "Chatters confirming unlocks")} value={d.summary.image_unlock_rate} kind="percent" note={calc("image_unlock_confirm ∩ message_send", "count(distinct user_key 兩邊都有) / count(distinct user_key WHERE message_send)\n不是 image_unlock_result", "count(distinct user_key in both) / count(distinct user_key WHERE message_send)\nNot image_unlock_result")} /><Card label={text("聊天者成功送禮率", "Chatters delivering gifts")} value={d.summary.gift_rate} kind="percent" note={calc("gift_send_result ∩ message_send", "count(distinct user_key WHERE gift_send_result AND result = 'success' AND 也有 message_send) / count(distinct user_key WHERE message_send)", "count(distinct user_key WHERE gift_send_result AND result = 'success' AND message_send) / count(distinct user_key WHERE message_send)")} /></>}
    </Grid>
    {health && <><h3 className="mt-2 flex items-center font-semibold">{text("已訂閱：週／月／年", "Subscribed: weekly / monthly / annual")}<Hint text={subscriptionNote} /></h3><SubscriptionTable d={d} columns={subcols} zh={zh} /></>}
  </>;
  return <RangeContext.Provider value={{ ranges, setRange: (key, range) => setRanges(v => ({ ...v, [key]: range })) }}><div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-4"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#18181b] text-xl font-bold text-pink-400">M.</span><h1 className="font-semibold">{text("Moment 分析", "Moment Analytics")}</h1></div>
      <nav aria-label="Dashboard sections" className="flex flex-wrap gap-1">{(Object.keys(labels) as Tab[]).map(t => <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)} className={`rounded-full px-3 py-2 text-sm ${tab === t ? "bg-[var(--accent)] text-white" : "text-[var(--secondary-text)]"}`}>{labels[t][zh ? 0 : 1]}</button>)}</nav>
      <div className="flex items-center gap-3 text-xs"><button onClick={() => setLocale(zh ? "en" : "zh")}>{zh ? "English" : "中文"}</button>{authEnabled && <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); memory.clear(); window.location.href = "/login"; }}>{text("登出", "Sign out")}</button>}</div>
    </div></header>
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <form className="mb-6 flex flex-wrap items-end gap-3 text-xs" onSubmit={e => { e.preventDefault(); setFilters({ ...draft }); }}>
        <label>{text("版本", "Version")}<input value={draft.version} onChange={e => setDraft(v => ({ ...v, version: e.target.value }))} placeholder={text("全部", "All")} className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2" /></label>
        <label>{text("平台", "Platform")}<select value={draft.platform} onChange={e => setDraft(v => ({ ...v, platform: e.target.value }))} className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2"><option value="">{text("全部", "All")}</option><option>IOS</option><option>ANDROID</option><option>WEB</option></select></label>
        <label>{text("國家（英文名稱）", "Country (English name)")}<input value={draft.geo} onChange={e => setDraft(v => ({ ...v, geo: e.target.value }))} placeholder={text("全部", "All")} className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-2" /></label>
        <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-white">{text("套用篩選", "Apply filters")}</button>
      </form>
      {tab === "overview" && <>
        <Panel title={text("核心 KPI", "Core KPIs")} note={text("變化比較前一個等長期間。基期為零或沒有數字時顯示 —。", "Changes compare the preceding equal-length period. A zero or missing baseline shows —.")} endpoint="kpi" initialDays={1} filters={filters} zh={zh} compare>{d => stats(d)}</Panel>
        <Panel title={text("每日趨勢", "Daily trend")} endpoint="daily-trend" initialDays={7} filters={filters} zh={zh}>{d => <>
          <ChartBox title={text("用戶", "Users")} note={text("每日去重人數。活躍是當天有事件的使用者；新安裝是當天 first_open；聊天是當天 message_send。", "Daily distinct users. Active means any event; new installs are first_open; chatters sent a message.")}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={d.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={axisTick} /><YAxis tick={axisTick} allowDecimals={false} /><Tooltip {...tipStyle} /><Legend /><Line dataKey="active_users" name={text("活躍用戶", "Active users")} stroke="#49a44c" dot={false} strokeWidth={2} /><Line dataKey="new_users" name={text("新安裝", "New installs")} stroke="#f59e0b" dot={false} strokeWidth={2} /><Line dataKey="chatters" name={text("聊天用戶", "Chatters")} stroke="#818cf8" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
          </ChartBox>
          <ChartBox title={text("訊息", "Messages")} note={text("當天 message_send 次數。", "message_send events that day.")} height={220}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={d.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={axisTick} /><YAxis tick={axisTick} allowDecimals={false} /><Tooltip {...tipStyle} /><Line dataKey="messages" name={text("訊息", "Messages")} stroke="#38bdf8" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
          </ChartBox>
          <ChartBox title={text("內購收入", "IAP revenue")} note={text("當天內購收入（USD）。RevenueCat 圖表時，當天數字可能仍是暫定。", "IAP revenue that day, in USD. The current RevenueCat day can still be provisional.")} height={220}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={d.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={axisTick} /><YAxis tick={axisTick} /><Tooltip {...tipStyle} /><Line dataKey="revenue" name={text("內購收入", "IAP revenue")} stroke="#49a44c" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
          </ChartBox>
          <Table rows={d.daily} columns={[{ key: "date", title: text("日期", "Date") }, { key: "active_users", title: text("活躍用戶", "Active users"), note: calc("任一事件", "count(distinct user_key) WHERE 當天有事件", "count(distinct user_key) with any event that day") }, { key: "new_users", title: text("新安裝", "New installs"), note: calc("first_open", "count(distinct install_key) WHERE first_open 在當天", "count(distinct install_key) WHERE first_open is that day") }, { key: "messages", title: text("訊息", "Messages"), note: calc("message_send", "count(message_send) WHERE 當天 AND (result IS NULL OR result = 'success')", "count(message_send) that day WHERE result IS NULL OR result = 'success'") }, { key: "chatters", title: text("聊天用戶", "Chatters"), note: calc("message_send", "count(distinct user_key) WHERE 當天有 message_send", "count(distinct user_key) with message_send that day") }, { key: "avg_messages", title: text("平均訊息／聊天用戶", "Messages / chatter"), format: "decimal", note: calc("message_send", "count(message_send) / count(distinct user_key)", "count(message_send) / count(distinct user_key)") }, { key: "avg_app_duration", title: text("App 平均參與時長（秒）", "App engagement / GA session (s)"), format: "decimal", note: calc("engagement_time_msec", "sum(engagement_time_msec) / 1000 / count(distinct ga_session_id)", "sum(engagement_time_msec) / 1000 / count(distinct ga_session_id)") }, { key: "activation_rate", title: text("激活率", "Activation"), format: "percent", note: calc("first_open ∩ message_send", "count(distinct 當天新安裝且當天有 message_send) / count(distinct 當天新安裝)", "count(distinct new installs that also sent) / count(distinct new installs)") }, { key: "deletions", title: text("刪除次數", "Deletions"), note: calc("chat_session_dispose", "count(chat_session_dispose) WHERE 當天", "count(chat_session_dispose) that day") }, { key: "revenue", title: text("內購收入", "IAP revenue"), format: "money", note: calc("RevenueCat Charts Revenue", "sum(當天內購收入 USD)", "sum(that day's IAP revenue in USD)") }]} />
          <ChartBox title={text("熱門事件", "Top events")} note={text("期間內次數最多的事件。次數是事件筆數，用戶是去重人數。", "Events with the most firings in the period. Count is events; users are distinct.")} height={Math.max(240, Math.min(d.top_events.length, 12) * 28)}>
            <ResponsiveContainer width="100%" height="100%"><BarChart data={d.top_events.slice(0, 12)} layout="vertical" margin={{ left: 16 }}><XAxis type="number" tick={axisTick} allowDecimals={false} /><YAxis type="category" dataKey="event" width={150} tick={axisTick} /><Tooltip {...tipStyle} /><Bar dataKey="count" name={text("次數", "Events")} fill="#49a44c" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
          </ChartBox>
        </>}</Panel>
        <Panel title={text("飛輪健康儀表盤", "Flywheel health dashboard")} endpoint="health-dashboard" initialDays={30} filters={filters} zh={zh}>{d => stats(d, true)}</Panel>
      </>}
      {tab === "activation" && <Panel title={text("行為覆蓋", "Behaviour coverage")} endpoint="activation-funnel" initialDays={30} filters={filters} zh={zh}>{d => {
        const where = (event: string) => event === "message_send" ? "event = 'message_send' AND (result IS NULL OR result = 'success')" : event === "chat_session_dispose" || event === "gift_send_result" ? `event = '${event}' AND result = 'success'` : `event = '${event}'`;
        const stepNote = (event: string) => calc(event === "image_unlock_confirm" ? "image_unlock_confirm" : event, `count(distinct user_key) WHERE ${where(event)}\n占比 = 上面的人數 / count(distinct user_key)\n各步獨立，沒有先後。`, `count(distinct user_key) WHERE ${where(event)}\nShare = that count / count(distinct user_key)\nEach step is independent.`);
        const top = (rows: { name: string; users: number }[], limit = 8) => {
          const sorted = rows.filter(r => r.name && r.users > 0).sort((a, b) => b.users - a.users);
          const rest = sorted.slice(limit).reduce((n, r) => n + r.users, 0);
          return rest > 0 ? [...sorted.slice(0, limit), { name: text("其他", "Other"), users: rest }] : sorted.slice(0, limit);
        };
        const slice = (field: string, name: string) => name === text("其他", "Other")
          ? calc(field, "其餘項目各自 count(distinct user_key) 後加總。圖上只畫前 8 名。\n排除 geo.country IN ('China','Hong Kong','Singapore')", "Sum of count(distinct user_key) for the remaining values. The pie shows the top 8.\ngeo.country NOT IN ('China','Hong Kong','Singapore')")
          : calc(field, `count(distinct user_key) WHERE ${field} = '${name}'\n排除 geo.country IN ('China','Hong Kong','Singapore')`, `count(distinct user_key) WHERE ${field} = '${name}'\ngeo.country NOT IN ('China','Hong Kong','Singapore')`);
        return <>
        <h3 className="mt-6 flex items-center font-semibold">{text("行為人數", "Users by behaviour")}<Hint text={calc("各步自己的事件", "count(distinct user_key) WHERE event = 該步埋點\n占比 = 該人數 / count(distinct user_key)", "count(distinct user_key) WHERE event = that step\nShare = that count / count(distinct user_key)")} /></h3>
        <RankList rows={d.coverage.map(r => ({ name: zh ? r.zh : r.en, value: r.users ?? 0, share: r.conversion, note: stepNote(r.event) }))} />
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div><h3 className="mb-1 flex items-center font-semibold">{text("地區", "Regions")}<Hint text={slice("geo.country", "每個國家")} /></h3><SharePie rows={top(d.geo.map(r => ({ name: r.region, users: r.users })))} sliceNote={name => slice("geo.country", name)} /></div>
          <div><h3 className="mb-1 flex items-center font-semibold">{text("裝置", "Devices")}<Hint text={slice("device.category", "每個裝置")} /></h3><SharePie rows={top(d.attributes.filter(r => r.type === "device").map(r => ({ name: r.attribute, users: r.users })), 8)} sliceNote={name => slice("device.category", name)} /></div>
          <div><h3 className="mb-1 flex items-center font-semibold">{text("語言", "Languages")}<Hint text={slice("device.language", "每個語言")} /></h3><SharePie rows={top(d.attributes.filter(r => r.type === "language").map(r => ({ name: r.attribute, users: r.users })))} sliceNote={name => slice("device.language", name)} /></div>
        </div>
      </>}}</Panel>}
      {tab === "sessions" && <Panel title={text("聊天次數", "Chat counts")} endpoint="session-quality" initialDays={30} filters={filters} zh={zh}>{d => d.chats === null ? <Missing zh={zh} /> : <>
        <Grid>{([
          ["total", "聊天次數", "Chats", "decimal", "埋點：message_send\n計算：count(message_send) WHERE result IS NULL OR result = 'success'", "Event: message_send\nCalculation: count(message_send) WHERE result IS NULL OR result = 'success'"],
          ["users", "聊天人數", "Chatting users", "decimal", "埋點：message_send\n計算：count(distinct user_key) WHERE result IS NULL OR result = 'success'", "Event: message_send\nCalculation: count(distinct user_key) WHERE result IS NULL OR result = 'success'"],
          ["median", "每人中位數", "Median chats / user", "decimal", "埋點：message_send\n計算：median(每位 user_key 的 count(message_send))", "Event: message_send\nCalculation: median(count(message_send) per user_key)"],
          ["light_rate", "1–4 次", "1–4 chats", "percent", "埋點：message_send\n計算：count(distinct user_key WHERE 1 ≤ count(message_send) ≤ 4) / count(distinct 聊天 user_key)", "Event: message_send\nCalculation: count(distinct user_key WHERE 1 ≤ count(message_send) ≤ 4) / chatting users"],
          ["medium_rate", "5–9 次", "5–9 chats", "percent", "埋點：message_send\n計算：count(distinct user_key WHERE 5 ≤ count(message_send) ≤ 9) / count(distinct 聊天 user_key)", "Event: message_send\nCalculation: count(distinct user_key WHERE 5 ≤ count(message_send) ≤ 9) / chatting users"],
          ["heavy_rate", "≥10 次", "≥10 chats", "percent", "埋點：message_send\n計算：count(distinct user_key WHERE count(message_send) ≥ 10) / count(distinct 聊天 user_key)", "Event: message_send\nCalculation: count(distinct user_key WHERE count(message_send) ≥ 10) / chatting users"],
        ] as const).map(([key, cn, en, kind, zhNote, enNote]) => <Card key={key} label={text(cn, en)} value={d.chats![key]} kind={kind} note={text(zhNote, enNote)} />)}</Grid>
        <ChartBox title={text("每人聊天次數", "Chats per user")} note={text("橫軸是這段期間每位使用者的 message_send 次數，直軸是人數。", "Horizontal axis is each user's message_send count. Vertical axis is users.")}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={d.chats.distribution}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="bucket" tick={axisTick} /><YAxis tick={axisTick} allowDecimals={false} /><Tooltip {...tipStyle} /><Bar dataKey="user_count" name={text("人數", "Users")} fill="#49a44c" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
        <Card label={text("App 會話參與時長中位數（秒）", "Median App engagement / GA session (s)")} value={d.summary.median_app_duration} kind="decimal" note={text("所有 GA 會話參與秒數的中位數。", "Median engagement seconds across GA sessions.")} />
        <ChartBox title={text("App 參與時長分布", "App engagement distribution")} note={text("GA 會話按參與時長分組後的會話數。", "GA sessions grouped by engagement duration.")} height={240}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={d.app_duration_distribution}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="bucket" tick={axisTick} /><YAxis tick={axisTick} allowDecimals={false} /><Tooltip {...tipStyle} /><Bar dataKey="session_count" name={text("會話數", "Sessions")} fill="#818cf8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
      </>}</Panel>}
      {tab === "behaviour" && <Panel title={text("行為次數", "Behaviour events")} endpoint="behaviour" initialDays={30} filters={filters} zh={zh}>{d => <>
        <Grid>{bcols.map(col => <Card key={col.key} label={col.title} value={(d.behaviour as Row)[col.key]} note={col.note} />)}</Grid>
        <ChartBox title={text("每日行為", "Daily behaviour")} note={text("每天的事件次數，不是去重人數。", "Event counts per day, not distinct users.")}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={d.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={axisTick} /><YAxis tick={axisTick} allowDecimals={false} /><Tooltip {...tipStyle} /><Legend /><Line dataKey="messages" name={text("訊息", "Messages")} stroke="#38bdf8" dot={false} strokeWidth={2} /><Line dataKey="chat_views" name={text("聊天頁", "Chat views")} stroke="#818cf8" dot={false} strokeWidth={2} /><Line dataKey="unlocks" name={text("確認解鎖", "Unlocks")} stroke="#f59e0b" dot={false} strokeWidth={2} /><Line dataKey="gifts" name={text("送禮", "Gifts")} stroke="#f472b6" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
        </ChartBox>
        <Table rows={d.daily} columns={[{ key: "date", title: text("日期", "Date"), note: text("UTC 日期。", "UTC date.") }, ...bcols]} />
        <h3 className="mt-6 flex items-center font-semibold">{text("角色行為", "Persona activity")}<Hint text={text("依 robot_id 彙總的事件次數與去重使用者。", "Event counts and distinct users grouped by robot_id.")} /></h3><Table rows={d.personas} columns={[{ key: "name", title: text("角色", "Persona"), note: text("角色顯示名稱。", "Persona display name.") }, { key: "robot_id", title: "ID" }, { key: "users", title: text("用戶", "Users"), note: text("與這個角色有事件的去重使用者。", "Distinct users with an event for this persona.") }, ...bcols]} />
      </>}</Panel>}
      {tab === "retention" && <Panel title={text("留存（觀察窗內首次活躍隊列）", "Retention (first observed activity cohorts)")} endpoint="retention" initialDays={30} filters={filters} zh={zh}>{d => d.retention === null ? <Missing zh={zh} /> : <>
        <ChartBox title={text("隊列留存", "Cohort retention")} note={text("以觀察窗內第一次出現的日期為隊列。D0 是當天，D1/D3/D7/D14 是之後第幾天仍有事件。向前多看 14 天，首次觀察到不等於首次安裝。", "Cohorts start at each user's first observed day. D0 is that day; D1/D3/D7/D14 are later active days. Lookback is 14 days, so first observed is not first install.")}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={d.retention.cohorts}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" tick={axisTick} /><YAxis tick={axisTick} unit="%" /><Tooltip {...tipStyle} /><Line dataKey="rate" name={text("留存率", "Retention")} stroke="#49a44c" strokeWidth={2} /></LineChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox title={text("每日回訪", "Daily returning users")} note={text("當天活躍，且上一次活躍至少早兩天的使用者。", "Users active today whose previous activity was at least two days earlier.")}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={d.retention.returning}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={axisTick} /><YAxis tick={axisTick} allowDecimals={false} /><Tooltip {...tipStyle} /><Legend /><Line dataKey="active_users" name={text("活躍", "Active")} stroke="#49a44c" dot={false} strokeWidth={2} /><Line dataKey="returning_users" name={text("回訪", "Returning")} stroke="#818cf8" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
        </ChartBox>
        <Table rows={d.retention.cohorts} columns={[{ key: "day", title: "Day", note: text("距離首次觀察日的天數。", "Days after the first observed active day.") }, { key: "cohort_size", title: "Cohort", note: text("有足夠觀察天數的人數。", "Users who have had enough days to be observed.") }, { key: "retained", title: "Retained", note: text("該天仍有事件的人數。", "Users with an event on that later day.") }, { key: "rate", title: "Rate", format: "percent", note: text("留存人數／可觀察人數。", "Retained users / eligible cohort.") }]} />
        <Table rows={d.retention.returning} columns={[{ key: "date", title: "Date" }, { key: "active_users", title: "Active", note: text("當天有事件的去重使用者。", "Distinct users with an event that day.") }, { key: "returning_users", title: "Returning", note: text("上次活躍至少早兩天的人。", "Active today, previous activity at least two days earlier.") }, { key: "chat_views", title: "Chat views", note: text("當天 chat_page_view 次數。", "chat_page_view events that day.") }, { key: "returning_chat_views", title: "Returning chat views", note: text("回訪使用者的 chat_page_view 次數。", "chat_page_view events from returning users.") }]} />
      </>}</Panel>}
      {tab === "monetisation" && <Panel title={text("商業化", "Monetisation")} endpoint="monetisation" initialDays={30} filters={filters} zh={zh}>{d => <>
        <Card label={text("內購總收入", "Total in-app purchase revenue")} value={d.summary.revenue} kind="money" note={d.meta.revenue_source === "revenuecat_chart" ? text("RevenueCat 圖表來源；包含訂閱與一次性內購、排除廣告。退款按記帳日扣除，逐筆交易對帳及購買頁面分類仍待接入。", "RevenueCat Charts: subscriptions and one-time IAP, excluding ads. Refunds deducted when recorded. Transaction reconciliation and purchase-page classification remain pending.") : text("已驗證交易明細的期間淨收入", "Net period revenue from the verified transaction ledger")} />
        <Grid>{d.payments.amounts.map(r => {
          const value = r.kind === "recharge" || r.kind === "bundle" ? r.revenue : d.payments.ready ? r.revenue : d.billing?.amounts.find(a => a.kind === r.kind)?.revenue ?? r.revenue;
          const notes: Record<string, string> = {
            recharge: calc("coin_purchase_result", "sum(price × count) WHERE result = 'success' AND product_id NOT LIKE '%pack%'\n排除 geo.country IN ('China','Hong Kong','Singapore')。沒有成功列時為 $0。", "sum(price × count) WHERE result = 'success' AND product_id NOT LIKE '%pack%'\ngeo.country NOT IN ('China','Hong Kong','Singapore'). No success rows means $0."),
            bundle: calc("coin_purchase_result", "sum(price × count) WHERE result = 'success' AND product_id LIKE '%pack%'", "sum(price × count) WHERE result = 'success' AND product_id LIKE '%pack%'"),
            subscription: calc("RevenueCat 訂閱交易", "sum(訂閱交易金額)\n排除 China、Hong Kong、Singapore", "sum(subscription transaction amount)\nExclude China, Hong Kong and Singapore"),
            unknown: calc("RevenueCat 非訂閱內購", "sum(不是訂閱的內購金額)", "sum(IAP amount that is not a subscription)"),
          };
          return <Card key={r.kind} label={text(({ recharge: "充值頁收入", bundle: "禮包收入", subscription: "訂閱收入", unknown: "待歸類收入" } as Record<string, string>)[r.kind], `${r.kind} revenue`)} value={value} kind="money" note={notes[r.kind]} />;
        })}</Grid>
        <ChartBox title={text("收入構成", "Revenue mix")} note={text("四類金額的占比。充值與禮包來自 coin_purchase_result；訂閱與待歸類來自 RevenueCat。", "Share of the four amounts. Recharge and bundles come from coin_purchase_result; subscriptions and unclassified come from RevenueCat.")} height={260}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={d.payments.amounts.map(r => ({ name: text(({ recharge: "充值", bundle: "禮包", subscription: "訂閱", unknown: "待歸類" } as Record<string, string>)[r.kind], r.kind), value: (r.kind === "recharge" || r.kind === "bundle" ? r.revenue : d.billing?.amounts.find(a => a.kind === r.kind)?.revenue ?? r.revenue) || 0 })).filter(r => r.value > 0)} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>{COLORS.map((fill, i) => <Cell key={fill} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tipStyle} /><Legend /></PieChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox title={text("M-coin 充值行為", "M-coin recharge actions")} note={text("四步各自去重，不要求 flow_id 或先後。購買成功是 coin_purchase_result 且 result=success。占比是該步人數／期間活躍人數。", "Four independent user counts, with no flow_id or ordering. Purchase success is coin_purchase_result with result=success. The rate is users / period active users.")} height={220}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={d.payments.recharge_funnel} layout="vertical" margin={{ left: 16 }}><XAxis type="number" tick={axisTick} allowDecimals={false} /><YAxis type="category" dataKey="step" width={130} tick={axisTick} /><Tooltip {...tipStyle} /><Bar dataKey="users" name={text("使用者", "Users")} fill="#49a44c" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
        <ChartBox title={text("會員行為與訂閱", "Membership and subscriptions")} note={text("前三步是頁面事件人數。Subscribed 是 RevenueCat 去重訂閱顧客，含自動續訂。各步獨立，不是順序轉化。", "The first three rows are page-event users. Subscribed is distinct RevenueCat subscription customers, including renewals. Rows are independent.")} height={220}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={d.payments.membership_funnel} layout="vertical" margin={{ left: 16 }}><XAxis type="number" tick={axisTick} allowDecimals={false} /><YAxis type="category" dataKey="step" width={130} tick={axisTick} /><Tooltip {...tipStyle} /><Bar dataKey="users" name={text("使用者", "Users")} fill="#818cf8" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
        <h3 className="mt-6 flex items-center font-semibold">{text("已訂閱：週／月／年", "Subscribed: weekly / monthly / annual")}<Hint text={subscriptionNote} /></h3>
        <SubscriptionTable d={d} columns={subcols} zh={zh} />
        <h3 className="mt-6 flex items-center font-semibold">{text("訂閱計畫", "Subscription products")}<Hint text={text("依商店與 product id 彙總的訂閱顧客、次數與收入。", "Subscription customers, purchases and revenue by store and product id.")} /></h3>
        {d.payments.products === null && !d.billing ? <Missing zh={zh} /> : <Table rows={d.payments.products ?? d.billing?.products ?? []} columns={[{ key: "period", title: text("週期", "Period"), note: subcols[0].note }, { key: "store", title: text("商店", "Store"), note: text("app_store 或 play_store。", "app_store or play_store.") }, { key: "product_id", title: "Product ID", note: text("商店商品 id。", "Store product id.") }, { key: "users", title: text("去重訂閱購買人數", "Subscription purchasers"), note: subcols[1].note }, { key: "initial_users", title: text("初購人數", "Initial users"), note: subcols[2].note }, { key: "renewal_users", title: text("續訂人數", "Renewal users"), note: subcols[3].note }, { key: "purchases", title: text("訂閱次數", "Purchases"), note: text("初購加續訂的交易次數。", "Initial purchases plus renewals.") }, { key: "revenue", title: text("收入", "Revenue"), format: "money", note: text("這些交易的美元金額。", "USD amount of these transactions.") }]} />}
        <ChartBox title={text("送禮行為", "Gift actions")} note={text("禮物彈窗、選取、成功送出的去重使用者。成功送出是 gift_send_result 且 result=success。", "Distinct users for the gift popup, item selection and successful send. Success is gift_send_result with result=success.")} height={200}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={d.payments.gift_funnel} layout="vertical" margin={{ left: 16 }}><XAxis type="number" tick={axisTick} allowDecimals={false} /><YAxis type="category" dataKey="step" width={130} tick={axisTick} /><Tooltip {...tipStyle} /><Bar dataKey="users" name={text("使用者", "Users")} fill="#f472b6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
        </ChartBox>
        {d.meta.revenue_source === "revenuecat_chart" ? <>
          <ChartBox title={text("每日內購收入", "Daily IAP revenue")} note={text("RevenueCat 每日內購收入（USD、UTC）。交易次數不是付費人數。", "RevenueCat daily IAP revenue in USD, UTC. Transaction count is not payer count.")}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={d.payments.revenuecat?.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={axisTick} /><YAxis tick={axisTick} /><Tooltip {...tipStyle} /><Line dataKey="revenue" name={text("內購收入", "IAP revenue")} stroke="#49a44c" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
          </ChartBox>
          <Table rows={d.payments.revenuecat?.daily || []} columns={[{ key: "date", title: text("日期（UTC）", "Date (UTC)"), note: calc("RevenueCat chart cohort", "圖表的 UTC 日期", "The chart cohort date in UTC") }, { key: "revenue", title: text("內購收入", "IAP revenue"), format: "money", note: calc("RevenueCat Charts Revenue", "sum(當天內購收入 USD)\n退款記在退款入帳日。排除廣告，以及 China、Hong Kong、Singapore。", "sum(that day's IAP revenue in USD)\nRefunds are booked on the refund date. Ads and China, Hong Kong and Singapore are excluded.") }, { key: "transactions", title: text("交易次數（非人數）", "Transactions (not users)"), note: calc("RevenueCat Charts Transactions", "count(交易)\n不是 count(distinct 付費顧客)。同一顧客可以有多筆。", "count(transactions)\nNot count(distinct paying customers). One customer can have several.") }, { key: "incomplete", title: text("數據暫定", "Provisional"), note: calc("RevenueCat Charts incomplete", "incomplete = true 表示當天尚未結算，金額之後可能改變。", "incomplete = true means that day is not final and the amount can still change.") }]} />
        </> : <ChartBox title={text("每日分類收入", "Revenue by day and category")} note={text("每天的充值、禮包、訂閱與待歸類金額。", "Daily recharge, bundle, subscription and unclassified amounts.")}><ResponsiveContainer width="100%" height="100%"><BarChart data={d.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={axisTick} /><YAxis tick={axisTick} /><Tooltip {...tipStyle} /><Legend /><Bar dataKey="recharge_revenue" name={text("充值頁", "Recharge")} stackId="revenue" fill="#49a44c" /><Bar dataKey="bundle_revenue" name={text("禮包", "Bundles")} stackId="revenue" fill="#f59e0b" /><Bar dataKey="subscription_revenue" name={text("訂閱", "Subscriptions")} stackId="revenue" fill="#818cf8" /><Bar dataKey="unknown_revenue" name={text("待歸類", "Unclassified")} stackId="revenue" fill="#94a3b8" /></BarChart></ResponsiveContainer></ChartBox>}
        <h3 className="mt-6 flex items-center font-semibold">{text("經濟流水", "Economy flows")}<Hint text={text("期間內的增減量，不是錢包餘額。", "Movement during the period, not a wallet balance.")} /></h3>
        <Grid>{Object.entries(d.economy).map(([key, value]) => <Card key={key} label={text(({ battery_charged: "電量獲得", battery_consumed: "電量消耗", coins_earned: "金幣獲得（完整流水）", coins_spent: "金幣消耗（完整流水）", reported_coin_rewards: "任務金幣獎勵回報量", ad_completions: "廣告完成回報次數", ad_forced: "強制廣告觸發回報次數", unlock_attempts: "解鎖嘗試回報次數", unlock_successes: "成功解鎖", balance_fails: "餘額不足回報次數" } as Record<string, string>)[key], key.replaceAll("_", " "))} value={value} note={economyNotes[key] ? text(economyNotes[key][0], economyNotes[key][1]) : undefined} />)}</Grid>
      </>}</Panel>}
    </main>
  </div></RangeContext.Provider>;
}
