import type { AnalyticsContext } from "./context";
import { shiftDate } from "./context.ts";

export function identifier(value: string): string {
  if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_*]+$/.test(value)) throw new Error("Use a fully qualified BigQuery table identifier");
  return `\`${value}\``;
}
const param = (key: string) => `(SELECT COALESCE(p.value.string_value, CAST(p.value.int_value AS STRING), CAST(p.value.double_value AS STRING), CAST(p.value.float_value AS STRING)) FROM UNNEST(event_params) p WHERE p.key='${key}')`;
export function queryParameters(c: AnalyticsContext, historyDays = 1) {
  return { start: c.start, scan_start: shiftDate(c.start, -historyDays), end: c.end, timezone: c.timezone, version: c.version || "", platform: c.platform || "", geo: c.geo || "" };
}
export const factFilters = `(@version='' OR version=@version) AND (@platform='' OR platform=@platform) AND (@geo='' OR country=@geo) AND country NOT IN ('China','Hong Kong','Singapore')`;
export function eventQuery(table: string, identities?: string, aliases?: string): string {
  const canonical = identities ? `(SELECT ARRAY_AGG(i.user_key ORDER BY i.valid_from DESC LIMIT 1)[SAFE_OFFSET(0)] FROM ${identifier(identities)} i WHERE i.source='ga4' AND i.source_id=e.user_pseudo_id AND TIMESTAMP_MICROS(e.event_timestamp)>=i.valid_from AND (i.valid_to IS NULL OR TIMESTAMP_MICROS(e.event_timestamp)<i.valid_to))` : "CAST(NULL AS STRING)";
  const virtual = aliases ? `(SELECT ANY_VALUE(robot_id) FROM ${identifier(aliases)} WHERE virtual_id=${param("virtual_id")})` : "CAST(NULL AS STRING)";
  return `WITH source AS (
    SELECT *, _TABLE_SUFFIX AS source_suffix FROM ${identifier(table)}
    WHERE ((_TABLE_SUFFIX BETWEEN REPLACE(@scan_start,'-','') AND REPLACE(@end,'-',''))
      OR (_TABLE_SUFFIX BETWEEN CONCAT('intraday_',REPLACE(@scan_start,'-','')) AND CONCAT('intraday_',REPLACE(@end,'-',''))))
      AND REGEXP_CONTAINS(_TABLE_SUFFIX,r'^(intraday_)?[0-9]{8}$')
    QUALIFY _TABLE_SUFFIX=MIN(_TABLE_SUFFIX) OVER(PARTITION BY event_date)
  ), filtered AS (
    SELECT e.*, COALESCE(${canonical}, CONCAT('account:',NULLIF(COALESCE(user_id,${param("user_id")}),'')), CONCAT('install:',user_pseudo_id)) AS user_key
    FROM source e
    WHERE (@version='' OR app_info.version=@version) AND (@platform='' OR platform=@platform)
      AND (@geo='' OR geo.country=@geo) AND geo.country NOT IN ('China','Hong Kong','Singapore')
  ), normalized AS (
    SELECT FORMAT_DATE('%F',PARSE_DATE('%Y%m%d',event_date)) AS date, event_name AS event, user_key,
      user_pseudo_id AS install_key, COALESCE(${param("robot_id")},${virtual}) AS robot_id,
      ${param("conversation_id")} AS conversation_id, ${param("ga_session_id")} AS ga_session_id,
      ${param("event_id")} AS event_id, ${param("message_id")} AS message_id,
      ${param("result")} AS result, COALESCE(${param("action")},${param("change_type")},${param("trigger_type")}) AS action,
      ${param("flow_id")} AS flow_id, ${param("source_page")} AS source_page,
      TIMESTAMP_MICROS(event_timestamp) AS occurred_at,
      COALESCE(SAFE_CAST(${param("engagement_time_msec")} AS FLOAT64),0)/1000 AS engagement_sec,
      SAFE_CAST(${param("battery_after")} AS FLOAT64)-SAFE_CAST(${param("battery_before")} AS FLOAT64) AS battery_delta,
      SAFE_CAST(${param("coins_after")} AS FLOAT64)-SAFE_CAST(${param("coins_before")} AS FLOAT64) AS coin_delta
    FROM filtered
  ), events AS (
    SELECT * FROM normalized
    QUALIFY event_id IS NULL OR ROW_NUMBER() OVER(PARTITION BY event,event_id ORDER BY occurred_at)=1
  ), first_opens AS (
    SELECT install_key, MIN(occurred_at) AS first_at, MIN(date) AS date FROM events WHERE event='first_open' AND install_key IS NOT NULL GROUP BY install_key
  )
  SELECT
    ARRAY(SELECT AS STRUCT date,event,user_key,install_key,robot_id,conversation_id,ga_session_id,result,action,flow_id,source_page,
      COUNT(*) AS count, SUM(engagement_sec) AS engagement_sec, SUM(battery_delta) AS battery_delta, SUM(coin_delta) AS coin_delta,
      COUNTIF(event='message_send' AND message_id IS NULL) AS missing_message_ids,
      COUNTIF(event_id IS NULL) AS missing_event_ids,
      CAST(MIN(occurred_at) AS STRING) AS first_at,CAST(MAX(occurred_at) AS STRING) AS last_at
      FROM events WHERE event NOT IN ('notification_receive','notification_foreground','notification_open','notification_dismiss','app_remove')
      GROUP BY date,event,user_key,install_key,robot_id,conversation_id,ga_session_id,result,action,flow_id,source_page) AS events,
    ARRAY(SELECT AS STRUCT f.install_key,f.date,
      ARRAY(SELECT DISTINCT e.date FROM events e WHERE e.install_key=f.install_key AND e.event='message_send'
        AND e.result='success' AND e.occurred_at>=f.first_at) AS sent_dates
      FROM first_opens f) AS installs,
    ARRAY(SELECT AS STRUCT geo.country AS region,COUNT(DISTINCT user_key) AS users FROM filtered WHERE PARSE_DATE('%Y%m%d',event_date) BETWEEN DATE(@start) AND DATE(@end) GROUP BY region ORDER BY users DESC) AS geo,
    ARRAY(SELECT AS STRUCT 'device' AS type, device.category AS attribute,COUNT(DISTINCT user_key) AS users FROM filtered WHERE PARSE_DATE('%Y%m%d',event_date) BETWEEN DATE(@start) AND DATE(@end) GROUP BY attribute
      UNION ALL SELECT 'language',device.language,COUNT(DISTINCT user_key) FROM filtered WHERE PARSE_DATE('%Y%m%d',event_date) BETWEEN DATE(@start) AND DATE(@end) GROUP BY device.language) AS attributes`;
}

