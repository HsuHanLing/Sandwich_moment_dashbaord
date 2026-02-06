/**
 * Mock data for dashboard development without BigQuery.
 * Set USE_MOCK_DATA=true in .env.local to use this.
 */

function randomInRange(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export function getMockOverview() {
  return {
    total_spend: 0,
    total_impressions: 188400930,
    total_clicks: 18240977,
    total_engagement: 98825763,
    total_app_opens: 10559496,
    total_sessions: 9831899,
    total_conversions: 1840,
    total_revenue: 312000,
  };
}

export function getMockTrends(days: number = 30) {
  const data = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().split("T")[0],
      impressions: randomInRange(5000000, 7000000),
      clicks: randomInRange(500000, 700000),
      engagement: randomInRange(3000000, 4000000),
      app_opens: randomInRange(300000, 400000),
      sessions: randomInRange(300000, 400000),
      revenue: randomInRange(8000, 12000),
    });
  }
  return data;
}

export function getMockChannels() {
  return [
    { channel: "Google", impressions: 98000000, clicks: 8200000, sessions: 3500000, revenue: 142000 },
    { channel: "(direct)", impressions: 45000000, clicks: 5200000, sessions: 2800000, revenue: 98000 },
    { channel: "organic", impressions: 25000000, clicks: 2100000, sessions: 1200000, revenue: 52000 },
    { channel: "facebook", impressions: 12000000, clicks: 1800000, sessions: 650000, revenue: 24000 },
  ];
}

export function getMockCampaigns() {
  return [
    { campaign: "Brand Awareness Q1", impressions: 65000000, clicks: 5200000, sessions: 2100000, revenue: 84000 },
    { campaign: "Product Launch", impressions: 42000000, clicks: 3800000, sessions: 1500000, revenue: 76000 },
    { campaign: "Retargeting", impressions: 18000000, clicks: 2200000, sessions: 810000, revenue: 62000 },
    { campaign: "(not set)", impressions: 35000000, clicks: 1800000, sessions: 1200000, revenue: 0 },
  ];
}

// User Attributes (Age & Device)
export function getMockUserAttributes() {
  return {
    age: [
      { attr: "18-24岁", users: 680, share: 42.6 },
      { attr: "25-34岁", users: 614, share: 38.4 },
      { attr: "35+岁", users: 304, share: 19.0 },
    ],
    device: [
      { attr: "iOS", users: 920, share: 57.5 },
      { attr: "Android", users: 678, share: 42.5 },
    ],
  };
}

// Geographic Distribution
export function getMockGeoDistribution() {
  return [
    { region: "US", region_name: "美国", users: 420, share: 25.9 },
    { region: "GB", region_name: "英国", users: 286, share: 17.7 },
    { region: "CA", region_name: "加拿大", users: 186, share: 11.5 },
    { region: "SG", region_name: "新加坡", users: 142, share: 8.7 },
    { region: "AU", region_name: "澳大利亚", users: 96, share: 5.9 },
    { region: "DE", region_name: "德国", users: 84, share: 5.2 },
    { region: "FR", region_name: "法国", users: 72, share: 4.4 },
    { region: "other", region_name: "其他", users: 204, share: 12.6 },
  ];
}

// Creator & Supply
export function getMockCreatorSupply() {
  return {
    weekly: [
      { week: "W1", kol_earnings: 352, regular_earnings: 152 },
      { week: "W2", kol_earnings: 368, regular_earnings: 158 },
      { week: "W3", kol_earnings: 382, regular_earnings: 168 },
      { week: "W4", kol_earnings: 398, regular_earnings: 174 },
    ],
    metrics: {
      active_creators: 318,
      kol_creators: 42,
      regular_creators: 276,
      new_kol_7d: 8,
      kol_earnings_7d: 428,
      regular_earnings_7d: 184,
    },
  };
}

// Monetization
export function getMockMonetization() {
  return [
    { revenue_stream: "Unlock Pack", revenue: 1738, share: 87.7, roi: 1.42 },
    { revenue_stream: "Subscription", revenue: 244, share: 12.3, roi: 1.61 },
  ];
}

// Economy Health
export function getMockEconomyHealth() {
  return {
    chart: [
      { indicator: "解锁消耗", value: 2.4, label: "Avg unlocks/user/day" },
      { indicator: "刮刮卡", value: 92.1, label: "Scratch card open rate %" },
      { indicator: "升级卡", value: 18.6, label: "Upgrade card usage rate %" },
    ],
    metrics: [
      { indicator: "Avg unlocks / user / day", value: "2.4" },
      { indicator: "Scratch card open rate", value: "92.1%" },
      { indicator: "Upgrade card usage rate", value: "18.6%" },
      { indicator: "Avg reward per scratch", value: "$0.42" },
    ],
  };
}

// Content & Feed Performance
export function getMockContentFeed() {
  return {
    circle: [
      { area: "好友 SUP", impressions: 92000, ctr: 8.6, completion: 19.2, replay: 5.8 },
      { area: "好友 $UP", impressions: 48000, ctr: 11.4, completion: 26.8, replay: 8.2 },
      { area: "ForYou", impressions: 32000, ctr: 7.9, completion: 18.1, replay: 4.6 },
    ],
    featureCards: [
      { area: "Sequel 说明卡", impressions: 2800, ctr: 16.4, completion: null, replay: null },
      { area: "SUP 引导卡", impressions: 3200, ctr: 12.8, completion: null, replay: null },
      { area: "$UP 引导卡", impressions: 2600, ctr: 15.6, completion: null, replay: null },
      { area: "创意卡", impressions: 4200, ctr: 16.8, completion: null, replay: null },
      { area: "邀请好友卡", impressions: 1900, ctr: 10.2, completion: null, replay: null },
    ],
    exclusives: [
      { area: "KOL $UP", impressions: 42000, ctr: 16.8, completion: 38.4, replay: 13.6 },
      { area: "普通创作者 $UP", impressions: 19000, ctr: 10.2, completion: 28.9, replay: 8.1 },
    ],
  };
}
