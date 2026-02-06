/**
 * Metric definitions and formulas shown on hover.
 */

export const METRIC_FORMULAS: Record<string, { formula: string; description: string }> = {
  DAU: {
    formula: "COUNT(DISTINCT user_pseudo_id) per day",
    description: "Daily Active Users: unique users who had at least one session that day.",
  },
  D1_RETENTION: {
    formula: "(Users who returned on D1 / New users on D0) × 100%",
    description: "D1 Retention: % of new users who came back the next day.",
  },
  PAY_RATE: {
    formula: "(Paying users / DAU) × 100%",
    description: "Pay Rate: % of daily active users who made a purchase.",
  },
  ARPPU: {
    formula: "Total Revenue / Paying users",
    description: "Average Revenue Per Paying User.",
  },
  REVENUE: {
    formula: "SUM(event_value_in_usd) where event_name IN ('purchase','in_app_purchase')",
    description: "Total revenue from in-app purchases.",
  },
  WITHDRAWAL: {
    formula: "SUM(withdrawal events) or configurable % of revenue",
    description: "Total withdrawal amount (user payouts).",
  },
  ROI: {
    formula: "Revenue / Cost (or Revenue / Spend)",
    description: "Return on Investment.",
  },
  NEW: {
    formula: "COUNT(DISTINCT user_pseudo_id) where event_name = 'first_open'",
    description: "New users: first-time app opens.",
  },
  UNLOCK_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) with unlock-type events",
    description: "Users who triggered at least one unlock event.",
  },
  UNLOCK_GE2: {
    formula: "COUNT(DISTINCT user_pseudo_id) with ≥2 unlock events",
    description: "High-freq unlock users: 2+ unlock actions.",
  },
  PAYERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) with purchase event",
    description: "Unique paying users per day.",
  },
};
