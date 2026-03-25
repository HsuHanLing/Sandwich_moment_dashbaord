/**
 * Metric definitions and formulas shown on hover.
 */

export const METRIC_FORMULAS: Record<string, { formula: string; description: string }> = {
  PSEUDO_DAU: {
    formula: "COUNT(DISTINCT user_pseudo_id) per day (GA4 events_* ∪ events_intraday_*)",
    description:
      "Pseudo DAU: distinct user_pseudo_id with any event that calendar day. KPI and daily trend merge GA4 daily export tables (events_YYYYMMDD) with intraday (events_intraday_YYYYMMDD); when both exist for a date, the daily-export row is used so counts are not double-counted.",
  },
  DAU: {
    formula:
      "Daily shard: COUNT(DISTINCT user_id) WHERE event_name = 'Enter_NewUserLandSupPage'. Intraday-only days: COUNT(DISTINCT user_id) across events.",
    description:
      "Logged-in DAU: where the GA4 daily table has data for that date, counts distinct user_id on Enter_NewUserLandSupPage. On intraday-only dates (no daily shard yet), uses distinct user_id across all events. Same merge rule as Pseudo DAU (prefer daily shard when present).",
  },
  D1_RETENTION: {
    formula:
      "KPI: retained_d1 / LAG(registration). Daily trend row: retained_d1 / cohort_size (registrations that calendar day).",
    description:
      "Registration cohort: REG_EVENTS + REG_GEO (excl. Hong Kong, China, Singapore). Return on D+1 = at least one event on the day after registration, excluding only notification_receive, notification_dismiss, and app_remove (all other events count). KPI cards: denominator = previous day’s registrations; numerator = users who registered the day before the row date and qualified on the row date (return-date alignment). Daily trend table: each row is registration day D0; % = retained_d1 / registrations that day; tooltip shows retained/cohort. Cohorts too recent for a full D+1 window may show “—”. Same GA4 daily/intraday merge as other overview metrics.",
  },
  D1_RETENTION_GROWTH: {
    formula: "(Users qualifying on D1 / Registered users on D0) × 100%",
    description:
      "Growth retention chart: same registration cohort and same D+1 activity rule as KPI (events on D+1 except notification_receive, notification_dismiss, app_remove). Shows D1/D3/D7/D14 as a curve over a rolling window; differs from the KPI snapshot mainly by time aggregation and chart window, not by cohort rules.",
  },
  PAY_RATE: {
    formula: "(Paying users / DAU) × 100%",
    description:
      "KPI Pay Rate: paying users and DAU use the definitions above. Paying users = distinct user_pseudo_id with purchase, in_app_purchase, or iap_success (subscription convert/renew are not included in KPI payers).",
  },
  ARPPU: {
    formula: "Total Revenue / Paying users",
    description:
      "KPI ARPPU: revenue and payers both use purchase, in_app_purchase, and iap_success only (same scope as KPI Pay Rate).",
  },
  REVENUE: {
    formula:
      "KPI: SUM(event_value_in_usd) for purchase, in_app_purchase, iap_success. Daily trend also includes app_store_subscription_convert and app_store_subscription_renew.",
    description:
      "KPI revenue: in-app purchase and IAP success events only. Daily trend “Revenue” column additionally includes App Store subscription convert and renew events. Amounts from event_value_in_usd where present.",
  },
  WITHDRAWAL: {
    formula: "SUM(SAFE_CAST(withdraw_amount AS FLOAT64)) WHERE event_name = 'withdraw_result'",
    description:
      "Total withdrawal amount from withdraw_result events. Amount extracted from event_params.withdraw_amount, cast to FLOAT64. In the Daily trend table, values are shown in USD with up to two decimal places when the total for that day is fractional (e.g. $0.30 instead of $0).",
  },
  ROI: {
    formula: "Revenue / Cost (or Revenue / Spend)",
    description: "Return on Investment.",
  },
  NEW: {
    formula: "COUNT(DISTINCT user_pseudo_id) where event_name = 'first_open'",
    description: "New users: first-time app opens.",
  },
  DAILY_REGISTRATION: {
    formula: "COUNT(DISTINCT user_pseudo_id) per day where: (1) event_name IN ('Success_GoogleRegister','Register_Number_Success','Register_Email_Success','Success_AppleRegister') OR (2) event_name='auth_oauth_result' AND EXISTS(event_params key='result' value.string_value='success'); AND geo.country NOT IN ('Hong Kong','China','Singapore').",
    description: "Daily completed registrations: Google/Apple/Email/Phone success events or auth_oauth_result with result=success. Excludes Hong Kong, China, Singapore. Affected by Overview geo filter when applied.",
  },
  UNLOCK_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('video_unlock_success','dollarsup_first_unlock_success')",
    description: "Users who triggered at least one unlock: video_unlock_success (successful $UP unlock) or dollarsup_first_unlock_success (first-time newbie unlock).",
  },
  UNLOCK_GE2: {
    formula:
      "COUNT(DISTINCT user_pseudo_id) with 2+ unlock events that day (video_unlock_success or dollarsup_first_unlock_success combined)",
    description:
      "Loop users: per calendar day, users with at least two unlock events counting both video_unlock_success and dollarsup_first_unlock_success. GA4 daily/intraday merge applies.",
  },
  PAYERS: {
    formula:
      "KPI: purchase, in_app_purchase, iap_success. Daily trend: also app_store_subscription_convert, app_store_subscription_renew.",
    description:
      "Unique paying users per day. The KPI snapshot uses IAP-style purchase events only; the daily trend table adds App Store subscription convert/renew to align with subscription revenue in that column.",
  },
  UNLOCK_D7_RETENTION: {
    formula: "(Unlock users active on D+7 / Total unlock users in cohort) × 100%",
    description:
      "Cohort: users whose first unlock event falls within the data window (and ≥7 days ago so D7 can be observed). Retention = % of those users who had ANY activity exactly 7 days after their first unlock.",
  },
  UNLOCK_7D_DISTRIBUTION: {
    formula: "For each signup-cohort user → COUNT(unlock events in first 7 days) → bucket",
    description:
      "Cohort: users who signed up (first_open) within the data window (and ≥7 days ago). For each user, count how many unlock events they triggered in their first 7 days post-signup. Buckets: 0, 1, 2, 3, 4, 5-9, 10+.",
  },
  // Growth Funnel
  FUNNEL_FIRST_OPEN: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open'",
    description: "Users who opened the app for the first time (app install).",
  },
  FUNNEL_REGISTRATION: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Success_GoogleRegister', 'Success_AppleRegister', 'Register_Email_Success', 'Register_Number_Success', 'auth_oauth_result')",
    description: "Users who completed registration. Includes legacy events (Success_GoogleRegister, Success_AppleRegister, Register_Email_Success, Register_Number_Success) and auth_oauth_result (OAuth success).",
  },
  FUNNEL_FIRST_UNLOCK: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'dollarsup_first_unlock_success'",
    description: "Users who completed their first $UP unlock during onboarding. dollarsup_first_unlock_success fires on the newbie's very first unlock (onboarding step 3).",
  },
  FUNNEL_SCRATCH_ACTIVATED: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'onb_scratchcard_grant' OR (event_name = 'scratch_guide_complete' AND result = 'success')",
    description: "Users who completed the scratch card activation. onb_scratchcard_grant = scratch card granted after first unlock; scratch_guide_complete with result=success = completed the scratch guide. Completes the core newbie loop: unlock → scratch → reward.",
  },
  FUNNEL_FIRST_SUP: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('PostedSup_Success', 'Click_PostedSup') AND feed_area NOT LIKE '%$UP%'",
    description: "Users who interacted with their first SUP (free short video content). PostedSup_Success = posted free content; Click_PostedSup = clicked on free content. Indicates content engagement after activation.",
  },
  FUNNEL_FIRST_UP: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Click_SendtoDollarSup'",
    description: "Users who clicked to send content to $UP (premium paid content). Indicates interest in monetizing content = pre-payment intent.",
  },
  FUNNEL_FIRST_PAY: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('purchase', 'in_app_purchase', 'iap_success', 'app_store_subscription_convert', 'app_store_subscription_renew')",
    description: "Users who made their first purchase. Includes GA4 auto-tracked (purchase, in_app_purchase), new IAP events (iap_success), and subscription events.",
  },
  FUNNEL_CONVERSION: {
    formula: "(Users at step / First Open users) × 100%",
    description: "Conversion rate vs. first_open cohort base.",
  },
  // Retention (Growth: registration cohort + REG_GEO, same as KPI)
  RETENTION_D1: {
    formula: "(Users active on D1 / Registered users on D0) × 100%",
    description:
      "D1 retention (Growth chart): Registration cohort, excludes HK/CN/SG. D0 = registration date. Activity on Dn excludes notification_receive, notification_dismiss, and app_remove only. Same logic as D3/D7/D14.",
  },
  RETENTION_D3: {
    formula: "(Users who returned on day 3 / Registered users on D0) × 100%",
    description:
      "D3 retention: % of registration cohort (excl. HK/CN/SG) with qualifying activity 3 days after registration (same event exclusions as D1).",
  },
  RETENTION_D7: {
    formula: "(Users who returned on day 7 / Registered users on D0) × 100%",
    description:
      "D7 retention: % of registration cohort (excl. HK/CN/SG) with qualifying activity 7 days after registration (same event exclusions as D1).",
  },
  RETENTION_D14: {
    formula: "(Users who returned on day 14 / Registered users on D0) × 100%",
    description:
      "D14 retention: % of registration cohort (excl. HK/CN/SG) with qualifying activity 14 days after registration (same event exclusions as D1).",
  },
  RETENTION_D21: {
    formula: "(Users who returned on day 21 / New users on D0) × 100%",
    description: "D21 retention: % of cohort who had activity 21 days after signup.",
  },
  RETENTION_D30: {
    formula: "(Users who returned on day 30 / New users on D0) × 100%",
    description: "D30 retention: % of cohort who had activity 30 days after signup.",
  },
  RETENTION_WOW: {
    formula: "Week-over-week change vs. same day in prior week",
    description: "WoW: (Current week rate − Prior week rate).",
  },
  // Economy Health
  ECON_AVG_UNLOCKS: {
    formula: "COUNT(video_unlock_success events) / COUNT(DISTINCT users with video_unlock_success) / days",
    description: "Average video_unlock_success actions per active unlock user per day.",
  },
  ECON_SCRATCH_RATE: {
    formula: "COUNT(DISTINCT scratch users WHERE event_name = 'scratch_result_view') / COUNT(DISTINCT DAU) × 100%",
    description: "Scratch card rate: % of DAU who triggered at least one scratch_result_view event.",
  },
  ECON_UPGRADE_RATE: {
    formula: "COUNT(DISTINCT user_pseudo_id WHERE event_name = 'scratch_upgrade_result' AND upgrade_status = 'insufficient_balance') / COUNT(DISTINCT DAU) × 100%",
    description: "Upgrade attempt rate: % of DAU who triggered scratch_upgrade_result with upgrade_status=insufficient_balance (attempted upgrade but lacked balance).",
  },
  ECON_AVG_REWARD: {
    formula: "SUM(reward_amount) / COUNT(reward events) WHERE event_name = 'scratch_result_view' AND reward_amount IN [0, 20000]",
    description: "Average diamond reward per scratch_result_view event. reward_amount extracted from event_params, filtered to 0–20k range.",
  },
  // Content & Feed Performance (daily posts + SUP/$UP engagement with likes)
  CONTENT_DAILY_POST_SUP: {
    formula: "COUNTIF(event_name = 'PostedSup_Success') per day",
    description: "Daily SUP post count: number of free short-form video posts published per day. Event: PostedSup_Success.",
  },
  CONTENT_DAILY_POST_UP: {
    formula: "COUNTIF(event_name = 'Click_SendtoDollarSup') per day",
    description: "Daily $UP post count: number of paid content submissions per day. Event: Click_SendtoDollarSup.",
  },
  CONTENT_DAILY_POST_SEQUEL: {
    formula: "COUNTIF(event_name = 'Click_PostedSequel_success') per day",
    description: "Daily Sequel post count: number of sequel/multi-part content posts per day. Event: Click_PostedSequel_success.",
  },
  CONTENT_SUP_EXPOSURE: {
    formula: "(Deprecated) video_exposure no longer tracked — dashboard shows 0",
    description: "SUP exposure was based on video_exposure; that event is no longer tracked. Use click play and like metrics instead.",
  },
  CONTENT_SUP_CLICK_PLAY: {
    formula: "COUNTIF(event_name = 'video_click_play' AND video_type = 'SUP')",
    description: "SUP click-to-play count: user clicked to play a SUP video. Event: video_click_play with video_type = SUP.",
  },
  CONTENT_SUP_CLICK_RATE: {
    formula: "like_count / video_click_play × 100% (SUP)",
    description: "SUP engagement: likes per click-to-play (video_exposure no longer tracked).",
  },
  CONTENT_SUP_LIKE_COUNT: {
    formula: "COUNT(*) WHERE event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success') AND video_type = 'SUP'",
    description: "SUP like count: likes on SUP content. Events: click_like_button, LikeVideos_Success, LikePhotos_Success. video_type resolved via video_id join.",
  },
  CONTENT_SUP_LIKE_RATE: {
    formula: "like_count / video_click_play × 100% (SUP)",
    description: "SUP like rate: % of SUP click-to-play events that resulted in a like.",
  },
  CONTENT_UP_EXPOSURE: {
    formula: "(Deprecated) video_exposure no longer tracked — dashboard shows 0",
    description: "$UP exposure was based on video_exposure; that event is no longer tracked. Use click unlock and unlock success instead.",
  },
  CONTENT_UP_CLICK_UNLOCK: {
    formula: "COUNTIF(event_name = 'video_click_unlock')",
    description: "$UP click-unlock count: user clicked to unlock a paid video. Event: video_click_unlock.",
  },
  CONTENT_UP_UNLOCK_SUCCESS: {
    formula: "COUNTIF(event_name = 'video_unlock_success')",
    description: "$UP unlock success count: user completed payment and unlocked the video. Event: video_unlock_success.",
  },
  CONTENT_UP_CLICK_UNLOCK_RATE: {
    formula: "video_unlock_success / video_click_unlock × 100% ($UP)",
    description: "$UP funnel: successful unlocks as % of unlock clicks (no exposure denominator).",
  },
  CONTENT_UP_UNLOCK_SUCCESS_RATE: {
    formula: "video_unlock_success / video_click_unlock × 100% ($UP)",
    description: "$UP unlock success rate: % of unlock clicks that completed payment.",
  },
  CONTENT_UP_REVENUE: {
    formula: "SUM(SAFE_CAST(price AS FLOAT64)) WHERE event_name = 'video_unlock_success'",
    description: "$UP revenue: total revenue from successful unlocks. price from event_params.",
  },
  CONTENT_UP_LIKE_COUNT: {
    formula: "COUNT(*) WHERE event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success') AND video_type IN ('$UP','more_$up')",
    description: "$UP like count: likes on paid content. video_type resolved via video_id join.",
  },
  CONTENT_UP_LIKE_RATE: {
    formula: "like_count / video_unlock_success × 100% ($UP)",
    description: "$UP like rate: % of successful unlocks that resulted in a like.",
  },
  // Legacy Content & Feed (feed_area-based)
  FEED_IMPRESSIONS: {
    formula: "(Legacy) video_exposure no longer tracked",
    description: "Legacy feed impressions used video_exposure; that event is no longer tracked.",
  },
  FEED_CTR: {
    formula: "(Legacy) CTR used video_exposure denominator",
    description: "Legacy CTR used video_exposure; that event is no longer tracked.",
  },
  FEED_COMPLETION: {
    formula: "(video_play_end with is_completed=true / video_enter_fullscreen) × 100%",
    description: "Video completion rate: % of fullscreen video starts (video_enter_fullscreen) that were watched to completion (video_play_end with is_completed=true).",
  },
  FEED_REPLAY: {
    formula: "(more_up_continue / video_play_end with is_completed) × 100%",
    description: "Replay rate: % of completed videos that triggered a more_up_continue event (replay or continue watching).",
  },
  // Paid Users
  PAID_TOTAL_PAYERS: {
    formula:
      "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('purchase','in_app_purchase','app_store_subscription_convert','app_store_subscription_renew')",
    description:
      "Total unique users with at least one qualifying event in the period: GA4 purchase and in_app_purchase, plus App Store subscription convert/renew. Excludes iap_success.",
  },
  PAID_D7_RETENTION: {
    formula:
      "First pay = MIN(date) WHERE event_name = 'in_app_purchase'; retained = activity on first_pay_dt + 7 days (excluding notification_receive, notification_dismiss, app_remove)",
    description:
      "D7 retention of first-time in_app_purchase payers: % who had any qualifying activity on the calendar day 7 days after their first in_app_purchase. Cohort excludes users whose first pay was in the last 7 days (D7 not yet observable).",
  },
  PAID_ARPPU: {
    formula: "SUM(revenue) / COUNT(DISTINCT payers)",
    description: "Average Revenue Per Paying User in the selected period.",
  },
  PAID_AVG_PURCHASES: {
    formula: "COUNT(purchase events) / COUNT(DISTINCT payers)",
    description: "Average number of purchase transactions per paying user.",
  },
  PAID_FIRST_PAY_DAY: {
    formula: "MEDIAN(DATE_DIFF(first_purchase_date, signup_date, DAY))",
    description: "Median number of days from signup to first purchase.",
  },
  PAID_REPURCHASE_LIFETIME_BASE: {
    formula: "COUNT(DISTINCT user) WHERE ≥1 qualifying in_app_purchase in last 60 days",
    description:
      "Users with at least one qualifying in_app_purchase in the rolling 60-day repurchase scan, excluding product_id IN (exclusivemonthly, exclusiveaccess, subscription). Denominator for repurchase rate. First purchase means first qualifying IAP in that window, not all-time.",
  },
  PAID_REPURCHASERS: {
    formula: "COUNT(users) WHERE ≥2 qualifying in_app_purchase in last 60 days (by timestamp order)",
    description:
      "Unique users with at least two qualifying in_app_purchase events in the same 60-day window; same product_id exclusions as repurchase SQL. First and second are the 1st and 2nd IAP by event_timestamp in the window. Frequency buckets: 2, 3, 4, 5+ in-window purchase counts.",
  },
  PAID_REPURCHASE_RATE: {
    formula: "COUNT(DISTINCT repurchasers) / COUNT(DISTINCT users with ≥1 qualifying IAP)",
    description: "Share of users with at least one qualifying in_app_purchase who also have a second; all user counts use DISTINCT user_pseudo_id in SQL.",
  },
  PAID_AVG_DAYS_REPURCHASE: {
    formula: "AVG(days_to_second) with one row per user_pseudo_id (users with ≥2 purchases)",
    description: "Mean calendar days between first and second qualifying in_app_purchase; averaged once per distinct user.",
  },
  PAID_REPURCHASE_7D: {
    formula: "COUNT(DISTINCT eligible repurchasers within 7d) / COUNT(DISTINCT eligible cohort)",
    description:
      "Share of users in the 7-day cohort (first qualifying IAP at least 7 days ago) who had a second IAP within 7 calendar days. Numerator and denominator use DISTINCT user_pseudo_id.",
  },
  PAID_REPURCHASE_30D: {
    formula: "COUNT(DISTINCT eligible repurchasers within 30d) / COUNT(DISTINCT eligible cohort)",
    description:
      "Same as 7d with a 30-day window; DISTINCT user_pseudo_id on both parts.",
  },
  PAID_REPURCHASE_FREQUENCY_BUCKETS: {
    formula:
      "Among users with ≥2 qualifying IAPs in the 60-day window: COUNT per bucket where in-window count = 2, 3, 4, or ≥5; product_id NOT IN (exclusivemonthly, exclusiveaccess, subscription).",
    description:
      "Splits repurchasers by total qualifying IAP count within the 60-day scan: exactly 2, 3, 4, or five or more (after SKU exclusions). Percentages are shares of all repurchasers.",
  },
  PAID_REVENUE_TOTAL: {
    formula:
      "SUM(event_value_in_usd) WHERE event_name IN ('purchase','in_app_purchase','app_store_subscription_convert','app_store_subscription_renew') AND event_value_in_usd > 0",
    description:
      "Total revenue in the selected period from the same event set as Total Payers (purchase, in_app_purchase, App Store subscription convert/renew). Rows with zero or negative value are excluded.",
  },
  // Subscription / VIP
  SUB_TOTAL: {
    formula: "Paid (real $) + Wallet (in-app cash/diamond)",
    description: "Total subscribers: real-money subscription plus wallet (in-app cash/diamond). Excludes exchangers (Diamond/Cash→coin VIP conversion).",
  },
  SUB_EXCHANGE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('auto_convert_trigger', 'Click_CashWalletConfirmConvert')",
    description: "Users who converted to VIP by exchanging in-app balance. Convert methods: Diamond → coin, Cash → coin (convertMethod from event_params). Auto-convert = auto_convert_trigger; manual = Click_CashWalletConfirmConvert. IMPORTANT: Conversion feature is available on iOS only; not supported on Android.",
  },
  SUB_PAID: {
    formula:
      "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('app_store_subscription_convert','app_store_subscription_renew','iap_success','in_app_purchase') AND (COALESCE(product_id,'') IN ('exclusivemonthly','exclusiveaccess') OR (event_name='iap_success' AND product_id LIKE '%subscription%') OR event_name IN ('app_store_subscription_convert','app_store_subscription_renew'))",
    description:
      "Paid (real $) subscription users: product_id exclusivemonthly or exclusiveaccess; or iap_success with product_id LIKE '%subscription%'; or App Store subscription convert/renew. Excludes wallet_subscribe_success (in-app cash wallet) and top-up.",
  },
  SUB_WALLET: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'wallet_subscribe_success'",
    description: "Users who subscribed using in-app cash or diamond balance (wallet_subscribe_success). Not real money. Does not contribute to Paid Sub Revenue.",
  },
  SUB_PAID_REVENUE: {
    formula:
      "SUM(event_value_in_usd) WHERE event_name IN ('purchase','in_app_purchase','iap_success','app_store_subscription_convert','app_store_subscription_renew') AND event_value_in_usd > 0 AND (same product_id predicates as SUB_PAID)",
    description:
      "Real-money subscription revenue: same rules as SUB_PAID and Monetization “Subscription” slice—exclusivemonthly/exclusiveaccess, iap_success with product_id containing 'subscription', or App Store subscription convert/renew. On the Paid Users panel, only events included in the Paid KPI filter apply (purchase, in_app_purchase, subscription convert/renew), so revenue that appears only on iap_success is not in that share. Excludes wallet and top-up.",
  },
  SUB_ANALYSIS_INTRO: {
    formula: "See SUB_PAID, SUB_WALLET, SUB_EXCHANGE, SUB_PAID_REVENUE",
    description:
      "Paid subscription users and revenue use product_id IN (exclusivemonthly, exclusiveaccess), or iap_success with product_id LIKE '%subscription%', or App Store subscription events. Wallet and exchange rows use their own events.",
  },
  MONETIZATION_REVENUE_MIX: {
    formula:
      "Per event row: Subscription if purchase/IAP/store events AND (exclusive SKUs OR iap_success+subscription OR App Store sub events); else Unlock Pack",
    description:
      "Pie chart: Subscription slice matches Paid Sub Revenue (exclusive SKUs, iap_success subscription SKU, App Store subs). Remaining revenue from those events is Unlock Pack (e.g. top-up).",
  },
  SUB_IAP_SUCCESS: {
    formula: "(Subscription paid users / Subscription IAP start users) × 100%",
    description:
      "Subscription IAP success rate: paid users (SUB_PAID) divided by users who started a subscription IAP (iap_start with exclusive SKUs or product_id LIKE '%subscription%'). Top-up starts excluded.",
  },
  // Flywheel
  FW_ACTIVE_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) in period",
    description: "Total unique users with any event in the selected period.",
  },
  FW_NEW_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open'",
    description: "Users who opened the app for the first time in the selected period.",
  },
  FW_PAY_RATE: {
    formula: "(Paying users / Active users) × 100%",
    description: "Pay Rate: % of active users who made at least one purchase.",
  },
  FW_SCORE: {
    formula: "AVG(node scores) across all 8 flywheel nodes, each 0-10",
    description: "Overall flywheel health score: average of all node scores. 7+ = healthy, 4-6 = warning, <4 = broken.",
  },
  FW_FIRST_OPEN: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open'",
    description: "First Opens: new app installs / first-time opens in the period.",
  },
  FW_FIRST_OPEN_7D: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open' AND date >= CURRENT_DATE - 7",
    description: "First opens in the last 7 days. Used for WoW comparison.",
  },
  FW_WOW_CHANGE: {
    formula: "((Last 7d - Prev 7d) / Prev 7d) × 100%",
    description: "Week-over-week change in first opens.",
  },
  FW_DAILY_AVG: {
    formula: "Total first opens / days in period",
    description: "Average daily new users.",
  },
  FW_REGISTERED: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Success_GoogleRegister', 'Success_AppleRegister', 'Register_Email_Success', 'Register_Number_Success') OR (event_name = 'auth_oauth_result' AND result = 'success')",
    description: "Users from the first_open cohort who completed registration. Includes legacy events (Success_GoogleRegister, Success_AppleRegister, Register_Email/Number_Success) and auth_oauth_result with result=success.",
  },
  FW_REG_RATE: {
    formula: "(Registered users / First open users) × 100%",
    description: "Registration conversion: % of new users who registered.",
  },
  FW_FIRST_UNLOCK: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'dollarsup_first_unlock_success'",
    description: "Users from first_open cohort who performed their first content unlock. dollarsup_first_unlock_success fires on the newbie's very first $UP unlock.",
  },
  FW_UNLOCK_RATE: {
    formula: "(First unlock users / Registered users) × 100%",
    description: "First unlock conversion: % of registered users who unlocked content.",
  },
  FW_TOTAL_UNLOCKERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'video_unlock_success'",
    description: "All users who triggered at least one video_unlock_success event in the period.",
  },
  FW_LOOP_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) with >=2 video_unlock_success events",
    description: "Users who unlocked 2+ times via video_unlock_success, indicating the unlock loop has formed.",
  },
  FW_POWER_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) with >=10 unlock events",
    description: "Power users: heavy unlockers with 10+ events in the period.",
  },
  FW_AVG_UNLOCKS: {
    formula: "AVG(unlock events per user)",
    description: "Average number of unlock events per unlocking user.",
  },
  FW_LOOP_RATE: {
    formula: "(Loop users / Total unlockers) × 100%",
    description: "Loop rate: % of unlockers who came back for 2+ unlocks. Target: 85%+.",
  },
  FW_SCRATCH_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'scratch_reward_grant_result'",
    description: "Users who triggered a scratch reward grant (scratch_reward_grant_result). Indicates users who completed a scratch action that granted a reward.",
  },
  FW_REWARD_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_params.diamonds_amount IN [0, 20000]",
    description: "Users who received a diamond reward (0–20k). Uses diamonds_amount from event_params. Includes scratch and unlock auto-rewards.",
  },
  FW_TOTAL_DIAMONDS: {
    formula: "SUM(SAFE_CAST(diamonds_amount AS INT64)) WHERE diamonds_amount IN [0, 20000]",
    description: "Total diamonds distributed via event_params.diamonds_amount, filtered to 0–20k range. Covers scratch + unlock auto-reward.",
  },
  FW_AVG_REWARD: {
    formula: "Total diamonds / Reward users",
    description: "Average diamond reward per rewarded user based on diamonds_amount.",
  },
  FW_SCRATCH_RATE: {
    formula: "(Scratch users / Active users) × 100%",
    description: "% of active users who used scratch cards.",
  },
  FW_SCRATCH_SHARE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'scratch_share_click'",
    description: "Users who shared their scratch card result.",
  },
  FW_SHARE_RATE: {
    formula: "(Scratch share users / Scratch users) × 100%",
    description: "Scratch-to-share conversion: % of scratchers who shared results.",
  },
  FW_SHARE_SUCCESS_RATE: {
    formula: "success / (success + fail) × 100%",
    description: "% of share attempts that completed successfully.",
  },
  FW_CASHOUT_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'withdraw_click'",
    description: "Users who clicked to withdraw (withdraw_click). Measures users who initiated a cashout/withdrawal flow.",
  },
  FW_CASHOUT_SUCCESS: {
    formula: "COUNT(*) WHERE event_name = 'withdraw_result' AND result_status = 'success'",
    description: "Number of successful withdrawal completions from withdraw_result events.",
  },
  FW_CASHOUT_RATE: {
    formula: "(Cashout users / Scratch users) × 100%",
    description: "% of scratch users who attempted to cash out via withdraw_click.",
  },
  // Creator Supply (KOL vs Influencer) — content production / supply performance
  CREATOR_SUPPLY_OVERVIEW: {
    formula: "KOL vs Influencer performance by video_author_id",
    description: "Creator Supply: clicks, unlocks, revenue, likes per creator type (SUP / $UP). video_exposure is no longer tracked. Creators classified by user_id: KOL (14 IDs) or Influencer (106 IDs). Events: video_click_play, video_click_unlock, video_unlock_success, click_like_button, LikeVideos_Success, LikePhotos_Success. Attribution via video_author_id on click/unlock and video_id join for likes.",
  },
  CREATOR_SUP_EXPOSURE: {
    formula: "(Deprecated) video_exposure no longer tracked — dashboard shows 0",
    description: "SUP exposure used video_exposure; that event is no longer tracked.",
  },
  CREATOR_SUP_CLICK_PLAY: {
    formula: "COUNTIF(event_name = 'video_click_play' AND video_type = 'SUP') per creator_type",
    description: "SUP click-to-play count per creator. video_author_id from event_params.",
  },
  CREATOR_SUP_LIKE_COUNT: {
    formula: "COUNTIF(event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success') AND video_type = 'SUP') per creator_type",
    description: "SUP like count per creator. Like events joined to video_author_map via video_id to resolve video_type and video_author_id.",
  },
  CREATOR_SUP_LIKE_RATE: {
    formula: "like_count / video_click_play × 100% (SUP)",
    description: "SUP like rate per creator: % of click-to-play events that resulted in a like.",
  },
  CREATOR_UP_EXPOSURE: {
    formula: "(Deprecated) video_exposure no longer tracked — dashboard shows 0",
    description: "$UP exposure used video_exposure; that event is no longer tracked.",
  },
  CREATOR_UP_CLICK_UNLOCK: {
    formula: "COUNTIF(event_name = 'video_click_unlock') per creator_type",
    description: "$UP click-unlock count per creator.",
  },
  CREATOR_UP_UNLOCK_SUCCESS: {
    formula: "COUNTIF(event_name = 'video_unlock_success') per creator_type",
    description: "$UP unlock success count per creator.",
  },
  CREATOR_UP_REVENUE: {
    formula: "SUM(price) WHERE event_name = 'video_unlock_success' per creator_type",
    description: "$UP revenue per creator from successful unlocks.",
  },
  CREATOR_UP_LIKE_COUNT: {
    formula: "COUNTIF(event_name IN ('click_like_button','LikeVideos_Success','LikePhotos_Success') AND video_type IN ('$UP','more_$up')) per creator_type",
    description: "$UP like count per creator. video_type resolved via video_id join.",
  },
  CREATOR_UP_LIKE_RATE: {
    formula: "like_count / video_unlock_success × 100% ($UP)",
    description: "$UP like rate per creator: % of successful unlocks that resulted in a like.",
  },
  // Growth: Scratch / Reward / Withdraw behavior (distribution & totals)
  GROWTH_SCRATCH_DIST: {
    formula: "Per user: COUNT(*) WHERE event_name IN ('scratch_result_view','scratch_reward_grant_result'). Buckets: 0, 1, 2, 3, 4, 5-9, 10+.",
    description: "Scratch count distribution: among users with ≥1 scratch_result_view, count of scratch events (scratch_result_view + scratch_reward_grant_result) per user in period. Both events indicate scratch activity; bucketed by total count.",
  },
  GROWTH_REWARD_COUNT_DIST: {
    formula: "Per-event reward_amount (diamonds) from scratch_result_view + scratch_reward_grant_result. Buckets: 0, 0.5k (500 diamonds), 1k, 2k, 3–4k, 5–9k, 10k+ by amt/1000 where applicable.",
    description: "Reward amount per event distribution. Events: scratch_result_view, scratch_reward_grant_result. Uses reward_amount or diamonds_amount from event_params (FLOAT64, 0–20k). Includes a dedicated bucket labeled 0.5 for exactly 500 diamonds.",
  },
  GROWTH_REWARD_DIAMONDS_DIST: {
    formula: "Per user: SUM(reward_amount) from scratch_result_view + scratch_reward_grant_result WHERE reward_amount IN [0, 20000]. Buckets: 0, 1-1k, 1k-5k, 5k-10k, 10k-20k.",
    description: "Total diamonds per user: SUM of reward_amount from events scratch_result_view and scratch_reward_grant_result. reward_amount/diamonds_amount from event_params, FLOAT64, filtered 0–20k.",
  },
  GROWTH_WITHDRAW_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'withdraw_result'",
    description: "Users who had at least one withdraw_result event in the period.",
  },
  GROWTH_WITHDRAW_EVENTS: {
    formula: "COUNT(*) WHERE event_name = 'withdraw_result'",
    description: "Total number of withdraw_result events in the period.",
  },
  GROWTH_WITHDRAW_AMOUNT: {
    formula: "SUM(SAFE_CAST(withdraw_amount AS FLOAT64)) WHERE event_name = 'withdraw_result'",
    description: "Total withdrawal amount from withdraw_result events. withdraw_amount extracted from event_params and cast to FLOAT64.",
  },
  GROWTH_WITHDRAW_AMOUNT_DIST: {
    formula: "Per user: SUM(SAFE_CAST(withdraw_amount AS FLOAT64)) from withdraw_result events. Buckets: 1-10, 10-50, 50-100, 100+.",
    description: "Distribution of total withdrawal amount per user from withdraw_result events in the period.",
  },
  FW_INVITE_CLICKS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Click_InviteButton','Click_ShareInviteLink','Click_InviteViaText','Click_InviteSnapchat','scratch_share_click','Click_ShareCard','Click_SelectedInviteFriends','Click_FindFriendInviteInviteButton')",
    description: "Users who triggered any invite/share action. Includes all invite button clicks, share links, text invites, Snapchat invites, scratch share, card share, and friend invite buttons.",
  },
  FW_INVITE_SENT: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'InviteFriendViaText_Success'",
    description: "Users who successfully sent a text invite.",
  },
  FW_REFERRAL_RATE: {
    formula: "(Invite success users / Active users) × 100%",
    description: "% of active users who successfully referred someone.",
  },
  FW_IAP_START: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'iap_start'",
    description: "Users who initiated an in-app purchase flow (tapped buy on a top-up or subscription offer).",
  },
  FW_IAP_SUCCESS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'iap_success'",
    description: "Users who completed payment successfully via App Store / Google Play IAP.",
  },
  FW_IAP_FAIL: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'iap_fail'",
    description: "Users whose IAP payment was cancelled or failed. fail_reason = 'Payment cancelled' or 'Payment failed'.",
  },
  FW_TOPUP_CLICK: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'topup_entry_click'",
    description: "Users who clicked a top-up offer. entry_source: wallet_page/wallet_topup/unlock_insufficient/scratch_insufficient/hint_bubble. Includes product_id and price.",
  },
  FW_ONB_COMPLETE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'onb_guide_complete' AND result = 'success'",
    description: "Users who completed the full 4-step newbie onboarding guide (welcome > awesome content > unlock bonus > camera).",
  },
  FW_ONB_ABORT: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'onb_guide_abort'",
    description: "Users who did not complete onboarding. abort_type: background/kill/crash/navigation_error. last_step_id indicates where they dropped.",
  },
  // Share
  SHARE_SCRATCH_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'scratch_share_click'",
    description: "Users who tapped 'Share' on the scratch card result screen after scratching.",
  },
  SHARE_SCRATCH_RATE: {
    formula: "(scratch_share_users / scratch_users) × 100%",
    description: "Scratch-to-share conversion: % of users who scratched a card and then shared the result.",
  },
  SHARE_SUCCESS: {
    formula: "COUNT(*) WHERE event_name = 'scratch_share_result' AND result = 'success'",
    description: "Number of share attempts that completed successfully via the system share sheet.",
  },
  SHARE_CANCEL: {
    formula: "COUNT(*) WHERE event_name = 'scratch_share_result' AND result = 'cancel'",
    description: "Number of share attempts where user dismissed the system share sheet without completing the share.",
  },
  SHARE_FAIL: {
    formula: "COUNT(*) WHERE event_name = 'scratch_share_result' AND result = 'fail'",
    description: "Number of share attempts that encountered an error.",
  },
  SHARE_INVITE_CLICKS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Click_InviteButton'",
    description: "Users who tapped the Invite button (from Friends page, Explore, etc.).",
  },
  SHARE_INVITE_SENT: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'InviteFriendViaText_Success'",
    description: "Users who successfully sent a text invite to a friend.",
  },
  SHARE_INVITE_LINK: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Click_ShareInviteLink'",
    description: "Users who shared an invite link (from search, homepage, contacts, referrals page, etc.).",
  },
  FW_LANDING_SHOW: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'share_landing_show'",
    description: "Users who saw the share landing page (H5). Triggers when someone opens a Dynamic Link (getit.thefr.app or open.frogcool.com). user_exist=true/false indicates whether the visitor already has the app.",
  },
  FW_LANDING_CLICK: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'share_window_click'",
    description: "Users who clicked through the share landing page. short_link param shows the specific Dynamic Link URL (e.g. getit.thefr.app/5TVJ).",
  },
  FW_DEEPLINK_OPEN: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Fr-invitationLink-openPage'",
    description: "Users who opened the app via an invitation Dynamic Link. short_link param shows the source URL. This completes the referral loop.",
  },
  REF_INVITE_TO_SENT: {
    formula: "(Invite Sent users / Invite Attempt users) × 100%",
    description: "Conversion rate from all invite/share button clicks to successfully sent invites (InviteFriendViaText_Success). Measures how many users who tap invite actually complete the send.",
  },
  REF_LANDING_TO_CLICK: {
    formula: "(Landing Click users / Landing View users) × 100%",
    description: "Conversion rate from share landing page views (share_landing_show) to click-through (share_window_click). Measures landing page effectiveness.",
  },
  REF_CLICK_TO_OPEN: {
    formula: "(Deeplink Open users / Landing Click users) × 100%",
    description: "Conversion rate from landing page click to actually opening the app (Fr-invitationLink-openPage). Drop-off here means users didn't install or open the app.",
  },
  REF_OVERALL_CONVERSION: {
    formula: "(Referral Registrations / Invite Attempt users) × 100%",
    description: "End-to-end referral conversion: from all invite attempts to new users who registered via Dynamic Link (traffic_source.source = getit/frog/frogcool/appreferral).",
  },
  REF_REFERRAL_REGISTRATIONS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open' AND traffic_source.source IN ('getit','frog','frogcool','appreferral')",
    description: "New users who installed and opened the app via a referral Dynamic Link (getit.thefr.app or open.frogcool.com). These are users acquired through sharing/invites.",
  },
  // Health Dashboard
  HEALTH_REG_RATE: {
    formula: "(Registered users / First open users) × 100%, 30d",
    description: "Registration conversion: auth_submit_result or auth_oauth_result success. Denominator: first_open in period.",
  },
  HEALTH_UNLOCK_RATE: {
    formula: "(First unlock users / Registered users) × 100%, 30d",
    description: "First unlock: video_unlock_success or dollarsup_first_unlock_success. Denominator: registered in period.",
  },
  HEALTH_LOOP_RATE: {
    formula: "(Users with 2+ unlocks / Total unlock users) × 100%, 30d",
    description: "Unlock loop: users who unlocked at least twice. Denominator: all users with at least one unlock.",
  },
  HEALTH_SHARE_RATE: {
    formula: "(Scratch share users / Scratch users) × 100%, 30d",
    description: "Share after cashout: scratch_share_click users / users who completed scratch (scratch_reward_grant_result).",
  },
  HEALTH_REFERRAL_WEEK: {
    formula: "COUNT(DISTINCT user_pseudo_id) first_open via referral/dynamic link, last 7 days",
    description: "North Star. New registrations per week from referral or sharing (traffic_source getit/frog/frogcool/referral).",
  },
  HEALTH_D7_UNLOCK: {
    formula: "(Unlock cohort retained on D7 / Unlock cohort size) × 100%",
    description: "Unlock user D7 retention: users who first unlocked 7+ days ago and had activity on D7.",
  },
  HEALTH_PAY_RATE: {
    formula: "(Payers / Active users) × 100%, 30d",
    description: "Payment conversion: iap_success or purchase. Denominator: total active users in period.",
  },
  HEALTH_MONTHLY_REVENUE: {
    formula: "SUM(event_value_in_usd) WHERE event_name IN ('purchase','in_app_purchase','app_store_subscription_convert','app_store_subscription_renew'), 30d",
    description: "Total revenue in the last 30 days from in-app and subscription purchases.",
  },
  // Registration Funnel (auth_screen_view, auth_entry_click, auth_submit_result, etc.)
  REG_APP_OPEN: {
    formula: "event_name = 'first_open'",
    description: "App first open (install). Cohort base for the registration funnel.",
  },
  REG_APP_OPEN_NO_CLICK: {
    formula: "first_open 用户，且以下埋点均无数据（任一有数据则不计入 No action）：(1) Auth/注册: auth_entry_click, auth_nickname_next, auth_submit_result, auth_oauth_result, auth_method_switch; Success_GoogleRegister, Success_AppleRegister, Register_Email_Success, Register_Number_Success, Login_Email_Success, Login_Number_Success, signin_credit_earned. (2) 进入主站: screen_view/All_PageBehavior/auth_screen_view（在 reg 之后）. (3) 渠道点击: auth_entry_click 的 cta_name=google|apple|email|phone，auth_method_switch 的 provider=google|apple. (4) 看视频: video_start, video_play, video_complete, video_end, Video_Complete, Click_Sup. (5) 加好友/邀请: event_name 含 follow/friend，或 add_friend, follow_user, user_follow, InviteFriendViaText_Success, profile_top_button_click, other_profile_top_button_click. (6) 个人主页: screen_view/All_PageBehavior/auth_screen_view 且 screen_name 含 profile 或为 my_profile/user_profile/profile/personal_home/me. (7) 拍摄: event_name 含 record/shoot/capture/publish，或 video_record_start, shoot_start, publish_video, create_video, record_start.",
    description: "仅 first_open 后上述全部埋点均无数据的用户计入 No action。",
  },
  REG_LOGIN_HOME: {
    formula: "event_name = 'auth_screen_view' AND screen_name = 'login_home'",
    description: "认证页面曝光：登录首页渲染完成。Params: screen_name=login_home, auth_method, has_login_record.",
  },
  REG_AUTH_ENTRY_CLICK: {
    formula: "event_name = 'auth_entry_click'",
    description: "First entry: any Continue or Sign up click on login home.",
  },
  REG_CLICK_SIGNUP: {
    formula: "event_name = 'auth_entry_click' AND cta_name = 'signup'",
    description: "Sign up button click only (not Continue).",
  },
  REG_NICKNAME: {
    formula: "event_name = 'auth_screen_view' AND screen_name = 'nickname'",
    description: "认证页面曝光：昵称页渲染完成。",
  },
  REG_AUTH_NICKNAME_NEXT: {
    formula: "event_name = 'auth_nickname_next'",
    description: "昵称页点击下一步：昵称不为空且点击 Next。Params: to_method=email（默认跳Email注册页）.",
  },
  REG_REGISTER: {
    formula: "event_name = 'auth_screen_view' AND screen_name = 'register'",
    description: "认证页面曝光：注册页渲染完成。",
  },
  REG_CAPTCHA: {
    formula: "event_name = 'auth_screen_view' AND screen_name = 'captcha'",
    description: "认证页面曝光：真人验证页渲染完成。",
  },
  REG_OTP_VERIFY: {
    formula: "event_name = 'auth_screen_view' AND screen_name = 'otp_verify'",
    description: "认证页面曝光：验证码页渲染完成。仅电话（Phone）注册路径会经过此步；Google/Apple/Email 路径不需要 OTP。",
  },
  REG_REGISTERED: {
    formula: "event_name IN ('Success_GoogleRegister','Success_AppleRegister','Register_Email_Success','Register_Number_Success','Login_Email_Success','Login_Number_Success','signin_credit_earned','auth_submit_result','auth_oauth_result')",
    description: "Registered users (same definition as Growth Funnel).",
  },
  REG_METHOD_GOOGLE: {
    formula: "Success_GoogleRegister OR auth_oauth_result provider=google result=success OR auth_method_switch provider=google result=success",
    description: "Users who completed registration via Google.",
  },
  REG_METHOD_APPLE: {
    formula: "Success_AppleRegister OR auth_oauth_result provider=apple result=success OR auth_method_switch provider=apple result=success",
    description: "Users who completed registration via Apple.",
  },
  REG_METHOD_EMAIL: {
    formula: "auth_submit_result result=success auth_method=email OR Register_Email_Success OR Login_Email_Success",
    description: "Users who completed registration via Email.",
  },
  REG_METHOD_PHONE: {
    formula: "auth_submit_result result=success auth_method=phone OR Register_Number_Success OR Login_Number_Success",
    description: "Users who completed registration via Phone.",
  },
  REG_CHANNEL_GOOGLE_CLICKED: {
    formula: "auth_entry_click cta_name=google OR auth_method_switch provider=google",
    description: "Users who chose Google login (any result).",
  },
  REG_CHANNEL_APPLE_CLICKED: {
    formula: "auth_entry_click cta_name=apple OR auth_method_switch provider=apple",
    description: "Users who chose Apple login (any result).",
  },
  REG_CHANNEL_EMAIL_CLICKED: {
    formula: "auth_entry_click cta_name=email",
    description: "Users who chose Email signup path.",
  },
  REG_CHANNEL_PHONE_CLICKED: {
    formula: "auth_entry_click cta_name=phone",
    description: "Users who chose Phone signup path.",
  },
  REG_CHANNEL_FAILURE: {
    formula: "Clicked − Success (same events as Clicked, minus those who reached Success)",
    description: "Users who clicked this channel but did not complete registration.",
  },
  REG_ONBOARDING_COMPLETE: {
    formula: "event_name = 'onb_guide_complete' AND result = 'success'",
    description: "新手引导完成（4 步引导结束）。",
  },
  REG_ENTER_MAIN: {
    formula: "First Enter_NewUserLandSupPage after registration success (REG_EVENTS)",
    description:
      "Landed: first Enter_NewUserLandSupPage after any registration success event. Aligns with logged-in DAU entry (same event).",
  },
  REG_FUNNEL_CONVERSION: {
    formula: "(Users at step / App Open users) × 100%",
    description: "该步骤相对「打开 App」的转化率。",
  },

  // ─── Glimmo Metrics ────────────────────────────────────────────────
  GLIMMO_DAU: {
    formula: "COUNT(DISTINCT user_pseudo_id) per day",
    description: "Daily Active Users: unique users with any event on that day (GA4 events_*).",
  },
  GLIMMO_NEW_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open'",
    description: "New users who opened the Glimmo app for the first time (first_open event from GA4).",
  },
  GLIMMO_ENTRIES: {
    formula: "COUNT(*) WHERE event_name = 'Post_post'",
    description: "Total journal entries created. Each Post_post event = one journal entry submitted (text, template, or photo).",
  },
  GLIMMO_AI_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('companion_aicompanion_click', 'Homepage_bot_reply', 'Homepage_bot_like', 'companion_explore_click', 'companion_create_click')",
    description: "Users who interacted with the AI Companion feature. companion_aicompanion_click = opened AI companion; Homepage_bot_reply = received AI reply; Homepage_bot_like = liked AI reply; companion_explore_click = explored companions; companion_create_click = created custom companion.",
  },
  GLIMMO_SUB_VIEWERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Subscription_pageview'",
    description: "Users who viewed the subscription/premium page. Measures top-of-funnel premium interest.",
  },
  // Glimmo Flywheel Nodes
  GLIMMO_FW_DISCOVERY: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open'",
    description: "New user discovery: users who opened Glimmo for the first time. Source: first_open GA4 event.",
  },
  GLIMMO_FW_ONBOARDING: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Homepage_view' AND user ∈ first_open cohort",
    description: "Onboarding completion: first_open users who reached the Homepage. Events tracked: onboarding_personalize_click → onboarding_notification_click → Homepage_view.",
  },
  GLIMMO_FW_FIRST_ENTRY: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Post_post'",
    description: "First journal entry: users who wrote at least one entry. Post_post fires when any post (text/template/prompt/photo) is submitted.",
  },
  GLIMMO_FW_AI_ENGAGEMENT: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('companion_aicompanion_click', 'Homepage_bot_reply', 'Homepage_bot_like', 'companion_explore_click', 'companion_create_click')",
    description: "AI engagement: users who interacted with the AI Companion. Includes opening companion, receiving bot replies, liking replies, exploring, and creating custom companions.",
  },
  GLIMMO_FW_HABIT_LOOP: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE Post_post on 3+ distinct dates",
    description: "Habit loop: users who wrote journal entries on 3+ different days. Indicates journaling habit formation.",
  },
  GLIMMO_FW_EMOTIONAL_VALUE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Insight_pageview', 'collection_enter_click')",
    description: "Emotional value: users who viewed Emotion Insight (Insight_pageview) or entered Personal Collection (collection_enter_click). These features provide emotional reflection value.",
  },
  GLIMMO_FW_SHARE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Me_joininstagram_click', 'Me_joindiscord_click', 'Me_joindthread_click')",
    description: "Social sharing: users who tapped social links (Instagram, Discord, Threads). Currently limited share instrumentation — primary growth lever per growth report.",
  },
  GLIMMO_FW_PREMIUM: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Subscription_pageview', 'Me_premium_click')",
    description: "Premium conversion funnel: users who viewed the subscription page or tapped 'Premium' in settings. Subscription_pageview = paywall shown; Me_premium_click = premium entry from profile.",
  },
  // Glimmo Onboarding Funnel Steps
  GLIMMO_OB_FIRST_OPEN: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'first_open'",
    description: "First open: user installed and opened the app for the first time.",
  },
  GLIMMO_OB_PERSONALIZE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'onboarding_personalize_click'",
    description: "Personalize step: user tapped to personalize their journal setup during onboarding.",
  },
  GLIMMO_OB_NOTIFICATION: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('onboarding_notification_click', 'onboarding_notification_maybelater_click')",
    description: "Notification step: user interacted with notification permission prompt (accepted or skipped).",
  },
  GLIMMO_OB_HOMEPAGE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Homepage_view'",
    description: "Homepage reached: user completed onboarding and saw the main Homepage.",
  },
  GLIMMO_OB_FIRST_POST: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Post_post'",
    description: "First entry: user submitted their first journal post after onboarding.",
  },
  // Glimmo Feature Adoption
  GLIMMO_FA_WRITERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Post_post'",
    description: "Journal writers: unique users who submitted at least one journal entry (Post_post).",
  },
  GLIMMO_FA_AI_COMPANION: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('companion_aicompanion_click', 'Homepage_bot_reply', 'companion_explore_click', 'companion_create_click')",
    description: "AI Companion adopters: users who used the AI companion feature (opened, received replies, explored, or created companions).",
  },
  GLIMMO_FA_COLLECTION: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'collection_enter_click'",
    description: "Collection adopters: users who entered the Personal Collection feature to catalog physical objects and memories.",
  },
  GLIMMO_FA_INSIGHT: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Insight_pageview'",
    description: "Emotion Insight adopters: users who viewed the Insight page showing automatic emotional pattern tracking.",
  },
  GLIMMO_FA_SUBSCRIPTION: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Subscription_pageview'",
    description: "Subscription viewers: users who viewed the premium subscription page.",
  },
  // Glimmo Health Dashboard
  GLIMMO_HEALTH_ONBOARDING: {
    formula: "(Homepage_view users / first_open users) × 100%",
    description: "Onboarding completion rate: % of new users who reached the Homepage after onboarding.",
  },
  GLIMMO_HEALTH_WRITING: {
    formula: "(Post_post users / Active users) × 100%",
    description: "Writing rate: % of active users who submitted at least one journal entry.",
  },
  GLIMMO_HEALTH_AI: {
    formula: "(AI companion users / Active users) × 100%",
    description: "AI usage rate: % of active users who interacted with the AI Companion feature.",
  },
  GLIMMO_HEALTH_EMOTIONAL: {
    formula: "(Insight + Collection users / Active users) × 100%",
    description: "Emotional value rate: % of active users who used Insight or Collection features.",
  },
  GLIMMO_HEALTH_PREMIUM: {
    formula: "(Subscription_pageview users / Active users) × 100%",
    description: "Premium funnel rate: % of active users who viewed the subscription page.",
  },
};
