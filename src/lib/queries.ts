/**
 * BigQuery queries for AI Chat App (Moment-style) GA4 events.
 * Session-based emotional AI chat application analytics.
 */

const dataset = () => process.env.BIGQUERY_DATASET || "analytics_233462855";
const table = () => process.env.BIGQUERY_TABLE || "events_*";

export type OverviewFilters = {
  version?: string;
  platform?: string;
  geo?: string;
};

/**
 * GA4 BigQuery export uses:
 * - Daily: `events_YYYYMMDD` → _TABLE_SUFFIX = `20260319`
 * - Intraday (recent): `events_intraday_YYYYMMDD` → _TABLE_SUFFIX = `intraday_20260321`
 */
export function tableSuffixInRange(lowerExpr: string, upperExpr: string): string {
  return `(
    (REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$') AND _TABLE_SUFFIX BETWEEN ${lowerExpr} AND ${upperExpr})
    OR (STARTS_WITH(_TABLE_SUFFIX, 'intraday_') AND SUBSTR(_TABLE_SUFFIX, 10) BETWEEN ${lowerExpr} AND ${upperExpr})
  )`;
}

export function tableSuffixSince(intervalDays: number): string {
  const lower = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${intervalDays} DAY))`;
  return `(
    (REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$') AND _TABLE_SUFFIX >= ${lower})
    OR (STARTS_WITH(_TABLE_SUFFIX, 'intraday_') AND SUBSTR(_TABLE_SUFFIX, 10) >= ${lower})
  )`;
}

export function tableFilter(days: number) {
  const low = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))`;
  const high = `FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;
  return `${tableSuffixInRange(low, high)}
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

export function tableFilterDailyOnly(days: number) {
  const low = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))`;
  const high = `FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;
  return `(REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$') AND _TABLE_SUFFIX BETWEEN ${low} AND ${high})
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

export function tableFilterIntradayOnly(days: number) {
  const low = `FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY))`;
  const high = `FORMAT_DATE('%Y%m%d', CURRENT_DATE())`;
  return `(STARTS_WITH(_TABLE_SUFFIX, 'intraday_') AND SUBSTR(_TABLE_SUFFIX, 10) BETWEEN ${low} AND ${high})
      AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

/* ──────────────────────────────────────────────────────────────
   Helper: extract event_params value
   ────────────────────────────────────────────────────────────── */
function paramStr(key: string): string {
  return `(SELECT value.string_value FROM UNNEST(event_params) WHERE key = '${key}')`;
}
function paramInt(key: string): string {
  return `COALESCE((SELECT value.int_value FROM UNNEST(event_params) WHERE key = '${key}'), 0)`;
}
// paramDouble available if needed for float event params
// function paramDouble(key: string): string {
//   return `COALESCE((SELECT value.double_value FROM UNNEST(event_params) WHERE key = '${key}'), 0)`;
// }

/* ──────────────────────────────────────────────────────────────
   Filters
   ────────────────────────────────────────────────────────────── */

function filterClause(filters: OverviewFilters | undefined, days: number): string {
  if (!filters) return "";
  const parts: string[] = [];

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
    parts.push(`geo.country = '${String(filters.geo).replace(/'/g, "''")}'`);
  }

  void days;
  return parts.length ? " AND " + parts.join(" AND ") : "";
}

/* ──────────────────────────────────────────────────────────────
   Versions
   ────────────────────────────────────────────────────────────── */

export function getVersionsQuery(days: number = 60) {
  return `
    SELECT DISTINCT COALESCE(NULLIF(TRIM(app_info.version), ''), '(not set)') as version
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    ORDER BY version DESC
  `;
}

/* ══════════════════════════════════════════════════════════════
   1. KPI SNAPSHOT
   ══════════════════════════════════════════════════════════════ */

