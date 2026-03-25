# Dashboard 更新摘要

## 1. 页面结构
- **Tab 拆分**: Analytics 拆分为 Overview / Growth / Monetization / Flywheel / AI Analytics
- **Growth**: 增长漏斗、Share 数据、Referral & Reward、用户获取渠道
- **Monetization**: 收入概览、Economy Health、Subscription/VIP 分析
- **Flywheel**: 飞轮各节点转化与健康度
- **AI Analytics**: 每日数据与飞轮/商业化洞察

## 2. 增长漏斗 (Growth Funnel)
- 步骤: first_open → registration → first_unlock → scratch_activated → first_sup → first_up → first_pay
- 注册: `auth_submit_result` + `auth_oauth_result`
- 首次解锁: `dollarsup_first_unlock_success`, `video_unlock_success`
- 刮卡激活: `onb_scratchcard_grant`, `scratch_reward_grant_result`, `scratch_guide_complete`
- first_sup / first_up 已恢复；漏斗说明与 tooltip 已同步

## 3. Economy Health
- **柱状图**: 改为真实数值轴，不再按最大值归一化到 100%，与下方表格一致
- 支持 All / Paid 分段

## 4. Subscription/VIP 分析
- **订阅与充值分离**: 仅统计订阅（product_id='subscription'），不含 top-up（product_id LIKE 'top-up%'）
- 付费订阅: `app_store_subscription_convert`, `app_store_subscription_renew`, `wallet_subscribe_success`, `iap_success`(subscription)
- 漏斗与收入仅含订阅；IAP Success Rate 为「订阅 IAP 成功率」

## 5. 用户获取 (User Acquisition)
- **渠道分类**: Google Ads、Dynamic Link (Share/Invite)、Direct/Unattributed、Google Play (Organic) 等
- **左右一致**: 右侧「按 Campaign 安装归因」与左侧同源数据（仅 first_open），展示 campaign 级明细

## 6. Flywheel
- 节点: Discovery → Registration → First Unlock → Unlock Loop → Scratch & Reward → Share → Cashout → Referral
- **比例展示**: 所有转化与率均以「X% (分子/分母)」形式展示（漏斗、标题、展开明细）
- 每节点含 conversion_num / conversion_denom；展开区内 rate 类指标也带 (a/b)

## 7. Share 数据 (Growth)
- 独立板块: 刮卡分享 success/cancel/fail、邀请漏斗（All Share → 各方式 → Landing → Click → App Open）
- 数据来源与 tooltip 已标注

## 8. Referral & Reward (Growth)
- 邀请→发送→落地页→点击→打开 App→推荐注册 全漏斗
- 转化率 KPI 与各步骤 tooltip（REF_* 公式）

## 9. 埋点与公式
- 与事件规范对齐: auth_*, onb_*, scratch_*, video_*, iap_*, share_*, topup_* 等
- `metric-formulas.ts` 与 `queries.ts` 中事件名、公式、描述已统一更新

## 11. 付费用户复购与地理（Paid Users）
- **复购 SQL**：`event_name = 'in_app_purchase'`，`product_id` 排除 `exclusivemonthly`、`exclusiveaccess`、`subscription`；**事件扫描为最近 60 天**（`lifetimeTableFilter(60)`），首单/次单均为窗口内 `event_timestamp` 排序
- **频次柱状图**：窗口内累计 2 / 3 / 4 / 5+ 次购买分组
- **按平台**：`platform_breakdown` 使用 `COUNT(DISTINCT user_pseudo_id)` 计人数与复购人数
- **7d/30d 率**：`repurchase_rate_7d` / `repurchase_rate_30d`（可观测队列内分子 ÷ 分母）
- **每日趋势**：首单日/次单日各计一次（`COUNTIF(d.dt = first_dt)` / `second_dt`）
- **付费地理**：`purchase`、`in_app_purchase`、`iap_success`，与总付费用户 KPI 一致

## 10. UI / i18n
- 主题: Logo 绿色为强调色，图标统一
- 无 emoji；全量 i18n（中英）
- 各指标 hover 展示公式与数据来源（InfoTooltip）
