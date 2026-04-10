/**
 * Metric formula descriptions for the AI Chat App dashboard.
 * Used by KPICard and MetricInfoTooltip for hover explanations.
 */
export const METRIC_FORMULAS: Record<string, { formula: string; description: string }> = {
  DAU: {
    formula: "COUNT(DISTINCT user_pseudo_id) per day",
    description: "Daily active users — any user who triggered at least one event on that day.",
  },
  NEW_USERS: {
    formula: "guide_energy_show WHERE user_status = 'new'",
    description: "Users who opened the app for the first time (new install detected via onboarding guide).",
  },
  SESSIONS_PER_USER: {
    formula: "chat_entry_click / DAU",
    description: "Average number of chat sessions started per active user per day.",
  },
  AVG_MSGS_PER_SESSION: {
    formula: "AVG(message_count) from chat_session_dispose",
    description: "Average messages sent before a chat session is disposed. Higher = deeper engagement.",
  },
  AVG_SESSION_DURATION: {
    formula: "AVG(session_duration) from chat_session_dispose",
    description: "Average duration in seconds of a disposed chat session.",
  },
  ACTIVATION_RATE: {
    formula: "message_send users / new_install users × 100",
    description: "Percentage of new installs who sent at least one message. Core activation metric.",
  },
  D1_RETENTION: {
    formula: "D1 retained / D0 first-message cohort × 100",
    description: "Of users who sent their first message on D0, what % returned on D1 (any active event).",
  },
  DISPOSE_RATE: {
    formula: "chat_session_dispose / chat_entry_click × 100",
    description: "Percentage of sessions that end in disposal. Indicates emotional closure completion.",
  },
  REVENUE: {
    formula: "SUM(event_value_in_usd) for recharge_result + membership_success_toast",
    description: "Total revenue from M-Coin recharges and membership subscriptions.",
  },
  ARPU: {
    formula: "Total Revenue / DAU",
    description: "Average revenue per user per day.",
  },
  DEEP_CONVERSATION_RATE: {
    formula: "Sessions with message_count ≥ 10 / total sessions × 100",
    description: "Percentage of sessions reaching 10+ messages. Measures emotional depth.",
  },
  PERSONA_SWITCH_RATE: {
    formula: "profile_swipe_photo events / chat_entry_click events",
    description: "How frequently users swipe between personas relative to chat sessions.",
  },
  GIFT_RATE: {
    formula: "gift_item_purchase users / message_send users × 100",
    description: "Percentage of chatting users who purchased a gift for a virtual persona.",
  },
  MEMBERSHIP_RATE: {
    formula: "membership_success_toast users / DAU × 100",
    description: "Percentage of daily active users who subscribed to membership.",
  },
  RECHARGE_CONVERSION: {
    formula: "recharge_result(success) / click_mcoin_topup_entry × 100",
    description: "Conversion rate from clicking top-up entry to successful recharge.",
  },
  IMAGE_UNLOCK_RATE: {
    formula: "image_unlock_confirm users / message_send users × 100",
    description: "Percentage of chatters who unlocked at least one image.",
  },
  BATTERY_BALANCE: {
    formula: "battery_charged - battery_consumed",
    description: "Net battery flow. Negative = users consuming faster than recharging via ads.",
  },
  COIN_BALANCE: {
    formula: "coins_earned (missions) - coins_spent (unlocks)",
    description: "Net coin flow. Tracks economy health between mission rewards and spending.",
  },
};
