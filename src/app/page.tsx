"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { DailyTrendChart } from "@/components/DailyTrendChart";
import { DailyTrendTable } from "@/components/DailyTrendTable";
import { UserAttributesChart } from "@/components/UserAttributesChart";
import { GeoDistributionChart } from "@/components/GeoDistributionChart";
import { CreatorSupplyChart } from "@/components/CreatorSupplyChart";
import { MonetizationChart } from "@/components/MonetizationChart";
import { EconomyHealthChart } from "@/components/EconomyHealthChart";
import { ContentFeedChart } from "@/components/ContentFeedChart";
import { useLocale } from "@/contexts/LocaleContext";

type KPI = {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAttributes, setUserAttributes] = useState<{ age: { attr: string; users: number; share: number }[]; device: { attr: string; users: number; share: number }[] } | null>(null);
  const [geoDistribution, setGeoDistribution] = useState<{ region: string; region_name: string; users: number; share: number }[]>([]);
  const [creatorSupply, setCreatorSupply] = useState<{ weekly: { week: string; kol_earnings: number; regular_earnings: number }[]; metrics: Record<string, number> } | null>(null);
  const [monetization, setMonetization] = useState<{ revenue_stream: string; revenue: number; share: number; roi: number }[]>([]);
  const [economyHealth, setEconomyHealth] = useState<{ chart: { indicator: string; value: number; label: string }[]; metrics: { indicator: string; value: string }[] } | null>(null);
  const [contentFeed, setContentFeed] = useState<{ circle: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[]; featureCards: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[]; exclusives: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");

  useEffect(() => {
    async function fetchKPI() {
      const r = await fetch(`/api/marketing/kpi?mode=${kpiMode}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setKpi(j);
    }
    fetchKPI().catch((e) => setError(String(e)));
  }, [kpiMode]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      const params = `?days=${trendDays}`;
      try {
        const [dt, o, ua, geo, cs, mon, eh, cf] = await Promise.all([
          fetch(`/api/marketing/daily-trend${params}`).then((r) => r.json()),
          fetch(`/api/marketing/overview${params}`).then((r) => r.json()),
          fetch(`/api/marketing/user-attributes${params}`).then((r) => r.json()),
          fetch(`/api/marketing/geo-distribution${params}`).then((r) => r.json()),
          fetch(`/api/marketing/creator-supply${params}`).then((r) => r.json()),
          fetch(`/api/marketing/monetization${params}`).then((r) => r.json()),
          fetch(`/api/marketing/economy-health${params}`).then((r) => r.json()),
          fetch(`/api/marketing/content-feed${params}`).then((r) => r.json()),
        ]);
        if (Array.isArray(dt)) setDailyTrend(dt);
        if (o.error) throw new Error(o.error);
        if (ua?.age && ua?.device) setUserAttributes(ua);
        if (Array.isArray(geo)) setGeoDistribution(geo);
        if (cs?.weekly && cs?.metrics) setCreatorSupply(cs);
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
  }, [trendDays]);

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <h1 className="text-base font-semibold tracking-tight">{t("title")}</h1>
          <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-1 rounded-full p-1" style={{ backgroundColor: "var(--pill-bg)", boxShadow: "var(--shadow-sm)" }}>
              <button
                onClick={() => setLocale("en")}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${locale === "en" ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`}
                style={locale === "en" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
              >
                EN
              </button>
              <button
                onClick={() => setLocale("zh")}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${locale === "zh" ? "text-[var(--foreground)]" : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"}`}
                style={locale === "zh" ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
              >
                中文
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 text-[var(--foreground)]">
            {error}. {t("errorMock")}
          </div>
        )}

        {/* Tab 1: Overview - Core KPI + Daily Trend */}
        {activeTab === "overview" && (
          <>
        {/* Core KPI Snapshot */}
        <section className="mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t("coreKpi")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("coreKpiDesc")}</p>
            </div>
            <div className="flex gap-0.5 rounded-full p-1" style={{ backgroundColor: "var(--pill-bg)", boxShadow: "var(--shadow-sm)" }}>
              {(["today", "7d", "30d"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setKpiMode(m)}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    kpiMode === m
                      ? "text-[var(--foreground)]"
                      : "text-[var(--secondary-text)] hover:text-[var(--foreground)]"
                  }`}
                  style={kpiMode === m ? { backgroundColor: "var(--pill-active)", boxShadow: "var(--shadow-sm)" } : undefined}
                >
                  {m === "today" ? t("today") : m === "7d" ? t("days7") : t("days30")}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-4 text-[11px] text-[var(--secondary-text)]">
            {todayStr} · {t("dataUpdate")}
          </p>

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
          <p className="mt-4 text-xs text-[var(--secondary-text)]">{t("scopeCompare")}</p>
        </section>

        {/* Daily Trend */}
        <section className="mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t("dailyTrend")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("dailyTrendDesc")}</p>
            </div>
            <select
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] shadow-sm"
            >
              <option value={7}>7 {t("days")}</option>
              <option value={14}>14 {t("days")}</option>
              <option value={30}>30 {t("days")}</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl bg-[var(--card-bg)] shadow-sm">
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
          <section className="overflow-visible rounded-xl bg-[var(--card-bg)] shadow-sm border border-[var(--border)]">
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
          <section className="overflow-visible rounded-xl bg-[var(--card-bg)] shadow-sm border border-[var(--border)]">
            <div className="p-4 sm:p-5 overflow-visible">
              <h2 className="text-base font-semibold tracking-tight">{t("geoDistribution")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("geoDistributionDesc")}</p>
              <div className="mt-4">
                <GeoDistributionChart data={geoDistribution} />
              </div>
            </div>
          </section>
          <section className="overflow-hidden rounded-xl bg-[var(--card-bg)] shadow-sm">
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

        {/* Monetization & Economy Health */}
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-xl bg-[var(--card-bg)] shadow-sm">
            <div className="p-4 sm:p-5">
              <h2 className="text-base font-semibold tracking-tight">{t("monetization")}</h2>
              <p className="mt-0.5 text-xs text-[var(--secondary-text)]">{t("monetizationDesc")}</p>
              <div className="mt-4">
                <MonetizationChart data={monetization ?? []} />
              </div>
            </div>
          </section>
          <section className="overflow-hidden rounded-xl bg-[var(--card-bg)] shadow-sm">
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
        <section className="overflow-hidden rounded-xl bg-[var(--card-bg)] shadow-sm">
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
    </div>
  );
}
