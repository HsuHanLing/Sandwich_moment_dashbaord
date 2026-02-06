"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { SpendTrendChart } from "@/components/SpendTrendChart";
import { ChannelChart } from "@/components/ChannelChart";
import { CampaignsTable } from "@/components/CampaignsTable";
import { TopEventsChart } from "@/components/TopEventsChart";

type Overview = {
  total_impressions: number;
  total_clicks: number;
  total_engagement: number;
  total_app_opens: number;
  total_sessions: number;
  total_conversions: number;
  total_revenue: number;
};

type TrendPoint = {
  date: string;
  impressions: number;
  clicks: number;
  sessions: number;
  revenue: number;
};

type Channel = {
  channel: string;
  impressions: number;
  clicks: number;
  sessions: number;
  revenue: number;
};

type Campaign = {
  campaign: string;
  impressions: number;
  clicks: number;
  sessions: number;
  revenue: number;
};

type EventRow = { event: string; count: number };

function formatNum(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [topEvents, setTopEvents] = useState<EventRow[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      const base = "/api/marketing";
      const params = `?days=${days}`;
      try {
        const [o, t, c, cam, ev] = await Promise.all([
          fetch(base + "/overview" + params).then((r) => r.json()),
          fetch(base + "/trends" + params).then((r) => r.json()),
          fetch(base + "/channels" + params).then((r) => r.json()),
          fetch(base + "/campaigns" + params).then((r) => r.json()),
          fetch(base + "/top-events" + params).then((r) => r.json()),
        ]);
        if (o.error) throw new Error(o.error);
        setOverview(o);
        setTrends(Array.isArray(t) ? t : []);
        setChannels(Array.isArray(c) ? c : []);
        setCampaigns(Array.isArray(cam) ? cam : []);
        setTopEvents(Array.isArray(ev) ? ev : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [days]);

  if (loading && !overview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-violet-500" />
          <p className="mt-3 text-stone-600 dark:text-stone-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Marketing Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {error}. Set <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">USE_MOCK_DATA=true</code> in .env.local for demo data.
          </div>
        )}

        {/* Overview cards */}
        {overview && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard title="Screen Views" value={formatNum(overview.total_impressions)} />
            <MetricCard title="Clicks" value={formatNum(overview.total_clicks)} />
            <MetricCard title="Engagement" value={formatNum(overview.total_engagement)} />
            <MetricCard title="App Opens" value={formatNum(overview.total_app_opens)} />
            <MetricCard title="Sessions" value={formatNum(overview.total_sessions)} />
            <MetricCard title="Revenue" value={formatCurrency(overview.total_revenue)} />
          </div>
        )}

        {/* Top events + Trends */}
        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Top events
            </h2>
            <TopEventsChart data={topEvents} />
          </section>
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Sessions over time
            </h2>
            <SpendTrendChart data={trends} />
          </section>
        </div>

        {/* Channels + Campaigns */}
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Sessions by channel
            </h2>
            <ChannelChart data={channels} />
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Sessions by campaign
            </h2>
            <CampaignsTable data={campaigns} />
          </section>
        </div>
      </main>
    </div>
  );
}
