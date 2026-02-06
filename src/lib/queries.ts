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

// KPI & Daily Trend
export function getKPIAndWowQuery(mode: "today" | "7d" | "30d") {
  const interval = mode === "today" ? 0 : mode === "7d" ? 7 : 30;
  const targetDate =
    mode === "today"
      ? "CURRENT_DATE()"
      : mode === "7d"
        ? "DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)"
        : "DATE_SUB(CURRENT_DATE(), INTERVAL 29 DAY)";
  return `
    WITH daily AS (
      SELECT
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT user_pseudo_id) as dau,
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT CASE WHEN event_name IN ('purchase','in_app_purchase') THEN user_pseudo_id END) as payers,
        COALESCE(SUM(CASE WHEN event_name IN ('purchase','in_app_purchase') THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name IN ('switch_Watermark','unlock','Unlock_Sup') OR event_name LIKE '%unlock%' THEN user_pseudo_id END) as unlock_users
      FROM \`${dataset()}.${table()}\`
      WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY))
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY)
      GROUP BY 1
    )
    SELECT
      d.dt, d.dau, d.new_users, d.payers, d.revenue, d.unlock_users
    FROM daily d
    WHERE d.dt = CURRENT_DATE() OR d.dt = DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  `;
}

export function getDailyTrendQuery(days: number = 7) {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
      COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) as new_users,
      COUNT(DISTINCT user_pseudo_id) as dau,
      COUNT(DISTINCT CASE WHEN event_name IN ('purchase','in_app_purchase') THEN user_pseudo_id END) as payers,
      COALESCE(SUM(CASE WHEN event_name IN ('purchase','in_app_purchase') THEN event_value_in_usd END), 0) as revenue,
      COUNT(DISTINCT CASE WHEN event_name IN ('switch_Watermark','unlock','Unlock_Sup') OR event_name LIKE '%unlock%' THEN user_pseudo_id END) as unlock_users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    GROUP BY event_date
    ORDER BY event_date ASC
  `;
}

// User Attributes - Age & Device (user_profile, device_info)
export function getUserAttributesQuery(days: number = 30) {
  return `
    WITH device_agg AS (
      SELECT platform as device_type, COUNT(DISTINCT user_pseudo_id) as users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
      GROUP BY platform
    ),
    age_agg AS (
      SELECT
        COALESCE(
          (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'age_group'),
          '35+'
        ) as age_group,
        COUNT(DISTINCT user_pseudo_id) as users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
      GROUP BY 1
    )
    SELECT 'device' as type, device_type as attr, users FROM device_agg
    UNION ALL
    SELECT 'age' as type, age_group as attr, users FROM age_agg
  `;
}

// Geographic Distribution (user_geo_info)
export function getGeoDistributionQuery(days: number = 30) {
  return `
    SELECT
      COALESCE(geo.country, 'Unknown') as region,
      COUNT(DISTINCT user_pseudo_id) as users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)} AND geo.country IS NOT NULL
    GROUP BY geo.country
    ORDER BY users DESC
    LIMIT 15
  `;
}

// Monetization - Revenue Mix (rev_mix, roi_by_channel)
export function getMonetizationQuery(days: number = 30) {
  return `
    SELECT
      COALESCE(
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_type'),
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item_category'),
        'Unlock Pack'
      ) as revenue_stream,
      SUM(event_value_in_usd) as revenue
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
      AND event_name IN ('purchase', 'in_app_purchase')
      AND event_value_in_usd > 0
    GROUP BY 1
    ORDER BY revenue DESC
  `;
}

// Economy Health (economy_flow)
export function getEconomyHealthQuery(days: number = 30) {
  return `
    WITH unlock_ct AS (
      SELECT COUNT(*) as cnt FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND (event_name LIKE '%unlock%' OR event_name = 'switch_Watermark')
    ),
    scratch_ct AS (
      SELECT COUNT(*) as cnt FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name LIKE '%scratch%'
    ),
    upgrade_ct AS (
      SELECT COUNT(*) as cnt FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name LIKE '%upgrade%'
    )
    SELECT 'unlock' as metric, (SELECT cnt FROM unlock_ct) as value
    UNION ALL SELECT 'scratch', (SELECT cnt FROM scratch_ct)
    UNION ALL SELECT 'upgrade', (SELECT cnt FROM upgrade_ct)
  `;
}

// Content & Feed Performance (feed_impression, feed_click, video_complete, feature_card_type)
export function getContentFeedQuery(days: number = 30) {
  return `
    WITH feed_areas AS (
      SELECT
        COALESCE(
          (SELECT value.string_value FROM UNNEST(e.event_params) WHERE key = 'feed_area'),
          (SELECT value.string_value FROM UNNEST(e.event_params) WHERE key = 'firebase_screen'),
          'ForYou'
        ) as area,
        COUNTIF(e.event_name IN ('screen_view', 'All_PageBehavior')) as impressions,
        COUNTIF(e.event_name = 'Click_Sup' OR e.event_name LIKE '%click%') as clicks,
        COUNT(DISTINCT e.user_pseudo_id) as users
      FROM \`${dataset()}.${table()}\` e
      WHERE ${tableFilter(days)}
      GROUP BY 1
    )
    SELECT area, impressions, clicks, users,
      SAFE_DIVIDE(clicks, NULLIF(impressions, 0)) * 100 as ctr
    FROM feed_areas
    WHERE impressions > 0
    ORDER BY impressions DESC
    LIMIT 20
  `;
}

// Creator & Supply (KOL vs Regular)
export function getCreatorSupplyQuery(days: number = 30) {
  return `
    WITH creator_earnings AS (
      SELECT
        COALESCE(
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'creator_type'),
          'regular'
        ) as creator_type,
        SUM(event_value_in_usd) as earnings
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('creator_earnings', 'withdrawal_request', 'unlock_event')
      GROUP BY 1
    )
    SELECT creator_type, earnings FROM creator_earnings
    ORDER BY earnings DESC
  `;
}
