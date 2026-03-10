/**
 * BigQuery queries for Glimmo AI Journal (GA4 events).
 * Key events: first_open, Post_post, companion_*, Homepage_bot_reply,
 * Subscription_pageview, collection_*, Insight_pageview, onboarding_*
 */

const dataset = () => process.env.GLIMMO_BIGQUERY_DATASET || "analytics_451348782";
const table = () => process.env.GLIMMO_BIGQUERY_TABLE || "events_*";

function tableFilter(days: number) {
  return `_TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

export type GlimmoFilters = {
  version?: string;
  geo?: string;
};

function filterClause(filters: GlimmoFilters | undefined): string {
  if (!filters) return "";
  const parts: string[] = [];
  if (filters.version && filters.version !== "all") {
    parts.push(`TRIM(COALESCE(app_info.version,'')) = '${String(filters.version).replace(/'/g, "''")}'`);
  }
  if (filters.geo && filters.geo !== "all") {
    parts.push(`geo.country = '${String(filters.geo).replace(/'/g, "''")}'`);
  }
  return parts.length > 0 ? " AND " + parts.join(" AND ") : "";
}

// ─── KPI ───────────────────────────────────────────────────────────────
export function getGlimmoKPIQuery(mode: "today" | "7d" | "30d", filters?: GlimmoFilters): string {
  const extra = filterClause(filters);
  const daysMap = { today: 1, "7d": 7, "30d": 30 };
  const days = daysMap[mode];
  const wowDays = days * 2;

  return `
    WITH period AS (
      SELECT
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
          THEN user_pseudo_id END) AS dau,
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
          AND event_name = 'first_open' THEN user_pseudo_id END) AS new_users,
        COUNT(CASE WHEN PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
          AND event_name = 'Post_post' THEN 1 END) AS journal_entries,
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
          AND event_name IN ('companion_aicompanion_click','Homepage_bot_reply','Homepage_bot_like','companion_explore_click','companion_create_click')
          THEN user_pseudo_id END) AS ai_users,
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
          AND event_name = 'Subscription_pageview' THEN user_pseudo_id END) AS sub_viewers,
        -- WoW comparison
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${wowDays} DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 1} DAY)
          THEN user_pseudo_id END) AS wow_dau,
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${wowDays} DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 1} DAY)
          AND event_name = 'first_open' THEN user_pseudo_id END) AS wow_new_users,
        COUNT(CASE WHEN PARSE_DATE('%Y%m%d', event_date) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${wowDays} DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 1} DAY)
          AND event_name = 'Post_post' THEN 1 END) AS wow_journal_entries,
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${wowDays} DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 1} DAY)
          AND event_name IN ('companion_aicompanion_click','Homepage_bot_reply','Homepage_bot_like','companion_explore_click','companion_create_click')
          THEN user_pseudo_id END) AS wow_ai_users,
        COUNT(DISTINCT CASE WHEN PARSE_DATE('%Y%m%d', event_date) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL ${wowDays} DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 1} DAY)
          AND event_name = 'Subscription_pageview' THEN user_pseudo_id END) AS wow_sub_viewers
      FROM \`${dataset()}.${table()}\`
      WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${wowDays} DAY))
        AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        ${extra}
    ),
    retention AS (
      SELECT
        COUNT(DISTINCT c.user_pseudo_id) AS d1_cohort,
        COUNT(DISTINCT r.user_pseudo_id) AS d1_retained
      FROM (
        SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) AS first_day
        FROM \`${dataset()}.${table()}\`
        WHERE ${tableFilter(days + 2)} AND event_name = 'first_open' ${extra}
        GROUP BY 1
      ) c
      LEFT JOIN (
        SELECT DISTINCT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) AS dt
        FROM \`${dataset()}.${table()}\`
        WHERE ${tableFilter(days + 2)} ${extra}
      ) r ON c.user_pseudo_id = r.user_pseudo_id AND r.dt = DATE_ADD(c.first_day, INTERVAL 1 DAY)
      WHERE c.first_day >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 1} DAY)
        AND c.first_day < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    )
    SELECT p.*, retention.d1_cohort, retention.d1_retained,
      CASE WHEN retention.d1_cohort > 0 THEN ROUND(retention.d1_retained * 100.0 / retention.d1_cohort, 1) ELSE 0 END AS d1_retention
    FROM period p, retention
  `;
}