export function getKPIAndWowQuery(mode: "today" | "7d" | "30d", filters?: OverviewFilters) {
  const days = mode === "today" ? 8 : mode === "7d" ? 14 : 60;
  const extra = filterClause(filters, days);
  return `
    WITH daily_d AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date_str,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT user_pseudo_id) as dau,
        COUNT(DISTINCT CASE WHEN event_name = 'guide_energy_show'
          AND ${paramStr('user_status')} = 'new' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END) as chatters,
        COUNT(CASE WHEN event_name = 'message_send' THEN 1 END) as total_messages,
        COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END) as disposed_sessions,
        COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END) as total_sessions,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('message_count')} END) as avg_msgs_per_session,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('session_duration')} END) as avg_session_duration,
        COUNT(DISTINCT CASE WHEN event_name = 'recharge_result'
          AND ${paramStr('status')} = 'success' THEN user_pseudo_id END) as recharge_payers,
        COALESCE(SUM(CASE WHEN event_name IN ('recharge_result','membership_success_toast')
          THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase' THEN user_pseudo_id END) as gift_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterDailyOnly(days)}${extra}
      GROUP BY 1, 2
    ),
    daily_i AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date_str,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT user_pseudo_id) as dau,
        COUNT(DISTINCT CASE WHEN event_name = 'guide_energy_show'
          AND ${paramStr('user_status')} = 'new' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END) as chatters,
        COUNT(CASE WHEN event_name = 'message_send' THEN 1 END) as total_messages,
        COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END) as disposed_sessions,
        COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END) as total_sessions,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('message_count')} END) as avg_msgs_per_session,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('session_duration')} END) as avg_session_duration,
        COUNT(DISTINCT CASE WHEN event_name = 'recharge_result'
          AND ${paramStr('status')} = 'success' THEN user_pseudo_id END) as recharge_payers,
        COALESCE(SUM(CASE WHEN event_name IN ('recharge_result','membership_success_toast')
          THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase' THEN user_pseudo_id END) as gift_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterIntradayOnly(days)}${extra}
      GROUP BY 1, 2
    ),
    daily AS (
      SELECT
        COALESCE(d.date_str, i.date_str) as date_str,
        COALESCE(d.dt, i.dt) as dt,
        IF(d.dt IS NOT NULL, d.dau, i.dau) as dau,
        IF(d.dt IS NOT NULL, d.new_users, i.new_users) as new_users,
        IF(d.dt IS NOT NULL, d.chatters, i.chatters) as chatters,
        IF(d.dt IS NOT NULL, d.total_messages, i.total_messages) as total_messages,
        IF(d.dt IS NOT NULL, d.disposed_sessions, i.disposed_sessions) as disposed_sessions,
        IF(d.dt IS NOT NULL, d.total_sessions, i.total_sessions) as total_sessions,
        IF(d.dt IS NOT NULL, d.avg_msgs_per_session, i.avg_msgs_per_session) as avg_msgs_per_session,
        IF(d.dt IS NOT NULL, d.avg_session_duration, i.avg_session_duration) as avg_session_duration,
        IF(d.dt IS NOT NULL, d.recharge_payers, i.recharge_payers) as recharge_payers,
        IF(d.dt IS NOT NULL, d.revenue, i.revenue) as revenue,
        IF(d.dt IS NOT NULL, d.gift_users, i.gift_users) as gift_users
      FROM daily_d d
      FULL OUTER JOIN daily_i i ON d.dt = i.dt
    ),
    d1_base AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(days + 7)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days + 7} DAY)
        AND event_name = 'message_send'${extra}
      GROUP BY 1
    ),
    d1_cohort AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', DATE_ADD(r.first_dt, INTERVAL 1 DAY)) as return_date,
        COUNT(DISTINCT r.user_pseudo_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN b.user_pseudo_id IS NOT NULL THEN r.user_pseudo_id END) as retained_d1
      FROM d1_base r
      LEFT JOIN \`${dataset()}.${table()}\` b
        ON r.user_pseudo_id = b.user_pseudo_id
        AND PARSE_DATE('%Y%m%d', b.event_date) = DATE_ADD(r.first_dt, INTERVAL 1 DAY)
        AND ${tableSuffixSince(days + 7)}
        AND b.event_name NOT IN ('notification_receive','notification_dismiss','app_remove')${extra}
      GROUP BY 1
    )
    SELECT
      d.date_str, d.dt, d.dau, d.new_users, d.chatters,
      d.total_messages, d.disposed_sessions, d.total_sessions,
      d.avg_msgs_per_session, d.avg_session_duration,
      d.recharge_payers, d.revenue, d.gift_users,
      c.cohort_size as d1_cohort_size,
      c.retained_d1
    FROM daily d
    LEFT JOIN d1_cohort c ON c.return_date = d.date_str
    ORDER BY d.dt DESC
  `;
}

/* ══════════════════════════════════════════════════════════════
   2. DAILY TREND
   ══════════════════════════════════════════════════════════════ */

