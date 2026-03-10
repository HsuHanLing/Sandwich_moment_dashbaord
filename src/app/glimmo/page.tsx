"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { GlimmoDailyTrendChart } from "@/components/glimmo/GlimmoDailyTrendChart";
import { GlimmoDailyTrendTable } from "@/components/glimmo/GlimmoDailyTrendTable";
import { GlimmoOnboardingFunnel } from "@/components/glimmo/GlimmoOnboardingFunnel";
import { GlimmoFeatureAdoption } from "@/components/glimmo/GlimmoFeatureAdoption";
import { GlimmoFlywheelSection } from "@/components/glimmo/GlimmoFlywheelSection";
import { GlimmoHealthDashboard } from "@/components/glimmo/GlimmoHealthDashboard";
import { RetentionRateChart } from "@/components/RetentionRateChart";
import { GeoDistributionChart } from "@/components/GeoDistributionChart";
import { useLocale } from "@/contexts/LocaleContext";

type KPI = {
  dau: number;
  new_users: number;
  d1_retention: number;
  journal_entries: number;
  ai_users: number;
  sub_viewers: number;
  wow_dau: number;
  wow_new_users: number;
  wow_journal_entries: number;
  wow_ai_users: number;
  wow_sub_viewers: number;
  data_updated_at?: string;
};

type DailyRow = {
  date: string;
  dau: number;
  new_users: number;
  journal_entries: number;
  journal_users: number;
  ai_users: number;
  sub_viewers: number;
  collection_users: number;
  insight_users: number;
};

type FunnelStep = { step: string; label: string; users: number };