// ─── Daily Trend ───────────────────────────────────────────────────────
export function getGlimmoDailyTrendQuery(days: number, filters?: GlimmoFilters): string {
  const extra = filterClause(filters);
  return `
    SELECT
      event_date AS date,
      COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) AS new_users,
      COUNT(DISTINCT user_pseudo_id) AS dau,
      COUNT(CASE WHEN event_name = 'Post_post' THEN 1 END) AS journal_entries,
      COUNT(DISTINCT CASE WHEN event_name = 'Post_post' THEN user_pseudo_id END) AS journal_users,
      COUNT(DISTINCT CASE WHEN event_name IN ('companion_aicompanion_click','Homepage_bot_reply','Homepage_bot_like','companion_explore_click','companion_create_click') THEN user_pseudo_id END) AS ai_users,
      COUNT(DISTINCT CASE WHEN event_name = 'Subscription_pageview' THEN user_pseudo_id END) AS sub_viewers,
      COUNT(DISTINCT CASE WHEN event_name = 'collection_enter_click' THEN user_pseudo_id END) AS collection_users,
      COUNT(DISTINCT CASE WHEN event_name = 'Insight_pageview' THEN user_pseudo_id END) AS insight_users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)} ${extra}
    GROUP BY event_date
    ORDER BY event_date
  `;
}

// ─── Overview summary ──────────────────────────────────────────────────
export function getGlimmoOverviewQuery(days: number, filters?: GlimmoFilters): string {
  const extra = filterClause(filters);
  return `
    SELECT
      COUNT(DISTINCT user_pseudo_id) AS total_users,
      COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) AS new_users,
      COUNT(DISTINCT CASE WHEN event_name = 'Post_post' THEN user_pseudo_id END) AS writers,
      COUNT(CASE WHEN event_name = 'Post_post' THEN 1 END) AS total_entries,
      COUNT(DISTINCT CASE WHEN event_name IN ('companion_aicompanion_click','Homepage_bot_reply') THEN user_pseudo_id END) AS ai_users,
      COUNT(DISTINCT CASE WHEN event_name = 'Subscription_pageview' THEN user_pseudo_id END) AS sub_viewers,
      COUNT(DISTINCT CASE WHEN event_name = 'collection_enter_click' THEN user_pseudo_id END) AS collection_users,
      COUNT(DISTINCT CASE WHEN event_name = 'Insight_pageview' THEN user_pseudo_id END) AS insight_users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)} ${extra}
  `;
}

// ─── Growth Funnel (Onboarding) — cohort = new users (first_open in period) only ───
export function getGlimmoOnboardingFunnelQuery(days: number): string {
  return `
    WITH cohort AS (
      SELECT DISTINCT user_pseudo_id
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name = 'first_open'
    ),
    events AS (
      SELECT user_pseudo_id, event_name
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    )
    SELECT
      (SELECT COUNT(*) FROM cohort) AS first_open,
      (SELECT COUNT(DISTINCT e.user_pseudo_id) FROM events e INNER JOIN cohort c ON e.user_pseudo_id = c.user_pseudo_id WHERE e.event_name = 'onboarding_personalize_click') AS onboarding_personalize,
      (SELECT COUNT(DISTINCT e.user_pseudo_id) FROM events e INNER JOIN cohort c ON e.user_pseudo_id = c.user_pseudo_id WHERE e.event_name IN ('onboarding_notification_click','onboarding_notification_maybelater_click')) AS onboarding_notification,
      (SELECT COUNT(DISTINCT e.user_pseudo_id) FROM events e INNER JOIN cohort c ON e.user_pseudo_id = c.user_pseudo_id WHERE e.event_name = 'Homepage_view') AS homepage_view,
      (SELECT COUNT(DISTINCT e.user_pseudo_id) FROM events e INNER JOIN cohort c ON e.user_pseudo_id = c.user_pseudo_id WHERE e.event_name = 'Post_post') AS first_post
  `;
}

// ─── Feature Adoption Funnel ───────────────────────────────────────────
export function getGlimmoFeatureAdoptionQuery(days: number): string {
  return `
    WITH users AS (
      SELECT user_pseudo_id, event_name
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    )
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'Post_post' THEN user_pseudo_id END) AS writers,
      COUNT(DISTINCT CASE WHEN event_name IN ('companion_aicompanion_click','Homepage_bot_reply','companion_explore_click','companion_create_click') THEN user_pseudo_id END) AS ai_companion_users,
      COUNT(DISTINCT CASE WHEN event_name = 'collection_enter_click' THEN user_pseudo_id END) AS collection_users,
      COUNT(DISTINCT CASE WHEN event_name = 'Insight_pageview' THEN user_pseudo_id END) AS insight_users,
      COUNT(DISTINCT CASE WHEN event_name = 'Subscription_pageview' THEN user_pseudo_id END) AS subscription_viewers
    FROM users
  `;
}

