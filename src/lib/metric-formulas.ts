/**
 * Metric definitions and formulas shown on hover.
 */

export const METRIC_FORMULAS: Record<string, { formula: string; description: string }> = {
  DAU: {
    formula: "COUNT(DISTINCT user_pseudo_id) per day, geo.country NOT IN ('Hong Kong','China','Singapore')",
    description: "Daily Active Users: unique users with activity that day, excluding HK/CN/SG.",
  },
  D1_RETENTION: {
    formula: "(Users who returned on D1 / Registered users on D0) × 100%",
    description: "D1 Retention: % of registered users who came back the next day. Cohort: users who completed registration (Google/Apple/Email/Phone or auth_oauth_result success). Excludes HK/CN/SG.",
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
  DAILY_REGISTRATION: {
    formula: "COUNT(DISTINCT user_pseudo_id) per day where: (1) event_name IN ('Success_GoogleRegister','Register_Number_Success','Register_Email_Success','Success_AppleRegister') OR (2) event_name='auth_oauth_result' AND EXISTS(event_params key='result' value.string_value='success'); AND geo.country NOT IN ('Hong Kong','China','Singapore').",
    description: "Daily completed registrations: Google/Apple/Email/Phone success events or auth_oauth_result with result=success. Excludes Hong Kong, China, Singapore. Affected by Overview geo filter when applied.",
  },
  UNLOCK_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('video_unlock_success','dollarsup_first_unlock_success','video_click_unlock')",
    description: "Users who triggered at least one unlock: video_unlock_success (successful $UP unlock), dollarsup_first_unlock_success (first-time newbie unlock), or video_click_unlock (click to unlock).",
  },
  UNLOCK_GE2: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE unlock_count >= 2, events: video_unlock_success, dollarsup_first_unlock_success, video_click_unlock",
    description: "Loop users: 2+ unlock actions. Indicates the unlock loop has formed.",
  },
  PAYERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) with purchase event",
    description: "Unique paying users per day.",
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
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Success_GoogleRegister', 'Success_AppleRegister', 'Register_*_Success', 'Login_*_Success', 'signin_credit_earned', 'auth_submit_result', 'auth_oauth_result')",
    description: "Users who completed registration. Includes legacy events (Success_GoogleRegister, Register_Email_Success, etc.) and new unified events (auth_submit_result with flow_type=signup/result=success, auth_oauth_result with result=success).",
  },
  FUNNEL_FIRST_UNLOCK: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('dollarsup_first_unlock_success', 'video_unlock_success')",
    description: "Users who completed their first $UP unlock during onboarding. dollarsup_first_unlock_success = newbie's first unlock (onboarding step 3). video_unlock_success = any successful $UP unlock.",
  },
  FUNNEL_SCRATCH_ACTIVATED: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('onb_scratchcard_grant', 'scratch_reward_grant_result') OR (event_name = 'scratch_guide_complete' AND result = 'success')",
    description: "Users who completed the scratch card activation. After first unlock, user receives a scratch card, scratches it, gets diamond reward (500 diamonds). This completes the core newbie loop: unlock → scratch → reward.",
  },
  FUNNEL_FIRST_SUP: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Click_Sup' AND feed_area NOT LIKE '%$UP%'",
    description: "Users who clicked on their first SUP (free short video content). Indicates content engagement after activation.",
  },
  FUNNEL_FIRST_UP: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Click_Sup' AND feed_area LIKE '%$UP%'",
    description: "Users who clicked on their first $UP (premium paid content). Indicates interest in paid content = pre-payment intent.",
  },
  FUNNEL_FIRST_PAY: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('purchase', 'in_app_purchase', 'iap_success', 'app_store_subscription_convert', 'app_store_subscription_renew')",
    description: "Users who made their first purchase. Includes GA4 auto-tracked (purchase, in_app_purchase), new IAP events (iap_success), and subscription events.",
  },
  FUNNEL_CONVERSION: {
    formula: "(Users at step / First Open users) × 100%",
    description: "Conversion rate vs. first_open cohort base.",
  },
  // Retention (cohort by signup)
  RETENTION_D1: {
    formula: "(Users who returned on day 1 / New users on D0) × 100%",
    description: "D1 retention: % of cohort who had activity 1 day after signup.",
  },
  RETENTION_D3: {
    formula: "(Users who returned on day 3 / New users on D0) × 100%",
    description: "D3 retention: % of cohort who had activity 3 days after signup.",
  },
  RETENTION_D7: {
    formula: "(Users who returned on day 7 / New users on D0) × 100%",
    description: "D7 retention: % of cohort who had activity 7 days after signup.",
  },
  RETENTION_D14: {
    formula: "(Users who returned on day 14 / New users on D0) × 100%",
    description: "D14 retention: % of cohort who had activity 14 days after signup.",
  },
  RETENTION_WOW: {
    formula: "Week-over-week change vs. same day in prior week",
    description: "WoW: (Current week rate − Prior week rate).",
  },
  // Economy Health
  ECON_AVG_UNLOCKS: {
    formula: "COUNT(unlock events) / COUNT(DISTINCT users with unlock) / days",
    description: "Average unlock actions per active unlock user per day.",
  },
  ECON_SCRATCH_RATE: {
    formula: "COUNT(DISTINCT scratch users) / COUNT(DISTINCT DAU) × 100%",
    description: "Scratch card open rate: % of DAU who opened at least one scratch card.",
  },
  ECON_UPGRADE_RATE: {
    formula: "COUNT(DISTINCT upgrade users) / COUNT(DISTINCT DAU) × 100%",
    description: "Upgrade card usage rate: % of DAU who used an upgrade card.",
  },
  ECON_AVG_REWARD: {
    formula: "SUM(reward_amount diamonds) / COUNT(scratch_result_view + onb_scratchcard_grant events)",
    description: "Average diamond reward per scratch card. Extracted from event_params.reward_amount on scratch_result_view and onb_scratchcard_grant events.",
  },
  // Content & Feed
  FEED_IMPRESSIONS: {
    formula: "COUNT(screen_view OR All_PageBehavior) per feed area",
    description: "Total impressions (page views) for this feed area.",
  },
  FEED_CTR: {
    formula: "(Clicks / Impressions) × 100%",
    description: "Click-through rate: % of impressions that resulted in a click.",
  },
  FEED_COMPLETION: {
    formula: "(Video completes / Video starts) × 100%",
    description: "Video completion rate: % of started videos that were watched to the end.",
  },
  FEED_REPLAY: {
    formula: "(Replay events / Video completes) × 100%",
    description: "Replay rate: % of completed videos that were replayed.",
  },
  // Paid Users
  PAID_TOTAL_PAYERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('purchase','in_app_purchase')",
    description: "Total unique users who made at least one purchase in the period.",
  },
  PAID_D7_RETENTION: {
    formula: "(Payers active on D+7 / Total first-time payers in cohort) × 100%",
    description: "D7 retention of paid users: % of users who made their first purchase in the window and had any activity 7 days later.",
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
  PAID_REVENUE_TOTAL: {
    formula: "SUM(event_value_in_usd) WHERE event_name IN ('purchase','in_app_purchase')",
    description: "Total revenue from all purchases in the selected period.",
  },
  // Subscription / VIP
  SUB_TOTAL: {
    formula: "Exchange + Paid (real $) + Wallet (in-app cash)",
    description: "Total subscribers: exchange (cash/diamond), real-money subscription, and wallet_subscribe_success (in-app cash wallet).",
  },
  SUB_EXCHANGE: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('auto_convert_trigger', 'Click_CashWalletConfirmConvert')",
    description: "Users who converted to VIP by exchanging in-app cash or diamonds. Includes both auto-convert (triggered automatically) and manual convert (user initiated).",
  },
  SUB_PAID: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('app_store_subscription_convert', 'app_store_subscription_renew') OR (iap_success AND product_id='subscription')",
    description: "Users who paid real money to subscribe (App Store / Google Play or IAP subscription). Excludes wallet_subscribe_success (in-app cash wallet) and top-up.",
  },
  SUB_WALLET: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'wallet_subscribe_success'",
    description: "Users who subscribed using in-app cash wallet (not real money). Does not contribute to Paid Sub Revenue.",
  },
  SUB_PAID_REVENUE: {
    formula: "SUM(event_value_in_usd) WHERE event_name IN ('purchase','in_app_purchase','app_store_subscription_convert','app_store_subscription_renew') AND (event_name IN ('app_store_subscription_convert','app_store_subscription_renew') OR product_type/item_category LIKE '%sub%' OR product_id='subscription')",
    description: "Subscription plan revenue: purchase/in_app_purchase events classified as subscription by product_type, item_category, or product_id. Same source as Monetization Subscription stream. Excludes wallet (in-app cash) and top-up.",
  },
  SUB_IAP_SUCCESS: {
    formula: "(Subscription paid users / Subscription IAP start users) × 100%",
    description: "Subscription IAP success rate: % of users who started a subscription purchase flow (product_id='subscription') and completed payment. Top-up purchases excluded.",
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
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Success_GoogleRegister', 'Success_AppleRegister', 'Register_*_Success', 'Login_*_Success', 'signin_credit_earned', 'auth_submit_result', 'auth_oauth_result')",
    description: "Users from the first_open cohort who completed registration. Includes legacy auth events and new unified auth_submit_result (flow_type=signup, result=success) and auth_oauth_result (provider=apple/google, result=success).",
  },
  FW_REG_RATE: {
    formula: "(Registered users / First open users) × 100%",
    description: "Registration conversion: % of new users who registered.",
  },
  FW_FIRST_UNLOCK: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('video_unlock_success', 'dollarsup_first_unlock_success')",
    description: "Users from first_open cohort who performed their first content unlock. dollarsup_first_unlock_success fires on the newbie's very first $UP unlock.",
  },
  FW_UNLOCK_RATE: {
    formula: "(First unlock users / Registered users) × 100%",
    description: "First unlock conversion: % of registered users who unlocked content.",
  },
  FW_TOTAL_UNLOCKERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('video_unlock_success', 'dollarsup_first_unlock_success', 'video_click_unlock')",
    description: "All users who triggered at least one unlock event in the period.",
  },
  FW_LOOP_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) with >=2 events from (video_unlock_success, dollarsup_first_unlock_success, video_click_unlock)",
    description: "Users who unlocked 2+ times, indicating the unlock loop has formed.",
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
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name LIKE '%scratch%' (covers scratch_entry_click, scratch_complete, scratch_auto_start, scratch_share_click, etc.)",
    description: "Users who interacted with scratch cards. Includes scratch_entry_click, scratch_complete, scratch_auto_start, scratch_reward_grant_result, scratch_share_click.",
  },
  FW_REWARD_USERS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('scratch_result_view', 'scratch_reward_grant_result', 'onb_scratchcard_grant') AND reward_amount IS NOT NULL",
    description: "Users who received a diamond reward. scratch_reward_grant_result has diamonds_amount=500, onb_scratchcard_grant has reward_amount from newbie guide.",
  },
  FW_TOTAL_DIAMONDS: {
    formula: "SUM(SAFE_CAST(reward_amount AS INT64)) from scratch_result_view, scratch_reward_grant_result, onb_scratchcard_grant",
    description: "Total diamonds distributed. Sourced from event_params.reward_amount (or diamonds_amount) on scratch result events.",
  },
  FW_AVG_REWARD: {
    formula: "Total diamonds / Reward users",
    description: "Average diamond reward per user who scratched.",
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
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name IN ('Click_CashWalletConfirmConvert', 'auto_convert_trigger')",
    description: "Users who converted diamonds/cash to VIP or withdrew. Click_CashWalletConfirmConvert = manual convert, auto_convert_trigger = system auto-convert after newbie scratch reward.",
  },
  FW_CASHOUT_RATE: {
    formula: "(Cashout users / Scratch users) × 100%",
    description: "% of scratch users who attempted to cash out.",
  },
  FW_INVITE_CLICKS: {
    formula: "COUNT(DISTINCT user_pseudo_id) WHERE event_name = 'Click_InviteButton'",
    description: "Users who tapped the Invite button.",
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
    formula: "First screen_view / auth_screen_view after registration success",
    description: "注册成功后首次进入主流程页面（任意页面曝光）。",
  },
  REG_FUNNEL_CONVERSION: {
    formula: "(Users at step / App Open users) × 100%",
    description: "该步骤相对「打开 App」的转化率。",
  },
};
