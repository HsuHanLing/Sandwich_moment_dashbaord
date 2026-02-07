"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocale } from "@/contexts/LocaleContext";

type Message = { role: "user" | "assistant"; content: string };

export type DashboardContext = {
  kpi: {
    data_range_start?: string;
    data_range_end?: string;
    data_updated_at?: string | null;
    dau: number;
    d1_retention: number;
    pay_rate: number;
    arppu: number;
    revenue: number;
    withdrawal: number;
    roi: number;
    wow_dau: number;
    wow_d1: number;
    wow_pay_rate: number;
    wow_arppu: number;
    wow_revenue: number;
    wow_withdrawal: number;
    wow_roi: number;
  } | null;
  dailyTrend: {
    date: string;
    new_users: number;
    dau: number;
    d1: string;
    unlock_users: number;
    unlock_ge2: number;
    payers: number;
    revenue: number;
    withdrawal: number;
  }[];
  filters: {
    channel: string;
    version: string;
    userSegment: string;
    platform: string;
    kpiMode: string;
    trendDays: number;
  };
  growthFunnel: { step: string; stepLabel: string; users: number; conversion: number }[];
  retention: { chart: { day: string; rate: number; wow: number }[] };
  userAttributes: { age: { attr: string; users: number; share: number }[]; device: { attr: string; users: number; share: number }[] } | null;
  geoDistribution: { region: string; region_name: string; users: number; share: number }[];
  creatorSupply: { weekly: { week: string; kol_earnings: number; regular_earnings: number }[]; metrics: Record<string, number> } | null;
  monetization: { revenue_stream: string; revenue: number; share: number; roi: number }[];
  economyHealth: { chart: { indicator: string; value: number; label: string }[]; metrics: { indicator: string; value: string }[] } | null;
  contentFeed: { circle: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[]; featureCards: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[]; exclusives: { area: string; impressions: number; ctr: number; completion: number | null; replay: number | null }[] } | null;
};

/* ── Teal accent palette ── */
const TEAL = "#0d9488";
const TEAL_LIGHT = "rgba(13, 148, 136, 0.08)";
/* TEAL_GLOW available if needed: rgba(13, 148, 136, 0.25) */

const SUGGESTED_EN = [
  "What does today's data tell us?",
  "How is D1 Retention trending?",
  "Analyze the revenue trend",
  "Why might DAU have changed?",
];
const SUGGESTED_ZH = [
  "今天的数据表现如何？",
  "D1 留存趋势怎么样？",
  "分析一下收入趋势",
  "DAU 变化的原因是什么？",
];

const HINT_KEY = "ahoy_ai_hint_seen";

