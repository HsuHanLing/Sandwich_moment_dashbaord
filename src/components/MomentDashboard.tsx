"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";
import type { Report } from "@/lib/analytics/model";
import { change } from "@/lib/analytics/model";
import type { BillingReport } from "@/lib/analytics/revenuecat-billing";

type Data = Report & { previous: Report["summary"] | null; billing?: BillingReport };
type Range = { days: number; end: string };
const RangeContext = createContext<{ ranges: Record<string, Range>; setRange: (key: string, range: Range) => void } | null>(null);
type Filters = { version: string; platform: string; geo: string };
type Row = Record<string, unknown>;
type Column = { key: string; title: string; format?: "money" | "percent" | "decimal" };
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
function Card({ label, value, kind, note, previous, unavailable }: { label: string; value: unknown; kind?: Column["format"]; note?: string; previous?: number | null; unavailable?: string }) {
  const delta = previous === undefined ? undefined : change(typeof value === "number" ? value : null, previous);
  return <div className="rounded-xl border border-[var(--card-stroke)] bg-[var(--card-bg)] p-4" title={note}>
    <div className="text-xs text-[var(--secondary-text)]">{label}</div><div className="mt-2 text-2xl font-semibold tabular-nums">{fmt(value, kind)}</div>
    {(value === null || value === undefined) && unavailable && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{unavailable}</p>}
    {delta !== undefined && <div className="mt-1 text-xs text-[var(--secondary-text)]">{delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}</div>}
    {note && <div className="mt-2 text-[11px] leading-relaxed text-[var(--secondary-text)]">{note}</div>}
  </div>;
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="my-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>; }
function Table({ rows, columns }: { rows: object[]; columns: Column[] }) {
  return <div className="my-4 overflow-auto rounded-xl border border-[var(--border)]"><table className="w-full whitespace-nowrap text-left text-xs"><thead className="bg-[var(--background)]"><tr>{columns.map(c => <th key={c.key} className="px-4 py-3 font-medium">{c.title}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((row, i) => <tr key={i} className="border-t border-[var(--border)]">{columns.map(c => <td key={c.key} className="px-4 py-3 tabular-nums">{fmt((row as Row)[c.key], c.format)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="p-4 text-[var(--secondary-text)]">No rows / 無資料列</td></tr>}</tbody></table></div>;
}
function Panel({ title, endpoint, initialDays, filters, zh, children, compare = false }: { title: string; endpoint: string; initialDays: number; filters: Filters; zh: boolean; compare?: boolean; children: (data: Data) => React.ReactNode }) {
  const rangeState = useContext(RangeContext)!;
  const range = rangeState.ranges[endpoint] || { days: initialDays, end: "" };
  const setRange = (value: Range) => rangeState.setRange(endpoint, value);
  const state = useReport(endpoint, range, filters, compare);
  const billing = useBilling(state.data, ["kpi", "health-dashboard", "monetisation"].includes(endpoint));
  return <section className="mb-6 rounded-2xl border border-[var(--card-stroke)] bg-[var(--card-bg)] p-4 sm:p-6" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2><div className="flex items-center gap-3 text-xs">
      <label>{zh ? "期間" : "Period"} <select aria-label={`${title} period`} value={range.days} onChange={e => setRange({ ...range, days: Number(e.target.value) })} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2">{[1, 7, 14, 30, 90].map(n => <option key={n} value={n}>{n === 1 ? zh ? "今天" : "Today" : `${n} ${zh ? "天" : "days"}`}</option>)}</select></label>
      <label>{zh ? "截至" : "Ending"} <input aria-label={`${title} end date`} type="date" value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2" /></label>
    </div></div>
    {state.loading && <p role="status" className="py-8 text-sm text-[var(--secondary-text)]">{zh ? "載入中…" : "Loading…"}</p>}
    {state.error && <p role="alert" className="my-4 rounded-xl border border-rose-400/40 p-4 text-sm">{state.error}</p>}
    {state.data && <><div className="mt-2 text-xs text-[var(--secondary-text)]">{state.data.meta.start} → {state.data.meta.end} · {state.data.meta.timezone} · {zh ? "更新" : "Updated"} {new Date(state.data.meta.updated_at).toLocaleTimeString()} {state.data.meta.demo && <strong className="ml-2 text-amber-600">DEMO / 示範資料</strong>}</div>
      {state.data.meta.reasons.length > 0 && <details className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><summary className="cursor-pointer font-medium">{zh ? "資料尚未完整接入，— 代表未知" : "Partial data · — means unavailable"}</summary><ul className="mt-2 list-disc space-y-1 pl-4">{state.data.meta.reasons.filter(r => !billing.data || r !== "Product catalog not connected").map(r => <li key={r}>{r}</li>)}</ul></details>}
      {billing.loading && <p role="status" className="mt-3 text-xs text-[var(--secondary-text)]">{zh ? "正在讀取並對帳完整付款紀錄；首次可能需要約 2 分鐘，其他指標可先查看。" : "Loading and reconciling complete billing records; the first load can take about 2 minutes. Other metrics are available now."}</p>}
      {billing.error && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{zh ? "付款明細尚未可用：" : "Billing details unavailable: "}{billing.error}</p>}
      {billing.data && <p className="mt-3 text-xs text-[var(--secondary-text)]">{zh ? "付款人數依 RevenueCat 顧客 ID 去重，已逐日對帳；尚未與 App 匿名身分映射，因此跨來源付費率仍待接入。交易快照更新：" : "Payers use distinct RevenueCat customer IDs and reconcile by day. App identity mapping remains pending, so canonical payer/active-user rates are unavailable. Billing snapshot: "}{new Date(billing.data.fetched_at).toLocaleString()}</p>}
      {children(billing.data ? { ...state.data, billing: billing.data,
        summary: { ...state.data.summary, revenue: billing.data.revenue, arpu: state.data.summary.active_users ? billing.data.revenue / state.data.summary.active_users : null,
          pay_rate: state.data.summary.active_users ? billing.data.payers / state.data.summary.active_users * 100 : null,
          membership_rate: state.data.summary.active_users ? billing.data.subscription_users / state.data.summary.active_users * 100 : null },
        daily: state.data.daily.map(r => ({ ...r, revenue: billing.data!.daily.find(day => day.date === r.date)?.revenue ?? r.revenue })),
        payments: { ...state.data.payments, revenuecat: state.data.payments.revenuecat ? { ...state.data.payments.revenuecat, revenue: billing.data.revenue, daily: billing.data.daily } : null },
      } : state.data)}</>}
  </section>;
}
function Missing({ zh }: { zh: boolean }) { return <p className="my-4 rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--secondary-text)]">{zh ? "待接入已驗證資料，尚無可計算結果。" : "Awaiting verified data. No result available yet."}</p>; }
function SubscriptionTable({ d, columns, zh }: { d: Data; columns: Column[]; zh: boolean }) { const rows = d.payments.subscriptions ?? d.billing?.subscriptions?.map(r => ({ ...r, conversion: null })); return !rows ? <Missing zh={zh} /> : <Table rows={rows.map(r => ({ ...r, period: zh ? ({ weekly: "週訂閱", monthly: "月訂閱", annual: "年訂閱" } as Record<string, string>)[r.period] : r.period }))} columns={columns} />; }

export function MomentDashboard() {
  const { locale, setLocale } = useLocale(); const zh = locale === "zh"; const text = (cn: string, en: string) => zh ? cn : en;
  const [ranges, setRanges] = useState<Record<string, Range>>({});
  const [tab, setTab] = useState<Tab>("overview"); const [filters, setFilters] = useState<Filters>({ version: "", platform: "", geo: "" }); const [draft, setDraft] = useState<Filters>(filters);
  const [authEnabled, setAuthEnabled] = useState(false);
  useEffect(() => { fetch("/api/auth/status").then(r => r.json()).then(r => setAuthEnabled(r.enabled === true)).catch(() => {}); }, []);
  const bcols: Column[] = [{ key: "gifts", title: text("成功送禮", "Gifts delivered") }, { key: "unlocks", title: text("確認解鎖", "Unlock confirms") }, { key: "chat_views", title: text("進入聊天頁", "Chat page views") }, { key: "messages", title: text("發送訊息", "Messages sent") }, { key: "profile_views", title: text("角色主頁", "Profile views") }, { key: "swipes", title: text("切換角色", "Persona switches") }, { key: "reports", title: text("檢舉次數", "Report events") }];
  const subcols: Column[] = [{ key: "period", title: text("週期", "Period") }, { key: "users", title: text("去重合計人數", "Distinct purchasers") }, { key: "initial_users", title: text("初購人數", "Initial users") }, { key: "renewal_users", title: text("續訂人數", "Renewal users") }, { key: "conversion", title: text("購買人數／活躍人數", "Purchasers / active users"), format: "percent" }];
  const subscriptionNote = text("初購、續訂包含未打開 App 者；合計取聯集，比例可超過 100%。兩類人數不可直接相加。", "Includes initial purchases and renewals without an App visit. Total users are a union; ratios may exceed 100%.");
  const stats = (d: Data, health = false) => <>
    <Grid>
      {!health && <><Card label={text("平均日活", "Average DAU")} value={d.summary.dau} kind="decimal" previous={d.previous?.dau} /><Card label={text("新安裝用戶", "New installs")} value={d.summary.new_users} note={text("安裝或重裝後首次啟動", "First launch after install or reinstall")} /><Card label={text("每位聊天使用者平均訊息數", "Messages per chatting user")} value={d.summary.avg_messages} kind="decimal" previous={d.previous?.avg_messages} /><Card label={text("平均 App 參與會話時長（秒）", "Average App engagement / GA session (s)")} value={d.summary.avg_app_duration} kind="decimal" previous={d.previous?.avg_app_duration} /></>}
      <Card label={text("新安裝激活率", "New-install activation")} value={d.summary.activation_rate} kind="percent" note={text("新安裝後、本期內有成功發送事件的安裝實例／本期新安裝實例；按 App 埋點計算", "New installs reporting a successful send after first_open within this period / new installs; App telemetry")} unavailable={d.summary.new_users === 0 ? text("本期沒有新安裝實例", "No new installs in this period") : text("安裝與發送事件尚不可用", "Install and send events unavailable")} />
      {!health && <Card label={text("活躍用戶 D1 回訪率", "Active-user D1 return rate")} value={d.summary.d1_retention} kind="percent" note={text("前一天活躍者中，當天回訪的比例；期間按每日隊列人數加權", "Previous-day active users returning today; weighted by daily cohorts")} />}
      <Card label={text("會話刪除次數", "Conversation deletions")} value={d.summary.deletions} note={text("chat_session_dispose 事件次數。不是去重聊天框，也不是刪除比例。", "Count of chat_session_dispose events. Not distinct conversations, and not a deletion rate.")} unavailable={text("事件來源尚不可用", "Events source unavailable")} />
      <Card label={text("內購收入", "In-app purchase revenue")} value={d.summary.revenue} kind="money" previous={d.previous?.revenue} note={d.meta.revenue_source === "revenuecat_chart" ? d.billing ? text("RevenueCat 內購收入（USD、UTC），已逐日對帳；退款按記帳日扣除，當日數字暫定。", "RevenueCat IAP (USD, UTC), reconciled by day; refunds deducted when recorded. Current day is provisional.") : text("來源：RevenueCat 內購圖表（USD、UTC）；退款按記帳日扣除，當日數字暫定。付款明細正在讀取或待核對。", "Source: RevenueCat IAP Charts (USD, UTC); refunds deducted when recorded. Current day is provisional. Billing details loading or awaiting reconciliation.") : text("已驗證生產交易；含充值、禮包、訂閱、待歸類，扣除退款", "Verified production purchases across all categories, net of refunds")} unavailable={text("收入來源尚未可用，詳見資料狀態", "Revenue source unavailable; see data status")} />
      <Card label="ARPU" value={d.summary.arpu} kind="money" note={text("與收入卡相同的收入來源／期間活躍使用者", "Same revenue source as the revenue card / period active users")} unavailable={d.summary.active_users === 0 ? text("本期沒有活躍使用者", "No active users in this period") : text("收入或活躍使用者資料尚不可用", "Revenue or active-user source unavailable")} />
      <Card label="ARPPU" value={d.summary.arppu ?? d.billing?.arppu} kind="money" note={d.billing ? text("RevenueCat 內購收入／期間去重付費顧客 ID；已逐日對帳", "RevenueCat IAP revenue / distinct period paying customer IDs; reconciled by day") : text("內購收入／去重付費使用者", "IAP revenue / distinct paying users")} unavailable={d.payments.ready || d.billing ? text("本期沒有付費使用者", "No paying users in this period") : text("付款明細待讀取／對帳", "Billing details awaiting load/reconciliation")} />
      {d.billing && <Card label={text("去重付費顧客（RevenueCat ID）", "Distinct paying customers (RevenueCat IDs)")} value={d.billing.payers} />}
      <Card label={text("付費人數／活躍人數", "Payers / active users")} value={d.summary.pay_rate} kind="percent" note={d.billing ? text("RevenueCat 去重付費顧客除以 App 期間活躍人數。兩套身分沒有對照，不是同一群人。", "RevenueCat paying customers divided by App active users. The two ID systems are not linked.") : undefined} unavailable={d.payments.ready || d.billing ? text("本期沒有活躍使用者", "No active users in this period") : text("尚缺可去重的交易使用者明細", "Transaction-level payer identities not connected")} />
      <Card label={text("訂閱購買人數／活躍人數", "Subscription purchasers / active users")} value={d.summary.membership_rate} kind="percent" note={d.billing ? text("RevenueCat 去重訂閱顧客除以 App 期間活躍人數。兩套身分沒有對照，不是同一群人。", "RevenueCat subscription customers divided by App active users. The two ID systems are not linked.") : undefined} unavailable={d.payments.ready || d.billing ? text("本期沒有活躍使用者", "No active users in this period") : text("需要訂閱交易、產品週期與使用者明細", "Requires subscription transactions, product periods and payer identities")} />
      {health && <><Card label={text("聊天覆蓋率", "Chat engagement")} value={d.summary.chat_engagement} kind="percent" note={text("發訊息使用者／期間活躍使用者", "Chatting users / active users")} /><Card label={text("卡片曝光後進入聊天頁", "Exposed users entering chat")} value={d.summary.persona_to_chat} kind="percent" note={text("曝光者與聊天頁使用者的交集／曝光使用者，不驗證先後", "Intersection of exposed users and chat viewers / exposed users; no ordering implied")} /><Card label={text("聊天者確認解鎖率", "Chatters confirming unlocks")} value={d.summary.image_unlock_rate} kind="percent" note={text("有 image_unlock_confirm 的聊天者／聊天者。不是 image_unlock_result 的成功發放。", "Chatters with image_unlock_confirm / chatters. This is not an image_unlock_result grant.")} /><Card label={text("聊天者成功送禮率", "Chatters delivering gifts")} value={d.summary.gift_rate} kind="percent" note={text("gift_send_result 且 result=success 的聊天者／聊天者。這是 App 回報，不是後端驗證。", "Chatters with gift_send_result result=success / chatters. App-reported, not backend-verified.")} /></>}
    </Grid>
    {health && <><p className="text-xs text-[var(--secondary-text)]">{subscriptionNote}</p><SubscriptionTable d={d} columns={subcols} zh={zh} /></>}
    {d.previous && <p className="text-xs text-[var(--secondary-text)]">{text("變化比較前一個等長期間；基期為零或未知時顯示 —。", "Changes compare the preceding equal-length period. Zero or unavailable baseline: —.")}</p>}
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
        <Panel title={text("核心 KPI", "Core KPIs")} endpoint="kpi" initialDays={1} filters={filters} zh={zh} compare>{d => stats(d)}</Panel>
        <Panel title={text("每日趨勢", "Daily trend")} endpoint="daily-trend" initialDays={7} filters={filters} zh={zh}>{d => <>
          <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={d.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line dataKey="active_users" name={text("活躍用戶", "Active users")} stroke="#49a44c" dot={false} /><Line dataKey="chatters" name={text("聊天用戶", "Chatters")} stroke="#818cf8" dot={false} /></LineChart></ResponsiveContainer></div>
          <Table rows={d.daily} columns={[{ key: "date", title: text("日期", "Date") }, { key: "active_users", title: text("活躍用戶", "Active users") }, { key: "new_users", title: text("新安裝", "New installs") }, { key: "messages", title: text("訊息", "Messages") }, { key: "chatters", title: text("聊天用戶", "Chatters") }, { key: "avg_messages", title: text("平均訊息／聊天用戶", "Messages / chatter"), format: "decimal" }, { key: "avg_app_duration", title: text("App 平均參與時長（秒）", "App engagement / GA session (s)"), format: "decimal" }, { key: "activation_rate", title: text("激活率", "Activation"), format: "percent" }, { key: "deletions", title: text("刪除次數", "Deletions") }, { key: "revenue", title: text("內購收入", "IAP revenue"), format: "money" }]} />
          <h3 className="mt-6 font-semibold">{text("熱門事件", "Top events")}</h3><Table rows={d.top_events} columns={[{ key: "event", title: text("事件", "Event") }, { key: "count", title: text("次數", "Events") }, { key: "users", title: text("去重用戶", "Distinct users") }]} />
        </>}</Panel>
        <Panel title={text("飛輪健康儀表盤", "Flywheel health dashboard")} endpoint="health-dashboard" initialDays={30} filters={filters} zh={zh}>{d => stats(d, true)}</Panel>
      </>}
      {tab === "activation" && <Panel title={text("14 項行為覆蓋", "14 behaviour coverage stages")} endpoint="activation-funnel" initialDays={30} filters={filters} zh={zh}>{d => <>
        <p className="my-3 text-xs text-[var(--secondary-text)]">{text("各行為獨立去重；覆蓋率＝行為使用者／期間活躍使用者，無順序要求。", "Independent distinct users per action / active users. These are not sequential conversion steps.")}</p>
        <div className="space-y-3 overflow-x-auto">{d.coverage.map((r, i) => <div key={r.event} className="grid min-w-[480px] grid-cols-[180px_1fr_100px] items-center gap-3 text-xs"><span>{i + 1}. {zh ? r.zh : r.en}</span><div className="h-5 rounded bg-[var(--background)]"><div className="h-full rounded bg-[var(--accent)]" style={{ width: `${r.conversion || 0}%` }} /></div><span className="text-right">{fmt(r.users)} · {fmt(r.conversion, "percent")}</span></div>)}</div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2"><div><h3>{text("地區分布", "Regions")}</h3><Table rows={d.geo} columns={[{ key: "region", title: text("地區", "Region") }, { key: "users", title: text("用戶", "Users") }]} /></div><div><h3>{text("裝置與語言", "Devices and languages")}</h3><Table rows={d.attributes} columns={[{ key: "type", title: text("類型", "Type") }, { key: "attribute", title: text("屬性", "Attribute") }, { key: "users", title: text("用戶", "Users") }]} /></div></div>
      </>}</Panel>}
      {tab === "sessions" && <Panel title={text("聊天次數", "Chat counts")} endpoint="session-quality" initialDays={30} filters={filters} zh={zh}>{d => d.chats === null ? <Missing zh={zh} /> : <>
        <p className="mt-3 text-xs text-[var(--secondary-text)]">{text("一次 message_send 算一次聊天。下面是期間聊天次數，以及每位使用者聊了幾次。不使用刪除事件。", "Each message_send is one chat. Totals and per-user counts below. Deletion events are not used.")}</p>
        <Grid>{([ ["total", "聊天次數", "Chats", "decimal"], ["users", "聊天人數", "Chatting users", "decimal"], ["median", "每人中位數", "Median chats / user", "decimal"], ["light_rate", "1–4 次", "1–4 chats", "percent"], ["medium_rate", "5–9 次", "5–9 chats", "percent"], ["heavy_rate", "≥10 次", "≥10 chats", "percent"] ] as const).map(([key, cn, en, kind]) => <Card key={key} label={text(cn, en)} value={d.chats![key]} kind={kind} />)}</Grid>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.chats.distribution}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="user_count" name={text("人數", "Users")} fill="#49a44c" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <h3 className="mt-6 font-semibold">{text("App 參與時長分布（GA 會話組數）", "App engagement distribution (GA sessions)")}</h3><Card label={text("App 會話參與時長中位數（秒）", "Median App engagement / GA session (s)")} value={d.summary.median_app_duration} kind="decimal" />
        <div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.app_duration_distribution}><XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="session_count" fill="#818cf8" /></BarChart></ResponsiveContainer></div>
      </>}</Panel>}
      {tab === "behaviour" && <Panel title={text("行為次數", "Behaviour events")} endpoint="behaviour" initialDays={30} filters={filters} zh={zh}>{d => <>
        <Grid>{bcols.map(col => <Card key={col.key} label={col.title} value={(d.behaviour as Row)[col.key]} />)}</Grid>
        <Table rows={d.daily} columns={[{ key: "date", title: text("日期", "Date") }, ...bcols]} />
        <h3 className="mt-6 font-semibold">{text("角色行為", "Persona activity")}</h3><Table rows={d.personas} columns={[{ key: "name", title: text("角色", "Persona") }, { key: "robot_id", title: "ID" }, { key: "users", title: text("用戶", "Users") }, ...bcols]} />
      </>}</Panel>}
      {tab === "retention" && <Panel title={text("留存（觀察窗內首次活躍隊列）", "Retention (first observed activity cohorts)")} endpoint="retention" initialDays={30} filters={filters} zh={zh}>{d => d.retention === null ? <Missing zh={zh} /> : <><p className="mt-3 text-xs text-[var(--secondary-text)]">{text("向前多觀察 14 天；首次觀察到活躍不等於首次安裝。", "Includes 14 days of prior activity; first observed activity is not first installation.")}</p><Table rows={d.retention.cohorts} columns={[{ key: "day", title: "Day" }, { key: "cohort_size", title: "Cohort" }, { key: "retained", title: "Retained" }, { key: "rate", title: "Rate", format: "percent" }]} /><Table rows={d.retention.returning} columns={[{ key: "date", title: "Date" }, { key: "active_users", title: "Active" }, { key: "returning_users", title: "Returning" }, { key: "chat_views", title: "Chat views" }, { key: "returning_chat_views", title: "Returning chat views" }]} /></>}</Panel>}
      {tab === "monetisation" && <Panel title={text("商業化", "Monetisation")} endpoint="monetisation" initialDays={30} filters={filters} zh={zh}>{d => <>
        <Card label={text("內購總收入", "Total in-app purchase revenue")} value={d.summary.revenue} kind="money" note={d.meta.revenue_source === "revenuecat_chart" ? text("RevenueCat 圖表來源；包含訂閱與一次性內購、排除廣告。退款按記帳日扣除，逐筆交易對帳及購買頁面分類仍待接入。", "RevenueCat Charts: subscriptions and one-time IAP, excluding ads. Refunds deducted when recorded. Transaction reconciliation and purchase-page classification remain pending.") : text("已驗證交易明細的期間淨收入", "Net period revenue from the verified transaction ledger")} />
        <Grid>{d.payments.amounts.map(r => <Card key={r.kind} label={text(({ recharge: "充值頁收入", bundle: "禮包收入", subscription: "訂閱收入", unknown: "待歸類收入" } as Record<string, string>)[r.kind], `${r.kind} revenue`)} value={r.kind === "recharge" || r.kind === "bundle" ? r.revenue : d.payments.ready ? r.revenue : d.billing?.amounts.find(a => a.kind === r.kind)?.revenue ?? r.revenue} kind="money" note={r.kind === "recharge" || r.kind === "bundle" ? text("coin_purchase_result 且 result=success。sku 或 product_id 為商品；名稱含 pack 算禮包，其餘算充值。price 以美元計。", "coin_purchase_result with result=success. sku or product_id is the product; ids containing pack are bundles, the rest are recharge. price is USD.") : undefined} unavailable={text("尚無可用金額", "Amount is not available")} />)}</Grid>
        <p className="text-xs text-[var(--secondary-text)]">{text("充值與禮包只計成功的 coin_purchase_result。此期間若沒有成功事件，金額為 $0。訂閱仍看 RevenueCat。", "Recharge and bundles count successful coin_purchase_result events only. A period with no successes is $0. Subscriptions still come from RevenueCat.")}</p>
        <h3 className="mt-6 font-semibold">{text("M-coin 充值行為", "M-coin recharge actions")}</h3><Table rows={d.payments.recharge_funnel} columns={[{ key: "step", title: "Step" }, { key: "users", title: "Users" }, { key: "conversion", title: text("占活躍用戶", "Of active users"), format: "percent" }]} />
        <p className="text-xs text-[var(--secondary-text)]">{text("四步各自去重，不要求 flow_id 或先後。購買成功是 coin_purchase_result 且 result=success。", "Four independent user counts, with no flow_id or ordering. Purchase success is coin_purchase_result with result=success.")}</p>
        <h3 className="mt-6 font-semibold">{text("會員頁面行為與訂閱購買", "Membership actions and purchases")}</h3>
        <p className="mt-2 text-xs text-[var(--secondary-text)]">{text("前三行為頁面動作；Subscribed 包含自動續訂，各行獨立統計，占活躍用戶比例，不代表順序轉化。", "Page actions and Subscribed are independent counts; automatic renewals are included. Ratios use active users, not a sequential funnel.")}</p>
        <Table rows={d.payments.membership_funnel} columns={[{ key: "step", title: text("行為", "Action") }, { key: "users", title: text("使用者", "Users") }, { key: "conversion", title: text("占活躍用戶", "Of active users"), format: "percent" }]} />
        <h3 className="mt-6 font-semibold">{text("已訂閱：週／月／年", "Subscribed: weekly / monthly / annual")}</h3><p className="mt-2 text-xs text-[var(--secondary-text)]">{subscriptionNote}</p><SubscriptionTable d={d} columns={subcols} zh={zh} />
        <h3 className="mt-6 font-semibold">{text("訂閱計畫", "Subscription products")}</h3>
        {d.payments.products === null && !d.billing ? <Missing zh={zh} /> : <Table rows={d.payments.products ?? d.billing?.products ?? []} columns={[{ key: "period", title: text("週期", "Period") }, { key: "store", title: text("商店", "Store") }, { key: "product_id", title: "Product ID" }, { key: "users", title: text("去重訂閱購買人數", "Subscription purchasers") }, { key: "initial_users", title: text("初購人數", "Initial users") }, { key: "renewal_users", title: text("續訂人數", "Renewal users") }, { key: "purchases", title: text("訂閱次數", "Purchases") }, { key: "revenue", title: text("收入", "Revenue"), format: "money" }]} />}
        <details className="my-4 text-xs"><summary>{text("其他會員頁事件回報人數", "Other reported membership actions")}</summary><Table rows={d.payments.membership_extras} columns={[{ key: "event", title: text("事件", "Event") }, { key: "users", title: text("使用者", "Users") }]} /></details>
        <h3 className="mt-6 font-semibold">{text("送禮行為覆蓋", "Gift action coverage")}</h3><Table rows={d.payments.gift_funnel} columns={[{ key: "step", title: text("行為", "Action") }, { key: "users", title: text("使用者", "Users") }, { key: "conversion", title: text("占活躍用戶", "Of active users"), format: "percent" }]} />
        {d.meta.revenue_source === "revenuecat_chart" ? <>
          <h3 className="mt-6 font-semibold">{text("RevenueCat 每日內購收入", "RevenueCat daily IAP revenue")}</h3>
          <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.payments.revenuecat?.daily}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="revenue" name={text("內購收入（USD）", "IAP revenue (USD)")} fill="#49a44c" /></BarChart></ResponsiveContainer></div>
          <Table rows={d.payments.revenuecat?.daily || []} columns={[{ key: "date", title: text("日期（UTC）", "Date (UTC)") }, { key: "revenue", title: text("內購收入", "IAP revenue"), format: "money" }, { key: "transactions", title: text("交易次數（非人數）", "Transactions (not users)") }, { key: "incomplete", title: text("數據暫定", "Provisional") }]} />
        </> : <><h3 className="mt-6 font-semibold">{text("每日分類收入", "Revenue by day and category")}</h3><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.daily}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="recharge_revenue" name={text("充值頁", "Recharge")} stackId="revenue" fill="#49a44c" /><Bar dataKey="bundle_revenue" name={text("禮包", "Bundles")} stackId="revenue" fill="#f59e0b" /><Bar dataKey="subscription_revenue" name={text("訂閱", "Subscriptions")} stackId="revenue" fill="#818cf8" /><Bar dataKey="unknown_revenue" name={text("待歸類", "Unclassified")} stackId="revenue" fill="#94a3b8" /></BarChart></ResponsiveContainer></div></>}
        <h3 className="mt-6 font-semibold">{text("經濟流水", "Economy flows")}</h3><p className="mt-2 text-xs text-[var(--secondary-text)]">{text("期間內增減量，不代表錢包餘額。未驗證埋點或未接入流水時顯示 —。", "Period flows, not wallet balances. Unverified or disconnected sources display —.")}</p>
        <Grid>{Object.entries(d.economy).map(([key, value]) => <Card key={key} label={text(({ battery_charged: "電量獲得", battery_consumed: "電量消耗", coins_earned: "金幣獲得（完整流水）", coins_spent: "金幣消耗（完整流水）", reported_coin_rewards: "任務金幣獎勵回報量", ad_completions: "廣告完成回報次數", ad_forced: "強制廣告觸發回報次數", unlock_attempts: "解鎖嘗試回報次數", unlock_successes: "成功解鎖", balance_fails: "餘額不足回報次數" } as Record<string, string>)[key], key.replaceAll("_", " "))} value={value} note={key === "reported_coin_rewards" ? text("僅 coins_rewarded 的回報增量，不含購買等其他用途，不代表完整金幣流水。", "Reported coins_rewarded deltas only; excludes purchases and other purposes. Not a complete coin ledger.") : undefined} unavailable={text("尚缺完整事件／流水資料", "Complete event/ledger data not available")} />)}</Grid>
      </>}</Panel>}
    </main>
  </div></RangeContext.Provider>;
}
