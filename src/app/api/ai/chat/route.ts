import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an analytics assistant for the Ahoy Analytics Center dashboard. Your role is to help users understand metrics, data trends, and provide actionable insights.

You have deep knowledge of the following metrics and their formulas:

**Core KPIs:**
- DAU: COUNT(DISTINCT user_pseudo_id) per day — Daily Active Users
- D1 Retention: (Users who returned on D1 / New users on D0) × 100% — Next-day retention
- Pay Rate: (Paying users / DAU) × 100% — Monetization rate
- ARPPU: Total Revenue / Paying users — Average Revenue Per Paying User
- Revenue: SUM(event_value_in_usd) for purchase events — Total in-app revenue
- Withdrawal: Total withdrawal amount (user payouts, estimated 20% of revenue)
- ROI: Revenue / Cost (or Revenue / Spend) — Return on Investment
- WoW (Week-over-Week): (Current value − Value 7 days ago) / Value 7 days ago × 100%

**Daily Trend Metrics:**
- New Users: first_open events — first-time app opens
- DAU: unique users per day
- D1: next-day retention per date
- Unlock Users: users who triggered at least one unlock event
- Unlock ≥ 2: high-frequency users with 2+ unlock actions
- Payers: unique paying users per day
- Revenue & Withdrawal: daily amounts

**Growth Funnel (7-day signup cohort):**
Signup → Activation → First SUP / First $UP → First Unlock → First Payment
(First SUP and First $UP are parallel branches)

**Retention (by signup cohort):**
D1/D3/D7/D14 retention rates with WoW comparison

**Filters:**
- Channel: All / Organic / Paid / Social / App Store
- Version: App version
- Client/Platform: Android / iOS / Web
- User Dimension: All / New Users / Old Users / Returning (7+ days inactive then came back)

**User Attributes:**
- Age Distribution: user age groups and their share
- Device Type: mobile, desktop, tablet breakdown

**Geographic Distribution:**
- Top regions/countries by user count and share percentage

**Creator & Supply:**
- Active creators (Total, KOL, Regular), new KOL creators (7d)
- Weekly earnings breakdown: KOL vs Regular creator earnings
- KOL = Key Opinion Leader / top-tier creators

**Monetization Breakdown:**
- Revenue by stream (e.g., in-app purchase, ads, subscriptions)
- Share percentage and ROI per stream

**Economy Health:**
- Key economic indicators: token balance, circulation, inflation rate, etc.
- Health status labels for each indicator

**Content & Feed Performance:**
- Three feed sections: Circle, Feature Cards, Exclusives
- Metrics per area: impressions, CTR (click-through rate), completion rate, replay rate

**Data source:** Google Analytics 4 (GA4) → BigQuery. Updated daily.

Guidelines:
- ALWAYS reference the actual dashboard data provided in the context below to answer questions.
- When discussing metrics, mention the specific numbers from the data.
- When comparing metrics, calculate the actual change amounts and percentages.
- When interpreting trends, use the daily trend data to identify patterns (rising, falling, stable).
- If the user asks in Chinese, respond in Chinese. If in English, respond in English.
- Be concise but thorough. Use bullet points for clarity.
- When suggesting possible causes for data changes, be specific and actionable.
- Use markdown formatting: **bold** for emphasis, \`code\` for metric names, bullet points for lists.`;

