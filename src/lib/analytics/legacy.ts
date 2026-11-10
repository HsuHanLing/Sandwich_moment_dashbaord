import type { Report } from "./model";

export function legacyResponse(kind: string, d: Report, previous: Report["summary"] | null) {
  const s = d.summary; const p = previous;
  const daily = d.daily.map(r => ({ ...r, dau: r.active_users, total_messages: r.messages, sessions: r.chat_views, avg_msgs_per_session: r.avg_messages, avg_session_duration_sec: r.avg_app_duration, revenue: r.revenue, d1_retention_rate: null }));
  switch (kind) {
    case "kpi": return { ...s, meta: d.meta, data_range_start: d.meta.start, data_range_end: d.meta.end, avg_msgs_per_session: s.avg_messages, avg_session_duration: s.avg_app_duration,
      sessions_per_user: null, d1_retention: s.d1_retention, wow_dau: p?.dau ?? null, wow_avg_msgs: p?.avg_messages ?? null, wow_avg_duration: p?.avg_app_duration ?? null,
      wow_revenue: p?.revenue ?? null, wow_arpu: p?.arpu ?? null, wow_activation_rate: p?.activation_rate ?? null };
    case "daily-trend": return daily;
    case "activation-funnel": return d.coverage.map(r => ({ step: r.event, label: r.en, users: r.users, conversion: r.conversion }));
    case "session-quality": return { meta: d.meta, summary: { total_sessions: d.sessions.total, valid_sessions: d.sessions.valid, valid_session_rate: d.sessions.valid_rate,
      avg_messages: s.avg_messages, avg_duration_sec: s.avg_app_duration, deep_conversation_rate: d.sessions.deep_rate, shallow_rate: d.sessions.shallow_rate, medium_rate: d.sessions.medium_rate, median_messages: d.sessions.median_messages }, message_distribution: d.sessions.distribution, duration_distribution: [] };
    case "behaviour": return { meta: d.meta, daily, personas: d.personas };
    case "health-dashboard": return { meta: d.meta, revenue: s.revenue, dau_avg: s.dau, indicators: [
      ["activation_rate", s.activation_rate], ["dispose_rate", s.dispose_rate], ["pay_rate", s.pay_rate], ["membership_rate", s.membership_rate],
      ["chat_engagement", s.chat_engagement], ["persona_to_chat", s.persona_to_chat], ["image_unlock", s.image_unlock_rate], ["gift_rate", s.gift_rate],
      ...(d.payments.subscriptions || []).map(r => [`${r.period}_membership_rate`, r.conversion]),
    ].map(([id, value]) => ({ id, label: id, value, unit: "%", status: "neutral" })) };
    case "monetisation": return { meta: d.meta, overview: { ...s, recharge_revenue: d.payments.amounts.find(r => r.kind === "recharge")?.revenue, bundle_revenue: d.payments.amounts.find(r => r.kind === "bundle")?.revenue, membership_revenue: d.payments.amounts.find(r => r.kind === "subscription")?.revenue },
      recharge_funnel: d.payments.recharge_funnel, membership_funnel: d.payments.membership_funnel, gift_funnel: d.payments.gift_funnel, membership_products: d.payments.products, membership_periods: d.payments.subscriptions, revenue_daily: daily };
    case "economy": return { ...d.economy, meta: d.meta };
    case "retention": return { meta: d.meta, retention: d.retention?.cohorts || [], returning_sessions: d.retention?.returning || [] };
    case "top-events": return d.top_events;
    case "geo": return d.geo;
    case "user-attributes": return { device: d.attributes.filter(a => a.type === "device"), language: d.attributes.filter(a => a.type === "language"), meta: d.meta };
    default: return d;
  }
}