export function AIChatWidget({ dashboardData }: { dashboardData: DashboardContext }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Hint bubble logic ── */
  useEffect(() => {
    // Don't show if user already interacted or chat is open
    if (open) { setShowHint(false); return; }
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch { /* SSR / private mode */ }

    // Show after 3s delay
    const showT = setTimeout(() => setShowHint(true), 3000);
    // Auto-hide after 8s of visibility
    const hideT = setTimeout(() => setShowHint(false), 11000);
    hintTimer.current = hideT;
    return () => { clearTimeout(showT); clearTimeout(hideT); };
  }, [open]);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try { localStorage.setItem(HINT_KEY, "1"); } catch { /* noop */ }
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen((v) => !v);
    dismissHint();
  }, [dismissHint]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, dashboardData }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setMessages([...newMessages, { role: "assistant", content: data.message }]);
      } catch {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content:
              locale === "zh"
                ? "抱歉，暂时无法响应，请稍后再试。"
                : "Sorry, temporarily unavailable. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, locale, dashboardData]
  );

  const suggested = locale === "zh" ? SUGGESTED_ZH : SUGGESTED_EN;

  return (
    <>
      {/* ── Hint bubble ── */}
      {showHint && !open && (
        <div
          onClick={handleOpen}
          className="fixed z-50 cursor-pointer"
          style={{
            bottom: 110,
            right: 20,
            animation: "ahoyHintIn 0.3s ease-out",
          }}
        >
          <div
            style={{
              background: "#111",
              color: "#fff",
              fontSize: 12,
              lineHeight: 1.45,
              padding: "10px 14px",
              borderRadius: 14,
              maxWidth: 220,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              position: "relative",
            }}
          >
            {locale === "zh"
              ? "有数据问题？问我就好 👋"
              : "Got data questions? Ask me 👋"}
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); dismissHint(); }}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: 9,
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
              </svg>
            </button>
            {/* Arrow pointing down-right toward the button */}
            <div style={{
              position: "absolute",
              bottom: -6,
              right: 18,
              width: 12,
              height: 12,
              background: "#111",
              transform: "rotate(45deg)",
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}

      {/* ── Floating trigger button ── */}
      <button
        onClick={handleOpen}
        aria-label="Ahoy AI"
        className="fixed right-5 z-50 flex items-center justify-center transition-all duration-300 ease-out"
        style={
          open
            ? {
                bottom: 48,
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "#f5f5f5",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }
            : {
                bottom: 48,
                width: 52,
                height: 52,
                borderRadius: 26,
                background: "#fff",
                boxShadow: "0 2px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
                padding: 0,
                overflow: "hidden",
              }
        }
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <img src="/logo2.png" alt="Ahoy AI" style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover" }} />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden"
          style={{
            bottom: 108,
            right: 20,
            width: 380,
            height: "min(560px, calc(100vh - 140px))",
            borderRadius: 20,
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex shrink-0 items-center justify-between px-5"
            style={{
              height: 56,
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-3">
              <img src="/logo2.png" alt="" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover" }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", letterSpacing: -0.2 }}>Ahoy AI</p>
                <p style={{ fontSize: 10, color: "#999", letterSpacing: 0.1 }}>
                  {locale === "zh" ? "实时数据分析" : "Live data insights"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  style={{
                    fontSize: 11,
                    color: "#999",
                    padding: "4px 8px",
                    borderRadius: 6,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f5f5f5";
                    e.currentTarget.style.color = "#333";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#999";
                  }}
                >
                  {locale === "zh" ? "清除" : "Clear"}
                </button>
              )}
              {/* Live data indicator */}
              <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ background: TEAL_LIGHT }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: TEAL, display: "inline-block" }} />
                <span style={{ fontSize: 9, color: TEAL, fontWeight: 500 }}>LIVE</span>
              </div>
            </div>
          </div>

          {/* ── Messages area ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            style={{ padding: "16px 16px 12px" }}
          >
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col">
                {/* Welcome */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 16,
                    background: "#fafafa",
                    marginBottom: 16,
                  }}
                >
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: "#555" }}>
                    {locale === "zh" ? (
                      <>我能看到 Dashboard 上的实时数据。问我关于指标定义、趋势解读、数据异常的任何问题。</>
                    ) : (
                      <>I can see your live dashboard data. Ask me about metrics, trends, or anomalies.</>
                    )}
                  </p>
                </div>

                {/* Suggestions */}
                <p style={{ fontSize: 10, color: "#aaa", marginBottom: 8, paddingLeft: 2, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>
                  {locale === "zh" ? "快捷提问" : "Suggestions"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {suggested.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.06)",
                        background: "#fff",
                        textAlign: "left",
                        fontSize: 11,
                        lineHeight: 1.4,
                        color: "#444",
                        transition: "all 0.15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fafafa";
                        e.currentTarget.style.borderColor = TEAL;
                        e.currentTarget.style.color = "#1a1a1a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                        e.currentTarget.style.color = "#444";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ marginBottom: 10 }}
              >
                {msg.role === "assistant" && (
                  <img src="/logo2.png" alt="" style={{ width: 24, height: 24, borderRadius: 8, marginRight: 8, marginTop: 2, flexShrink: 0, objectFit: "cover" }} />
                )}
                <div
                  style={
                    msg.role === "user"
                      ? {
                          maxWidth: "78%",
                          padding: "10px 14px",
                          borderRadius: "18px 18px 4px 18px",
                          background: "#111",
                          color: "#fff",
                          fontSize: 12.5,
                          lineHeight: 1.55,
                        }
                      : {
                          maxWidth: "82%",
                          padding: "10px 14px",
                          borderRadius: "4px 18px 18px 18px",
                          background: "#f5f5f5",
                          color: "#1a1a1a",
                          fontSize: 12.5,
                          lineHeight: 1.55,
                        }
                  }
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="ai-md"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex justify-start" style={{ marginBottom: 10 }}>
                <img src="/logo2.png" alt="" style={{ width: 24, height: 24, borderRadius: 8, marginRight: 8, marginTop: 2, flexShrink: 0, objectFit: "cover" }} />
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "4px 18px 18px 18px",
                    background: "#f5f5f5",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  <span className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", background: TEAL, opacity: 0.7, animationDelay: "0ms" }} />
                  <span className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", background: TEAL, opacity: 0.5, animationDelay: "150ms" }} />
                  <span className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", background: TEAL, opacity: 0.3, animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* ── Input area ── */}
          <div
            style={{
              padding: "12px 16px 14px",
              borderTop: "1px solid rgba(0,0,0,0.05)",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-end gap-2"
            >
              <div
                className="flex flex-1 items-end"
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#fafafa",
                  padding: "8px 12px",
                  transition: "border-color 0.15s",
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-resize
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  onFocus={(e) => {
                    const wrap = e.target.parentElement;
                    if (wrap) wrap.style.borderColor = TEAL;
                  }}
                  onBlur={(e) => {
                    const wrap = e.target.parentElement;
                    if (wrap) wrap.style.borderColor = "rgba(0,0,0,0.08)";
                  }}
                  placeholder={locale === "zh" ? "问任何数据问题…" : "Ask anything about your data…"}
                  disabled={loading}
                  rows={1}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    resize: "none",
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: "#1a1a1a",
                    maxHeight: 80,
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: input.trim() ? "#111" : "#e5e5e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: input.trim() ? "pointer" : "default",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#fff" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </form>
            <p style={{ fontSize: 9, color: "#bbb", textAlign: "center", marginTop: 6, letterSpacing: 0.2 }}>
              Ahoy AI · Powered by Gemini
            </p>
          </div>
        </div>
      )}

      {/* ── Scoped styles for AI markdown + hint animation ── */}
      <style>{`
        @keyframes ahoyHintIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ai-md p { margin: 0 0 6px; }
        .ai-md p:last-child { margin: 0; }
        .ai-md strong { font-weight: 600; color: #111; }
        .ai-md code {
          font-size: 11px;
          background: rgba(0,0,0,0.04);
          padding: 1px 5px;
          border-radius: 4px;
          font-family: "SF Mono", Menlo, Monaco, monospace;
        }
        .ai-md ul, .ai-md ol {
          margin: 4px 0 8px;
          padding-left: 16px;
        }
        .ai-md li { margin-bottom: 2px; }
        .ai-md li::marker { color: ${TEAL}; }
      `}</style>
    </>
  );
}

/** Lightweight markdown → HTML */
function formatMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^\s*[-•]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