export function getDailyTrendQuery(days: number = 7, filters?: OverviewFilters) {
  const extra = filterClause(filters, days);
  return `
    WITH daily_d AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT user_pseudo_id) as dau,
        COUNT(DISTINCT CASE WHEN event_name = 'guide_energy_show'
          AND ${paramStr('user_status')} = 'new' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END) as chatters,
        COUNT(CASE WHEN event_name = 'message_send' THEN 1 END) as total_messages,
        COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END) as sessions,
        COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END) as disposed_sessions,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('message_count')} END) as avg_msgs_per_session,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('session_duration')} END) as avg_session_duration_sec,
        COALESCE(SUM(CASE WHEN event_name IN ('recharge_result','membership_success_toast')
          THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase' THEN user_pseudo_id END) as gift_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterDailyOnly(days)}${extra}
      GROUP BY 1, 2
    ),
    daily_i AS (
      SELECT
        FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
        PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(DISTINCT user_pseudo_id) as dau,
        COUNT(DISTINCT CASE WHEN event_name = 'guide_energy_show'
          AND ${paramStr('user_status')} = 'new' THEN user_pseudo_id END) as new_users,
        COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END) as chatters,
        COUNT(CASE WHEN event_name = 'message_send' THEN 1 END) as total_messages,
        COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END) as sessions,
        COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END) as disposed_sessions,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('message_count')} END) as avg_msgs_per_session,
        AVG(CASE WHEN event_name = 'chat_session_dispose'
          THEN ${paramInt('session_duration')} END) as avg_session_duration_sec,
        COALESCE(SUM(CASE WHEN event_name IN ('recharge_result','membership_success_toast')
          THEN event_value_in_usd END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase' THEN user_pseudo_id END) as gift_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilterIntradayOnly(days)}${extra}
      GROUP BY 1, 2
    )
    SELECT
      COALESCE(d.date, i.date) as date,
      IF(d.dt IS NOT NULL, d.dau, i.dau) as dau,
      IF(d.dt IS NOT NULL, d.new_users, i.new_users) as new_users,
      IF(d.dt IS NOT NULL, d.chatters, i.chatters) as chatters,
      IF(d.dt IS NOT NULL, d.total_messages, i.total_messages) as total_messages,
      IF(d.dt IS NOT NULL, d.sessions, i.sessions) as sessions,
      IF(d.dt IS NOT NULL, d.disposed_sessions, i.disposed_sessions) as disposed_sessions,
      IF(d.dt IS NOT NULL, d.avg_msgs_per_session, i.avg_msgs_per_session) as avg_msgs_per_session,
      IF(d.dt IS NOT NULL, d.avg_session_duration_sec, i.avg_session_duration_sec) as avg_session_duration_sec,
      IF(d.dt IS NOT NULL, d.revenue, i.revenue) as revenue,
      IF(d.dt IS NOT NULL, d.gift_users, i.gift_users) as gift_users
    FROM daily_d d
    FULL OUTER JOIN daily_i i ON d.dt = i.dt
    ORDER BY COALESCE(d.dt, i.dt) ASC
  `;
}

/* ══════════════════════════════════════════════════════════════
   3. ACTIVATION FUNNEL
   ══════════════════════════════════════════════════════════════ */

export function getActivationFunnelQuery(days: number = 30) {
  return `
    WITH base AS (
      SELECT
        user_pseudo_id, event_name,
        ${paramStr('user_status')} as user_status,
        ${paramStr('entry_type')} as entry_type
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    )
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'guide_energy_show'
        AND user_status = 'new' THEN user_pseudo_id END) as new_installs,
      COUNT(DISTINCT CASE WHEN event_name = 'discover_card_exposure'
        THEN user_pseudo_id END) as persona_exposed,
      COUNT(DISTINCT CASE WHEN event_name = 'profile_swipe_photo'
        THEN user_pseudo_id END) as persona_swiped,
      COUNT(DISTINCT CASE WHEN event_name = 'chat_entry_click'
        THEN user_pseudo_id END) as chat_entered,
      COUNT(DISTINCT CASE WHEN event_name = 'chat_page_view'
        THEN user_pseudo_id END) as chat_viewed,
      COUNT(DISTINCT CASE WHEN event_name = 'message_send'
        THEN user_pseudo_id END) as message_sent,
      COUNT(DISTINCT CASE WHEN event_name = 'image_unlock_request'
        THEN user_pseudo_id END) as image_requested,
      COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase'
        THEN user_pseudo_id END) as gift_sent
    FROM base
  `;
}

/* ══════════════════════════════════════════════════════════════
   4. SESSION QUALITY
   ══════════════════════════════════════════════════════════════ */

export function getSessionQualityQuery(days: number = 30) {
  return `
    WITH disposed AS (
      SELECT
        user_pseudo_id,
        ${paramStr('virtual_id')} as virtual_id,
        ${paramInt('message_count')} as message_count,
        ${paramInt('session_duration')} as session_duration,
        ${paramStr('trigger_type')} as trigger_type
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'chat_session_dispose'
    )
    SELECT
      COUNT(*) as total_sessions,
      AVG(message_count) as avg_messages,
      AVG(session_duration) as avg_duration_sec,
      COUNTIF(message_count >= 10) as deep_sessions,
      COUNTIF(message_count >= 10) / NULLIF(COUNT(*), 0) as deep_conversation_rate,
      COUNTIF(message_count < 3) as shallow_sessions,
      COUNTIF(message_count < 3) / NULLIF(COUNT(*), 0) as shallow_rate,
      APPROX_QUANTILES(message_count, 100)[OFFSET(50)] as median_messages,
      APPROX_QUANTILES(session_duration, 100)[OFFSET(50)] as median_duration_sec,
      COUNTIF(trigger_type = 'swipe') as dispose_swipe,
      COUNTIF(trigger_type = 'popup') as dispose_popup
    FROM disposed
  `;
}

