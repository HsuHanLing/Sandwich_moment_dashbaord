/**
 * Metric formula descriptions for the AI Chat App dashboard.
 * Used by KPICard, MetricInfoTooltip, and all dashboard sections for hover explanations.
 *
 * Each entry provides:
 *   name     — Human-readable metric name
 *   formula  — SQL-level calculation logic
 *   description — Business meaning for non-technical stakeholders
 */
export type MetricInfo = { name: string; formula: string; description: string };

export const METRIC_FORMULAS: Record<string, MetricInfo> = {
  /* ─── Overview KPIs ─── */
  CHATTERS: {
    name: "Chatters",
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event = message_send",
    description: "Unique users who sent at least one message on that day.",
  },
  TOTAL_MESSAGES: {
    name: "Total Messages",
    formula: "COUNT(*) WHERE event = message_send",
    description: "Total number of message_send events fired on that day across all users and sessions.",
  },
  SESSIONS: {
    name: "Sessions",
    formula: "COUNT(*) WHERE event = chat_entry_click",
    description: "Total chat sessions started on that day (each chat_entry_click = one session start).",
  },
  DISPOSED_SESSIONS: {
    name: "Disposed Sessions",
    formula: "COUNT(*) WHERE event = chat_session_dispose",
    description: "Sessions that were formally ended (disposed). A disposed session has a recorded message count and trigger type.",
  },
  DAU: {
    name: "DAU (Daily Active Users)",
    formula: "COUNT(DISTINCT user_pseudo_id) per day",
    description: "Any user who triggered at least one event on that day. Core measure of daily reach.",
  },
  NEW_USERS: {
    name: "New Users",
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event = guide_energy_show AND user_status = 'new'",
    description: "Users who opened the app for the first time (detected via the onboarding energy guide).",
  },
  SESSIONS_PER_USER: {
    name: "Sessions / User",
    formula: "COUNT(chat_entry_click) / COUNT(DISTINCT user_pseudo_id)",
    description: "Average number of chat sessions started per active user per day. Higher means more habitual usage.",
  },
  AVG_MSGS_PER_SESSION: {
    name: "Avg Messages",
    formula: "COUNT(message_send) / COUNT(DISTINCT user_pseudo_id WHERE event = message_send)",
    description: "Average messages sent per chatting user. Uses only message_send events for consistency.",
  },
  AVG_SESSION_DURATION: {
    name: "Avg Session Duration",
    formula: "SUM(engagement_time_msec per ga_session_id) / 1000 → AVG across sessions",
    description: "Average session duration in seconds, calculated from user_engagement events. Avoids double-counting across events.",
  },
  ACTIVATION_RATE: {
    name: "Activation Rate",
    formula: "Users with BOTH guide_energy_show AND message_send / Users with guide_energy_show × 100",
    description: "Percentage of onboarded users who sent at least one message. Only users who saw the onboarding guide are included in the denominator.",
  },
  D1_RETENTION: {
    name: "D1 Retention",
    formula: "Users returning on day after first active day / Users on their first active day × 100",
    description: "Of users whose first active day was D0, what % came back on D1. Excludes notification_receive, notification_dismiss, and app_remove from activity.",
  },
  DISPOSE_RATE: {
    name: "Dispose Rate",
    formula: "COUNT(chat_session_dispose) / COUNT(chat_entry_click) × 100",
    description: "Percentage of started chat sessions that end in disposal. Indicates emotional closure completion.",
  },
  REVENUE: {
    name: "Revenue",
    formula: "SUM(event_value_in_usd) WHERE event IN (recharge_result, membership_success_toast)",
    description: "Total revenue from M-Coin recharges and membership subscriptions in USD.",
  },
  ARPU: {
    name: "ARPU",
    formula: "Total Revenue / DAU",
    description: "Average revenue per active user per day.",
  },

  /* ─── Session Quality ─── */
  TOTAL_SESSIONS: {
    name: "Total Sessions",
    formula: "COUNT(*) WHERE event = chat_session_dispose",
    description: "Total number of disposed (completed) chat sessions in the period.",
  },
  DEEP_CONVERSATION_RATE: {
    name: "Deep Conversation Rate",
    formula: "COUNTIF(message_count ≥ 10) / total_sessions × 100",
    description: "Percentage of sessions with 10+ messages. Indicates how often users reach meaningful emotional depth.",
  },
  SHALLOW_RATE: {
    name: "Shallow Session Rate",
    formula: "COUNTIF(message_count < 3) / total_sessions × 100",
    description: "Percentage of sessions with fewer than 3 messages — users who left before real engagement.",
  },
  VALID_SESSION: {
    name: "Valid Sessions",
    formula: "COUNTIF(message_count ≥ 1 from chat_session_dispose)",
    description: "Sessions with at least 1 message sent — a session that had real user interaction.",
  },
  VALID_SESSION_RATE: {
    name: "Valid Session Rate",
    formula: "valid_sessions / total_sessions × 100",
    description: "Percentage of disposed sessions that contained at least one message.",
  },
  DEEP_ENGAGEMENT: {
    name: "Deep Engagement Sessions",
    formula: "COUNTIF(message_count ≥ 10 from chat_session_dispose)",
    description: "Number of sessions where the user sent 10+ messages — deep emotional engagement.",
  },
  MEDIAN_MESSAGES: {
    name: "Median Messages",
    formula: "APPROX_QUANTILES(message_count, 100)[OFFSET(50)]",
    description: "The median number of messages per session. Less sensitive to outliers than the average.",
  },
  MEDIAN_DURATION: {
    name: "Median Duration",
    formula: "APPROX_QUANTILES(engagement_time / 1000, 100)[OFFSET(50)]",
    description: "The median session duration in seconds, based on user_engagement events.",
  },
  DISPOSE_SWIPE: {
    name: "Dispose (Swipe)",
    formula: "COUNTIF(trigger_type = 'swipe') from chat_session_dispose",
    description: "Sessions ended by the user swiping away (active dismissal).",
  },
  DISPOSE_POPUP: {
    name: "Dispose (Popup)",
    formula: "COUNTIF(trigger_type = 'popup') from chat_session_dispose",
    description: "Sessions ended via the system popup prompt.",
  },

  /* ─── Behaviour ─── */
  PERSONA_SWITCH_RATE: {
    name: "Persona Switch Rate",
    formula: "COUNT(profile_swipe_photo) / COUNT(chat_entry_click)",
    description: "How frequently users swipe between personas relative to sessions started.",
  },
  CHAT_ENGAGEMENT_RATE: {
    name: "Chat Engagement",
    formula: "COUNT(DISTINCT message_send users) / DAU × 100",
    description: "Percentage of daily active users who sent at least one message.",
  },
  PERSONA_TO_CHAT_RATE: {
    name: "Persona → Chat",
    formula: "COUNT(DISTINCT chat_entry_click users) / COUNT(DISTINCT discover_card_exposure users) × 100",
    description: "Ratio of users who entered a chat vs users who were exposed to a persona card. Can exceed 100% if users chat without seeing the discover feed.",
  },

  /* ─── Retention ─── */
  D1_RETENTION_DAILY: {
    name: "D1 Retention (Daily Trend)",
    formula: "retained_d1 / d1_cohort_size × 100 per day",
    description: "For users whose first active day was yesterday, what % came back today. Uses all events except notification and app_remove noise.",
  },

  /* ─── Monetisation ─── */
  GIFT_RATE: {
    name: "Gift Rate",
    formula: "COUNT(DISTINCT gift_item_purchase users) / COUNT(DISTINCT message_send users) × 100",
    description: "Percentage of chatting users who purchased a gift for a virtual persona.",
  },
  MEMBERSHIP_RATE: {
    name: "Membership Rate",
    formula: "COUNT(DISTINCT membership_success_toast users) / DAU × 100",
    description: "Percentage of active users who subscribed to membership.",
  },
  PAY_RATE: {
    name: "Pay Rate",
    formula: "COUNT(DISTINCT recharge_result(success) users) / DAU × 100",
    description: "Percentage of active users who successfully recharged M-Coins.",
  },
  RECHARGE_CONVERSION: {
    name: "Recharge Conversion",
    formula: "recharge_result(success) users / click_mcoin_topup_entry users × 100",
    description: "Conversion rate from clicking the top-up entry to a successful recharge.",
  },
  IMAGE_UNLOCK_RATE: {
    name: "Image Unlock Rate",
    formula: "COUNT(DISTINCT image_unlock_confirm users) / COUNT(DISTINCT message_send users) × 100",
    description: "Percentage of chatting users who unlocked at least one image.",
  },

  /* ─── Economy Health ─── */
  BATTERY_BALANCE: {
    name: "Battery Balance",
    formula: "SUM(battery_charged) − SUM(battery_consumed) from battery_status_change",
    description: "Net battery flow. Negative = users consuming faster than recharging via ads.",
  },
  COIN_BALANCE: {
    name: "Coin Balance",
    formula: "SUM(coins_earned) − SUM(coins_spent) from coins_rewarded / coins_unlock_confirm",
    description: "Net coin flow. Tracks economy health between mission rewards and spending.",
  },
};
