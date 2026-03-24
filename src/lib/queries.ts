/**
 * BigQuery queries for GA4 events (custom event names).
 * Events: screen_view, Click_Sup, user_engagement, Open_app, session_start, etc.
 */

const dataset = () => process.env.BIGQUERY_DATASET || "analytics_233462855";
const table = () => process.env.BIGQUERY_TABLE || "events_*";

export type OverviewFilters = {
  channel?: string;
  version?: string;
  userSegment?: string;
  platform?: string;
  geo?: string;
};

/**
 * GA4 BigQuery export uses:
 * - Daily: `events_YYYYMMDD` → _TABLE_SUFFIX = `20260319`
 * - Intraday (recent): `events_intraday_YYYYMMDD` → _TABLE_SUFFIX = `intraday_20260321`
 * Plain `BETWEEN '20260316' AND '20260323'` on _TABLE_SUFFIX excludes intraday shards (lexicographic).
 */
export function tableSuffixInRange(lowerExpr: string, upperExpr: string): string {
  return `(
    (REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$') AND _TABLE_SUFFIX BETWEEN ${lowerExpr} AND ${upperExpr})
    OR (STARTS_WITH(_TABLE_SUFFIX, 'intraday_') AND SUBSTR(_TABLE_SUFFIX, 10) BETWEEN ${lowerExpr} AND ${upperExpr})
  )`;
}

/** Lower bound only: include daily and intraday shards with date suffix >= lower (YYYYMMDD). */
export function tableSuffixSince(intervalDays: number): string {
  const lower = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${intervalDays} DAY))`;
  return `(
    (REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$') AND _TABLE_SUFFIX >= ${lower})
    OR (STARTS_WITH(_TABLE_SUFFIX, 'intraday_') AND SUBSTR(_TABLE_SUFFIX, 10) >= ${lower})
  )`;
}

/** Partition + event_date window for marketing queries (daily + intraday). */
export function tableFilter(days: number) {
  const low = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))`;
  const high = `FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;
  return `${tableSuffixInRange(low, high)}
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

/** Only finalized daily shards `events_YYYYMMDD` (8-digit suffix). */
export function tableFilterDailyOnly(days: number) {
  const low = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))`;
  const high = `FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;
  return `(REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$') AND _TABLE_SUFFIX BETWEEN ${low} AND ${high})
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

/** Only intraday shards `events_intraday_YYYYMMDD`. */
export function tableFilterIntradayOnly(days: number) {
  const low = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))`;
  const high = `FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;
  return `(STARTS_WITH(_TABLE_SUFFIX, 'intraday_') AND SUBSTR(_TABLE_SUFFIX, 10) BETWEEN ${low} AND ${high})
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

/** Wide window for lifetime first/second purchase (GA4 export retention). */
function lifetimeTableFilter(lookbackDays: number) {
  return `_TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${lookbackDays} DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookbackDays} DAY)`;
}

/** Canonical successful purchase events (real $ + wallet IAP); excludes exchanger-only flows. */
const PURCHASE_EVENT_NAMES = `('in_app_purchase','purchase','iap_success',
          'app_store_subscription_convert','app_store_subscription_renew')`;

/**
 * Subscription (paid) classification when `product_id` is available as a column (e.g. subscription analysis `base`).
 * Exclusive SKUs, or iap_success with product_id LIKE '%subscription%', or App Store subscription events.
 */
const SUBSCRIPTION_PAID_PRODUCT = `(
  COALESCE(product_id, '') IN ('exclusivemonthly', 'exclusiveaccess')
  OR (event_name = 'iap_success' AND COALESCE(product_id, '') LIKE '%subscription%')
  OR event_name IN ('app_store_subscription_convert', 'app_store_subscription_renew')
)`;

/** iap_start / iap_fail: subscription SKU (exclusive or generic subscription product id). */
const SUBSCRIPTION_IAP_FLOW_PRODUCT = `(
  COALESCE(product_id, '') IN ('exclusivemonthly', 'exclusiveaccess')
  OR COALESCE(product_id, '') LIKE '%subscription%'
)`;

/** Same as SUBSCRIPTION_PAID_PRODUCT but reads product_id from event_params inline (no base CTE). */
const SUBSCRIPTION_PAID_PRODUCT_PARAMS = `(
  COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id'), '') IN ('exclusivemonthly', 'exclusiveaccess')
  OR (event_name = 'iap_success' AND COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id'), '') LIKE '%subscription%')
  OR event_name IN ('app_store_subscription_convert', 'app_store_subscription_renew')
)`;

function filterClause(filters: OverviewFilters | undefined, days: number): string {
  if (!filters) return "";
  const parts: string[] = [];

  if (filters.channel && filters.channel !== "all") {
    if (filters.channel === "organic") {
      parts.push(`(COALESCE(traffic_source.medium,'') IN ('organic','(none)','(not set)','') OR traffic_source.source = '(direct)')`);
    } else if (filters.channel === "paid") {
      parts.push(`traffic_source.medium IN ('cpc','cpm','cpv','paid')`);
    } else if (filters.channel === "social") {
      parts.push(`(traffic_source.medium = 'social' OR LOWER(COALESCE(traffic_source.source,'')) LIKE '%facebook%' OR LOWER(COALESCE(traffic_source.source,'')) LIKE '%instagram%' OR LOWER(COALESCE(traffic_source.source,'')) LIKE '%twitter%')`);
    } else if (filters.channel === "app_store") {
      parts.push(`(traffic_source.medium = 'app' OR LOWER(COALESCE(traffic_source.source,'')) LIKE '%play%' OR LOWER(COALESCE(traffic_source.source,'')) LIKE '%store%')`);
    }
  }

  if (filters.platform && filters.platform !== "all") {
    const platformUpper = filters.platform.toUpperCase();
    parts.push(`UPPER(COALESCE(platform, '')) = '${platformUpper}'`);
  }

  if (filters.version && filters.version !== "all") {
    if (filters.version === "(not set)") {
      parts.push(`(app_info.version IS NULL OR TRIM(COALESCE(app_info.version,'')) = '')`);
    } else {
      parts.push(`TRIM(COALESCE(app_info.version,'')) = '${String(filters.version).replace(/'/g, "''")}'`);
    }
  }

  if (filters.geo && filters.geo !== "all") {
    if (filters.geo === "exclude_hk_cn_sg") {
      parts.push(`geo.country NOT IN ('Hong Kong','China','Singapore')`);
    } else {
      parts.push(`geo.country = '${String(filters.geo).replace(/'/g, "''")}'`);
    }
  }

  if (filters.userSegment && filters.userSegment !== "all") {
    if (filters.userSegment === "new") {
      parts.push(`user_pseudo_id IN (
        SELECT user_pseudo_id FROM \`${dataset()}.${table()}\` 
        WHERE ${tableFilter(days)} AND event_name = 'first_open'
        GROUP BY 1
      )`);
    } else if (filters.userSegment === "old") {
      parts.push(`user_pseudo_id NOT IN (
        SELECT user_pseudo_id FROM \`${dataset()}.${table()}\`
        WHERE ${tableFilter(days)} AND event_name = 'first_open'
        GROUP BY 1
      )`);
    } else if (filters.userSegment === "returning") {
      const lookback = Math.max(days + 14, 30);
      const filtersNoUser = { channel: filters.channel, version: filters.version, platform: filters.platform, geo: filters.geo };
      const extraNoUser = filterClause(filtersNoUser, lookback);
      parts.push(`user_pseudo_id IN (
        WITH user_days AS (
          SELECT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) as dt
          FROM \`${dataset()}.${table()}\`
          WHERE ${tableSuffixSince(lookback)}
            AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
            AND PARSE_DATE('%Y%m%d', event_date) <= CURRENT_DATE()${extraNoUser}
          GROUP BY 1, 2
        ),
        with_prev AS (
          SELECT user_pseudo_id, dt,
            LAG(dt) OVER (PARTITION BY user_pseudo_id ORDER BY dt) as prev_dt
          FROM user_days
        )
        SELECT DISTINCT user_pseudo_id
        FROM with_prev
        WHERE DATE_DIFF(dt, prev_dt, DAY) >= 7
      )`);
    }
  }

  return parts.length ? " AND " + parts.join(" AND ") : "";
}

export function getVersionsQuery(days: number = 60) {
  return `
    SELECT DISTINCT COALESCE(NULLIF(TRIM(app_info.version), ''), '(not set)') as version
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    ORDER BY version DESC
  `;
}