export function getMessageDistributionQuery(days: number = 30) {
  return `
    WITH disposed AS (
      SELECT ${paramInt('message_count')} as msg_count
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'chat_session_dispose'
    ),
    bucketed AS (
      SELECT
        CASE
          WHEN msg_count = 0 THEN '0'
          WHEN msg_count BETWEEN 1 AND 2 THEN '1-2'
          WHEN msg_count BETWEEN 3 AND 5 THEN '3-5'
          WHEN msg_count BETWEEN 6 AND 10 THEN '6-10'
          WHEN msg_count BETWEEN 11 AND 20 THEN '11-20'
          WHEN msg_count BETWEEN 21 AND 50 THEN '21-50'
          ELSE '50+'
        END as bucket,
        CASE
          WHEN msg_count = 0 THEN 0
          WHEN msg_count BETWEEN 1 AND 2 THEN 1
          WHEN msg_count BETWEEN 3 AND 5 THEN 2
          WHEN msg_count BETWEEN 6 AND 10 THEN 3
          WHEN msg_count BETWEEN 11 AND 20 THEN 4
          WHEN msg_count BETWEEN 21 AND 50 THEN 5
          ELSE 6
        END as sort_key
      FROM disposed
    )
    SELECT bucket, COUNT(*) as session_count, sort_key
    FROM bucketed
    GROUP BY bucket, sort_key
    ORDER BY sort_key
  `;
}

export function getDurationDistributionQuery(days: number = 30) {
  return `
    WITH disposed AS (
      SELECT ${paramInt('session_duration')} as dur_sec
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name = 'chat_session_dispose'
    ),
    bucketed AS (
      SELECT
        CASE
          WHEN dur_sec < 30 THEN '<30s'
          WHEN dur_sec < 60 THEN '30s-1m'
          WHEN dur_sec < 180 THEN '1-3m'
          WHEN dur_sec < 300 THEN '3-5m'
          WHEN dur_sec < 600 THEN '5-10m'
          WHEN dur_sec < 1800 THEN '10-30m'
          ELSE '30m+'
        END as bucket,
        CASE
          WHEN dur_sec < 30 THEN 0
          WHEN dur_sec < 60 THEN 1
          WHEN dur_sec < 180 THEN 2
          WHEN dur_sec < 300 THEN 3
          WHEN dur_sec < 600 THEN 4
          WHEN dur_sec < 1800 THEN 5
          ELSE 6
        END as sort_key
      FROM disposed
    )
    SELECT bucket, COUNT(*) as session_count, sort_key
    FROM bucketed
    GROUP BY bucket, sort_key
    ORDER BY sort_key
  `;
}

/* ══════════════════════════════════════════════════════════════
   5. BEHAVIOUR: Dispose & Persona
   ══════════════════════════════════════════════════════════════ */

