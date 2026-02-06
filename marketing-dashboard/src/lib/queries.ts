/**
 * BigQuery queries for GA4 events (custom event names).
 * Events: screen_view, Click_Sup, user_engagement, Open_app, session_start, etc.
 */

const dataset = () => process.env.BIGQUERY_DATASET || "analytics_233462855";
const table = () => process.env.BIGQUERY_TABLE || "events_*";

function tableFilter(days: number) {
  return `_TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

// Custom event mapping from your data
const EVENTS = {
  impressions: "event_name = 'screen_view' OR event_name = 'All_PageBehavior'",
  clicks: "event_name = 'Click_Sup'",
  engagement: "event_name = 'user_engagement' OR event_name = 'LongPress_Sup'",
  appOpens: "event_name = 'Open_app'",
  sessions: "event_name = 'session_start'",
  conversions: "event_name = 'purchase' OR event_name = 'conversion' OR event_name = 'first_open'",
};

export function getOverviewQuery(days: number = 30) {
  return `
    SELECT
      COUNTIF(${EVENTS.impressions}) as total_impressions,
      COUNTIF(${EVENTS.clicks}) as total_clicks,
      COUNTIF(${EVENTS.engagement}) as total_engagement,
      COUNTIF(${EVENTS.appOpens}) as total_app_opens,
      COUNTIF(${EVENTS.sessions}) as total_sessions,
      COUNTIF(${EVENTS.conversions}) as total_conversions,
      COALESCE(SUM(event_value_in_usd), 0) as total_revenue
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
  `;
}

export function getTrendsQuery(days: number = 30) {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
      COUNTIF(${EVENTS.impressions}) as impressions,
      COUNTIF(${EVENTS.clicks}) as clicks,
      COUNTIF(${EVENTS.engagement}) as engagement,
      COUNTIF(${EVENTS.appOpens}) as app_opens,
      COUNTIF(${EVENTS.sessions}) as sessions,
      COALESCE(SUM(event_value_in_usd), 0) as revenue
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    GROUP BY event_date
    ORDER BY event_date ASC
  `;
}

export function getTopEventsQuery(days: number = 30, limit: number = 15) {
  return `
    SELECT event_name as event, COUNT(*) as count
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    GROUP BY event_name
    ORDER BY count DESC
    LIMIT ${limit}
  `;
}

export function getChannelPerformanceQuery(days: number = 30) {
  return `
    SELECT
      COALESCE(traffic_source.source, '(direct)') as channel,
      COUNTIF(${EVENTS.impressions}) as impressions,
      COUNTIF(${EVENTS.clicks}) as clicks,
      COUNTIF(${EVENTS.sessions}) as sessions,
      COALESCE(SUM(event_value_in_usd), 0) as revenue
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    GROUP BY traffic_source.source
    ORDER BY sessions DESC
  `;
}

export function getCampaignsQuery(days: number = 30, limit: number = 20) {
  return `
    SELECT
      COALESCE(traffic_source.name, '(not set)') as campaign,
      COUNTIF(${EVENTS.impressions}) as impressions,
      COUNTIF(${EVENTS.clicks}) as clicks,
      COUNTIF(${EVENTS.sessions}) as sessions,
      COALESCE(SUM(event_value_in_usd), 0) as revenue
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    GROUP BY traffic_source.name
    ORDER BY sessions DESC
    LIMIT ${limit}
  `;
}
