"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { DailyTrendChart } from "@/components/DailyTrendChart";
import { DailyTrendTable } from "@/components/DailyTrendTable";
import { UserAttributesChart } from "@/components/UserAttributesChart";
import { GeoDistributionChart } from "@/components/GeoDistributionChart";
import { CreatorSupplyChart } from "@/components/CreatorSupplyChart";
import { GrowthFunnelChart } from "@/components/GrowthFunnelChart";
import { RetentionRateChart } from "@/components/RetentionRateChart";
import { MonetizationChart } from "@/components/MonetizationChart";
import { EconomyHealthChart } from "@/components/EconomyHealthChart";
import { ContentFeedChart } from "@/components/ContentFeedChart";
import { AIChatWidget } from "@/components/AIChatWidget";
import type { DashboardContext } from "@/components/AIChatWidget";
import { useLocale } from "@/contexts/LocaleContext";

type KPI = {
  data_range_start?: string;
  data_range_end?: string;
  data_updated_at?: string | null;
  dau: number;
  d1_retention: number;
  pay_rate: number;
  arppu: number;
  revenue: number;
  withdrawal: number;
  roi: number;
  wow_dau: number;
  wow_d1: number;
  wow_pay_rate: number;
  wow_arppu: number;
  wow_revenue: number;
  wow_withdrawal: number;
  wow_roi: number;
};

type DailyRow = {
  date: string;
  new_users: number;
  dau: number;
  d1: string;
  unlock_users: number;
  unlock_ge2: number;
  payers: number;
  revenue: number;
  withdrawal: number;
};

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? "+100%" : "0%";
  const pct = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
}