export function getBehaviourQuery(days: number = 30) {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
      COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END) as disposes,
      COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END) as chat_entries,
      SAFE_DIVIDE(
        COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END),
        NULLIF(COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END), 0)
      ) as dispose_rate,
      COUNT(CASE WHEN event_name = 'profile_swipe_photo' THEN 1 END) as persona_swipes,
      COUNT(DISTINCT CASE WHEN event_name = 'profile_swipe_photo' THEN user_pseudo_id END) as swipe_users,
      COUNT(CASE WHEN event_name = 'chat_restart' THEN 1 END) as restarts,
      COUNT(CASE WHEN event_name = 'greeting_trigger' THEN 1 END) as greetings,
      COUNT(CASE WHEN event_name = 'fatigue_control' THEN 1 END) as fatigue_triggers,
      COUNT(DISTINCT CASE WHEN event_name = 'profile_report_action'
        AND ${paramStr('action')} = 'report' THEN user_pseudo_id END) as report_users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
      AND event_name IN ('chat_session_dispose','chat_entry_click','profile_swipe_photo',
        'chat_restart','greeting_trigger','fatigue_control','profile_report_action')
    GROUP BY event_date
    ORDER BY event_date ASC
  `;
}

export function getPersonaPopularityQuery(days: number = 30) {
  return `
    SELECT
      ${paramStr('virtual_id')} as virtual_id,
      COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END) as chat_entries,
      COUNT(CASE WHEN event_name = 'message_send' THEN 1 END) as messages,
      COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END) as disposes,
      AVG(CASE WHEN event_name = 'chat_session_dispose'
        THEN ${paramInt('message_count')} END) as avg_msgs,
      AVG(CASE WHEN event_name = 'chat_session_dispose'
        THEN ${paramInt('session_duration')} END) as avg_duration,
      COUNT(DISTINCT user_pseudo_id) as unique_users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
      AND event_name IN ('chat_entry_click','message_send','chat_session_dispose')
      AND ${paramStr('virtual_id')} IS NOT NULL
    GROUP BY 1
    ORDER BY chat_entries DESC
    LIMIT 20
  `;
}

/* ══════════════════════════════════════════════════════════════
   6. RETENTION
   ══════════════════════════════════════════════════════════════ */

export function getRetentionQuery(days: number = 30) {
  const lookback = days + 14;
  return `
    WITH first_active AS (
      SELECT user_pseudo_id, MIN(PARSE_DATE('%Y%m%d', event_date)) as first_dt
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', event_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookback} DAY)
        AND event_name = 'message_send'
      GROUP BY 1
    ),
    cohort AS (
      SELECT
        f.user_pseudo_id,
        f.first_dt,
        DATE_DIFF(PARSE_DATE('%Y%m%d', b.event_date), f.first_dt, DAY) as day_n
      FROM first_active f
      JOIN \`${dataset()}.${table()}\` b
        ON f.user_pseudo_id = b.user_pseudo_id
        AND ${tableSuffixSince(lookback)}
        AND PARSE_DATE('%Y%m%d', b.event_date) >= f.first_dt
        AND b.event_name NOT IN ('notification_receive','notification_dismiss','app_remove')
    )
    SELECT
      day_n,
      COUNT(DISTINCT user_pseudo_id) as retained,
      (SELECT COUNT(DISTINCT user_pseudo_id) FROM first_active
       WHERE first_dt <= DATE_SUB(CURRENT_DATE(), INTERVAL day_n DAY)) as cohort_size
    FROM cohort
    WHERE day_n IN (0, 1, 3, 7, 14)
    GROUP BY day_n
    ORDER BY day_n
  `;
}

export function getReturningSessionsQuery(days: number = 30) {
  return `
    WITH user_days AS (
      SELECT user_pseudo_id, PARSE_DATE('%Y%m%d', event_date) as dt,
        COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END) as sessions
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
      GROUP BY 1, 2
    ),
    with_prev AS (
      SELECT *, LAG(dt) OVER (PARTITION BY user_pseudo_id ORDER BY dt) as prev_dt
      FROM user_days
    )
    SELECT
      FORMAT_DATE('%Y-%m-%d', dt) as date,
      COUNT(DISTINCT user_pseudo_id) as active_users,
      COUNT(DISTINCT CASE WHEN DATE_DIFF(dt, prev_dt, DAY) >= 2 THEN user_pseudo_id END) as returning_users,
      SUM(sessions) as total_sessions,
      SUM(CASE WHEN DATE_DIFF(dt, prev_dt, DAY) >= 2 THEN sessions ELSE 0 END) as returning_sessions
    FROM with_prev
    GROUP BY 1
    ORDER BY 1
  `;
}

/* ══════════════════════════════════════════════════════════════
   7. MONETISATION
   ══════════════════════════════════════════════════════════════ */

export function getMonetisationOverviewQuery(days: number = 30) {
  return `
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'recharge_result'
        AND ${paramStr('status')} = 'success' THEN user_pseudo_id END) as recharge_payers,
      COALESCE(SUM(CASE WHEN event_name = 'recharge_result'
        AND ${paramStr('status')} = 'success' THEN event_value_in_usd END), 0) as recharge_revenue,
      COUNT(DISTINCT CASE WHEN event_name = 'membership_success_toast'
        THEN user_pseudo_id END) as membership_subscribers,
      COALESCE(SUM(CASE WHEN event_name = 'membership_success_toast'
        THEN event_value_in_usd END), 0) as membership_revenue,
      COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase'
        THEN user_pseudo_id END) as gift_users,
      COUNT(CASE WHEN event_name = 'gift_item_purchase' THEN 1 END) as gift_count,
      COUNT(DISTINCT CASE WHEN event_name = 'npc_gift_confirm_click'
        THEN user_pseudo_id END) as npc_gift_users,
      COUNT(CASE WHEN event_name = 'npc_gift_confirm_click' THEN 1 END) as npc_gift_count,
      COUNT(DISTINCT user_pseudo_id) as total_active_users,
      COUNT(DISTINCT CASE WHEN event_name = 'ad_charge_success'
        THEN user_pseudo_id END) as ad_charge_users,
      COUNT(CASE WHEN event_name = 'ad_charge_success' THEN 1 END) as ad_charges,
      COUNT(CASE WHEN event_name = 'ad_completion' THEN 1 END) as ad_completions
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
  `;
}