function buildDataContext(data: Record<string, unknown>): string {
  const parts: string[] = [];

  // Active filters
  const filters = data.filters as Record<string, unknown> | undefined;
  if (filters) {
    parts.push("## Current Filters");
    parts.push(`- KPI Period: ${filters.kpiMode}`);
    parts.push(`- Trend Range: ${filters.trendDays} days`);
    parts.push(`- Channel: ${filters.channel}`);
    parts.push(`- Version: ${filters.version}`);
    parts.push(`- Platform: ${filters.platform}`);
    parts.push(`- User Segment: ${filters.userSegment}`);
  }

  // KPI snapshot
  const kpi = data.kpi as Record<string, unknown> | undefined;
  if (kpi) {
    parts.push("\n## Core KPI Snapshot");
    parts.push(`Data range: ${kpi.data_range_start || "N/A"} ~ ${kpi.data_range_end || "N/A"}`);
    parts.push(`Last data updated: ${kpi.data_updated_at || "N/A"}`);
    parts.push(`- DAU: ${num(kpi.dau)} (WoW baseline: ${num(kpi.wow_dau)})`);
    parts.push(`- D1 Retention: ${kpi.d1_retention}% (WoW baseline: ${kpi.wow_d1}%)`);
    parts.push(`- Pay Rate: ${kpi.pay_rate}% (WoW baseline: ${kpi.wow_pay_rate}%)`);
    parts.push(`- ARPPU: $${num(kpi.arppu)} (WoW baseline: $${num(kpi.wow_arppu)})`);
    parts.push(`- Revenue: $${num(kpi.revenue)} (WoW baseline: $${num(kpi.wow_revenue)})`);
    parts.push(`- Withdrawal: $${num(kpi.withdrawal)} (WoW baseline: $${num(kpi.wow_withdrawal)})`);
    parts.push(`- ROI: ${kpi.roi} (WoW baseline: ${kpi.wow_roi})`);
  }

  // Daily trend
  const dailyTrend = data.dailyTrend as Record<string, unknown>[] | undefined;
  if (dailyTrend && dailyTrend.length > 0) {
    parts.push("\n## Daily Trend Data");
    parts.push("| Date | New Users | DAU | D1 Ret. | Unlock | Unlock≥2 | Payers | Revenue | Withdrawal |");
    parts.push("|------|-----------|-----|---------|--------|----------|--------|---------|------------|");
    for (const row of dailyTrend) {
      parts.push(
        `| ${row.date} | ${num(row.new_users)} | ${num(row.dau)} | ${row.d1 || "—"} | ${num(row.unlock_users)} | ${num(row.unlock_ge2)} | ${num(row.payers)} | $${num(row.revenue)} | $${num(row.withdrawal)} |`
      );
    }
  }

  // Growth funnel
  const funnel = data.growthFunnel as Record<string, unknown>[] | undefined;
  if (funnel && funnel.length > 0) {
    parts.push("\n## Growth Funnel (7-day cohort)");
    for (const step of funnel) {
      parts.push(`- ${step.stepLabel}: ${num(step.users)} users (${step.conversion}% conversion)`);
    }
  }

  // Retention
  const retention = data.retention as Record<string, unknown> | undefined;
  if (retention) {
    const chart = (retention.chart as Record<string, unknown>[]) || [];
    if (chart.length > 0) {
      parts.push("\n## Retention Rates");
      for (const r of chart) {
        parts.push(`- ${r.day}: ${r.rate}% (WoW: ${Number(r.wow) >= 0 ? "+" : ""}${r.wow}pp)`);
      }
    }
  }

  // User Attributes
  const ua = data.userAttributes as Record<string, unknown> | undefined;
  if (ua) {
    const age = (ua.age as Record<string, unknown>[]) || [];
    const device = (ua.device as Record<string, unknown>[]) || [];
    if (age.length > 0) {
      parts.push("\n## User Attributes — Age Distribution");
      for (const a of age) {
        parts.push(`- ${a.attr}: ${num(a.users)} users (${a.share}%)`);
      }
    }
    if (device.length > 0) {
      parts.push("\n## User Attributes — Device Type");
      for (const d of device) {
        parts.push(`- ${d.attr}: ${num(d.users)} users (${d.share}%)`);
      }
    }
  }

  // Geographic Distribution
  const geo = data.geoDistribution as Record<string, unknown>[] | undefined;
  if (geo && geo.length > 0) {
    parts.push("\n## Geographic Distribution (Top regions)");
    parts.push("| Region | Users | Share |");
    parts.push("|--------|-------|-------|");
    for (const g of geo.slice(0, 15)) {
      parts.push(`| ${g.region_name || g.region} | ${num(g.users)} | ${g.share}% |`);
    }
  }

  // Creator & Supply
  const cs = data.creatorSupply as Record<string, unknown> | undefined;
  if (cs) {
    const metrics = (cs.metrics as Record<string, number>) || {};
    const weekly = (cs.weekly as Record<string, unknown>[]) || [];
    if (Object.keys(metrics).length > 0) {
      parts.push("\n## Creator & Supply Metrics");
      for (const [k, v] of Object.entries(metrics)) {
        parts.push(`- ${k}: ${typeof v === "number" ? num(v) : v}`);
      }
    }
    if (weekly.length > 0) {
      parts.push("\n### Weekly Creator Earnings");
      for (const w of weekly) {
        parts.push(`- ${w.week}: KOL $${num(w.kol_earnings)}, Regular $${num(w.regular_earnings)}`);
      }
    }
  }

  // Monetization
  const mon = data.monetization as Record<string, unknown>[] | undefined;
  if (mon && mon.length > 0) {
    parts.push("\n## Monetization Breakdown");
    parts.push("| Revenue Stream | Revenue | Share | ROI |");
    parts.push("|----------------|---------|-------|-----|");
    for (const m of mon) {
      parts.push(`| ${m.revenue_stream} | $${num(m.revenue)} | ${m.share}% | ${m.roi} |`);
    }
  }

  // Economy Health
  const eh = data.economyHealth as Record<string, unknown> | undefined;
  if (eh) {
    const metrics = (eh.metrics as Record<string, unknown>[]) || [];
    const chart = (eh.chart as Record<string, unknown>[]) || [];
    if (metrics.length > 0) {
      parts.push("\n## Economy Health Metrics");
      for (const m of metrics) {
        parts.push(`- ${m.indicator}: ${m.value}`);
      }
    }
    if (chart.length > 0) {
      parts.push("\n### Economy Health Indicators");
      for (const c of chart) {
        parts.push(`- ${c.indicator}: ${c.value} (${c.label})`);
      }
    }
  }

  // Content & Feed Performance
  const cf = data.contentFeed as Record<string, unknown> | undefined;
  if (cf) {
    const sections: [string, string][] = [["circle", "Circle"], ["featureCards", "Feature Cards"], ["exclusives", "Exclusives"]];
    for (const [key, label] of sections) {
      const items = (cf[key] as Record<string, unknown>[]) || [];
      if (items.length > 0) {
        parts.push(`\n## Content & Feed — ${label}`);
        parts.push("| Area | Impressions | CTR | Completion | Replay |");
        parts.push("|------|-------------|-----|------------|--------|");
        for (const item of items) {
          parts.push(`| ${item.area} | ${num(item.impressions)} | ${item.ctr}% | ${item.completion ?? "—"} | ${item.replay ?? "—"} |`);
        }
      }
    }
  }

  return parts.join("\n");
}

function num(v: unknown): string {
  if (v === null || v === undefined) return "0";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages || [];
    const dashboardData: Record<string, unknown> = body.dashboardData || {};

    // Build contextual system prompt with live data
    const dataContext = buildDataContext(dashboardData);
    const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n---\n\n# LIVE DASHBOARD DATA (use this to answer questions)\n\n${dataContext}`;

    // Build Gemini API request
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: fullSystemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Gemini API error" }, { status: res.status });
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I could not generate a response.";

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