export default function DashboardPage() {
  const { t, locale, setLocale } = useLocale();
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [dailyTrend, setDailyTrend] = useState<DailyRow[]>([]);
  const [kpiMode, setKpiMode] = useState<"today" | "7d" | "30d">("today");
  const [trendDays, setTrendDays] = useState(7);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterVersion, setFilterVersion] = useState("all");
  const [filterUserSegment, setFilterUserSegment] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAttributes, setUserAttributes] = useState<{ age: { attr: string; users: number; share: number }[]; device: { attr: string; users: number; share: number }[] } | null>(null);
  const [geoDistribution, setGeoDistribution] = useState<{ region: string; region_name: string; users: number; share: number }[]>([]);
  const [creatorSupply, setCreatorSupply] = useState<{ weekly: { week: string; kol_earnings: number; regular_earnings: number }[]; metrics: Record<string, number> } | null>(null);
  const [growthFunnel, setGrowthFunnel] = useState<{ step: string; stepLabel: string; users: number; conversion: number }[]>([]);
  const [retention, setRetention] = useState<{ chart: { day: string; rate: number; wow: number }[] }>({ chart: [] });
  const [monetization, setMonetization] = useState<{ revenue_stream: string; revenue: number; share: number; roi: number }[]>([]);
  const [economyHealth, setEconomyHealth] = useState<{ chart: { indicator: string; value: number; label: string }[]; metrics: { indicator: string; value: string }[] } | null>(null);
  const [contentFeed, setContentFeed] = useState<{ circle: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[]; featureCards: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[]; exclusives: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");
  const [authEnabled, setAuthEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setAuthEnabled(d.enabled === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/marketing/versions")
      .then((r) => r.json())
      .then((v) => Array.isArray(v) && setVersions(v))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchKPI() {
      const params = new URLSearchParams({ mode: kpiMode });
      if (filterChannel !== "all") params.set("channel", filterChannel);
      if (filterVersion !== "all") params.set("version", filterVersion);
      if (filterUserSegment !== "all") params.set("userSegment", filterUserSegment);
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      const r = await fetch(`/api/marketing/kpi?${params}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setKpi(j);
    }
    fetchKPI().catch((e) => setError(String(e)));
  }, [kpiMode, filterChannel, filterVersion, filterUserSegment, filterPlatform]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ days: String(trendDays) });
      if (filterChannel !== "all") params.set("channel", filterChannel);
      if (filterVersion !== "all") params.set("version", filterVersion);
      if (filterUserSegment !== "all") params.set("userSegment", filterUserSegment);
      if (filterPlatform !== "all") params.set("platform", filterPlatform);
      const qs = `?${params}`;
      try {
        const [dt, o, ua, geo, cs, gf, ret, mon, eh, cf] = await Promise.all([
          fetch(`/api/marketing/daily-trend${qs}`).then((r) => r.json()),
          fetch(`/api/marketing/overview${qs}`).then((r) => r.json()),
          fetch(`/api/marketing/user-attributes${qs}`).then((r) => r.json()),
          fetch(`/api/marketing/geo-distribution${qs}`).then((r) => r.json()),
          fetch(`/api/marketing/creator-supply${qs}`).then((r) => r.json()),
          fetch(`/api/marketing/growth-funnel?days=7`).then((r) => (r.ok ? r.json() : [])),
          fetch(`/api/marketing/retention${qs}`).then((r) => (r.ok ? r.json() : { chart: [] })),
          fetch(`/api/marketing/monetization${qs}`).then((r) => r.json()),
          fetch(`/api/marketing/economy-health${qs}`).then((r) => r.json()),
          fetch(`/api/marketing/content-feed${qs}`).then((r) => r.json()),
        ]);
        if (Array.isArray(dt)) setDailyTrend(dt);
        if (o.error) throw new Error(o.error);
        if (ua?.age && ua?.device) setUserAttributes(ua);
        if (Array.isArray(geo)) setGeoDistribution(geo);
        if (cs?.weekly && cs?.metrics) setCreatorSupply(cs);
        if (Array.isArray(gf)) setGrowthFunnel(gf);
        if (ret?.chart) setRetention(ret);
        if (Array.isArray(mon)) setMonetization(mon);
        if (eh?.chart && eh?.metrics) setEconomyHealth(eh);
        if (cf?.circle && cf?.featureCards && cf?.exclusives) setContentFeed(cf);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [trendDays, filterChannel, filterVersion, filterUserSegment, filterPlatform]);

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
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo2.png" alt="" className="h-7 w-auto rounded-md" />
            <h1 className="text-base font-semibold uppercase tracking-tight">{t("title")}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher - Apple-style */}
            <div className="flex rounded-full p-1" style={{ backgroundColor: "var(--pill-bg)", boxShadow: "var(--shadow-sm)" }}>
              <button
                onClick={() => setActiveTab("overview")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === "overview"
                    ? "text-[var(--foreground)]"
                    : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"
                }`}
                style={activeTab === "overview" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
              >
                {t("tabOverview")}
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === "analytics"
                    ? "text-[var(--foreground)]"
                    : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"
                }`}
                style={activeTab === "analytics" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
              >
                {t("tabAnalytics")}
              </button>
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
            {error}. {t("errorMock")}
          </div>
        )}

        {/* Tab 1: Overview - Core KPI + Daily Trend */}
        {activeTab === "overview" && (
          <>
        {/* Overview Filters */}
        <section className="mb-6 flex flex-wrap gap-3">
          <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterChannel")}</label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              disabled={loading}
              className="min-w-[140px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ border: "1px solid var(--border)" }}
            >
              <option value="all">{t("all")}</option>
              <option value="organic">{t("filterChannelOrganic")}</option>
              <option value="paid">{t("filterChannelPaid")}</option>
              <option value="social">{t("filterChannelSocial")}</option>
              <option value="app_store">{t("filterChannelAppStore")}</option>
            </select>
          </div>
          <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterVersion")}</label>
            <select
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value)}
              disabled={loading}
              className="min-w-[140px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ border: "1px solid var(--border)" }}
            >
              <option value="all">{t("all")}</option>
              {versions.map((v) => (
                <option key={v} value={v === "(not set)" ? "(not set)" : v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterPlatform")}</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              disabled={loading}
              className="min-w-[140px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ border: "1px solid var(--border)" }}
            >
              <option value="all">{t("all")}</option>
              <option value="ANDROID">{t("filterPlatformAndroid")}</option>
              <option value="IOS">{t("filterPlatformIos")}</option>
              <option value="WEB">{t("filterPlatformWeb")}</option>
            </select>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-[var(--card-bg)] px-4 py-3" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--secondary-text)]">{t("filterUserSegment")}</label>
              <select
                value={filterUserSegment}
                onChange={(e) => setFilterUserSegment(e.target.value)}
                disabled={loading}
                className="min-w-[180px] rounded-lg bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ border: "1px solid var(--border)" }}
              >
                <option value="all">{t("filterUserAll")}</option>
                <option value="new">{t("filterUserNew")}</option>
                <option value="old">{t("filterUserOld")}</option>
                <option value="returning">{t("filterUserReturning")}</option>
              </select>
            </div>
            {filterUserSegment === "returning" && (
              <span className="self-center text-[10px] text-[var(--secondary-text)]" style={{ maxWidth: 220 }}>
                {t("filterUserReturningNote")}
              </span>
            )}
          </div>
        </section>

        {/* Core KPI Snapshot */}
        <section className="mb-8">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              {t("coreKpi")}
              <span className="ml-2 font-normal text-[11px] text-[var(--secondary-text)]">
                {kpi?.data_range_start && kpi?.data_range_end
                  ? t("dataRange") + `: ${kpi.data_range_start} ~ ${kpi.data_range_end}`
                  : t("dataRange") + `: ${todayStr}`}
                {kpi?.data_updated_at && (
                  <> · {t("lastUpdated")}: {kpi.data_updated_at}</>
                )}
              </span>
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <label htmlFor="kpi-period" className="text-[11px] font-medium text-[var(--secondary-text)]">{t("kpiPeriod")}:</label>
              <select
                id="kpi-period"
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
          <div className="mb-4 mt-2 flex flex-wrap gap-2">
            <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
              {t("filterChannel")}: {filterChannel === "all" ? t("all") : filterChannel === "organic" ? t("filterChannelOrganic") : filterChannel === "paid" ? t("filterChannelPaid") : filterChannel === "social" ? t("filterChannelSocial") : t("filterChannelAppStore")}
            </span>
            <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
              {t("filterVersion")}: {filterVersion === "all" ? t("all") : filterVersion}
            </span>
            <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
              {t("filterPlatform")}: {filterPlatform === "all" ? t("all") : filterPlatform === "ANDROID" ? t("filterPlatformAndroid") : filterPlatform === "IOS" ? t("filterPlatformIos") : t("filterPlatformWeb")}
            </span>
            <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
              {t("filterUserSegment")}: {filterUserSegment === "all" ? t("filterUserAll") : filterUserSegment === "new" ? t("filterUserNew") : filterUserSegment === "old" ? t("filterUserOld") : t("filterUserReturning")}
            </span>
          </div>

          {kpi && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <KPICard
                title="DAU"
                value={kpi.dau.toLocaleString()}
                change={pctChange(kpi.dau, kpi.wow_dau)}
                changePositive={kpi.dau >= kpi.wow_dau}
                metricKey="DAU"
                vsLabel={t("vs7d")}
              />
              <KPICard
                title="D1 Retention"
                value={`${kpi.d1_retention}%`}
                change={pctChange(kpi.d1_retention, kpi.wow_d1)}
                changePositive={kpi.d1_retention >= kpi.wow_d1}
                metricKey="D1_RETENTION"
                vsLabel={t("vs7d")}
              />
              <KPICard
                title="Pay Rate"
                value={`${kpi.pay_rate.toFixed(1)}%`}
                change={pctChange(kpi.pay_rate, kpi.wow_pay_rate)}
                changePositive={kpi.pay_rate >= kpi.wow_pay_rate}
                metricKey="PAY_RATE"
                vsLabel={t("vs7d")}
              />
              <KPICard
                title="ARPPU"
                value={formatCurrency(kpi.arppu)}
                change={pctChange(kpi.arppu, kpi.wow_arppu)}
                changePositive={kpi.arppu >= kpi.wow_arppu}
                metricKey="ARPPU"
                vsLabel={t("vs7d")}
              />
              <KPICard
                title="Total Revenue"
                value={formatCurrency(kpi.revenue)}
                change={pctChange(kpi.revenue, kpi.wow_revenue)}
                changePositive={kpi.revenue >= kpi.wow_revenue}
                metricKey="REVENUE"
                vsLabel={t("vs7d")}
              />
              <KPICard
                title="Total Withdrawal"
                value={formatCurrency(kpi.withdrawal)}
                change={pctChange(kpi.withdrawal, kpi.wow_withdrawal)}
                changePositive={kpi.withdrawal >= kpi.wow_withdrawal}
                metricKey="WITHDRAWAL"
                vsLabel={t("vs7d")}
              />
              <KPICard
                title="ROI"
                value={kpi.roi.toFixed(2)}
                change={pctChange(kpi.roi, kpi.wow_roi)}
                changePositive={kpi.roi >= kpi.wow_roi}
                metricKey="ROI"
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
              <span className="ml-2 font-normal text-[11px] text-[var(--secondary-text)]">
                {(() => {
                  const end = todayStr;
                  const start = new Date();
                  start.setDate(start.getDate() - trendDays + 1);
                  const startStr = start.toISOString().slice(0, 10);
                  return t("dataRange") + `: ${startStr} ~ ${end}`;
                })()}
                {kpi?.data_updated_at && (
                  <> · {t("lastUpdated")}: {kpi.data_updated_at}</>
                )}
              </span>
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <label htmlFor="trend-range" className="text-[11px] font-medium text-[var(--secondary-text)]">{t("trendRange")}:</label>
              <select
                id="trend-range"
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
          <div className="mb-4 mt-2 flex flex-wrap gap-2">
                <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
                  {t("filterChannel")}: {filterChannel === "all" ? t("all") : filterChannel === "organic" ? t("filterChannelOrganic") : filterChannel === "paid" ? t("filterChannelPaid") : filterChannel === "social" ? t("filterChannelSocial") : t("filterChannelAppStore")}
                </span>
                <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
                  {t("filterVersion")}: {filterVersion === "all" ? t("all") : filterVersion}
                </span>
                <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
                  {t("filterPlatform")}: {filterPlatform === "all" ? t("all") : filterPlatform === "ANDROID" ? t("filterPlatformAndroid") : filterPlatform === "IOS" ? t("filterPlatformIos") : t("filterPlatformWeb")}
                </span>
                <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", color: "var(--secondary-text)" }}>
                  {t("filterUserSegment")}: {filterUserSegment === "all" ? t("filterUserAll") : filterUserSegment === "new" ? t("filterUserNew") : filterUserSegment === "old" ? t("filterUserOld") : t("filterUserReturning")}
                </span>
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
          </>
        )}

        {/* Tab 2: Analytics - User Attributes, Geo, Creator, Monetization, Economy, Content Feed */}
        {activeTab === "analytics" && (
          <>
        {/* User Attributes, Geographic, Creator & Supply */}
        <div className="mb-8 grid gap-4 lg:grid-cols-3 overflow-visible">
          <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div className="p-4 sm:p-5 overflow-visible">
              <h2 className="text-base font-semibold tracking-tight">{t("userAttributes")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("userAttributesDesc")}</p>
              {userAttributes ? (
                <div className="mt-4">
                  <UserAttributesChart age={userAttributes.age} device={userAttributes.device} ageLabel={t("ageDistribution")} deviceLabel={t("deviceType")} />
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
              )}
            </div>
          </section>
          <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div className="p-4 sm:p-5 overflow-visible">
              <h2 className="text-base font-semibold tracking-tight">{t("geoDistribution")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("geoDistributionDesc")}</p>
              <div className="mt-4">
                <GeoDistributionChart data={geoDistribution} />
              </div>
            </div>
          </section>
          <section className="overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div className="p-4 sm:p-5">
              <h2 className="text-base font-semibold tracking-tight">{t("creatorSupply")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("creatorSupplyDesc")}</p>
              {creatorSupply ? (
                <div className="mt-4">
                  <CreatorSupplyChart weekly={creatorSupply.weekly} metrics={creatorSupply.metrics} />
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
              )}
            </div>
          </section>
        </div>

        {/* Growth Funnel & Retention Rate */}
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div className="overflow-visible p-4 sm:p-5">
              <h2 className="text-base font-semibold tracking-tight">{t("growthFunnel")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("growthFunnelDesc")}</p>
              <div className="mt-4">
                <GrowthFunnelChart data={growthFunnel} />
              </div>
            </div>
          </section>
          <section className="overflow-visible rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div className="overflow-visible p-4 sm:p-5">
              <h2 className="text-base font-semibold tracking-tight">{t("retentionRate")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("retentionDesc")}</p>
              <div className="mt-4">
                <RetentionRateChart chart={retention.chart} />
              </div>
            </div>
          </section>
        </div>

        {/* Monetization & Economy Health */}
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div className="p-4 sm:p-5">
              <h2 className="text-base font-semibold tracking-tight">{t("monetization")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("monetizationDesc")}</p>
              <div className="mt-4">
                <MonetizationChart data={monetization ?? []} />
              </div>
            </div>
          </section>
          <section className="overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
            <div className="p-4 sm:p-5">
              <h2 className="text-base font-semibold tracking-tight">{t("economyHealth")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("economyHealthDesc")}</p>
              {economyHealth ? (
                <div className="mt-4">
                  <EconomyHealthChart chart={economyHealth.chart} metrics={economyHealth.metrics} />
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
              )}
            </div>
          </section>
        </div>

        {/* Content & Feed Performance */}
        <section className="overflow-hidden rounded-xl bg-[var(--card-bg)]" style={{ border: "1px solid var(--card-stroke)", boxShadow: "var(--card-shadow)" }}>
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold tracking-tight">{t("contentFeed")}</h2>
            <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("contentFeedDesc")}</p>
            {contentFeed ? (
              <div className="mt-4">
                <ContentFeedChart
                  circle={contentFeed.circle}
                  featureCards={contentFeed.featureCards}
                  exclusives={contentFeed.exclusives}
                />
              </div>
            ) : (
              <p className="mt-4 text-xs text-[var(--secondary-text)]">{t("loadingText")}</p>
            )}
          </div>
        </section>
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card-bg)]/50 py-4">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-8">
          <p className="text-[11px] text-[var(--secondary-text)]">
            © Ahoy Analytics Center · Secure access
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

      <AIChatWidget
        dashboardData={{
          kpi,
          dailyTrend,
          filters: {
            channel: filterChannel,
            version: filterVersion,
            userSegment: filterUserSegment,
            platform: filterPlatform,
            kpiMode,
            trendDays,
          },
          growthFunnel,
          retention,
          userAttributes,
          geoDistribution,
          creatorSupply,
          monetization,
          economyHealth,
          contentFeed,
        } as DashboardContext}
      />
    </div>
  );
}