export function getRechargeFunnelQuery(days: number = 30) {
  return `
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'click_mcoin_topup_entry'
        THEN user_pseudo_id END) as topup_entry,
      COUNT(DISTINCT CASE WHEN event_name = 'recharge_enter'
        THEN user_pseudo_id END) as recharge_page,
      COUNT(DISTINCT CASE WHEN event_name = 'recharge_option_click'
        THEN user_pseudo_id END) as option_clicked,
      COUNT(DISTINCT CASE WHEN event_name = 'recharge_result'
        AND ${paramStr('status')} = 'success' THEN user_pseudo_id END) as purchase_success,
      COUNT(DISTINCT CASE WHEN event_name = 'recharge_result'
        AND ${paramStr('status')} = 'cancel' THEN user_pseudo_id END) as purchase_cancel,
      COUNT(DISTINCT CASE WHEN event_name = 'recharge_result'
        AND ${paramStr('status')} = 'fail' THEN user_pseudo_id END) as purchase_fail
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
  `;
}

export function getMembershipFunnelQuery(days: number = 30) {
  return `
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'membership_enter'
        THEN user_pseudo_id END) as membership_views,
      COUNT(DISTINCT CASE WHEN event_name = 'membership_select_plan'
        THEN user_pseudo_id END) as plan_selected,
      COUNT(DISTINCT CASE WHEN event_name = 'membership_click_purchase'
        THEN user_pseudo_id END) as purchase_clicked,
      COUNT(DISTINCT CASE WHEN event_name = 'membership_success_toast'
        THEN user_pseudo_id END) as purchase_success,
      COUNT(DISTINCT CASE WHEN event_name = 'subscription_toast_cancel'
        THEN user_pseudo_id END) as purchase_cancelled,
      COUNT(DISTINCT CASE WHEN event_name = 'membership_promotion_popup'
        THEN user_pseudo_id END) as promo_shown,
      COUNT(DISTINCT CASE WHEN event_name = 'membership_promotion_click'
        THEN user_pseudo_id END) as promo_clicked,
      COUNT(DISTINCT CASE WHEN event_name = 'chat_vip_click_locked'
        THEN user_pseudo_id END) as vip_gate_hits
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
  `;
}

export function getGiftFunnelQuery(days: number = 30) {
  return `
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'gift_popup_open'
        THEN user_pseudo_id END) as popup_opened,
      COUNT(DISTINCT CASE WHEN event_name = 'gift_item_click'
        THEN user_pseudo_id END) as item_clicked,
      COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase'
        THEN user_pseudo_id END) as item_purchased,
      COUNT(DISTINCT CASE WHEN event_name = 'gift_popup_recharge_click'
        THEN user_pseudo_id END) as recharge_from_gift,
      COUNT(DISTINCT CASE WHEN event_name = 'npc_gift_request_shown'
        THEN user_pseudo_id END) as npc_request_shown,
      COUNT(DISTINCT CASE WHEN event_name = 'npc_gift_request_click'
        THEN user_pseudo_id END) as npc_request_clicked,
      COUNT(DISTINCT CASE WHEN event_name = 'npc_gift_confirm_click'
        THEN user_pseudo_id END) as npc_confirmed,
      COUNT(DISTINCT CASE WHEN event_name = 'npc_gift_confirm_cancel'
        THEN user_pseudo_id END) as npc_cancelled
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
  `;
}