// Custom event mapping from your data
const EVENTS = {
  impressions: "event_name = 'All_PageBehavior'",
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

// Registration events: same as registration_daily (excl. HK/CN/SG)
const REG_EVENTS = `(
  event_name IN ('Success_GoogleRegister','Register_Number_Success','Register_Email_Success','Success_AppleRegister')
  OR (event_name = 'auth_oauth_result'
    AND EXISTS (SELECT 1 FROM UNNEST(event_params) ep WHERE ep.key = 'result' AND ep.value.string_value = 'success'))
)`;
const REG_GEO = `geo.country NOT IN ('Hong Kong', 'China', 'Singapore')`;

// KPI Snapshot - D1 by registration cohort, return date (yesterday's registrants who returned today)
export function getKPIAndWowQuery(mode: "today" | "7d" | "30d", filters?: OverviewFilters) {
  const days = mode === "today" ? 8 : mode === "7d" ? 14 : 60;
  const extra = filterClause(filters, days);
  return `
    WITH daily_d AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date_str,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT user_pseudo_id) as pseudo_dau,
        COUNT(DISTINCT case when event_name = 'Enter_NewUserLandSupPage' then user_id else null end) as dau,
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT CASE WHEN event_name IN ('purchase','in_app_purchase', 'iap_success') THEN user_pseudo_id END) as payers,
        COALESCE(SUM(CASE WHEN event_name IN ('purchase','in_app_purchase', 'iap_success') THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name IN ('video_unlock_success','dollarsup_first_unlock_success') THEN user_pseudo_id END) as unlock_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterDailyOnly(days)}${extra}
      GROUP BY 1, 2
    ),
    daily_i AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date_str,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT user_pseudo_id) as pseudo_dau,
        COUNT(DISTINCT case when event_name = 'Enter_NewUserLandSupPage' then user_id else null end) as dau,
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT CASE WHEN event_name IN ('purchase','in_app_purchase', 'iap_success') THEN user_pseudo_id END) as payers,
        COALESCE(SUM(CASE WHEN event_name IN ('purchase','in_app_purchase', 'iap_success') THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name IN ('video_unlock_success','dollarsup_first_unlock_success') THEN user_pseudo_id END) as unlock_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterIntradayOnly(days)}${extra}
      GROUP BY 1, 2
    ),
    daily AS (
      SELECT
        COALESCE(d.date_str, i.date_str) as date_str,
        COALESCE(d.dt, i.dt) as dt,
        IF(d.dt IS NOT NULL, d.pseudo_dau, i.pseudo_dau) as pseudo_dau,
        IF(d.dt IS NOT NULL, d.dau, i.dau) as dau,
        IF(d.dt IS NOT NULL, d.new_users, i.new_users) as new_users,
        IF(d.dt IS NOT NULL, d.payers, i.payers) as payers,
        IF(d.dt IS NOT NULL, d.revenue, i.revenue) as revenue,
        IF(d.dt IS NOT NULL, d.unlock_users, i.unlock_users) as unlock_users
      FROM daily_d d
      FULL OUTER JOIN daily_i i ON d.dt = i.dt
    ),
    registration_daily_d AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        COUNT(DISTINCT user_pseudo_id) as registration
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterDailyOnly(days)}${extra} AND ${REG_GEO} AND ${REG_EVENTS}
      GROUP BY event_date
    ),
    registration_daily_i AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        COUNT(DISTINCT user_pseudo_id) as registration
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterIntradayOnly(days)}${extra} AND ${REG_GEO} AND ${REG_EVENTS}
      GROUP BY event_date
    ),
    registration_daily AS (
      SELECT
        COALESCE(d.date, i.date) as date,
        IF(d.date IS NOT NULL, d.registration, i.registration) as registration
      FROM registration_daily_d d
      FULL OUTER JOIN registration_daily_i i ON d.date = i.date
    ),
    reg_users AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_reg_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(days + 7)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 7} DAY)
        AND ${REG_GEO} AND ${REG_EVENTS}${extra}
      GROUP BY 1
    ),
    d1_cohort AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', DATE_ADD(r.first_reg_dt, INTERVAL 1 DAY)) as return_date,
        COUNT(DISTINCT r.user_pseudo_id) as retained_d1
      FROM reg_users r
      JOIN \`${dataset()}.${table()}\` b
        ON r.user_pseudo_id = b.user_pseudo_id
        AND PARSE_DATE('%Y%m%d', b.event_date) = DATE_ADD(r.first_reg_dt, INTERVAL 1 DAY)
      WHERE ${tableSuffixSince(days + 7)}
        AND PARSE_DATE('%Y%m%d', b.event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)${extra}
        and b.event_name NOT IN ('notification_receive','notification_dismiss','app_remove')
      GROUP BY 1
    )
    SELECT
      d.date_str,
      d.dt,
      d.pseudo_dau,
      d.dau,
      d.new_users,
      d.payers,
      d.revenue,
      d.unlock_users,
      c.retained_d1,
      LAG(COALESCE(r.registration, 0)) OVER (ORDER BY d.dt) as prev_day_registrations
    FROM daily d
    LEFT JOIN registration_daily r ON r.date = d.date_str
    LEFT JOIN d1_cohort c ON c.return_date = d.date_str
    ORDER BY d.dt DESC
  `;
}

export function getDailyTrendQuery(days: number = 7, filters?: OverviewFilters) {
  const extra = filterClause(filters, days);
  const lookback = days + 7;
  return `
    WITH daily_d AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT user_pseudo_id) as pseudo_dau,
        COUNT(DISTINCT case when event_name = 'Enter_NewUserLandSupPage' then user_id else null end) as dau,
        COUNT(DISTINCT CASE WHEN event_name IN ('purchase','in_app_purchase',
          'app_store_subscription_convert','app_store_subscription_renew', 'iap_success')
          THEN user_pseudo_id END) as payers,
        COALESCE(SUM(CASE WHEN event_name IN ('purchase','in_app_purchase',
          'app_store_subscription_convert','app_store_subscription_renew', 'iap_success')
          THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name IN ('video_unlock_success','dollarsup_first_unlock_success') THEN user_pseudo_id END) as unlock_users,
        COUNT(DISTINCT CASE WHEN event_name IN ('video_unlock_success','dollarsup_first_unlock_success') THEN user_pseudo_id END) as unlock_users_base,
        COALESCE(SUM(
        CASE WHEN event_name = 'withdraw_result' THEN 
              COALESCE(
                SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'withdraw_amount') AS FLOAT64),
                0
              ) 
            END
          ), 0) as withdrawal
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterDailyOnly(days)}${extra}
      GROUP BY 1, 2
    ),
    daily_i AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT user_pseudo_id) as pseudo_dau,
        COUNT(DISTINCT case when event_name = 'Enter_NewUserLandSupPage' then user_id else null end) as dau,
        COUNT(DISTINCT CASE WHEN event_name IN ('purchase','in_app_purchase',
          'app_store_subscription_convert','app_store_subscription_renew', 'iap_success')
          THEN user_pseudo_id END) as payers,
        COALESCE(SUM(CASE WHEN event_name IN ('purchase','in_app_purchase',
          'app_store_subscription_convert','app_store_subscription_renew', 'iap_success')
          THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name IN ('video_unlock_success','dollarsup_first_unlock_success') THEN user_pseudo_id END) as unlock_users,
        COUNT(DISTINCT CASE WHEN event_name IN ('video_unlock_success','dollarsup_first_unlock_success') THEN user_pseudo_id END) as unlock_users_base,
        COALESCE(SUM(
        CASE WHEN event_name = 'withdraw_result' THEN 
              COALESCE(
                SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'withdraw_amount') AS FLOAT64),
                0
              ) 
            END
          ), 0) as withdrawal
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterIntradayOnly(days)}${extra}
      GROUP BY 1, 2
    ),
    daily AS (
      SELECT
        COALESCE(d.date, i.date) as date,
        COALESCE(d.dt, i.dt) as dt,
        IF(d.dt IS NOT NULL, d.new_users, i.new_users) as new_users,
        IF(d.dt IS NOT NULL, d.pseudo_dau, i.pseudo_dau) as pseudo_dau,
        IF(d.dt IS NOT NULL, d.dau, i.dau) as dau,
        IF(d.dt IS NOT NULL, d.payers, i.payers) as payers,
        IF(d.dt IS NOT NULL, d.revenue, i.revenue) as revenue,
        IF(d.dt IS NOT NULL, d.unlock_users, i.unlock_users) as unlock_users,
        IF(d.dt IS NOT NULL, d.unlock_users_base, i.unlock_users_base) as unlock_users_base,
        IF(d.dt IS NOT NULL, d.withdrawal, i.withdrawal) as withdrawal
      FROM daily_d d
      FULL OUTER JOIN daily_i i ON d.dt = i.dt
    ),
    registration_daily_d AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        COUNT(DISTINCT user_pseudo_id) as registration
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterDailyOnly(days)}${extra} AND ${REG_GEO} AND ${REG_EVENTS}
      GROUP BY event_date
    ),
    registration_daily_i AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        COUNT(DISTINCT user_pseudo_id) as registration
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterIntradayOnly(days)}${extra} AND ${REG_GEO} AND ${REG_EVENTS}
      GROUP BY event_date
    ),
    registration_daily AS (
      SELECT
        COALESCE(d.date, i.date) as date,
        IF(d.date IS NOT NULL, d.registration, i.registration) as registration
      FROM registration_daily_d d
      FULL OUTER JOIN registration_daily_i i ON d.date = i.date
    ),
    unlock_ge2_daily_d AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        COUNT(DISTINCT user_pseudo_id) as unlock_ge2
      FROM (
        SELECT user_pseudo_id, event_date,
          COUNT(*) as cnt
        FROM \`${dataset()}.${table()}\`
        WHERE ${tableFilterDailyOnly(days)}${extra}
          AND event_name IN ('video_unlock_success','dollarsup_first_unlock_success')
        GROUP BY user_pseudo_id, event_date
        HAVING cnt >= 2
      )
        GROUP BY 1
    ),
    unlock_ge2_daily_i AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        COUNT(DISTINCT user_pseudo_id) as unlock_ge2
      FROM (
        SELECT user_pseudo_id, event_date,
          COUNT(*) as cnt
        FROM \`${dataset()}.${table()}\`
        WHERE ${tableFilterIntradayOnly(days)}${extra}
          AND event_name IN ('video_unlock_success','dollarsup_first_unlock_success')
        GROUP BY user_pseudo_id, event_date
        HAVING cnt >= 2
      )
        GROUP BY 1
    ),
    unlock_ge2_daily AS (
      SELECT
        COALESCE(d.date, i.date) as date,
        IF(d.date IS NOT NULL, d.unlock_ge2, i.unlock_ge2) as unlock_ge2
      FROM unlock_ge2_daily_d d
      FULL OUTER JOIN unlock_ge2_daily_i i ON d.date = i.date
    ),
    reg_users AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_reg_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND ${REG_GEO} AND ${REG_EVENTS}${extra}
      GROUP BY 1
    ),
    d1_cohort AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', r.first_reg_dt) as cohort_date,
        COUNT(DISTINCT r.user_pseudo_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN a.user_pseudo_id IS NOT NULL THEN r.user_pseudo_id END) as retained_d1
      FROM reg_users r
      LEFT JOIN (
        SELECT DISTINCT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) as dt
        FROM \`${dataset()}.${table()}\`
        WHERE ${tableSuffixSince(lookback)}
          AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)${extra}
          AND event_name NOT IN ('notification_receive','notification_dismiss','app_remove')
      ) a ON r.user_pseudo_id = a.user_pseudo_id
        AND a.dt = DATE_ADD(r.first_reg_dt, INTERVAL 1 DAY)
      WHERE r.first_reg_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND r.first_reg_dt < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY 1
    )
    SELECT
      d.date,
      d.new_users,
      COALESCE(r.registration, 0) as registration,
      d.pseudo_dau,
      d.dau,
      d.payers,
      d.revenue,
      d.unlock_users,
      COALESCE(u.unlock_ge2, 0) as unlock_ge2,
      d.withdrawal,
      c.cohort_size as d1_cohort_size,
      c.retained_d1
    FROM daily d
    LEFT JOIN registration_daily r ON r.date = d.date
    LEFT JOIN d1_cohort c ON c.cohort_date = d.date
    LEFT JOIN unlock_ge2_daily u ON u.date = d.date
    ORDER BY d.dt ASC
  `;
}

// User Attributes - Age & Device (platform + device.category)
export function getUserAttributesQuery(days: number = 30) {
  return `
    WITH device_agg AS (
      SELECT
        platform as device_type,
        device.category as device_category,
        COUNT(DISTINCT user_pseudo_id) as users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
      GROUP BY 1, 2
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
    SELECT
      'device' as type,
      CONCAT(
        COALESCE(device_type, 'unknown'),
        ' · ',
        COALESCE(device_category, '—')
      ) as attr,
      users
    FROM device_agg
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

// Monetization - Revenue Mix: Subscription vs Unlock Pack (same product_id rule as Paid Sub Revenue)
export function getMonetizationQuery(days: number = 30) {
  return `
    WITH classified AS (
      SELECT
        CASE
          WHEN event_name IN ('purchase', 'in_app_purchase', 'app_store_subscription_convert', 'app_store_subscription_renew', 'iap_success')
            AND ${SUBSCRIPTION_PAID_PRODUCT_PARAMS}
            THEN 'Subscription'
          ELSE 'Unlock Pack'
        END as revenue_stream,
        event_value_in_usd
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('purchase', 'in_app_purchase', 'app_store_subscription_convert', 'app_store_subscription_renew', 'iap_success')
        AND event_value_in_usd > 0
    )
    SELECT revenue_stream, SUM(event_value_in_usd) as revenue
    FROM classified
    GROUP BY 1
    ORDER BY revenue DESC
  `;
}

// Economy Health (economy_flow) — segment: 'all' | 'paid'
export function getEconomyHealthQuery(days: number = 30, segment: string = "all") {
  const paidFilter = segment === "paid"
    ? `AND user_pseudo_id IN (
        SELECT DISTINCT user_pseudo_id FROM \`${dataset()}.${table()}\`
        WHERE ${tableFilter(days)} AND event_name IN ('purchase','in_app_purchase','iap_success')
      )`
    : "";
  return `
    WITH base AS (
      SELECT user_pseudo_id, event_name, event_value_in_usd
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} ${paidFilter}
    ),
    dau AS (
      SELECT COUNT(DISTINCT case when event_name = 'Enter_NewUserLandSupPage' then user_pseudo_id else null end) as total_dau FROM base
    ),
    unlock_stats AS (
      SELECT
        COUNT(*) as unlock_events,
        COUNT(DISTINCT user_pseudo_id) as unlock_users
      FROM base
      WHERE event_name IN ('video_unlock_success')
    ),
    scratch_stats AS (
      SELECT
        COUNT(*) as scratch_events,
        COUNT(DISTINCT user_pseudo_id) as scratch_users
      FROM base
      WHERE event_name in ('scratch_result_view', 'scratch_reward_grant_result')
    ),
    scratch_rewards AS (
      SELECT
        COUNT(*) as reward_events,
        COALESCE(SUM(reward_val), 0) as reward_diamonds_total
      FROM (
        SELECT
          COALESCE(SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'reward_amount') AS FLOAT64),SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'diamonds_amount') AS FLOAT64)) as reward_val
        FROM \`${dataset()}.${table()}\`
        WHERE ${tableFilter(days)} and event_name in ('scratch_result_view', 'scratch_reward_grant_result')
      )
      WHERE reward_val IS NOT NULL AND reward_val BETWEEN 0 AND 20000
    ),
    upgrade_stats AS (
      SELECT
        COUNT(DISTINCT user_pseudo_id) as upgrade_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} ${paidFilter}
        AND event_name = 'scratch_upgrade_result'
        AND EXISTS (
          SELECT 1 FROM UNNEST(event_params) 
          WHERE key = 'upgrade_status' AND value.string_value = 'insufficient_balance' 
        )
    )
    SELECT
      (SELECT total_dau FROM dau) as total_dau,
      (SELECT unlock_events FROM unlock_stats) as unlock_events,
      (SELECT unlock_users FROM unlock_stats) as unlock_users,
      (SELECT scratch_events FROM scratch_stats) as scratch_events,
      (SELECT scratch_users FROM scratch_stats) as scratch_users,
      (SELECT reward_events FROM scratch_rewards) as reward_events,
      (SELECT reward_diamonds_total FROM scratch_rewards) as reward_diamonds_total,
      (SELECT upgrade_users FROM upgrade_stats) as upgrade_users
  `;
}

// Content & Feed Performance
// Part 1: daily post counts for Sup / $up / Sequel (line chart)
// Part 2: SUP and $UP engagement metrics with likes (summary table)
export function getContentFeedQuery(days: number = 30) {
  return `
    -- Part 1: Daily post counts
    WITH daily_posts AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date_str,
        COUNTIF(event_name = 'PostedSup_Success') as sup_posts,
        COUNTIF(event_name = 'Click_SendtoDollarSup') as up_posts,
        COUNTIF(event_name = 'Click_PostedSequel_success') as sequel_posts
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('PostedSup_Success','Click_SendtoDollarSup','Click_PostedSequel_success')
      GROUP BY 1
      ORDER BY 1
    ),

    -- video_id → video_author_id mapping (for exposure + like attribution)
    video_author_map AS (
      SELECT DISTINCT
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') as video_id,
        COALESCE(
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_type'),
          ''
        ) as video_type
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('video_click_play','video_click_unlock','video_unlock_success')
        AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') IS NOT NULL
    ),

    -- Part 2: Engagement events (clicks, unlocks, likes only — video_exposure no longer tracked)
    engagement AS (
      SELECT
        event_name,
        COALESCE(
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_type'),
          ''
        ) as video_type,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'price') as price,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') as video_id,
        user_pseudo_id
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN (
          'video_click_play','video_click_unlock','video_unlock_success',
          'click_like_button','LikeVideos_Success','LikePhotos_Success'
        )
    ),

    -- Resolve video_type for like events via video_id join
    like_with_type AS (
      SELECT
        e.event_name,
        COALESCE(vam.video_type, e.video_type) as video_type,
        e.video_id,
        e.user_pseudo_id
      FROM engagement e
      LEFT JOIN video_author_map vam ON e.video_id = vam.video_id
      WHERE e.event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success')
    ),

    -- SUP metrics (no exposure; click_rate = like engagement per click play)
    sup_metrics AS (
      SELECT
        0 as exposure,
        0 as exposure_uv,
        COUNTIF(event_name = 'video_click_play' AND video_type = 'SUP') as click_play,
        COUNT(DISTINCT CASE WHEN event_name = 'video_click_play' AND video_type = 'SUP'
          THEN user_pseudo_id END) as click_play_uv,
        SAFE_DIVIDE(
          (SELECT COUNT(*) FROM like_with_type WHERE video_type = 'SUP'),
          NULLIF(COUNTIF(event_name = 'video_click_play' AND video_type = 'SUP'), 0)
        ) * 100 as click_rate
      FROM engagement
    ),
    sup_likes AS (
      SELECT
        COUNT(*) as like_count,
        COUNT(DISTINCT user_pseudo_id) as like_uv
      FROM like_with_type
      WHERE video_type = 'SUP'
    ),

    -- $UP metrics (no exposure; rates use click → unlock funnel only)
    up_metrics AS (
      SELECT
        0 as exposure,
        0 as exposure_uv,
        COUNTIF(event_name = 'video_click_unlock') as click_unlock,
        COUNT(DISTINCT CASE WHEN event_name = 'video_click_unlock'
          THEN user_pseudo_id END) as click_unlock_uv,
        COUNTIF(event_name = 'video_unlock_success') as unlock_success,
        COUNT(DISTINCT CASE WHEN event_name = 'video_unlock_success'
          THEN user_pseudo_id END) as unlock_success_uv,
        SAFE_DIVIDE(
          COUNTIF(event_name = 'video_unlock_success'),
          NULLIF(COUNTIF(event_name = 'video_click_unlock'), 0)
        ) * 100 as click_unlock_rate,
        SAFE_DIVIDE(
          COUNTIF(event_name = 'video_unlock_success'),
          NULLIF(COUNTIF(event_name = 'video_click_unlock'), 0)
        ) * 100 as unlock_success_rate,
        COALESCE(SUM(CASE WHEN event_name = 'video_unlock_success'
          THEN SAFE_CAST(price AS FLOAT64) END), 0) as revenue
      FROM engagement
    ),
    up_likes AS (
      SELECT
        COUNT(*) as like_count,
        COUNT(DISTINCT user_pseudo_id) as like_uv
      FROM like_with_type
      WHERE video_type IN ('$UP','more_$up')
    )

    -- Return daily posts + metrics in one result using a type column
    SELECT 'daily' as result_type, date_str, sup_posts, up_posts, sequel_posts,
      0 as sup_exposure, 0 as sup_exposure_uv, 0 as sup_click_play, 0 as sup_click_play_uv, 0.0 as sup_click_rate,
      0 as sup_like_count, 0 as sup_like_uv, 0.0 as sup_like_rate,
      0 as up_exposure, 0 as up_exposure_uv, 0 as up_click_unlock, 0 as up_click_unlock_uv,
      0 as up_unlock_success, 0 as up_unlock_success_uv,
      0.0 as up_click_unlock_rate, 0.0 as up_unlock_success_rate, 0.0 as up_revenue,
      0 as up_like_count, 0 as up_like_uv, 0.0 as up_like_rate
    FROM daily_posts
    UNION ALL
    SELECT 'metrics', NULL, 0, 0, 0,
      s.exposure, s.exposure_uv, s.click_play, s.click_play_uv, s.click_rate,
      sl.like_count, sl.like_uv,
      SAFE_DIVIDE(sl.like_count, NULLIF(s.click_play, 0)) * 100,
      u.exposure, u.exposure_uv, u.click_unlock, u.click_unlock_uv,
      u.unlock_success, u.unlock_success_uv,
      u.click_unlock_rate, u.unlock_success_rate, u.revenue,
      ul.like_count, ul.like_uv,
      SAFE_DIVIDE(ul.like_count, NULLIF(u.unlock_success, 0)) * 100
    FROM sup_metrics s, sup_likes sl, up_metrics u, up_likes ul
  `;
}

// Growth Funnel: first_open → registration → first_unlock → scratch_activated → first_sup / first_$up → first_pay
// New user activation flow:
//   1. first_open (download & open)
//   2. registration (auth_submit_result/auth_oauth_result or legacy)
//   3. first_unlock = dollarsup_first_unlock_success (onboarding step 3) or video_unlock_success
//   4. scratch_activated = onb_scratchcard_grant / scratch_reward_grant_result / scratch_guide_complete
//      (completed newbie loop: unlock → scratch → reward. Gap vs first_unlock = users who unlocked
//       via video_unlock_success outside onboarding, which doesn't trigger auto-scratch)
//   5. first_sup = first Click_Sup on SUP content (free content engagement)
//   6. first_up = first Click_Sup on $UP content (paid content interest)
//   7. first_pay = purchase / iap_success / subscription
export function getGrowthFunnelQuery(days: number = 30) {
  return `
    WITH base AS (
      SELECT user_pseudo_id, event_date, event_name, event_timestamp,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result') as result_val,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source') as feed_area
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(days + 14)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 14} DAY)
    ),
    first_opens AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as open_dt
      FROM base WHERE event_name = 'first_open'
      GROUP BY 1
      HAVING open_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
    ),
    first_events AS (
      SELECT
        s.user_pseudo_id,
        MIN(CASE WHEN b.event_name IN (
          'Success_GoogleRegister','Success_AppleRegister',
          'Register_Email_Success','Register_Number_Success',
          'auth_oauth_result'
        ) THEN b.event_date END) as first_register,
        MIN(CASE WHEN b.event_name IN (
          'dollarsup_first_unlock_success'
        ) THEN b.event_date END) as first_unlock,
        MIN(CASE WHEN b.event_name IN (
          'onb_scratchcard_grant'
        ) OR (b.event_name = 'scratch_guide_complete' AND b.result_val = 'success')
        THEN b.event_date END) as scratch_activated,
        MIN(CASE WHEN b.event_name in ('PostedSup_Success')
          THEN b.event_date END) as first_sup,
        MIN(CASE WHEN b.event_name = 'Click_SendtoDollarSup'
          THEN b.event_date END) as first_up,
        MIN(CASE WHEN b.event_name IN (
          'purchase','in_app_purchase','iap_success',
          'app_store_subscription_convert','app_store_subscription_renew'
        ) THEN b.event_date END) as first_pay
      FROM first_opens s
      JOIN base b ON s.user_pseudo_id = b.user_pseudo_id
        AND PARSE_DATE('%Y%m%d', b.event_date) >= s.open_dt
      GROUP BY 1
    )
    SELECT 'first_open' as step, COUNT(*) as users FROM first_opens
    UNION ALL SELECT 'registration', COUNT(*) FROM first_events WHERE first_register IS NOT NULL
    UNION ALL SELECT 'first_unlock', COUNT(*) FROM first_events WHERE first_unlock IS NOT NULL
    UNION ALL SELECT 'scratch_activated', COUNT(*) FROM first_events WHERE scratch_activated IS NOT NULL
    UNION ALL SELECT 'first_sup', COUNT(*) FROM first_events WHERE first_sup IS NOT NULL
    UNION ALL SELECT 'first_up', COUNT(*) FROM first_events WHERE first_up IS NOT NULL
    UNION ALL SELECT 'first_pay', COUNT(*) FROM first_events WHERE first_pay IS NOT NULL
    ORDER BY CASE step
      WHEN 'first_open' THEN 1 WHEN 'registration' THEN 2 WHEN 'first_unlock' THEN 3
      WHEN 'scratch_activated' THEN 4 WHEN 'first_sup' THEN 5 WHEN 'first_up' THEN 6
      WHEN 'first_pay' THEN 7 ELSE 8 END
  `;
}

// Discover event names and firebase_screen values that look registration-page related (for funnel mapping)
export function getRegistrationRelatedEventsQuery(days: number = 30) {
  return `
    SELECT * FROM (
      SELECT event_name as name, 'event' as type, COUNT(*) as cnt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(days)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND (
          LOWER(event_name) LIKE '%registration%'
          OR LOWER(event_name) LIKE '%register%'
          OR LOWER(event_name) LIKE '%signup%'
          OR LOWER(event_name) LIKE '%sign_up%'
          OR LOWER(event_name) LIKE '%auth%'
          OR LOWER(event_name) LIKE '%login%'
          OR LOWER(event_name) LIKE '%page%'
          OR LOWER(event_name) LIKE '%name%'
          OR LOWER(event_name) LIKE '%phone%'
          OR LOWER(event_name) LIKE '%email%'
          OR LOWER(event_name) LIKE '%verify%'
          OR LOWER(event_name) LIKE '%code%'
          OR LOWER(event_name) LIKE '%otp%'
        )
      GROUP BY event_name
      UNION ALL
      SELECT name, type, cnt FROM (
        SELECT
          COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'firebase_screen'), '(no screen)') as name,
          'screen' as type,
          COUNT(*) as cnt
        FROM \`${dataset()}.${table()}\`
        WHERE ${tableSuffixSince(days)}
          AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
          AND event_name IN ('All_PageBehavior')
        GROUP BY 1
      )
      WHERE LOWER(COALESCE(name,'')) LIKE '%registration%'
         OR LOWER(COALESCE(name,'')) LIKE '%register%'
         OR LOWER(COALESCE(name,'')) LIKE '%signup%'
         OR LOWER(COALESCE(name,'')) LIKE '%auth%'
         OR LOWER(COALESCE(name,'')) LIKE '%login%'
         OR LOWER(COALESCE(name,'')) LIKE '%page%'
         OR LOWER(COALESCE(name,'')) LIKE '%name%'
         OR LOWER(COALESCE(name,'')) LIKE '%phone%'
         OR LOWER(COALESCE(name,'')) LIKE '%email%'
         OR LOWER(COALESCE(name,'')) LIKE '%verify%'
         OR LOWER(COALESCE(name,'')) LIKE '%code%'
    ) ORDER BY type, cnt DESC
  `;
}

// Registration Funnel
export function getRegistrationFunnelQuery(days: number = 30) {
  const REG_EVENTS = `(
    b.event_name IN ('Success_GoogleRegister','Success_AppleRegister',
      'Register_Email_Success','Register_Number_Success',
      'Login_Email_Success','Login_Number_Success','auth_oauth_result')
  )`;
  const REG_EVENTS_B2 = REG_EVENTS.replace(/\bb\./g, 'b2.');

  const CORE_COUNTRIES = "('US','GB','IN','BR','ID','DE','FR','JP','KR','CA','MX')";
  return `
    WITH base AS (
      SELECT user_pseudo_id, event_date, event_name, event_timestamp,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result') as result_val,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'provider') as provider,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'flow_type') as flow_type,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'auth_method') as auth_method,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_name') as screen_name,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_name') as cta_name,
        COALESCE(geo.country, '') as country
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(days + 14)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 14} DAY)
    ),
    first_opens AS (
      SELECT user_pseudo_id, MIN(event_timestamp) as open_ts, MIN(PARSE_DATE('%Y%m%d', event_date)) as open_dt, ANY_VALUE(b.country) as country
      FROM base b WHERE b.event_name = 'first_open'
      GROUP BY 1
      HAVING open_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
    ),
    user_events AS (
      SELECT
        s.user_pseudo_id,
        s.country,
        -- Any user action after open (click, submit, success — not passive views: auth_screen_view)
        MIN(CASE
          WHEN b.event_name = 'auth_entry_click'
            OR b.event_name IN ('auth_nickname_next','auth_submit_result','auth_oauth_result','auth_method_switch')
            OR b.event_name IN ('Success_GoogleRegister','Success_AppleRegister','Register_Email_Success','Register_Number_Success','Login_Email_Success','Login_Number_Success')
          THEN b.event_timestamp END
        ) as any_action_ts,
        -- First entry: any auth_entry_click (Continue or Sign up)
        MIN(CASE WHEN b.event_name = 'auth_entry_click' THEN b.event_timestamp END) as auth_entry_click_ts,
        -- Debug: each action type (for No action breakdown)
        MIN(CASE WHEN b.event_name = 'auth_nickname_next' THEN b.event_timestamp END) as auth_nickname_next_ts,
        MIN(CASE WHEN b.event_name = 'auth_submit_result' THEN b.event_timestamp END) as auth_submit_result_ts,
        MIN(CASE WHEN b.event_name = 'auth_oauth_result' OR b.event_name = 'auth_method_switch' THEN b.event_timestamp END) as auth_oauth_or_switch_ts,
        MIN(CASE WHEN b.event_name IN ('Success_GoogleRegister','Success_AppleRegister','Register_Email_Success','Register_Number_Success','Login_Email_Success','Login_Number_Success') THEN b.event_timestamp END) as legacy_success_ts,
        -- Click sign up: auth_entry_click with cta_name='signup' only
        MIN(CASE WHEN b.event_name = 'auth_entry_click' AND LOWER(COALESCE(b.cta_name,'')) = 'signup' THEN b.event_timestamp END) as click_signup_ts,
        -- Registered: all registration success events (aligned with growth funnel)
        MIN(CASE WHEN ${REG_EVENTS} THEN b.event_timestamp END) as reg_ts,
        -- Landed: first Enter_NewUserLandSupPage after any registration success
        MIN(CASE WHEN b.event_name IN ('Enter_NewUserLandSupPage')
          AND (SELECT MIN(b2.event_timestamp) FROM base b2
               WHERE b2.user_pseudo_id = s.user_pseudo_id AND ${REG_EVENTS_B2}
          ) IS NOT NULL
          AND b.event_timestamp > (SELECT MIN(b2.event_timestamp) FROM base b2
            WHERE b2.user_pseudo_id = s.user_pseudo_id AND ${REG_EVENTS_B2})
          THEN b.event_timestamp END) as first_page_after_reg_ts,
        -- Channel clicks (Google/Apple via auth_entry_click or auth_method_switch)
        MIN(CASE WHEN (b.event_name = 'auth_entry_click' AND LOWER(COALESCE(b.cta_name,'')) = 'google')
          OR (b.event_name = 'auth_method_switch' AND LOWER(COALESCE(b.provider,'')) = 'google')
          THEN b.event_timestamp END) as click_google_ts,
        MIN(CASE WHEN (b.event_name = 'auth_entry_click' AND LOWER(COALESCE(b.cta_name,'')) = 'apple')
          OR (b.event_name = 'auth_method_switch' AND LOWER(COALESCE(b.provider,'')) = 'apple')
          THEN b.event_timestamp END) as click_apple_ts,
        MIN(CASE WHEN (b.event_name = 'auth_entry_click' AND LOWER(COALESCE(b.cta_name,'')) = 'email')
          THEN b.event_timestamp END) as click_email_ts,
        MIN(CASE WHEN (b.event_name = 'auth_entry_click' AND LOWER(COALESCE(b.cta_name,'')) = 'phone')
          THEN b.event_timestamp END) as click_phone_ts,
        -- Channel success
        MIN(CASE WHEN b.event_name = 'Success_GoogleRegister'
          OR (b.event_name = 'auth_oauth_result' AND LOWER(COALESCE(b.provider,'')) = 'google' AND LOWER(COALESCE(b.result_val,'')) = 'success')
          OR (b.event_name = 'auth_method_switch' AND LOWER(COALESCE(b.provider,'')) = 'google' AND LOWER(COALESCE(b.result_val,'')) = 'success')
          THEN b.event_timestamp END) as reg_google_ts,
        MIN(CASE WHEN b.event_name = 'Success_AppleRegister'
          OR (b.event_name = 'auth_oauth_result' AND LOWER(COALESCE(b.provider,'')) = 'apple' AND LOWER(COALESCE(b.result_val,'')) = 'success')
          OR (b.event_name = 'auth_method_switch' AND LOWER(COALESCE(b.provider,'')) = 'apple' AND LOWER(COALESCE(b.result_val,'')) = 'success')
          THEN b.event_timestamp END) as reg_apple_ts,
        MIN(CASE WHEN (b.event_name = 'auth_submit_result' AND LOWER(COALESCE(b.result_val,'')) = 'success' AND LOWER(COALESCE(b.auth_method,'')) = 'email')
          OR b.event_name = 'Register_Email_Success' OR b.event_name = 'Login_Email_Success'
          THEN b.event_timestamp END) as reg_email_ts,
        MIN(CASE WHEN (b.event_name = 'auth_submit_result' AND LOWER(COALESCE(b.result_val,'')) = 'success' AND LOWER(COALESCE(b.auth_method,'')) = 'phone')
          OR b.event_name = 'Register_Number_Success' OR b.event_name = 'Login_Number_Success'
          THEN b.event_timestamp END) as reg_phone_ts,
        -- No-action expansion: 看视频 / 加好友 / 个人主页 / 拍摄 (land = enter_main already above)
        MIN(CASE WHEN b.event_name IN ('video_start','video_play','video_complete','video_end','Video_Complete','Click_Sup') THEN b.event_timestamp END) as watch_video_ts,
        MIN(CASE WHEN (b.event_name LIKE '%follow%' OR b.event_name LIKE '%friend%' OR b.event_name IN ('AddFriend_Success','click_follow_button','user_follow','InviteFriendViaText_Success','profile_top_button_click','other_profile_top_button_click')) THEN b.event_timestamp END) as add_friend_ts,
        MIN(CASE WHEN b.event_name IN ('All_PageBehavior','auth_screen_view')
          AND (LOWER(COALESCE(b.screen_name,'')) LIKE '%profile%' OR LOWER(COALESCE(b.screen_name,'')) IN ('my_profile','user_profile','profile','personal_home','me')) THEN b.event_timestamp END) as profile_view_ts,
        MIN(CASE WHEN (b.event_name LIKE '%record%' OR b.event_name LIKE '%shoot%' OR b.event_name LIKE '%capture%' OR b.event_name LIKE '%publish%' OR b.event_name LIKE '%post%' OR b.event_name LIKE '%Post%' OR b.event_name IN ('video_record_start','shoot_start','publish_video','create_video','record_start')) THEN b.event_timestamp END) as shooting_ts
      FROM first_opens s
      JOIN base b ON s.user_pseudo_id = b.user_pseudo_id
        AND PARSE_DATE('%Y%m%d', b.event_date) >= s.open_dt
      GROUP BY 1, 2
    )
    SELECT 'app_open' as step, COUNT(*) as users FROM first_opens
    UNION ALL SELECT 'app_open_no_action', COUNT(*) FROM user_events
      WHERE auth_entry_click_ts IS NULL
        AND auth_nickname_next_ts IS NULL
        AND auth_submit_result_ts IS NULL
        AND auth_oauth_or_switch_ts IS NULL
        AND legacy_success_ts IS NULL
        AND reg_ts IS NULL
        AND first_page_after_reg_ts IS NULL
        AND click_google_ts IS NULL
        AND click_apple_ts IS NULL
        AND click_email_ts IS NULL
        AND click_phone_ts IS NULL
        AND reg_google_ts IS NULL
        AND reg_apple_ts IS NULL
        AND reg_email_ts IS NULL
        AND reg_phone_ts IS NULL
        AND watch_video_ts IS NULL
        AND add_friend_ts IS NULL
        AND profile_view_ts IS NULL
        AND shooting_ts IS NULL
    UNION ALL SELECT 'auth_entry_click', COUNT(*) FROM user_events WHERE auth_entry_click_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_auth_entry_click', COUNT(*) FROM user_events WHERE auth_entry_click_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_auth_nickname_next', COUNT(*) FROM user_events WHERE auth_nickname_next_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_auth_submit_result', COUNT(*) FROM user_events WHERE auth_submit_result_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_auth_oauth_or_switch', COUNT(*) FROM user_events WHERE auth_oauth_or_switch_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_legacy_success', COUNT(*) FROM user_events WHERE legacy_success_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_reg', COUNT(*) FROM user_events WHERE reg_ts IS NOT NULL
    UNION ALL SELECT 'click_signup', COUNT(*) FROM user_events WHERE click_signup_ts IS NOT NULL
    UNION ALL SELECT 'registered', COUNT(*) FROM user_events WHERE reg_ts IS NOT NULL
    UNION ALL SELECT 'enter_main', COUNT(*) FROM user_events WHERE first_page_after_reg_ts IS NOT NULL
    UNION ALL SELECT 'click_google', COUNT(*) FROM user_events WHERE click_google_ts IS NOT NULL
    UNION ALL SELECT 'click_apple', COUNT(*) FROM user_events WHERE click_apple_ts IS NOT NULL
    UNION ALL SELECT 'click_email', COUNT(*) FROM user_events WHERE click_email_ts IS NOT NULL
    UNION ALL SELECT 'click_phone', COUNT(*) FROM user_events WHERE click_phone_ts IS NOT NULL
    UNION ALL SELECT 'reg_google', COUNT(*) FROM user_events WHERE reg_google_ts IS NOT NULL
    UNION ALL SELECT 'reg_apple', COUNT(*) FROM user_events WHERE reg_apple_ts IS NOT NULL
    UNION ALL SELECT 'reg_email', COUNT(*) FROM user_events WHERE reg_email_ts IS NOT NULL
    UNION ALL SELECT 'reg_phone', COUNT(*) FROM user_events WHERE reg_phone_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_watch_video', COUNT(*) FROM user_events WHERE watch_video_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_add_friend', COUNT(*) FROM user_events WHERE add_friend_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_profile_view', COUNT(*) FROM user_events WHERE profile_view_ts IS NOT NULL
    UNION ALL SELECT 'debug_has_shooting', COUNT(*) FROM user_events WHERE shooting_ts IS NOT NULL
    UNION ALL SELECT CONCAT('country_', country, '_google'), COUNT(*) FROM user_events WHERE reg_google_ts IS NOT NULL AND TRIM(COALESCE(country,'')) != '' AND country IN ${CORE_COUNTRIES} GROUP BY country
    UNION ALL SELECT CONCAT('country_', country, '_apple'), COUNT(*) FROM user_events WHERE reg_apple_ts IS NOT NULL AND TRIM(COALESCE(country,'')) != '' AND country IN ${CORE_COUNTRIES} GROUP BY country
    UNION ALL SELECT CONCAT('country_', country, '_email'), COUNT(*) FROM user_events WHERE reg_email_ts IS NOT NULL AND TRIM(COALESCE(country,'')) != '' AND country IN ${CORE_COUNTRIES} GROUP BY country
    UNION ALL SELECT CONCAT('country_', country, '_phone'), COUNT(*) FROM user_events WHERE reg_phone_ts IS NOT NULL AND TRIM(COALESCE(country,'')) != '' AND country IN ${CORE_COUNTRIES} GROUP BY country
    ORDER BY CASE step
      WHEN 'app_open' THEN 1 WHEN 'app_open_no_action' THEN 2 WHEN 'auth_entry_click' THEN 3
      WHEN 'debug_has_auth_entry_click' THEN 4 WHEN 'debug_has_auth_nickname_next' THEN 5 WHEN 'debug_has_auth_submit_result' THEN 6
      WHEN 'debug_has_auth_oauth_or_switch' THEN 7 WHEN 'debug_has_legacy_success' THEN 8 WHEN 'debug_has_reg' THEN 9
      WHEN 'click_signup' THEN 10 WHEN 'registered' THEN 11 WHEN 'enter_main' THEN 12
      WHEN 'click_google' THEN 13 WHEN 'click_apple' THEN 14 WHEN 'click_email' THEN 15 WHEN 'click_phone' THEN 16
      WHEN 'reg_google' THEN 17 WHEN 'reg_apple' THEN 18 WHEN 'reg_email' THEN 19 WHEN 'reg_phone' THEN 20
      ELSE 21 END
  `;
}

// Retention: D1/D3/D7/D14 by registration cohort (same as KPI: REG_GEO + REG_EVENTS)
export function getRetentionQuery(days: number = 30) {
  return `
    WITH reg_users AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as reg_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(days + 14)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 14} DAY)
        AND ${REG_GEO} AND ${REG_EVENTS}
      GROUP BY 1
      HAVING reg_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
    ),
    activity AS (
      SELECT r.user_pseudo_id, r.reg_dt, b.event_date,
        DATE_DIFF(PARSE_DATE('%Y%m%d', b.event_date), r.reg_dt, DAY) as day_num
      FROM reg_users r
      JOIN \`${dataset()}.${table()}\` b
        ON r.user_pseudo_id = b.user_pseudo_id
        AND PARSE_DATE('%Y%m%d', b.event_date) > r.reg_dt
        AND PARSE_DATE('%Y%m%d', b.event_date) <= DATE_ADD(r.reg_dt, INTERVAL 14 DAY)
      WHERE ${tableSuffixSince(days + 14)}
        AND PARSE_DATE('%Y%m%d', b.event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 14} DAY) 
        AND b.event_name NOT IN ('notification_receive','notification_dismiss','app_remove')
      GROUP BY 1, 2, 3, 4
    ),
    retained AS (
      SELECT day_num, COUNT(DISTINCT user_pseudo_id) as cnt
      FROM activity WHERE day_num IN (1, 3, 7, 14)
      GROUP BY 1
    ),
    total_cohort AS (SELECT COUNT(*) as n FROM reg_users)
    SELECT
      retained.day_num,
      retained.cnt as retained_users,
      ROUND(100.0 * retained.cnt / NULLIF((SELECT n FROM total_cohort), 0), 1) as rate
    FROM retained
    ORDER BY retained.day_num
  `;
}

// Retention: D1/D3/D7/D14 by unlock cohort (users who unlocked at least once; D0 = first unlock date)
export function getRetentionQueryUnlockCohort(days: number = 30) {
  const lookback = days + 14;
  return `
    WITH unlock_cohort AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as cohort_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name IN ('video_unlock_success','dollarsup_first_unlock_success','video_click_unlock')
      GROUP BY 1
      HAVING cohort_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
    ),
    activity AS (
      SELECT u.user_pseudo_id, u.cohort_dt, b.event_date,
        DATE_DIFF(PARSE_DATE('%Y%m%d', b.event_date), u.cohort_dt, DAY) as day_num
      FROM unlock_cohort u
      JOIN \`${dataset()}.${table()}\` b
        ON u.user_pseudo_id = b.user_pseudo_id
        AND PARSE_DATE('%Y%m%d', b.event_date) > u.cohort_dt
        AND PARSE_DATE('%Y%m%d', b.event_date) <= DATE_ADD(u.cohort_dt, INTERVAL 14 DAY)
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', b.event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND b.event_name NOT IN ('notification_receive','notification_dismiss','app_remove')
      GROUP BY 1, 2, 3, 4
    ),
    retained AS (
      SELECT day_num, COUNT(DISTINCT user_pseudo_id) as cnt
      FROM activity WHERE day_num IN (1, 3, 7, 14)
      GROUP BY 1
    ),
    total_cohort AS (SELECT COUNT(*) as n FROM unlock_cohort)
    SELECT
      retained.day_num,
      retained.cnt as retained_users,
      ROUND(100.0 * retained.cnt / NULLIF((SELECT n FROM total_cohort), 0), 1) as rate
    FROM retained
    ORDER BY retained.day_num
  `;
}

// Unlock User D7 Retention (users who unlocked at least once → active on D7)
export function getUnlockD7RetentionQuery(days: number = 30) {
  const lookback = days + 14;
  return `
    WITH unlock_users AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_unlock_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name IN ('video_unlock_success','dollarsup_first_unlock_success')
      GROUP BY 1
      HAVING first_unlock_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND first_unlock_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ),
    activity AS (
      SELECT DISTINCT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) as dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name NOT IN ('notification_receive','notification_dismiss','app_remove')
    ) 
    SELECT
      COUNT(DISTINCT u.user_pseudo_id) as total_unlock_users,
      COUNT(DISTINCT CASE WHEN a.dt IS NOT NULL THEN u.user_pseudo_id END) as d7_retained
    FROM unlock_users u
    LEFT JOIN activity a
      ON u.user_pseudo_id = a.user_pseudo_id
      AND a.dt = DATE_ADD(u.first_unlock_dt, INTERVAL 7 DAY)
  `;
}

// Unlock count distribution in first 7 days after signup
export function getUnlockDistributionQuery(days: number = 30) {
  const lookback = days + 14;
  return `
    WITH signups AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as signup_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND ${REG_GEO} AND ${REG_EVENTS}
      GROUP BY 1
      HAVING signup_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND signup_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ),
    unlock_events AS (
      SELECT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) as dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name IN ('video_unlock_success','dollarsup_first_unlock_success')
    ),
    user_counts AS (
      SELECT s.user_pseudo_id,
        COUNT(e.dt) as unlock_count
      FROM signups s
      LEFT JOIN unlock_events e
        ON s.user_pseudo_id = e.user_pseudo_id
        AND e.dt BETWEEN s.signup_dt AND DATE_ADD(s.signup_dt, INTERVAL 6 DAY)
      GROUP BY 1
    )
    SELECT
      CASE
        WHEN unlock_count = 0 THEN '0'
        WHEN unlock_count = 1 THEN '1'
        WHEN unlock_count = 2 THEN '2'
        WHEN unlock_count = 3 THEN '3'
        WHEN unlock_count = 4 THEN '4'
        WHEN unlock_count BETWEEN 5 AND 9 THEN '5-9'
        ELSE '10+'
      END as bucket,
      COUNT(*) as user_count
    FROM user_counts
    GROUP BY 1
    ORDER BY MIN(unlock_count)
  `;
}

// Scratch count distribution (auto or manual) in period — per-user scratch event count, bucketed
export function getScratchDistributionQuery(days: number = 30) {
  return `
    WITH base_users AS (
      SELECT DISTINCT user_pseudo_id
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name in ('scratch_result_view')
    ),
    scratch_per_user AS (
      SELECT user_pseudo_id,
        COUNT(*) as scratch_count,
        COUNTIF(event_name in ('scratch_result_view', 'scratch_reward_grant_result')) as auto_count,
        COUNTIF(event_name not in ('scratch_result_view', 'scratch_reward_grant_result')) as manual_count
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name in ('scratch_result_view', 'scratch_reward_grant_result')
      GROUP BY 1
    ),
    with_bucket AS (
      SELECT
        b.user_pseudo_id,
        COALESCE(s.scratch_count, 0) as scratch_count,
        COALESCE(s.auto_count, 0) as auto_count,
        COALESCE(s.manual_count, 0) as manual_count,
        CASE
          WHEN COALESCE(s.scratch_count, 0) = 0 THEN '0'
          WHEN COALESCE(s.scratch_count, 0) = 1 THEN '1'
          WHEN COALESCE(s.scratch_count, 0) = 2 THEN '2'
          WHEN COALESCE(s.scratch_count, 0) = 3 THEN '3'
          WHEN COALESCE(s.scratch_count, 0) = 4 THEN '4'
          WHEN COALESCE(s.scratch_count, 0) BETWEEN 5 AND 9 THEN '5-9'
          ELSE '10+'
        END as bucket
      FROM base_users b
      LEFT JOIN scratch_per_user s ON b.user_pseudo_id = s.user_pseudo_id
    )
    SELECT bucket, COUNT(*) as user_count
    FROM with_bucket
    GROUP BY bucket
    ORDER BY MIN(scratch_count)
  `;
}

// Reward distribution in period: per-user reward event count and per-user total diamonds, bucketed
export function getRewardDistributionQuery(days: number = 30) {
  return `
    WITH reward_events AS (
      SELECT user_pseudo_id,
        COALESCE(SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'reward_amount') AS FLOAT64),
        SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'diamonds_amount') AS FLOAT64)) as reward_amount
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} and event_name in ('scratch_result_view', 'scratch_reward_grant_result')
    ),
    reward_filtered AS (
      SELECT user_pseudo_id, reward_amount as amt
      FROM reward_events
      WHERE reward_amount IS NOT NULL AND reward_amount BETWEEN 0 AND 20000
    ),
    per_user AS (
      SELECT user_pseudo_id,
        COUNT(*) as reward_count,
        COALESCE(SUM(amt), 0) as total_diamonds
      FROM reward_filtered
      GROUP BY 1
    ),
    with_count_bucket AS (
      SELECT b.user_pseudo_id,
        COALESCE(r.reward_count, 0) as reward_count,
        COALESCE(r.total_diamonds, 0) as total_diamonds,
        CASE
          WHEN COALESCE(b.amt, 0)/1000 = 0 THEN '0'
          WHEN COALESCE(b.amt, 0) = 500 THEN '0.5'
          WHEN COALESCE(b.amt, 0)/1000 = 1 THEN '1'
          WHEN COALESCE(b.amt, 0)/1000 = 2 THEN '2'
          WHEN COALESCE(b.amt, 0)/1000 BETWEEN 3 AND 4 THEN '3-4'
          WHEN COALESCE(b.amt, 0)/1000 BETWEEN 5 AND 9 THEN '5-9'
          WHEN COALESCE(b.amt, 0)/1000 >= 10 THEN '10+'
        END as count_bucket,
        CASE
          WHEN COALESCE(r.total_diamonds, 0) = 0 THEN '0'
          WHEN COALESCE(r.total_diamonds, 0) BETWEEN 1 AND 1000 THEN '1-1k'
          WHEN COALESCE(r.total_diamonds, 0) BETWEEN 1001 AND 5000 THEN '1k-5k'
          WHEN COALESCE(r.total_diamonds, 0) BETWEEN 5001 AND 10000 THEN '5k-10k'
          ELSE '10k-20k'
        END as diamonds_bucket
      FROM reward_filtered b
      LEFT JOIN per_user r ON b.user_pseudo_id = r.user_pseudo_id
    )
    SELECT
      'count' as metric_type,
      count_bucket as bucket,
      COUNT(*) as user_count
    FROM with_count_bucket
    GROUP BY count_bucket
    UNION ALL
    SELECT
      'diamonds' as metric_type,
      diamonds_bucket as bucket,
      COUNT(*) as user_count
    FROM with_count_bucket
    GROUP BY diamonds_bucket
    ORDER BY metric_type, bucket
  `;
}

// Withdraw totals in period (users, events, total amount USD)
export function getWithdrawTotalsQuery(days: number = 30) {
  return `
    WITH withdraw_events AS (
      SELECT user_pseudo_id,
        COALESCE(SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'withdraw_amount') AS FLOAT64), 0) as amount_usd
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'withdraw_result'
    ),
    per_user AS (
      SELECT user_pseudo_id, COUNT(*) as withdraw_count, SUM(amount_usd) as total_usd
      FROM withdraw_events
      WHERE amount_usd > 0
      GROUP BY 1
    )
    SELECT
      COUNT(DISTINCT user_pseudo_id) as withdraw_users,
      CAST(COALESCE(SUM(withdraw_count), 0) AS INT64) as withdraw_events,
      ROUND(COALESCE(SUM(total_usd), 0), 2) as total_amount_usd
    FROM per_user
  `;
}

// Withdraw amount per user distribution (USD buckets)
export function getWithdrawDistributionQuery(days: number = 30) {
  return `
    WITH withdraw_events AS (
      SELECT user_pseudo_id,
        COALESCE(SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'withdraw_amount') AS FLOAT64), 0) as amount_usd
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'withdraw_result'
    ),
    per_user AS (
      SELECT user_pseudo_id, SUM(amount_usd) as total_usd
      FROM withdraw_events
      WHERE amount_usd > 0
      GROUP BY 1
    ),
    with_bucket AS (
      SELECT
        CASE
          WHEN total_usd < 10 THEN '1-10'
          WHEN total_usd < 50 THEN '10-50'
          WHEN total_usd < 100 THEN '50-100'
          ELSE '100+'
        END as bucket
      FROM per_user
    )
    SELECT bucket, COUNT(*) as user_count
    FROM with_bucket
    GROUP BY bucket
    ORDER BY MIN(CASE bucket WHEN '1-10' THEN 1 WHEN '10-50' THEN 2 WHEN '50-100' THEN 3 ELSE 4 END)
  `;
}

// Paid Users: KPI summary with first-time vs repeat breakdown
export function getPaidUsersKPIQuery(days: number = 30) {
  const lookback = days + 60;
  return `
    WITH period_events AS (
      SELECT user_pseudo_id, event_name, event_value_in_usd,
        PARSE_DATE('%Y%m%d', event_date) as event_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('purchase','in_app_purchase',
          'app_store_subscription_convert','app_store_subscription_renew')
    ),
    all_time_first AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_pay_dt, count(*) as pay_count
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND event_name IN ('purchase','in_app_purchase',
          'app_store_subscription_convert','app_store_subscription_renew')
      GROUP BY 1
    ),
    payer_classify AS (
      SELECT DISTINCT pe.user_pseudo_id,
        CASE WHEN af.pay_count = 1
          THEN 'first_time' ELSE 'repeat' END as payer_type
      FROM all_time_first
    ),
    sub_revenue AS (
      SELECT
        COALESCE(SUM(CASE
          WHEN event_name IN ('app_store_subscription_convert','app_store_subscription_renew')
            THEN event_value_in_usd
          WHEN event_name IN ('purchase','in_app_purchase','iap_success') AND (
            COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id'), '') IN ('exclusivemonthly', 'exclusiveaccess')
            OR (event_name = 'iap_success' AND COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id'), '') LIKE '%subscription%')
          ) THEN event_value_in_usd
          ELSE 0
        END), 0) as subscription_revenue,
        COALESCE(SUM(event_value_in_usd), 0) as total_revenue
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('purchase','in_app_purchase','iap_success',
          'app_store_subscription_convert','app_store_subscription_renew')
        AND event_value_in_usd > 0
    )
    SELECT
      (SELECT COUNT(DISTINCT user_pseudo_id) FROM period_events) as total_payers,
      (SELECT COUNT(*) FROM period_events WHERE event_value_in_usd > 0) as total_purchases,
      (SELECT total_revenue FROM sub_revenue) as total_revenue,
      (SELECT subscription_revenue FROM sub_revenue) as subscription_revenue,
      (SELECT COUNT(*) FROM payer_classify WHERE payer_type = 'first_time') as first_time_payers,
      (SELECT COUNT(*) FROM payer_classify WHERE payer_type = 'repeat') as repeat_payers
  `;
}

// Paid Users: D7 retention of first-time payers
export function getPaidUsersD7RetentionQuery(days: number = 30) {
  const lookback = days + 14;
  return `
    WITH first_payers AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_pay_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name IN ('purchase','in_app_purchase')
      GROUP BY 1
      HAVING first_pay_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND first_pay_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    ),
    activity AS (
      SELECT DISTINCT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) as dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name NOT IN ('notification_receive','notification_dismiss','app_remove')
    )
    SELECT
      COUNT(DISTINCT p.user_pseudo_id) as total_first_payers,
      COUNT(DISTINCT CASE WHEN a.dt IS NOT NULL THEN p.user_pseudo_id END) as d7_retained
    FROM first_payers p
    LEFT JOIN activity a
      ON p.user_pseudo_id = a.user_pseudo_id
      AND a.dt = DATE_ADD(p.first_pay_dt, INTERVAL 7 DAY)
  `;
}

// Paid Users: days from signup to first purchase distribution
export function getPaidUsersFirstPayDistQuery(days: number = 30) {
  const lookback = days + 14;
  return `
    WITH signups AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as signup_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name = 'first_open'
      GROUP BY 1
    ),
    first_pay AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_pay_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name IN ('purchase','in_app_purchase')
      GROUP BY 1
    ),
    combined AS (
      SELECT
        DATE_DIFF(fp.first_pay_dt, s.signup_dt, DAY) as days_to_pay
      FROM first_pay fp
      JOIN signups s ON fp.user_pseudo_id = s.user_pseudo_id
      WHERE fp.first_pay_dt >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND DATE_DIFF(fp.first_pay_dt, s.signup_dt, DAY) >= 0
    )
    SELECT
      CASE
        WHEN days_to_pay = 0 THEN 'D0'
        WHEN days_to_pay = 1 THEN 'D1'
        WHEN days_to_pay = 2 THEN 'D2'
        WHEN days_to_pay BETWEEN 3 AND 6 THEN 'D3-6'
        WHEN days_to_pay BETWEEN 7 AND 13 THEN 'D7-13'
        ELSE 'D14+'
      END as bucket,
      COUNT(*) as user_count
    FROM combined
    GROUP BY 1
    ORDER BY MIN(days_to_pay)
  `;
}

// Repurchase: lifetime first/second successful purchase; KPI + daily + platform breakdown
// Events: PURCHASE_EVENT_NAMES. Success: revenue > 0 OR iap_success (wallet / zero-USD IAP).
export function getRepurchaseQuery(days: number = 30) {
  /** ~3y export window — balances lifetime semantics vs scan cost (was 10y). */
  const life = 1095;
  return `
    WITH success_purchases AS (
      SELECT
        user_pseudo_id,
        event_timestamp,
        PARSE_DATE('%Y%m%d', event_date) AS dt,
        COALESCE(NULLIF(TRIM(UPPER(platform)), ''), 'UNKNOWN') AS platform
      FROM \`${dataset()}.${table()}\`
      WHERE ${lifetimeTableFilter(life)}
        AND event_name IN ${PURCHASE_EVENT_NAMES}
        AND (
          COALESCE(event_value_in_usd, 0) > 0
          OR event_name = 'iap_success'
        )
    ),
    first_ts AS (
      SELECT user_pseudo_id, MIN(event_timestamp) AS first_ts
      FROM success_purchases
      GROUP BY 1
    ),
    second_ts AS (
      SELECT s.user_pseudo_id, MIN(s.event_timestamp) AS second_ts
      FROM success_purchases s
      INNER JOIN first_ts f
        ON s.user_pseudo_id = f.user_pseudo_id
        AND s.event_timestamp > f.first_ts
      GROUP BY 1
    ),
    platform_first AS (
      SELECT user_pseudo_id, platform
      FROM (
        SELECT
          user_pseudo_id,
          platform,
          ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp) AS rn
        FROM success_purchases
      )
      WHERE rn = 1
    ),
    user_lifetime AS (
      SELECT
        f.user_pseudo_id,
        DATE(f.first_ts) AS first_dt,
        DATE(s.second_ts) AS second_dt,
        DATE_DIFF(DATE(s.second_ts), DATE(f.first_ts), DAY) AS days_to_second,
        COALESCE(pf.platform, 'UNKNOWN') AS platform
      FROM first_ts f
      LEFT JOIN second_ts s ON f.user_pseudo_id = s.user_pseudo_id
      LEFT JOIN platform_first pf ON f.user_pseudo_id = pf.user_pseudo_id
    ),
    daily_spine AS (
      SELECT d AS dt
      FROM UNNEST(GENERATE_DATE_ARRAY(
        DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY),
        CURRENT_DATE()
      )) AS d
    ),
    daily_agg AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', d.dt) AS date,
        (SELECT COUNT(*) FROM user_lifetime u WHERE u.first_dt = d.dt) AS first_purchase_users,
        (SELECT COUNT(*) FROM user_lifetime u WHERE u.second_dt = d.dt) AS second_purchase_users
      FROM daily_spine d
    ),
    platform_breakdown AS (
      SELECT
        platform,
        COUNT(*) AS total_users,
        COUNTIF(second_dt IS NOT NULL) AS repurchasers,
        SAFE_DIVIDE(COUNTIF(second_dt IS NOT NULL), NULLIF(COUNT(*), 0)) AS repurchase_rate
      FROM user_lifetime
      GROUP BY 1
    )
    SELECT
      (SELECT COUNT(*) FROM user_lifetime) AS total_purchase_users,
      (SELECT COUNTIF(second_dt IS NOT NULL) FROM user_lifetime) AS repurchasers,
      SAFE_DIVIDE(
        (SELECT COUNTIF(second_dt IS NOT NULL) FROM user_lifetime),
        NULLIF((SELECT COUNT(*) FROM user_lifetime), 0)
      ) AS repurchase_rate,
      (SELECT AVG(CAST(days_to_second AS FLOAT64)) FROM user_lifetime WHERE second_dt IS NOT NULL) AS avg_days_to_repurchase,
      (SELECT COUNTIF(first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)) FROM user_lifetime) AS eligible_first_for_7d,
      (SELECT COUNTIF(
        first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
        AND second_dt IS NOT NULL
        AND days_to_second <= 7
      ) FROM user_lifetime) AS repurchased_within_7d,
      SAFE_DIVIDE(
        (SELECT COUNTIF(
          first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
          AND second_dt IS NOT NULL
          AND days_to_second <= 7
        ) FROM user_lifetime),
        NULLIF((SELECT COUNTIF(first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)) FROM user_lifetime), 0)
      ) AS repurchase_rate_7d,
      (SELECT COUNTIF(first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) FROM user_lifetime) AS eligible_first_for_30d,
      (SELECT COUNTIF(
        first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        AND second_dt IS NOT NULL
        AND days_to_second <= 30
      ) FROM user_lifetime) AS repurchased_within_30d,
      SAFE_DIVIDE(
        (SELECT COUNTIF(
          first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          AND second_dt IS NOT NULL
          AND days_to_second <= 30
        ) FROM user_lifetime),
        NULLIF((SELECT COUNTIF(first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) FROM user_lifetime), 0)
      ) AS repurchase_rate_30d,
      (SELECT ARRAY_AGG(STRUCT(date, first_purchase_users, second_purchase_users) ORDER BY date) FROM daily_agg) AS daily_data,
      (SELECT ARRAY_AGG(STRUCT(
        platform,
        total_users,
        repurchasers,
        repurchase_rate
      ) ORDER BY total_users DESC) FROM platform_breakdown) AS platform_breakdown
  `;
}

// Paid Users: geo distribution of payers
export function getPaidUsersGeoQuery(days: number = 30) {
  return `
    SELECT
      COALESCE(geo.country, 'Unknown') as country,
      COUNT(DISTINCT user_pseudo_id) as payers,
      COUNT(*) as purchases,
      COALESCE(SUM(event_value_in_usd), 0) as revenue
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
      AND event_name IN ('purchase','in_app_purchase')
    GROUP BY geo.country
    ORDER BY payers DESC
    LIMIT 15
  `;
}

// User Acquisition: channel/source distribution with new users, payers, revenue
export function getUserAcquisitionQuery(days: number = 30) {
  return `
    WITH user_source AS (
      SELECT
        user_pseudo_id,
        COALESCE(traffic_source.source, '(direct)') as source,
        COALESCE(traffic_source.medium, '(none)') as medium,
        COALESCE(traffic_source.name, '(not set)') as campaign
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'first_open'
    ),
    user_events AS (
      SELECT
        user_pseudo_id,
        COUNTIF(event_name IN ('purchase','in_app_purchase','iap_success')) as purchases,
        COALESCE(SUM(CASE WHEN event_name IN ('purchase','in_app_purchase','iap_success') THEN event_value_in_usd END), 0) as revenue
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
      GROUP BY 1
    )
    SELECT
      us.source,
      us.medium,
      us.campaign,
      COUNT(DISTINCT us.user_pseudo_id) as new_users,
      COUNT(DISTINCT CASE WHEN ue.purchases > 0 THEN us.user_pseudo_id END) as payers,
      COALESCE(SUM(ue.revenue), 0) as revenue
    FROM user_source us
    LEFT JOIN user_events ue ON us.user_pseudo_id = ue.user_pseudo_id
    GROUP BY us.source, us.medium, us.campaign
    ORDER BY new_users DESC
    LIMIT 30
  `;
}

// Download & Referral Tracking — campaign-level detail of the same first_open data
// Uses the same event (first_open) as getUserAcquisitionQuery for consistency
export function getReferralTrackingQuery(days: number = 30) {
  return `
    SELECT
      COALESCE(traffic_source.source, '(direct)') as source,
      COALESCE(traffic_source.name, '(not set)') as campaign,
      COALESCE(traffic_source.medium, '(none)') as medium,
      COUNT(*) as events,
      COUNT(DISTINCT user_pseudo_id) as users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
      AND event_name = 'first_open'
    GROUP BY 1, 2, 3
    ORDER BY users DESC
    LIMIT 50
  `;
}

// Creator & Supply: KOL vs Influencer event-level performance
//
// Creator identification uses video_author_id from event_params.
// video_click_play / video_click_unlock / video_unlock_success carry video_author_id directly.
// video_exposure is no longer tracked — metrics use clicks, unlocks, and likes only.
export function getCreatorSupplyQuery(days: number = 30) {
  return `
    -- KOL / Influencer user_id mapping (deduplicated)
    WITH creator_map AS (
      SELECT DISTINCT user_id, creator_type FROM (
        SELECT user_id, 'KOL' as creator_type FROM UNNEST([
          '26081301','45674424','35540478','23233279','41224657',
          '16296585','11620748','66572866','73914763','89637312',
          '75726889','38168147','31872462','59156123'
        ]) as user_id
        UNION ALL
        SELECT user_id, 'Influencer' as creator_type FROM UNNEST([
          '93219282','57689751','25978387','18062948','34810727',
          '54375030','97596140','52821848','79264892','46905583',
          '84386913','44879158','48462181','50998820','33682323',
          '65630231','20576747','55672002','31765663','57645577',
          '82681165','20886124','99899818','76328816','77876696',
          '47323774','20755791','39855342','87433700','85340482',
          '79487383','36099010','30311869','60055111','96288386',
          '98264149','99387399','92341605','81165935','77189556',
          '73867359','62271258','62311316','32296643','30345274',
          '12901463','50359816','27587229','22371474','90961576',
          '28159225','85817202','45287063','34466397',
          '46914670','31097628','95315119','63694283','35085775',
          '60051251','43458128','41256713','47154848','70028067',
          '85436737','34956258','61781715','14483331','78955834',
          '27269289','38491870','27050875','18491087','57869237',
          '69055938','51269701','68199936','70338437','21693415',
          '22516238','56477042','21779093','40743130','91223705',
          '71320239','32656086','23175635','38425517','18299848',
          '36021200','19609610','15100156','72700157',
          '97380631','83083773','96950015','67272982','44866613',
          '37009386','10235759','44286454','20988732','44092726',
          '71161652','31041904','48936630','66570252','66918095','1808'
        ]) as user_id
      )
    ),

    -- video_id → video_author_id + video_type mapping from click/unlock events
    video_author_map AS (
      SELECT DISTINCT
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') as video_id,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_author_id') as video_author_id,
        COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_type'), '') as video_type
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('video_click_play','video_click_unlock','video_unlock_success')
        AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') IS NOT NULL
        AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_author_id') IS NOT NULL
    ),

    -- Click / unlock events: have video_author_id directly
    click_events AS (
      SELECT
        event_name,
        user_pseudo_id,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_author_id') as video_author_id,
        COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_type'), '') as video_type,
        COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source'), '') as source,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'price') as price,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'video_id') as video_id
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('video_click_play','video_click_unlock','video_unlock_success')
    ),

    -- Like events: joined to video_author_map via video_id to resolve author + video_type
    like_events AS (
      SELECT
        e.event_name,
        e.user_pseudo_id,
        vam.video_author_id,
        COALESCE(vam.video_type, '') as video_type,
        '' as source,
        CAST(NULL AS STRING) as price,
        (SELECT value.string_value FROM UNNEST(e.event_params) WHERE key = 'video_id') as video_id
      FROM \`${dataset()}.${table()}\` e
      JOIN video_author_map vam
        ON (SELECT value.string_value FROM UNNEST(e.event_params) WHERE key = 'video_id') = vam.video_id
      WHERE ${tableFilter(days)}
        AND e.event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success')
    ),

    -- Union all events with a resolved video_author_id
    all_events AS (
      SELECT * FROM click_events WHERE video_author_id IS NOT NULL
      UNION ALL
      SELECT * FROM exposure_events WHERE video_author_id IS NOT NULL
      UNION ALL
      SELECT * FROM like_events WHERE video_author_id IS NOT NULL
    ),

    -- Join to creator classification
    creator_events AS (
      SELECT cm.creator_type, e.*
      FROM all_events e
      JOIN creator_map cm ON e.video_author_id = cm.user_id
    )

    SELECT
      creator_type,

      -- SUP volume (no exposure; sup_exposure* kept as 0 for API shape)
      0 as sup_exposure,
      0 as sup_exposure_uv,
      COUNTIF(event_name = 'video_click_play' AND video_type = 'SUP') as sup_click_play,
      COUNT(DISTINCT CASE WHEN event_name = 'video_click_play' AND video_type = 'SUP'
        THEN user_pseudo_id END) as sup_click_play_uv,
      SAFE_DIVIDE(
        COUNTIF(event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success') AND video_type = 'SUP'),
        NULLIF(COUNTIF(event_name = 'video_click_play' AND video_type = 'SUP'), 0)
      ) * 100 as sup_click_play_rate,

      -- $UP volume (click → unlock funnel; no exposure)
      0 as up_exposure,
      0 as up_exposure_uv,
      COUNTIF(event_name = 'video_click_unlock') as up_click_unlock,
      COUNT(DISTINCT CASE WHEN event_name = 'video_click_unlock'
        THEN user_pseudo_id END) as up_click_unlock_uv,
      COUNTIF(event_name = 'video_unlock_success') as up_unlock_success,
      COUNT(DISTINCT CASE WHEN event_name = 'video_unlock_success'
        THEN user_pseudo_id END) as up_unlock_success_uv,
      SAFE_DIVIDE(
        COUNTIF(event_name = 'video_unlock_success'),
        NULLIF(COUNTIF(event_name = 'video_click_unlock'), 0)
      ) * 100 as up_click_unlock_rate,
      SAFE_DIVIDE(
        COUNTIF(event_name = 'video_unlock_success'),
        NULLIF(COUNTIF(event_name = 'video_click_unlock'), 0)
      ) * 100 as up_unlock_success_rate,
      SAFE_DIVIDE(
        COUNTIF(event_name = 'video_unlock_success'),
        NULLIF(COUNTIF(event_name = 'video_click_unlock'), 0)
      ) * 100 as up_overall_conversion_rate,
      COALESCE(SUM(CASE WHEN event_name = 'video_unlock_success'
        THEN SAFE_CAST(price AS FLOAT64) END), 0) as up_revenue,

      -- SUP likes
      COUNTIF(event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success')
        AND video_type = 'SUP') as sup_like_count,
      COUNT(DISTINCT CASE WHEN event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success')
        AND video_type = 'SUP' THEN user_pseudo_id END) as sup_like_uv,
      SAFE_DIVIDE(
        COUNTIF(event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success') AND video_type = 'SUP'),
        NULLIF(COUNTIF(event_name = 'video_click_play' AND video_type = 'SUP'), 0)
      ) * 100 as sup_like_rate,

      -- $UP likes
      COUNTIF(event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success')
        AND video_type IN ('$UP','more_$up')) as up_like_count,
      COUNT(DISTINCT CASE WHEN event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success')
        AND video_type IN ('$UP','more_$up') THEN user_pseudo_id END) as up_like_uv,
      SAFE_DIVIDE(
        COUNTIF(event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success') AND video_type IN ('$UP','more_$up')),
        NULLIF(COUNTIF(event_name = 'video_unlock_success'), 0)
      ) * 100 as up_like_rate,

      0 as profile_exposure,
      0 as profile_exposure_uv,

      -- Source breakdown (from click events only)
      COUNTIF(source = 'Circle') as circle_events,
      COUNTIF(source = 'Explore') as explore_events

    FROM creator_events
    GROUP BY creator_type
    ORDER BY creator_type
  `;
}

// Refer & Reward: full referral funnel from invite to registration via dynamic link
export function getReferralRewardQuery(days: number = 30) {
  return `
    WITH base AS (
      SELECT user_pseudo_id, event_name, event_date,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result') as result_val,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'short_link') as short_link,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'user_exist') as user_exist,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source') as param_source
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    -- Sending side: who shared
    senders AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name IN (
          'Click_InviteButton','Click_ShareInviteLink','Click_InviteViaText','Click_InviteSnapchat', 'Click_SelectedInviteFriends','Click_FindFriendInviteInviteButton') THEN user_pseudo_id END) as invite_attempt_users,
        COUNT(CASE WHEN event_name IN (
          'Click_InviteButton','Click_ShareInviteLink','Click_InviteViaText','Click_InviteSnapchat', 'Click_SelectedInviteFriends','Click_FindFriendInviteInviteButton') THEN 1 END) as invite_attempt_events,
        COUNT(DISTINCT CASE WHEN event_name = 'InviteFriendViaText_Success'
          THEN user_pseudo_id END) as invite_sent_users,
        COUNT(CASE WHEN event_name = 'InviteFriendViaText_Success'
          THEN 1 END) as invite_sent_events
      FROM base
    ),
    -- Receiving side: landing page
    receivers AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name = 'share_landing_show'
          THEN user_pseudo_id END) as landing_views,
        COUNT(DISTINCT CASE WHEN event_name = 'share_landing_show' AND user_exist = 'false'
          THEN user_pseudo_id END) as landing_new_visitors,
        COUNT(DISTINCT CASE WHEN event_name = 'share_window_click'
          THEN user_pseudo_id END) as landing_clicks,
        COUNT(DISTINCT CASE WHEN event_name = 'Fr-invitationLink-openPage'
          THEN user_pseudo_id END) as deeplink_opens
      FROM base
    ),
    -- Referral registrations: users who first_open AND have referral/dynamic link source
    referral_regs AS (
      SELECT COUNT(DISTINCT user_pseudo_id) as referral_registrations
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'first_open'
        AND (
          LOWER(COALESCE(traffic_source.source, '')) IN ('getit','frog')
          OR LOWER(COALESCE(traffic_source.source, '')) LIKE '%frogcool%'
          OR LOWER(COALESCE(traffic_source.source, '')) LIKE '%thefr.app%'
          OR LOWER(COALESCE(traffic_source.medium, '')) = 'referral'
          OR LOWER(COALESCE(traffic_source.source, '')) = 'appreferral'
        )
    ),
    -- Daily trend
    daily AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', dt) as date,
        COUNT(DISTINCT CASE WHEN event_name IN (
          'Click_InviteButton','Click_ShareInviteLink','Click_InviteViaText','Click_InviteSnapchat'
        ) THEN user_pseudo_id END) as daily_invite_users,
        COUNT(DISTINCT CASE WHEN event_name = 'InviteFriendViaText_Success'
          THEN user_pseudo_id END) as daily_sent_users,
        COUNT(DISTINCT CASE WHEN event_name = 'share_landing_show'
          THEN user_pseudo_id END) as daily_landing_users,
        COUNT(DISTINCT CASE WHEN event_name = 'Fr-invitationLink-openPage'
          THEN user_pseudo_id END) as daily_open_users
      FROM base
      GROUP BY 1
    )
    SELECT
      s.*, rc.*, rr.*,
      (SELECT ARRAY_AGG(STRUCT(date, daily_invite_users, daily_sent_users,
        daily_landing_users, daily_open_users) ORDER BY date ASC) FROM daily) as daily_data
    FROM senders s, receivers rc, referral_regs rr
  `;
}

// Subscription / VIP Analysis: cash exchange vs real paid subscribers
// Paid subscription: product_id IN ('exclusivemonthly','exclusiveaccess'), or iap_success with product_id LIKE '%subscription%',
//   or app_store_subscription_convert / app_store_subscription_renew
// Top-up = one-time coin purchase (product_id LIKE 'top-up%') — excluded here
export function getSubscriptionAnalysisQuery(days: number = 30) {
  return `
    WITH base AS (
      SELECT user_pseudo_id, event_name, event_date, event_value_in_usd,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id') as product_id
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    daily AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', dt) as date, dt,
        COUNT(DISTINCT CASE WHEN event_name = 'auto_convert_trigger'
          THEN user_pseudo_id END) as auto_convert_users,
        COUNT(DISTINCT CASE WHEN event_name = 'Click_CashWalletConfirmConvert'
          THEN user_pseudo_id END) as manual_convert_users,
        COUNT(DISTINCT CASE WHEN event_name IN ('app_store_subscription_convert', 'app_store_subscription_renew', 'iap_success', 'in_app_purchase')
          AND ${SUBSCRIPTION_PAID_PRODUCT}
          THEN user_pseudo_id END) as paid_sub_users,
        COUNT(DISTINCT CASE WHEN event_name = 'wallet_subscribe_success'
          THEN user_pseudo_id END) as wallet_sub_users,
        COUNT(DISTINCT CASE WHEN event_name = 'nonmember_exchange_hint'
          THEN user_pseudo_id END) as nonmember_hint_users,
        COUNT(DISTINCT CASE WHEN event_name = 'click_membership_entry'
          THEN user_pseudo_id END) as membership_entry_users,
        COUNT(DISTINCT CASE WHEN event_name = 'iap_start' AND ${SUBSCRIPTION_IAP_FLOW_PRODUCT}
          THEN user_pseudo_id END) as iap_start_users,
        COUNT(DISTINCT CASE WHEN event_name = 'iap_fail' AND ${SUBSCRIPTION_IAP_FLOW_PRODUCT}
          THEN user_pseudo_id END) as iap_fail_users,
        COUNT(DISTINCT CASE WHEN event_name = 'iap_start' AND product_id LIKE 'top-up%'
          THEN user_pseudo_id END) as topup_start_users,
        COUNT(DISTINCT CASE WHEN event_name = 'iap_success' AND product_id LIKE 'top-up%'
          THEN user_pseudo_id END) as topup_success_users
      FROM base
      GROUP BY 1, 2
    ),
    totals AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name = 'auto_convert_trigger'
          THEN user_pseudo_id END) as total_auto_convert,
        COUNT(DISTINCT CASE WHEN event_name = 'Click_CashWalletConfirmConvert'
          THEN user_pseudo_id END) as total_manual_convert,
        COUNT(DISTINCT CASE WHEN event_name IN ('app_store_subscription_convert','app_store_subscription_renew', 'iap_success','in_app_purchase')
          AND ${SUBSCRIPTION_PAID_PRODUCT}
          THEN user_pseudo_id END) as total_paid_sub,
        COUNT(DISTINCT CASE WHEN event_name = 'wallet_subscribe_success'
          THEN user_pseudo_id END) as total_wallet_sub,
        COUNT(DISTINCT CASE WHEN event_name = 'nonmember_exchange_hint'
          THEN user_pseudo_id END) as total_nonmember_hint,
        COUNT(DISTINCT CASE WHEN event_name = 'click_membership_entry'
          THEN user_pseudo_id END) as total_membership_entry,
          COUNT(DISTINCT CASE WHEN event_name = 'iap_start' AND ${SUBSCRIPTION_IAP_FLOW_PRODUCT}
          THEN user_pseudo_id END) as total_iap_start,
        COUNT(DISTINCT CASE WHEN event_name = 'iap_fail' AND ${SUBSCRIPTION_IAP_FLOW_PRODUCT} AND COALESCE(product_id, '') NOT LIKE 'top-up%'
          THEN user_pseudo_id END) as total_iap_fail,
        COUNT(DISTINCT CASE WHEN event_name IN ('auto_convert_trigger',
          'Click_CashWalletConfirmConvert') THEN user_pseudo_id END) as total_exchange_users,
        COUNT(DISTINCT CASE WHEN event_name = 'iap_start' AND product_id LIKE 'top-up%'
          THEN user_pseudo_id END) as total_topup_start,
        COUNT(DISTINCT CASE WHEN event_name = 'iap_success' AND product_id LIKE 'top-up%'
          THEN user_pseudo_id END) as total_topup_success
      FROM base
    ),
    convert_amounts AS (
      SELECT
        COALESCE(
          (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'convertMethod'),
          'unknown'
        ) as convert_method,
        COUNT(*) as conversions
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'Click_CashWalletConfirmConvert'
      GROUP BY 1
    ),
    -- Paid Sub Revenue: same classification as Monetization Subscription slice (exclusive SKUs + iap_success rule + store subs)
    sub_plan_revenue AS (
      SELECT COALESCE(SUM(event_value_in_usd), 0) as amt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('purchase', 'in_app_purchase', 'app_store_subscription_convert', 'app_store_subscription_renew', 'iap_success')
        AND event_value_in_usd > 0
        AND ${SUBSCRIPTION_PAID_PRODUCT_PARAMS}
    )
    SELECT
      (SELECT ARRAY_AGG(STRUCT(date, dt, auto_convert_users, manual_convert_users,
        paid_sub_users, wallet_sub_users, nonmember_hint_users, membership_entry_users,
        iap_start_users, iap_fail_users, topup_start_users, topup_success_users) ORDER BY dt ASC) FROM daily) as daily_data,
      t.*,
      (SELECT amt FROM sub_plan_revenue) as paid_revenue,
      (SELECT ARRAY_AGG(STRUCT(convert_method, conversions)) FROM convert_amounts) as convert_methods
    FROM totals t
  `;
}

// Flywheel metrics: one query per node for the full flywheel health dashboard
export function getFlywheelQuery(days: number = 30) {
  return `
    WITH base AS (
      SELECT user_pseudo_id, user_id, event_name, event_date,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result') as result_val,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'reward_amount') as reward_amount,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'diamonds_amount') as diamonds_amount,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result_status') as result_status,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'withdraw_amount') as withdraw_amount
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    -- Node 1: Discovery
    discovery AS (
      SELECT
        COUNT(DISTINCT user_pseudo_id) as first_open_users,
        COUNT(DISTINCT CASE WHEN dt >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN user_pseudo_id END) as first_open_7d,
        COUNT(DISTINCT CASE WHEN dt >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
          AND dt < DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN user_pseudo_id END) as first_open_prev7d
      FROM base WHERE event_name = 'first_open'
    ),
    -- Node 2: Registration
    reg_base AS (
      SELECT DISTINCT user_pseudo_id FROM base WHERE event_name = 'first_open'
    ),
    registered AS (
      SELECT COUNT(DISTINCT b.user_pseudo_id) as registered_users
      FROM reg_base rb
      JOIN base b ON rb.user_pseudo_id = b.user_pseudo_id
      WHERE b.event_name IN ('Success_GoogleRegister','Register_Number_Success','Register_Email_Success','Success_AppleRegister')
        OR (b.event_name = 'auth_oauth_result' AND b.result_val = 'success')
    ),
    -- Node 3: First Unlock
    first_unlockers AS (
      SELECT COUNT(DISTINCT b.user_pseudo_id) as first_unlock_users
      FROM reg_base rb
      JOIN base b ON rb.user_pseudo_id = b.user_pseudo_id
      WHERE b.event_name IN ('dollarsup_first_unlock_success')
    ),
    -- Node 4: Unlock Loop (2+ unlocks)
    unlock_counts AS (
      SELECT user_pseudo_id, COUNT(*) as unlock_cnt
      FROM base
      WHERE event_name IN ('video_unlock_success')
      GROUP BY 1
    ),
    loop_stats AS (
      SELECT
        COUNT(*) as total_unlockers,
        COUNT(CASE WHEN unlock_cnt >= 2 THEN 1 END) as loop_users,
        COUNT(CASE WHEN unlock_cnt >= 10 THEN 1 END) as power_users,
        COALESCE(AVG(unlock_cnt), 0) as avg_unlocks
      FROM unlock_counts
    ),
    -- Node 5: Scratch & Reward
    -- reward_users / total_diamonds: any event with reward_amount 0–20k diamonds = "reward triggered"
    -- (includes manual scratch + auto-reward on $UP unlock; user need not scratch to get reward)
    scratch AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name = 'scratch_reward_grant_result' THEN user_pseudo_id END) as scratch_users,
        COUNT(CASE WHEN event_name LIKE '%scratch%' THEN 1 END) as scratch_events,
        COUNT(DISTINCT CASE WHEN diamonds_amount IS NOT NULL
          AND SAFE_CAST(diamonds_amount AS INT64) BETWEEN 0 AND 20000 THEN user_pseudo_id END) as reward_users,
        COALESCE(SUM(CASE WHEN diamonds_amount IS NOT NULL
          AND SAFE_CAST(diamonds_amount AS INT64) BETWEEN 0 AND 20000 THEN SAFE_CAST(diamonds_amount AS INT64) END), 0) as total_diamonds
      FROM base
    ),
    -- Node 6: Share (after scratch settlement page)
    -- scratch_share_click = user taps "Share with Friends" button (share_channel=system_sheet)
    -- scratch_share_result = system share callback: result=success/cancel/fail
    share_stats AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name = 'scratch_share_click' THEN user_pseudo_id END) as scratch_share_users,
        COUNT(CASE WHEN event_name = 'scratch_share_click' THEN 1 END) as scratch_share_events,
        COUNT(CASE WHEN event_name = 'scratch_share_result' AND result_val = 'success' THEN 1 END) as share_success,
        COUNT(CASE WHEN event_name = 'scratch_share_result' AND result_val = 'cancel' THEN 1 END) as share_cancel,
        COUNT(CASE WHEN event_name = 'scratch_share_result' AND result_val = 'fail' THEN 1 END) as share_fail,
        COUNT(DISTINCT CASE WHEN event_name = 'Click_ShareCard' THEN user_pseudo_id END) as card_share_users
      FROM base
    ),
    -- Node 7: Cashout / Withdrawal
    cashout AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name = 'withdraw_click' THEN user_pseudo_id END) as cashout_users,
        COUNT(CASE WHEN event_name = 'withdraw_result' AND result_status = 'success' THEN 1 END) as cashout_success,
        COALESCE(SUM(CASE WHEN event_name = 'withdraw_result' AND result_status = 'success'
          THEN SAFE_CAST(withdraw_amount AS INT64) END), 0) as withdrawal_usd
      FROM base
    ),
    -- Node 8: Referral / Invite + Dynamic Link landing
    -- Full invite funnel: any share/invite click → method chosen → success → landing shown → app opened
    referral AS (
      SELECT
        -- All users who triggered ANY invite/share action (total invite attempts)
        COUNT(DISTINCT CASE WHEN event_name IN (
          'Click_InviteButton','Click_ShareInviteLink','Click_InviteViaText',
          'Click_InviteSnapchat','scratch_share_click','Click_ShareCard',
          'Click_SelectedInviteFriends','Click_FindFriendInviteInviteButton'
        ) THEN user_pseudo_id END) as all_share_users,
        COUNT(CASE WHEN event_name IN (
          'Click_InviteButton','Click_ShareInviteLink','Click_InviteViaText',
          'Click_InviteSnapchat','scratch_share_click','Click_ShareCard',
          'Click_SelectedInviteFriends','Click_FindFriendInviteInviteButton'
        ) THEN 1 END) as all_share_clicks,
        -- Breakdown by method
        COUNT(DISTINCT CASE WHEN event_name = 'Click_InviteButton' THEN user_pseudo_id END) as invite_click_users,
        COUNT(DISTINCT CASE WHEN event_name = 'Click_InviteViaText' THEN user_pseudo_id END) as text_invite_users,
        COUNT(DISTINCT CASE WHEN event_name = 'Click_InviteSnapchat' THEN user_pseudo_id END) as snapchat_users,
        COUNT(DISTINCT CASE WHEN event_name = 'Click_ShareInviteLink' THEN user_pseudo_id END) as share_link_users,
        -- Success (invite actually sent)
        COUNT(DISTINCT CASE WHEN event_name = 'InviteFriendViaText_Success' THEN user_pseudo_id END) as invite_success_users,
        COUNT(CASE WHEN event_name = 'InviteFriendViaText_Success' THEN 1 END) as invite_success_events,
        -- Receiving end: Dynamic Link landing → click → app open
        COUNT(DISTINCT CASE WHEN event_name = 'share_landing_show' THEN user_pseudo_id END) as landing_show_users,
        COUNT(DISTINCT CASE WHEN event_name = 'share_window_click' THEN user_pseudo_id END) as landing_click_users,
        COUNT(DISTINCT CASE WHEN event_name = 'Fr-invitationLink-openPage' THEN user_pseudo_id END) as deeplink_open_users
      FROM base
    ),
    -- Daily active users for rate calculations
    dau_stats AS (
      SELECT 
        COUNT(DISTINCT user_pseudo_id) as total_pseudo_active,
        COUNT(DISTINCT case when event_name = 'Enter_NewUserLandSupPage' then user_id else null end) as total_active
      FROM base
    ),
    -- Payers
    payer_stats AS (
      SELECT
        COUNT(DISTINCT user_pseudo_id) as payers,
        COALESCE(SUM(CASE WHEN event_name IN ('in_app_purchase','purchase','iap_success',
          'app_store_subscription_convert','app_store_subscription_renew')
          THEN 1 END), 0) as purchase_events
      FROM base
      WHERE event_name IN ('in_app_purchase','purchase','iap_success',
        'app_store_subscription_convert','app_store_subscription_renew')
    )
    SELECT
      d.*, r.registered_users, fu.first_unlock_users,
      ls.total_unlockers, ls.loop_users, ls.power_users, ls.avg_unlocks,
      s.scratch_users, s.scratch_events, s.reward_users, s.total_diamonds,
      sh.scratch_share_users, sh.scratch_share_events, sh.share_success, sh.share_cancel, sh.share_fail, sh.card_share_users,
      c.cashout_users, c.cashout_success,
      ref.all_share_users, ref.all_share_clicks,
      ref.invite_click_users, ref.text_invite_users, ref.snapchat_users, ref.share_link_users,
      ref.invite_success_users, ref.invite_success_events,
      ref.landing_show_users, ref.landing_click_users, ref.deeplink_open_users,
      dau.total_active,
      dau.total_pseudo_active,
      p.payers, p.purchase_events
    FROM discovery d, registered r, first_unlockers fu, loop_stats ls,
      scratch s, share_stats sh, cashout c, referral ref, dau_stats dau, payer_stats p
  `;
}
