"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { KPICard } from "@/components/KPICard";
import { DailyTrendChart } from "@/components/DailyTrendChart";
import { DailyTrendTable } from "@/components/DailyTrendTable";
import { GrowthFunnelChart } from "@/components/GrowthFunnelChart";
import { RetentionRateChart } from "@/components/RetentionRateChart";
import { GeoDistributionChart } from "@/components/GeoDistributionChart";
import { SessionQualitySection } from "@/components/SessionQualitySection";
import { BehaviourSection } from "@/components/BehaviourSection";
import { MonetisationSection } from "@/components/MonetisationSection";
import { HealthDashboard } from "@/components/HealthDashboard";
import { TopEventsChart } from "@/components/TopEventsChart";
import { UserAttributesChart } from "@/components/UserAttributesChart";
import { useLocale } from "@/contexts/LocaleContext";

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? "+100%" : "0%";
  const pct = ((curr - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}

type KPI = {
  data_range_start?: string;
  data_range_end?: string;
  dau: number;
  new_users: number;
  chatters: number;
  sessions_per_user: number;
  avg_msgs_per_session: number;
  avg_session_duration: number;
  dispose_rate: number;
  activation_rate: number;
  revenue: number;
  arpu: number;
  d1_retention: number;
  gift_users: number;
  wow_dau: number;
  wow_sessions_per_user: number;
  wow_avg_msgs: number;
  wow_avg_duration: number;
  wow_revenue: number;
  wow_arpu: number;
  wow_d1_retention: number;
  wow_activation_rate: number;
};

type DailyRow = {
  date: string;
  dau: number;
  new_users: number;
  chatters: number;
  total_messages: number;
  sessions: number;
  disposed_sessions: number;
  avg_msgs_per_session: number;
  avg_session_duration_sec: number;
  revenue: number;
  gift_users: number;
};

export default function DashboardPage() {
  const { t, locale, setLocale } = useLocale();
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyRow[]>([]);
  const [kpiMode, setKpiMode] = useState<"today" | "7d" | "30d">("today");
  const [trendDays, setTrendDays] = useState(7);
  const [filterVersion, setFilterVersion] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterGeo, setFilterGeo] = useState("all");
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "activation" | "sessions" | "behaviour" | "retention" | "monetisation">("overview");
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(false);

  // Activation
  const [activationFunnel, setActivationFunnel] = useState<{ step: string; label: string; users: number; conversion: number }[]>([]);
  // Session Quality
  const [sessionData, setSessionData] = useState<{ summary: Record<string, number>; message_distribution: { bucket: string; session_count: number }[]; duration_distribution: { bucket: string; session_count: number }[] } | null>(null);
  // Behaviour
  const [behaviourData, setBehaviourData] = useState<{ daily: Record<string, unknown>[]; personas: Record<string, unknown>[] } | null>(null);
  // Retention
  const [retentionData, setRetentionData] = useState<{ retention: { day: string; retained: number; cohort_size: number; rate: number }[]; returning_sessions: Record<string, unknown>[] } | null>(null);
  // Monetisation
  const [monetisationData, setMonetisationData] = useState<Record<string, unknown> | null>(null);
  // Economy
  const [economyData, setEconomyData] = useState<Record<string, unknown> | null>(null);
  // Geo & Attributes
  const [geoData, setGeoData] = useState<{ region: string; region_name: string; users: number; share: number }[]>([]);
  const [userAttributes, setUserAttributes] = useState<{ device: { attr: string; users: number; share: number }[]; language: { attr: string; users: number; share: number }[] } | null>(null);
  // Health
  const [healthData, setHealthData] = useState<{ indicators: { id: string; label: string; value: number; unit: string; status: string }[]; revenue: number; dau_avg: number } | null>(null);
  // Top Events
  const [topEvents, setTopEvents] = useState<{ event: string; count: number; users: number }[]>([]);

  const analyticsLoadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/status").then((r) => r.json()).then((d) => setAuthEnabled(d.enabled === true)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/moment/versions").then((r) => r.json()).then((v) => Array.isArray(v) && setVersions(v)).catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchKPI() {
      const params = new URLSearchParams({ mode: kpiMode });
      if (filterVersion !== "all") params.set("version", filterVersion);
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      if (filterGeo !== "all") params.set("geo", filterGeo);
      const r = await fetch(`/api/moment/kpi?${params}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setKpi(j);
    }
    fetchKPI().catch((e) => setError(String(e)));
  }, [kpiMode, filterVersion, filterPlatform, filterGeo]);

  useEffect(() => {
    async function fetchOverviewData() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ days: String(trendDays) });
      if (filterVersion !== "all") params.set("version", filterVersion);
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      if (filterGeo !== "all") params.set("geo", filterGeo);
      try {
        const [dt, hd, te] = await Promise.all([
          fetch(`/api/moment/daily-trend?${params}`).then((r) => r.json()),
          fetch(`/api/moment/health-dashboard?days=${trendDays}`).then((r) => r.json()).catch(() => null),
          fetch(`/api/moment/top-events?days=${trendDays}`).then((r) => r.json()).catch(() => []),
        ]);
        if (Array.isArray(dt)) setDailyTrend(dt);
        if (hd?.indicators) setHealthData(hd);
        if (Array.isArray(te)) setTopEvents(te);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchOverviewData();
  }, [trendDays, filterVersion, filterPlatform, filterGeo]);

  const fetchTabData = useCallback(async (tab: string, days: number) => {
    const qs = `?days=${days}`;
    if (tab === "activation") {
      const [funnel, geo, attrs] = await Promise.all([
        fetch(`/api/moment/activation-funnel${qs}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/moment/geo${qs}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/moment/user-attributes${qs}`).then((r) => r.json()).catch(() => null),
      ]);
      if (Array.isArray(funnel)) setActivationFunnel(funnel);
      if (Array.isArray(geo)) setGeoData(geo);
      if (attrs) setUserAttributes(attrs);
    } else if (tab === "sessions") {
      const data = await fetch(`/api/moment/session-quality${qs}`).then((r) => r.json()).catch(() => null);
      if (data) setSessionData(data);
    } else if (tab === "behaviour") {
      const data = await fetch(`/api/moment/behaviour${qs}`).then((r) => r.json()).catch(() => null);
      if (data) setBehaviourData(data);
    } else if (tab === "retention") {
      const data = await fetch(`/api/moment/retention${qs}`).then((r) => r.json()).catch(() => null);
      if (data) setRetentionData(data);
    } else if (tab === "monetisation") {
      const [mon, econ] = await Promise.all([
        fetch(`/api/moment/monetisation${qs}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/moment/economy${qs}`).then((r) => r.json()).catch(() => null),
      ]);
      if (mon) setMonetisationData(mon);
      if (econ) setEconomyData(econ);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "overview") return;
    const key = `${activeTab}-${analyticsDays}`;
    if (analyticsLoadedRef.current.has(key)) return;
    let cancelled = false;
    (async () => {
      setAnalyticsLoading(true);
      try {
        await fetchTabData(activeTab, analyticsDays);
        if (!cancelled) analyticsLoadedRef.current.add(key);
      } catch (e) {
        console.error("Tab fetch error:", e);
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, analyticsDays, fetchTabData]);

  if (loading && !kpi) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          <p className="mt-4 text-[var(--secondary-text)]">{t("loading")}</p>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const tStr = t as (key: string) => string;
  const tabs = ["overview", "activation", "sessions", "behaviour", "retention", "monetisation"] as const;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/moment-logo.png"
              alt="Moment"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-lg object-contain"
              priority
            />
            <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">{t("title")}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full p-1" style={{ backgroundColor: "var(--pill-bg)", boxShadow: "var(--shadow-sm)" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${activeTab === tab ? "text-white" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`}
                  style={activeTab === tab ? { backgroundColor: "var(--accent)", boxShadow: "var(--shadow-sm)" } : undefined}
                >
                  {t(`tab_${tab}`)}
                </button>
              ))}
            </div>
            {authEnabled && (
              <button
                onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--secondary-text)] hover:text-[var(--foreground)]"
              >
                {t("signOut")}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8">
        {error && (
          <div className="mb-6 rounded-xl bg-[var(--card-bg)] p-4 text-[var(--foreground)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            {error}. {t("errorMock")}
          </div>
        )}

        {/* ═══ Tab 1: Overview ═══ */}
        {activeTab === "overview" && (
          <>
            {/* Filters */}
            <section className="mb-6 flex flex-wrap gap-3">
              <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)" }}>
                <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterVersion")}</label>
                <select value={filterVersion} onChange={(e) => setFilterVersion(e.target.value)} className="min-w-[120px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]" style={{ border: "1px solid var(--border)" }}>
                  <option value="all">{t("all")}</option>
                  {versions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)" }}>
                <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterPlatform")}</label>
                <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="min-w-[120px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]" style={{ border: "1px solid var(--border)" }}>
                  <option value="all">{t("all")}</option>
                  <option value="ANDROID">{t("filterPlatformAndroid")}</option>
                  <option value="IOS">{t("filterPlatformIos")}</option>
                </select>
              </div>
              <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)" }}>
                <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterGeo")}</label>
                <select value={filterGeo} onChange={(e) => setFilterGeo(e.target.value)} className="min-w-[120px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]" style={{ border: "1px solid var(--border)" }}>
                  <option value="all">{t("all")}</option>
                </select>
              </div>
            </section>

            {/* Core KPIs */}
            <section className="mb-8">
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold tracking-tight">
                  {t("coreKpi")}
                  <span className="ml-2 font-normal text-[11px] text-[var(--secondary-text)]">
                    {kpi?.data_range_start && kpi?.data_range_end ? `${t("dataRange")}: ${kpi.data_range_start} ~ ${kpi.data_range_end}` : `${t("dataRange")}: ${todayStr}`}
                  </span>
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="text-[11px] font-medium text-[var(--secondary-text)]">{t("kpiPeriod")}:</label>
                  <select value={kpiMode} onChange={(e) => setKpiMode(e.target.value as "today" | "7d" | "30d")} className="rounded-lg bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)]" style={{ border: "1px solid var(--card-stroke)" }}>
                    <option value="today">{t("today")}</option>
                    <option value="7d">{t("days7")}</option>
                    <option value="30d">{t("days30")}</option>
                  </select>
                </div>
              </div>

              {kpi && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10">
                  <KPICard title={t("kpiDau")} value={kpi.dau.toLocaleString()} change={pctChange(kpi.dau, kpi.wow_dau)} changePositive={kpi.dau >= kpi.wow_dau} metricKey="DAU" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiNewUsers")} value={kpi.new_users.toLocaleString()} metricKey="NEW_USERS" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiSessionsPerUser")} value={kpi.sessions_per_user.toFixed(2)} change={pctChange(kpi.sessions_per_user, kpi.wow_sessions_per_user)} changePositive={kpi.sessions_per_user >= kpi.wow_sessions_per_user} metricKey="SESSIONS_PER_USER" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiAvgMsgs")} value={kpi.avg_msgs_per_session.toFixed(1)} change={pctChange(kpi.avg_msgs_per_session, kpi.wow_avg_msgs)} changePositive={kpi.avg_msgs_per_session >= kpi.wow_avg_msgs} metricKey="AVG_MSGS_PER_SESSION" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiAvgDuration")} value={`${kpi.avg_session_duration}s`} change={pctChange(kpi.avg_session_duration, kpi.wow_avg_duration)} changePositive={kpi.avg_session_duration >= kpi.wow_avg_duration} metricKey="AVG_SESSION_DURATION" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiActivation")} value={`${kpi.activation_rate}%`} change={pctChange(kpi.activation_rate, kpi.wow_activation_rate)} changePositive={kpi.activation_rate >= kpi.wow_activation_rate} metricKey="ACTIVATION_RATE" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiD1")} value={`${kpi.d1_retention}%`} change={pctChange(kpi.d1_retention, kpi.wow_d1_retention)} changePositive={kpi.d1_retention >= kpi.wow_d1_retention} metricKey="D1_RETENTION" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiDisposeRate")} value={`${kpi.dispose_rate}%`} metricKey="DISPOSE_RATE" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiRevenue")} value={formatCurrency(kpi.revenue)} change={pctChange(kpi.revenue, kpi.wow_revenue)} changePositive={kpi.revenue >= kpi.wow_revenue} metricKey="REVENUE" vsLabel={t("vs7d")} />
                  <KPICard title={t("kpiArpu")} value={formatCurrency(kpi.arpu)} change={pctChange(kpi.arpu, kpi.wow_arpu)} changePositive={kpi.arpu >= kpi.wow_arpu} metricKey="ARPU" vsLabel={t("vs7d")} />
                </div>
              )}
            </section>

            {/* Daily Trend */}
            <section className="mb-8">
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold tracking-tight">{t("dailyTrend")}</h2>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="text-[11px] font-medium text-[var(--secondary-text)]">{t("trendRange")}:</label>
                  <select value={trendDays} onChange={(e) => setTrendDays(Number(e.target.value))} className="rounded-lg bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)]" style={{ border: "1px solid var(--card-stroke)" }}>
                    <option value={7}>7 {t("days")}</option>
                    <option value={14}>14 {t("days")}</option>
                    <option value={30}>30 {t("days")}</option>
                  </select>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <div className="p-4 sm:p-5">
                  <DailyTrendChart data={dailyTrend} />
                  <div className="mt-5">
                    <DailyTrendTable data={dailyTrend} />
                  </div>
                </div>
              </div>
            </section>

            {/* Health Dashboard */}
            {healthData && <HealthDashboard data={healthData} t={tStr} />}

            {/* Top Events */}
            {topEvents.length > 0 && (
              <section className="mb-8 overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <div className="p-4 sm:p-5">
                  <h2 className="text-base font-semibold tracking-tight">{t("topEventsTitle")}</h2>
                  <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("topEventsDesc")}</p>
                  <div className="mt-4"><TopEventsChart data={topEvents} /></div>
                </div>
              </section>
            )}
          </>
        )}

        {/* Period selector for non-overview tabs */}
        {activeTab !== "overview" && (
          <section className="mb-6">
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[var(--card-bg)] px-5 py-4" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-[var(--secondary-text)]">{t("analyticsPeriod")}:</label>
                <div className="flex rounded-full p-0.5" style={{ backgroundColor: "var(--pill-bg)" }}>
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setAnalyticsDays(d)}
                      disabled={analyticsLoading}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-60 ${analyticsDays === d ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`}
                      style={analyticsDays === d ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
                    >
                      {d}{t("days")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[var(--secondary-text)]">
                <span>{t("lastUpdated")}: {todayStr}</span>
                {analyticsLoading && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
                    {t("loadingText")}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══ Tab 2: Activation ═══ */}
        {activeTab === "activation" && (
          <>
            <section className="mb-8 overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
              <div className="p-4 sm:p-5">
                <h2 className="text-base font-semibold tracking-tight">{t("activationTitle")}</h2>
                <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("activationDesc")}</p>
                <div className="mt-4"><GrowthFunnelChart data={activationFunnel} days={analyticsDays} /></div>
              </div>
            </section>
            <div className="mb-8 grid gap-4 lg:grid-cols-2">
              <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <div className="p-4 sm:p-5">
                  <h2 className="text-base font-semibold tracking-tight">{t("geoTitle")}</h2>
                  <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("geoDesc")}</p>
                  <div className="mt-4"><GeoDistributionChart data={geoData} /></div>
                </div>
              </section>
              <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <div className="p-4 sm:p-5">
                  <h2 className="text-base font-semibold tracking-tight">{t("userAttrTitle")}</h2>
                  <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("userAttrDesc")}</p>
                  {userAttributes ? (
                    <div className="mt-4"><UserAttributesChart age={userAttributes.device} device={userAttributes.language} ageLabel={t("deviceDist")} deviceLabel={t("languageDist")} /></div>
                  ) : (
                    <p className="mt-4 text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {/* ═══ Tab 3: Session Quality ═══ */}
        {activeTab === "sessions" && (
          <SessionQualitySection data={sessionData} loading={analyticsLoading} t={tStr} />
        )}

        {/* ═══ Tab 4: Behaviour ═══ */}
        {activeTab === "behaviour" && (
          <BehaviourSection data={behaviourData} loading={analyticsLoading} t={tStr} />
        )}

        {/* ═══ Tab 5: Retention ═══ */}
        {activeTab === "retention" && retentionData && (
          <>
            <section className="mb-8 overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
              <div className="p-4 sm:p-5">
                <h2 className="text-base font-semibold tracking-tight">{t("retentionTitle")}</h2>
                <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("retentionDesc")}</p>
                <div className="mt-4">
                  <RetentionRateChart chart={retentionData.retention} cohortType="signup" />
                </div>
              </div>
            </section>
            <section className="mb-8 overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
              <div className="p-4 sm:p-5">
                <h2 className="text-base font-semibold tracking-tight">{t("returningTitle")}</h2>
                <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("returningDesc")}</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-[var(--secondary-text)]">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium text-right">Active</th>
                        <th className="px-3 py-2 font-medium text-right">Returning</th>
                        <th className="px-3 py-2 font-medium text-right">Sessions</th>
                        <th className="px-3 py-2 font-medium text-right">Ret. Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(retentionData.returning_sessions as { date: string; active_users: number; returning_users: number; total_sessions: number; returning_sessions: number }[]).map((r) => (
                        <tr key={r.date} className="border-b border-[var(--border)]">
                          <td className="px-3 py-2 font-medium">{r.date}</td>
                          <td className="px-3 py-2 text-right">{r.active_users.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{r.returning_users.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{r.total_sessions.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{r.returning_sessions.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ═══ Tab 6: Monetisation ═══ */}
        {activeTab === "monetisation" && (
          <MonetisationSection
            data={monetisationData}
            economyData={economyData}
            loading={analyticsLoading}
            t={tStr}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card-bg)]/50 py-4">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-8">
          <p className="text-[11px] text-[var(--secondary-text)]">© Moment Analytics · Secure access</p>
          <div className="flex items-center gap-1 rounded-full p-1" style={{ backgroundColor: "var(--pill-bg)", boxShadow: "var(--shadow-sm)" }}>
            <button onClick={() => setLocale("en")} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${locale === "en" ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`} style={locale === "en" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}>EN</button>
            <button onClick={() => setLocale("zh")} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${locale === "zh" ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`} style={locale === "zh" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}>中文</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