export function getRevenueDailyQuery(days: number = 30) {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%Y%m%d', event_date)) as date,
      COALESCE(SUM(CASE WHEN event_name = 'recharge_result'
        AND ${paramStr('status')} = 'success' THEN event_value_in_usd END), 0) as recharge_revenue,
      COALESCE(SUM(CASE WHEN event_name = 'membership_success_toast'
        THEN event_value_in_usd END), 0) as membership_revenue,
      COUNT(CASE WHEN event_name = 'gift_item_purchase' THEN 1 END) as gifts_sent,
      COUNT(CASE WHEN event_name = 'ad_completion' THEN 1 END) as ad_views
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
      AND event_name IN ('recharge_result','membership_success_toast','gift_item_purchase','ad_completion')
    GROUP BY event_date
    ORDER BY event_date ASC
  `;
}

/* ══════════════════════════════════════════════════════════════
   8. ECONOMY HEALTH (Battery + Coins)
   ══════════════════════════════════════════════════════════════ */

export function getEconomyHealthQuery(days: number = 30) {
  return `
    WITH battery AS (
      SELECT
        SUM(CASE WHEN ${paramStr('change_type')} = 'charge'
          THEN ${paramInt('battery_after')} - ${paramInt('battery_before')} ELSE 0 END) as battery_charged,
        SUM(CASE WHEN ${paramStr('change_type')} = 'consume'
          THEN ${paramInt('battery_before')} - ${paramInt('battery_after')} ELSE 0 END) as battery_consumed,
        COUNT(DISTINCT user_pseudo_id) as battery_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name = 'battery_status_change'
    ),
    coins AS (
      SELECT
        SUM(${paramInt('coins_after')} - ${paramInt('coins_before')}) as coins_earned,
        COUNT(DISTINCT user_pseudo_id) as coin_users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name = 'coins_rewarded'
    ),
    coin_spend AS (
      SELECT
        SUM(${paramInt('deducted_coins')}) as coins_spent,
        COUNT(*) as coin_unlocks
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)} AND event_name = 'coins_unlock_confirm'
    ),
    ads AS (
      SELECT
        COUNT(*) as ad_views,
        COUNT(DISTINCT user_pseudo_id) as ad_users,
        COUNT(CASE WHEN event_name = 'ad_forced_trigger' THEN 1 END) as forced_ads
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('ad_completion','ad_forced_trigger')
    ),
    unlocks AS (
      SELECT
        COUNT(*) as total_unlock_attempts,
        COUNT(DISTINCT user_pseudo_id) as unlock_users,
        COUNTIF(event_name = 'image_unlock_confirm') as successful_unlocks,
        COUNTIF(event_name = 'balance_array_fail') as balance_fails
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
        AND event_name IN ('image_unlock_attempt','image_unlock_confirm','balance_array_fail')
    )
    SELECT
      b.battery_charged, b.battery_consumed, b.battery_users,
      c.coins_earned, c.coin_users,
      cs.coins_spent, cs.coin_unlocks,
      a.ad_views, a.ad_users, a.forced_ads,
      u.total_unlock_attempts, u.unlock_users, u.successful_unlocks, u.balance_fails
    FROM battery b, coins c, coin_spend cs, ads a, unlocks u
  `;
}

/* ══════════════════════════════════════════════════════════════
   9. GEO DISTRIBUTION
   ══════════════════════════════════════════════════════════════ */

export function getGeoDistributionQuery(days: number = 30) {
  return `
    WITH geo AS (
      SELECT
        COALESCE(geo.country, '(unknown)') as country,
        COUNT(DISTINCT user_pseudo_id) as users
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
      GROUP BY 1
    ),
    total AS (SELECT SUM(users) as t FROM geo)
    SELECT
      g.country as region,
      g.country as region_name,
      g.users,
      ROUND(g.users / t.t * 100, 1) as share
    FROM geo g, total t
    ORDER BY g.users DESC
    LIMIT 20
  `;
}

/* ══════════════════════════════════════════════════════════════
   10. USER ATTRIBUTES (Device & Language)
   ══════════════════════════════════════════════════════════════ */

export function getUserAttributesQuery(days: number = 30) {
  return `
    WITH base AS (
      SELECT DISTINCT user_pseudo_id,
        COALESCE(device.category, '(unknown)') as device_category,
        COALESCE(device.operating_system, '(unknown)') as os,
        COALESCE(device.language, '(unknown)') as lang
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    ),
    total AS (SELECT COUNT(*) as t FROM base),
    by_device AS (
      SELECT device_category as attr, COUNT(*) as users
      FROM base GROUP BY 1
    ),
    by_lang AS (
      SELECT lang as attr, COUNT(*) as users
      FROM base GROUP BY 1
    )
    SELECT 'device' as metric_type, d.attr, d.users,
      ROUND(d.users / t.t * 100, 1) as share
    FROM by_device d, total t
    UNION ALL
    SELECT 'language' as metric_type, l.attr, l.users,
      ROUND(l.users / t.t * 100, 1) as share
    FROM by_lang l, total t
    ORDER BY metric_type, users DESC
  `;
}

/* ══════════════════════════════════════════════════════════════
   11. TOP EVENTS
   ══════════════════════════════════════════════════════════════ */

export function getTopEventsQuery(days: number = 30, limit: number = 20) {
  return `
    SELECT event_name as event, COUNT(*) as count,
      COUNT(DISTINCT user_pseudo_id) as users
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
    GROUP BY event_name
    ORDER BY count DESC
    LIMIT ${limit}
  `;
}

/* ══════════════════════════════════════════════════════════════
   12. HEALTH DASHBOARD (Flywheel-style)
   ══════════════════════════════════════════════════════════════ */

export function getHealthDashboardQuery(days: number = 30) {
  return `
    WITH metrics AS (
      SELECT
        -- Activation
        SAFE_DIVIDE(
          COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END),
          NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'guide_energy_show'
            AND ${paramStr('user_status')} = 'new' THEN user_pseudo_id END), 0)
        ) as activation_rate,
        -- Chat engagement
        SAFE_DIVIDE(
          COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END),
          NULLIF(COUNT(DISTINCT user_pseudo_id), 0)
        ) as chat_engagement_rate,
        -- Persona discovery
        SAFE_DIVIDE(
          COUNT(DISTINCT CASE WHEN event_name = 'chat_entry_click' THEN user_pseudo_id END),
          NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'discover_card_exposure' THEN user_pseudo_id END), 0)
        ) as persona_to_chat_rate,
        -- Dispose rate
        SAFE_DIVIDE(
          COUNT(CASE WHEN event_name = 'chat_session_dispose' THEN 1 END),
          NULLIF(COUNT(CASE WHEN event_name = 'chat_entry_click' THEN 1 END), 0)
        ) as dispose_rate,
        -- Image unlock rate
        SAFE_DIVIDE(
          COUNT(DISTINCT CASE WHEN event_name = 'image_unlock_confirm' THEN user_pseudo_id END),
          NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END), 0)
        ) as image_unlock_rate,
        -- Recharge conversion
        SAFE_DIVIDE(
          COUNT(DISTINCT CASE WHEN event_name = 'recharge_result'
            AND ${paramStr('status')} = 'success' THEN user_pseudo_id END),
          NULLIF(COUNT(DISTINCT user_pseudo_id), 0)
        ) as pay_rate,
        -- Gift rate
        SAFE_DIVIDE(
          COUNT(DISTINCT CASE WHEN event_name = 'gift_item_purchase' THEN user_pseudo_id END),
          NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'message_send' THEN user_pseudo_id END), 0)
        ) as gift_rate,
        -- Membership rate
        SAFE_DIVIDE(
          COUNT(DISTINCT CASE WHEN event_name = 'membership_success_toast' THEN user_pseudo_id END),
          NULLIF(COUNT(DISTINCT user_pseudo_id), 0)
        ) as membership_rate,
        -- Revenue
        COALESCE(SUM(CASE WHEN event_name IN ('recharge_result','membership_success_toast')
          THEN event_value_in_usd END), 0) as total_revenue,
        COUNT(DISTINCT user_pseudo_id) as dau_sum
      FROM \`${dataset()}.${table()}\`
      WHERE ${tableFilter(days)}
    )
    SELECT * FROM metrics
  `;
}