type FlywheelNode = {
  id: string;
  name: string;
  nameCn: string;
  metrics: Record<string, number>;
  status: "healthy" | "warning" | "broken";
  score: number;
  conversion: number | null;
  conversion_num?: number | null;
  conversion_denom?: number | null;
  benchmark: string;
};

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? "+100%" : "0%";
  const pct = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export default function GlimmoDashboardPage() {
  const { t, locale, setLocale } = useLocale();
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyRow[]>([]);
  const [kpiMode, setKpiMode] = useState<"today" | "7d" | "30d">("today");
  const [trendDays, setTrendDays] = useState(7);
  const [filterVersion, setFilterVersion] = useState("all");
  const [filterGeo, setFilterGeo] = useState("all");
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "growth" | "flywheel">("overview");
  const [authEnabled, setAuthEnabled] = useState(false);

  // Analytics tab state
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [onboardingFunnel, setOnboardingFunnel] = useState<FunnelStep[]>([]);
  const [featureAdoption, setFeatureAdoption] = useState<FunnelStep[]>([]);
  const [retention, setRetention] = useState<{ chart: { day: string; rate: number }[] }>({ chart: [] });
  const [geoDistribution, setGeoDistribution] = useState<{ region: string; region_name: string; users: number; share: number }[]>([]);
  const [userAttributes, setUserAttributes] = useState<{ device: { attr: string; users: number; share: number }[]; language: { attr: string; users: number; share: number }[] } | null>(null);
  const [flywheelData, setFlywheelData] = useState<{ nodes: FlywheelNode[]; overallScore: number; summary: Record<string, number>; days: number }>({ nodes: [], overallScore: 0, summary: {}, days: 30 });

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setAuthEnabled(d.enabled === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/glimmo/versions")
      .then((r) => r.json())
      .then((v) => Array.isArray(v) && setVersions(v))
      .catch(() => {});
  }, []);

  // KPI fetch
  useEffect(() => {
    async function fetchKPI() {
      const params = new URLSearchParams({ mode: kpiMode });
      if (filterVersion !== "all") params.set("version", filterVersion);
      if (filterGeo !== "all") params.set("geo", filterGeo);
      const r = await fetch(`/api/glimmo/kpi?${params}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setKpi(j);
    }
    fetchKPI().catch((e) => setError(String(e)));
  }, [kpiMode, filterVersion, filterGeo]);

  // Overview daily trend
  useEffect(() => {
    async function fetchOverviewData() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ days: String(trendDays) });
      if (filterVersion !== "all") params.set("version", filterVersion);
      if (filterGeo !== "all") params.set("geo", filterGeo);
      try {
        const res = await fetch(`/api/glimmo/daily-trend?${params}`);
        const dt = await res.json();
        if (Array.isArray(dt)) setDailyTrend(dt);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchOverviewData();
  }, [trendDays, filterVersion, filterGeo]);

  // Analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      setAnalyticsLoading(true);
      const qs = `?days=${analyticsDays}`;
      try {
        const [gf, ret, geo, ua, fw] = await Promise.all([
          fetch(`/api/glimmo/growth-funnel${qs}`).then((r) => r.json()).catch(() => ({ onboarding: [], featureAdoption: [] })),
          fetch(`/api/glimmo/retention${qs}`).then((r) => r.json()).catch(() => ({ chart: [] })),
          fetch(`/api/glimmo/geo-distribution${qs}`).then((r) => r.json()).catch(() => []),
          fetch(`/api/glimmo/user-attributes${qs}`).then((r) => r.json()).catch(() => ({ device: [], language: [] })),
          fetch(`/api/glimmo/flywheel${qs}`).then((r) => r.json()).catch(() => ({ nodes: [], overallScore: 0, summary: {}, days: 30 })),
        ]);
        if (gf.onboarding) setOnboardingFunnel(gf.onboarding);
        if (gf.featureAdoption) setFeatureAdoption(gf.featureAdoption);
        if (ret?.chart) setRetention(ret);
        if (Array.isArray(geo)) setGeoDistribution(geo);
        if (ua?.device) setUserAttributes(ua);
        if (fw?.nodes) setFlywheelData(fw);
      } catch (e) {
        console.error("Glimmo analytics error:", e);
      } finally {
        setAnalyticsLoading(false);
      }
    }
    fetchAnalytics();
  }, [analyticsDays]);

  const tStr = t as (key: string) => string;

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

  return (
    <div className="glimmo-theme flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <img src="/glimmo-logo.png" alt="Glimmo" className="h-7 w-auto rounded-md" />
            <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full p-1" style={{ backgroundColor: "var(--pill-bg)", boxShadow: "var(--shadow-sm)" }}>
              {(["overview", "growth", "flywheel"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab ? "text-white" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"
                  }`}
                  style={activeTab === tab ? { backgroundColor: "var(--accent)", boxShadow: "var(--shadow-sm)" } : undefined}
                >
                  {t(`glimmoTab_${tab}`)}
                </button>
              ))}
            </div>
            {authEnabled && (
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
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
            {error}
          </div>
        )}

        {/* ──── Overview Tab ──── */}
        {activeTab === "overview" && (
          <>
            {/* Filters */}
            <section className="mb-6 flex flex-wrap gap-3">
              <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterVersion")}</label>
                <select
                  value={filterVersion}
                  onChange={(e) => setFilterVersion(e.target.value)}
                  className="min-w-[140px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <option value="all">{t("all")}</option>
                  {versions.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterGeo")}</label>
                <select
                  value={filterGeo}
                  onChange={(e) => setFilterGeo(e.target.value)}
                  className="min-w-[160px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <option value="all">{t("all")}</option>
                  <option value="United States">United States</option>
                  <option value="China">China</option>
                  <option value="Brazil">Brazil</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Italy">Italy</option>
                  <option value="India">India</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                </select>
              </div>
            </section>

            {/* Core KPIs */}
            <section className="mb-8">
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold tracking-tight">
                  {t("glimmoKpi")}
                  <span className="ml-2 font-normal text-[11px] text-[var(--secondary-text)]">
                    {t("dataRange")}: {todayStr}
                    {kpi?.data_updated_at && <> · {t("lastUpdated")}: {kpi.data_updated_at}</>}
                  </span>
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="text-[11px] font-medium text-[var(--secondary-text)]">{t("kpiPeriod")}:</label>
                  <select
                    value={kpiMode}
                    onChange={(e) => setKpiMode(e.target.value as "today" | "7d" | "30d")}
                    className="rounded-lg bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)]"
                    style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
                  >
                    <option value="today">{t("today")}</option>
                    <option value="7d">{t("days7")}</option>
                    <option value="30d">{t("days30")}</option>
                  </select>
                </div>
              </div>

              {kpi && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <KPICard
                    title="DAU"
                    value={kpi.dau.toLocaleString()}
                    change={pctChange(kpi.dau, kpi.wow_dau)}
                    changePositive={kpi.dau >= kpi.wow_dau}
                    metricKey="DAU"
                    vsLabel={t("vs7d")}
                  />
                  <KPICard
                    title={t("glimmoNewUsers")}
                    value={kpi.new_users.toLocaleString()}
                    change={pctChange(kpi.new_users, kpi.wow_new_users)}
                    changePositive={kpi.new_users >= kpi.wow_new_users}
                    metricKey="GLIMMO_NEW_USERS"
                    vsLabel={t("vs7d")}
                  />
                  <KPICard
                    title={t("glimmoD1Retention")}
                    value={`${kpi.d1_retention}%`}
                    change=""
                    metricKey="D1_RETENTION"
                    vsLabel={t("glimmoD1Note")}
                  />
                  <KPICard
                    title={t("glimmoEntries")}
                    value={kpi.journal_entries.toLocaleString()}
                    change={pctChange(kpi.journal_entries, kpi.wow_journal_entries)}
                    changePositive={kpi.journal_entries >= kpi.wow_journal_entries}
                    metricKey="GLIMMO_ENTRIES"
                    vsLabel={t("vs7d")}
                  />
                  <KPICard
                    title={t("glimmoAIUsers")}
                    value={kpi.ai_users.toLocaleString()}
                    change={pctChange(kpi.ai_users, kpi.wow_ai_users)}
                    changePositive={kpi.ai_users >= kpi.wow_ai_users}
                    metricKey="GLIMMO_AI_USERS"
                    vsLabel={t("vs7d")}
                  />
                  <KPICard
                    title={t("glimmoSubViewers")}
                    value={kpi.sub_viewers.toLocaleString()}
                    change={pctChange(kpi.sub_viewers, kpi.wow_sub_viewers)}
                    changePositive={kpi.sub_viewers >= kpi.wow_sub_viewers}
                    metricKey="GLIMMO_SUB_VIEWERS"
                    vsLabel={t("vs7d")}
                  />
                </div>
              )}
            </section>

            {/* Daily Trend */}
            <section className="mb-8">
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold tracking-tight">
                  {t("dailyTrend")}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="text-[11px] font-medium text-[var(--secondary-text)]">{t("trendRange")}:</label>
                  <select
                    value={trendDays}
                    onChange={(e) => setTrendDays(Number(e.target.value))}
                    className="rounded-lg bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)]"
                    style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}
                  >
                    <option value={7}>7 {t("days")}</option>
                    <option value={14}>14 {t("days")}</option>
                    <option value={30}>30 {t("days")}</option>
                  </select>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <div className="p-4 sm:p-5">
                  <GlimmoDailyTrendChart data={dailyTrend} />
                  <div className="mt-5">
                    <GlimmoDailyTrendTable data={dailyTrend} t={tStr} />
                  </div>
                </div>
              </div>
            </section>

            {/* Health Dashboard */}
            <GlimmoHealthDashboard t={tStr} />
          </>
        )}

        {/* Shared Period Selector for non-overview tabs */}
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
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-60 ${
                        analyticsDays === d ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"
                      }`}
                      style={analyticsDays === d ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
                    >
                      {d}{t("days")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[var(--secondary-text)]">
                <span>
                  {t("dataRange")}:{" "}
                  <strong className="font-semibold text-[var(--foreground)]">
                    {(() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(start.getDate() - analyticsDays);
                      return `${start.toISOString().slice(0, 10)} ~ ${end.toISOString().slice(0, 10)}`;
                    })()}
                  </strong>
                </span>
                <span>·</span>
                <span>{t("lastUpdated")}: {todayStr}</span>
                {analyticsLoading && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
                      {t("loadingText")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ──── Growth Tab ──── */}
        {activeTab === "growth" && (
          <>
            {/* Onboarding Funnel */}
            <GlimmoOnboardingFunnel data={onboardingFunnel} loading={analyticsLoading} days={analyticsDays} t={tStr} />

            {/* Feature Adoption */}
            <GlimmoFeatureAdoption data={featureAdoption} loading={analyticsLoading} days={analyticsDays} t={tStr} />

            {/* Retention */}
            <section className="mb-8 overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
              <div className="overflow-visible p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold tracking-tight">{t("retentionRate")}</h2>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
                    {t("lastNDays").replace("{n}", String(analyticsDays))}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("glimmoRetentionDesc")}</p>
                <div className="mt-4">
                  <RetentionRateChart chart={retention.chart.map((r) => ({ ...r, wow: 0 }))} />
                </div>
              </div>
            </section>

            {/* User Attributes & Geo */}
            <div className="mb-8 grid gap-4 lg:grid-cols-2 overflow-visible">
              {/* Device / Language breakdown */}
              <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <div className="p-4 sm:p-5 overflow-visible">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold tracking-tight">{t("glimmoUserAttributes")}</h2>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
                      {t("lastNDays").replace("{n}", String(analyticsDays))}
                    </span>
                  </div>
                  {userAttributes ? (
                    <div className="mt-4 space-y-4">
                      <div>
                        <h3 className="mb-2 text-[11px] font-medium text-[var(--secondary-text)]">{t("glimmoDeviceDist")}</h3>
                        <div className="space-y-1.5">
                          {userAttributes.device.slice(0, 8).map((d) => (
                            <div key={d.attr} className="flex items-center gap-2 text-[11px]">
                              <span className="w-[140px] truncate text-[var(--foreground)]">{d.attr}</span>
                              <div className="flex-1">
                                <div className="h-4 overflow-hidden rounded" style={{ backgroundColor: "var(--background)" }}>
                                  <div className="h-full rounded" style={{ width: `${Math.max(d.share, 2)}%`, backgroundColor: "var(--accent)", opacity: 0.7 }} />
                                </div>
                              </div>
                              <span className="w-[50px] text-right text-[var(--secondary-text)]">{d.share}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-2 text-[11px] font-medium text-[var(--secondary-text)]">{t("glimmoLanguageDist")}</h3>
                        <div className="space-y-1.5">
                          {userAttributes.language.slice(0, 8).map((l) => (
                            <div key={l.attr} className="flex items-center gap-2 text-[11px]">
                              <span className="w-[100px] truncate text-[var(--foreground)]">{l.attr}</span>
                              <div className="flex-1">
                                <div className="h-4 overflow-hidden rounded" style={{ backgroundColor: "var(--background)" }}>
                                  <div className="h-full rounded" style={{ width: `${Math.max(l.share, 2)}%`, backgroundColor: "#8b5cf6", opacity: 0.7 }} />
                                </div>
                              </div>
                              <span className="w-[50px] text-right text-[var(--secondary-text)]">{l.share}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
                  )}
                </div>
              </section>

              {/* Geo Distribution */}
              <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
                <div className="p-4 sm:p-5 overflow-visible">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold tracking-tight">{t("geoDistribution")}</h2>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
                      {t("lastNDays").replace("{n}", String(analyticsDays))}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("geoDistributionDesc")}</p>
                  <div className="mt-4">
                    <GeoDistributionChart data={geoDistribution} />
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {/* ──── Flywheel Tab ──── */}
        {activeTab === "flywheel" && (
          <GlimmoFlywheelSection
            nodes={flywheelData.nodes}
            overallScore={flywheelData.overallScore}
            summary={flywheelData.summary}
            days={analyticsDays}
            t={tStr}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card-bg)]/50 py-4">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-8">
          <p className="text-[11px] text-[var(--secondary-text)]">
            © Ahoy Analytics Center · Glimmo Dashboard · Secure access
          </p>
          <div className="flex items-center gap-1 rounded-full p-1" style={{ backgroundColor: "var(--pill-bg)", boxShadow: "var(--shadow-sm)" }}>
            <button
              onClick={() => setLocale("en")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${locale === "en" ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`}
              style={locale === "en" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("zh")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${locale === "zh" ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`}
              style={locale === "zh" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
            >
              中文
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