export function conversationQuery(table: string): string {
  return `WITH dedup AS (
    SELECT * FROM ${identifier(table)} WHERE DATE(occurred_at,@timezone)<=DATE(@end) AND environment='PRODUCTION'
    QUALIFY ROW_NUMBER() OVER(PARTITION BY event_id ORDER BY ingested_at DESC)=1
  ), active AS (
    SELECT conversation_id,ARRAY_AGG(DISTINCT FORMAT_DATE('%F',DATE(occurred_at,@timezone))) AS eligible_dates,
      ARRAY_AGG(STRUCT(platform,version,country) ORDER BY occurred_at DESC LIMIT 1)[OFFSET(0)] AS dimensions
    FROM dedup WHERE DATE(occurred_at,@timezone) BETWEEN DATE(@start) AND DATE(@end) AND ${factFilters}
      AND event_type IN ('opened','user_message','deleted') GROUP BY conversation_id
  )
  SELECT conversation_id, ANY_VALUE(user_key) AS user_key,ANY_VALUE(robot_id) AS robot_id,
    CAST(MIN(IF(event_type='created',occurred_at,NULL)) AS STRING) AS created_at,
    CAST(MIN(IF(event_type='deleted',occurred_at,NULL)) AS STRING) AS deleted_at,
    ANY_VALUE(active.eligible_dates) AS activity_dates,
    COUNT(DISTINCT IF(event_type='user_message',message_id,NULL)) AS lifetime_messages,
    COUNTIF(event_type='created' AND history_complete)>0 AND COUNTIF(event_type='user_message' AND message_id IS NULL)=0 AS history_complete,
    ANY_VALUE(active.dimensions.platform) AS platform,
    ANY_VALUE(active.dimensions.version) AS version,
    ANY_VALUE(active.dimensions.country) AS country
  FROM dedup JOIN active USING(conversation_id) GROUP BY conversation_id`;
}

export function transactionQuery(table: string): string {
  // Filter AFTER deduplication in the model. A refund or correction cannot be
  // dropped by a different version/country before selecting the latest state.
  return `SELECT store,transaction_id,user_key,product_id,CAST(purchased_at AS STRING) AS purchased_at,
    CAST(updated_at AS STRING) AS updated_at,amount,currency,amount_usd,refund_usd,verified,environment,status,purchase_type,
    source_page,flow_id,platform,version,country
    FROM ${identifier(table)} WHERE DATE(purchased_at,@timezone) BETWEEN DATE(@start) AND DATE(@end)
    AND DATE(updated_at,@timezone)<=DATE(@end)`;
}