// ─── Retention (D1/D3/D7/D14/D21/D30, first_open cohort) ───────────────
export function getGlimmoRetentionQuery(days: number): string {
  const lookback = Math.max(days + 30, 60);
  return `
    WITH cohort AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) AS first_day
      FROM \`${dataset()}.${table()}\`
      WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY))
        AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name = 'first_open'
      GROUP BY 1
      HAVING first_day >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
        AND first_day < DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    ),
    activity AS (
      SELECT DISTINCT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) AS dt
      FROM \`${dataset()}.${table()}\`
      WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY))
        AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
    ),
    retention AS (
      SELECT
        c.user_pseudo_id,
        DATE_DIFF(a.dt, c.first_day, DAY) AS day_n
      FROM cohort c
      JOIN activity a ON c.user_pseudo_id = a.user_pseudo_id
    )
    SELECT
      CONCAT('D', day_n) AS day,
      ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0 / (SELECT COUNT(*) FROM cohort), 1) AS rate
    FROM retention
    WHERE day_n IN (1, 3, 7, 14, 21, 30)
    GROUP BY day_n
    ORDER BY day_n
  `;
}

// ─── Flywheel ──────────────────────────────────────────────────────────
export function getGlimmoFlywheelQuery(days: number): string {
  return `
    WITH base AS (
      SELECT user_pseudo_id, event_name, PARSE_DATE('%Y%m%d', event_date) AS dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    first_open_users AS (
      SELECT user_pseudo_id FROM base WHERE event_name = 'first_open'
    ),
    onboarding_complete AS (
      SELECT DISTINCT user_pseudo_id FROM base
      WHERE event_name = 'Homepage_view' AND user_pseudo_id IN (SELECT user_pseudo_id FROM first_open_users)
    ),
    first_posters AS (
      SELECT DISTINCT user_pseudo_id FROM base WHERE event_name = 'Post_post'
    ),
    ai_engaged AS (
      SELECT DISTINCT user_pseudo_id FROM base
      WHERE event_name IN ('companion_aicompanion_click','Homepage_bot_reply','Homepage_bot_like','companion_explore_click','companion_create_click')
    ),
    habit_users AS (
      SELECT user_pseudo_id FROM (
        SELECT user_pseudo_id, COUNT(DISTINCT dt) AS active_days
        FROM base WHERE event_name = 'Post_post'
        GROUP BY 1
      ) WHERE active_days >= 3
    ),
    emotional_value AS (
      SELECT DISTINCT user_pseudo_id FROM base
      WHERE event_name IN ('Insight_pageview','collection_enter_click')
    ),
    share_users AS (
      SELECT DISTINCT user_pseudo_id FROM base
      WHERE event_name IN ('Me_joininstagram_click','Me_joindiscord_click','Me_joindthread_click')
    ),
    premium_viewers AS (
      SELECT DISTINCT user_pseudo_id FROM base
      WHERE event_name IN ('Subscription_pageview','Me_premium_click')
    ),
    seven_day AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' AND dt >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) THEN user_pseudo_id END) AS first_open_7d,
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' AND dt BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) AND DATE_SUB(CURRENT_DATE(), INTERVAL 8 DAY) THEN user_pseudo_id END) AS first_open_prev7d
      FROM base
    )
    SELECT
      (SELECT COUNT(*) FROM first_open_users) AS first_open_users,
      (SELECT COUNT(*) FROM onboarding_complete) AS onboarding_complete,
      (SELECT COUNT(*) FROM first_posters) AS first_posters,
      (SELECT COUNT(*) FROM ai_engaged) AS ai_engaged,
      (SELECT COUNT(*) FROM habit_users) AS habit_users,
      (SELECT COUNT(*) FROM emotional_value) AS emotional_value,
      (SELECT COUNT(*) FROM share_users) AS share_users,
      (SELECT COUNT(*) FROM premium_viewers) AS premium_viewers,
      COUNT(DISTINCT base.user_pseudo_id) AS total_active,
      s.first_open_7d,
      s.first_open_prev7d,
      -- extra metrics
      COUNT(DISTINCT CASE WHEN base.event_name = 'Post_post' THEN base.user_pseudo_id END) AS total_writers,
      COUNT(CASE WHEN base.event_name = 'Post_post' THEN 1 END) AS total_entries,
      COUNT(DISTINCT CASE WHEN base.event_name = 'Homepage_bot_reply' THEN base.user_pseudo_id END) AS bot_reply_users,
      COUNT(CASE WHEN base.event_name = 'Homepage_bot_reply' THEN 1 END) AS bot_replies,
      COUNT(DISTINCT CASE WHEN base.event_name = 'companion_create_click' THEN base.user_pseudo_id END) AS companion_creators,
      COUNT(DISTINCT CASE WHEN base.event_name = 'collection_newcollection_click' THEN base.user_pseudo_id END) AS new_collection_users,
      COUNT(DISTINCT CASE WHEN base.event_name = 'Insight_write_click' THEN base.user_pseudo_id END) AS insight_writers
    FROM base, seven_day s
    GROUP BY s.first_open_7d, s.first_open_prev7d
  `;
}