/* ══════════════════════════════════════════════════════════════
   13. IMAGE UNLOCK FLOW
   ══════════════════════════════════════════════════════════════ */

export function getImageUnlockFlowQuery(days: number = 30) {
  return `
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'image_unlock_request'
        THEN user_pseudo_id END) as request_users,
      COUNT(CASE WHEN event_name = 'image_unlock_request' THEN 1 END) as total_requests,
      COUNT(DISTINCT CASE WHEN event_name = 'image_unlock_attempt'
        THEN user_pseudo_id END) as attempt_users,
      COUNT(DISTINCT CASE WHEN event_name = 'image_unlock_confirm'
        AND ${paramStr('action')} = 'unlock' THEN user_pseudo_id END) as confirmed_users,
      COUNT(DISTINCT CASE WHEN event_name = 'coins_unlock_confirm'
        THEN user_pseudo_id END) as coin_unlock_users,
      COUNT(DISTINCT CASE WHEN event_name = 'battery_unlock_confirm'
        THEN user_pseudo_id END) as battery_unlock_users,
      COUNT(DISTINCT CASE WHEN event_name = 'ad_unlock_trigger'
        THEN user_pseudo_id END) as ad_unlock_users,
      COUNT(DISTINCT CASE WHEN event_name = 'auto_unlock_triggered'
        THEN user_pseudo_id END) as auto_unlock_users,
      COUNT(CASE WHEN event_name = 'balance_array_fail' THEN 1 END) as balance_fails
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
  `;
}

/* ══════════════════════════════════════════════════════════════
   14. LOGIN / ONBOARDING FUNNEL
   ══════════════════════════════════════════════════════════════ */

export function getLoginFunnelQuery(days: number = 30) {
  return `
    SELECT
      COUNT(DISTINCT CASE WHEN event_name = 'guide_energy_show'
        AND ${paramStr('user_status')} = 'new' THEN user_pseudo_id END) as new_installs,
      COUNT(DISTINCT CASE WHEN event_name = 'login_page_enter'
        THEN user_pseudo_id END) as login_page_views,
      COUNT(DISTINCT CASE WHEN event_name = 'login_success'
        THEN user_pseudo_id END) as login_success,
      COUNT(DISTINCT CASE WHEN event_name = 'login_success'
        AND ${paramStr('login_method')} = 'Apple' THEN user_pseudo_id END) as login_apple,
      COUNT(DISTINCT CASE WHEN event_name = 'login_success'
        AND ${paramStr('login_method')} = 'Google' THEN user_pseudo_id END) as login_google,
      COUNT(DISTINCT CASE WHEN event_name = 'login_failed_toast'
        THEN user_pseudo_id END) as login_failed
    FROM \`${dataset()}.${table()}\`
    WHERE ${tableFilter(days)}
  `;
}
