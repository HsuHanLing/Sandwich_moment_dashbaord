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