// ─── User Attributes ───────────────────────────────────────────────────
export function getGlimmoUserAttributesQuery(days: number): string {
  return `
    WITH users AS (
      SELECT
        user_pseudo_id,
        FIRST_VALUE(device.mobile_brand_name) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp DESC) AS brand,
        FIRST_VALUE(device.mobile_model_name) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp DESC) AS model,
        FIRST_VALUE(device.language) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp DESC) AS language
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    distinct_users AS (
      SELECT DISTINCT user_pseudo_id, brand, model, language FROM users
    ),
    total AS (
      SELECT COUNT(*) AS total FROM distinct_users
    )
    SELECT 'device' AS category, CONCAT(COALESCE(brand,'Unknown'),' ',COALESCE(model,'')) AS attr,
      COUNT(*) AS users, ROUND(COUNT(*) * 100.0 / MAX(t.total), 1) AS share
    FROM distinct_users, total t
    GROUP BY attr
    ORDER BY users DESC
    LIMIT 10
  `;
}

export function getGlimmoLanguageDistQuery(days: number): string {
  return `
    WITH users AS (
      SELECT
        user_pseudo_id,
        FIRST_VALUE(device.language) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp DESC) AS lang
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    distinct_users AS (
      SELECT DISTINCT user_pseudo_id, lang FROM users
    ),
    total AS (SELECT COUNT(*) AS total FROM distinct_users)
    SELECT COALESCE(lang, 'Unknown') AS attr, COUNT(*) AS users,
      ROUND(COUNT(*) * 100.0 / MAX(t.total), 1) AS share
    FROM distinct_users, total t
    GROUP BY lang
    ORDER BY users DESC
    LIMIT 15
  `;
}

// ─── Geo Distribution ──────────────────────────────────────────────────
export function getGlimmoGeoDistributionQuery(days: number): string {
  return `
    WITH users AS (
      SELECT
        user_pseudo_id,
        FIRST_VALUE(geo.country) OVER (PARTITION BY user_pseudo_id ORDER BY event_timestamp DESC) AS country
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    distinct_users AS (
      SELECT DISTINCT user_pseudo_id, country FROM users
    ),
    total AS (SELECT COUNT(*) AS total FROM distinct_users)
    SELECT
      COALESCE(country, 'Unknown') AS region,
      COALESCE(country, 'Unknown') AS region_name,
      COUNT(*) AS users,
      ROUND(COUNT(*) * 100.0 / MAX(t.total), 1) AS share
    FROM distinct_users, total t
    GROUP BY country
    ORDER BY users DESC
    LIMIT 20
  `;
}

// ─── Health Dashboard (Flywheel summary for overview) ──────────────────
export function getGlimmoHealthDashboardQuery(days: number): string {
  return `
    WITH base AS (
      SELECT user_pseudo_id, event_name, PARSE_DATE('%Y%m%d', event_date) AS dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    metrics AS (
      SELECT
        COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) AS new_users,
        COUNT(DISTINCT user_pseudo_id) AS total_active,
        COUNT(DISTINCT CASE WHEN event_name = 'Homepage_view' THEN user_pseudo_id END) AS homepage_viewers,
        COUNT(DISTINCT CASE WHEN event_name = 'Post_post' THEN user_pseudo_id END) AS writers,
        COUNT(DISTINCT CASE WHEN event_name IN ('companion_aicompanion_click','Homepage_bot_reply') THEN user_pseudo_id END) AS ai_users,
        COUNT(DISTINCT CASE WHEN event_name IN ('Insight_pageview','collection_enter_click') THEN user_pseudo_id END) AS emotional_users,
        COUNT(DISTINCT CASE WHEN event_name = 'Subscription_pageview' THEN user_pseudo_id END) AS sub_viewers
      FROM base
    )
    SELECT * FROM metrics
  `;
}

// ─── Versions ──────────────────────────────────────────────────────────
export function getGlimmoVersionsQuery(): string {
  return `
    SELECT DISTINCT TRIM(COALESCE(app_info.version, '')) AS version
    FROM \`${dataset()}.${table()}\`
    WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))
      AND app_info.version IS NOT NULL AND TRIM(app_info.version) != ''
    ORDER BY version DESC
    LIMIT 20
  `;
}
