"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/contexts/LocaleContext";
import { FlywheelSection } from "@/components/FlywheelSection";

/* ── Types ── */

type FlywheelData = {
  nodes: { id: string; name: string; nameCn: string; metrics: Record<string, number>; status: "healthy" | "warning" | "broken"; score: number; conversion: number | null; benchmark: string }[];
  overallScore: number;
  summary: Record<string, number>;
  days: number;
};

type ActionItem = {
  id: string;
  title: string;
  owner: string;
  status: "in_progress" | "done" | "blocked";
  notes: string;
};

type PlanItem = {
  id: string;
  title: string;
  notes: string;
};

type StandupRecord = {
  date: string;
  core_problems: string;
  strategy: string;
  action_items: ActionItem[];
  upcoming_plans: PlanItem[];
  is_template?: boolean;
};

/* ── Helpers ── */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function addDays(d: string, n: number) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const cardStyle = { border: "1px solid var(--border)", boxShadow: "var(--card-shadow)", borderRadius: 16 } as const;

/* Apple-style section icons (SF Symbols–like, stroke) */
function SectionIcon({ icon }: { icon: "problem" | "strategy" | "action" | "plan" }) {
  const className = "h-5 w-5 shrink-0 text-[var(--secondary-text)]";
  switch (icon) {
    case "problem":
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--pill-bg)" }}>
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </span>
      );
    case "strategy":
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--pill-bg)" }}>
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41M18.36 5.64l1.41-1.41" />
          </svg>
        </span>
      );
    case "action":
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--pill-bg)" }}>
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" />
          </svg>
        </span>
      );
    case "plan":
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--pill-bg)" }}>
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
      );
    default:
      return null;
  }
}

/* ── Components ── */

type Status = "in_progress" | "done" | "blocked";
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];
const STATUS_STYLE: Record<Status, { bg: string; color: string }> = {
  in_progress: { bg: "rgba(66,133,244,0.12)", color: "var(--chart-blue)" },
  done: { bg: "rgba(52,168,83,0.12)", color: "var(--positive)" },
  blocked: { bg: "rgba(234,67,53,0.12)", color: "var(--negative)" },
};

function StatusSelector({
  status,
  onChange,
}: {
  status: Status;
  onChange: (status: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right, width: r.width });
    }
  }, []);

  const handleOpen = useCallback(() => {
    if (!open) updatePos();
    setOpen((o) => !o);
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const menu = document.getElementById("status-dropdown");
      if (menu?.contains(target)) return;
      setOpen(false);
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("resize", updatePos);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open, updatePos]);

  const s = STATUS_STYLE[status];
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80"
        style={{ backgroundColor: s.bg, color: s.color }}
      >
        {label}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="status-dropdown"
            className="fixed rounded-lg border border-[var(--border)] bg-[var(--card-bg)] py-1 shadow-lg"
            style={{
              top: pos.top,
              left: pos.left - pos.width,
              minWidth: pos.width,
              boxShadow: "var(--card-shadow)",
              zIndex: 9999,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--background)]"
                style={{ color: STATUS_STYLE[opt.value].color }}
              >
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

/* Single-line list: type and Enter to add each line */
function LineListInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const lines = (value || "").split("\n").filter(Boolean);
  const [current, setCurrent] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = current.trim();
      if (v) {
        onChange(lines.length ? lines.join("\n") + "\n" + v : v);
        setCurrent("");
      }
    }
  };

  const removeLine = (i: number) => {
    const next = lines.filter((_, j) => j !== i);
    onChange(next.join("\n"));
  };

  const updateLine = (i: number, newVal: string) => {
    const next = [...lines];
    if (newVal.trim() === "") {
      next.splice(i, 1);
    } else {
      next[i] = newVal;
    }
    onChange(next.join("\n"));
  };

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <div key={i} className="group flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-[12px] font-medium text-[var(--secondary-text)] tabular-nums">{i + 1}.</span>
          <input
            type="text"
            className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-[13px] text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
            value={line}
            onChange={(e) => updateLine(i, e.target.value)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== line) updateLine(i, v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <button
            type="button"
            onClick={() => removeLine(i)}
            className="rounded-full p-1.5 text-[var(--secondary-text)] opacity-0 transition-opacity hover:bg-black/5 hover:text-[var(--negative)] group-hover:opacity-100"
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-right text-[12px] font-medium text-[var(--secondary-text)] tabular-nums">{lines.length + 1}.</span>
        <input
          type="text"
          className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder-[var(--secondary-text)] placeholder:opacity-50 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
          placeholder={placeholder}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const map = { saving: "Saving…", saved: "Saved", error: "Save failed" };
  const color = state === "error" ? "var(--negative)" : "var(--secondary-text)";
  return (
    <span className="text-[11px] font-medium" style={{ color }}>
      {state === "saving" && <span className="mr-1 inline-block h-2 w-2 animate-spin rounded-full border border-[var(--secondary-text)] border-t-transparent" />}
      {map[state]}
    </span>
  );
}

/* ── Main Page ── */

export default function StandupPage() {
  const { t } = useLocale();
  const [date, setDate] = useState(todayStr);
  const [record, setRecord] = useState<StandupRecord | null>(null);
  const [flywheelData, setFlywheelData] = useState<FlywheelData>({ nodes: [], overallScore: 0, summary: {}, days: 7 });
  const [actionInput, setActionInput] = useState("");
  const [planInput, setPlanInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRecordRef = useRef<StandupRecord | null>(null);
  const recordRef = useRef<StandupRecord | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  recordRef.current = record;

  useEffect(() => {
    fetch("/api/auth/status").then(r => r.json()).then(d => setAuthEnabled(d.enabled)).catch(() => {});
  }, []);

  // Load flywheel funnel data (past 7 days)
  useEffect(() => {
    fetch("/api/marketing/flywheel?days=7")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setFlywheelData({ nodes: d.nodes ?? [], overallScore: d.overallScore ?? 0, summary: d.summary ?? {}, days: 7 });
      })
      .catch(() => {});
  }, []);

  // Flush pending save (for date switch) - save immediately instead of debouncing
  const flushSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const toSave = pendingRecordRef.current ?? recordRef.current;
    if (!toSave?.date) return;
    pendingRecordRef.current = null;
    try {
      await fetch("/api/standup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
    } catch {
      /* ignore */
    }
  }, []);

  // Load standup record for selected date (API carries over previous day's data when no record exists)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setSaveState("idle");
      await flushSave();
      if (cancelled) return;
      try {
        const res = await fetch(`/api/standup?date=${date}`);
        if (cancelled) return;
        const d = res.ok ? await res.json() : null;
        if (d) setRecord(d);
      } catch {
        if (!cancelled) setRecord(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [date, flushSave]);

  // Keyboard shortcuts: left/right arrows for date navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowLeft") setDate((d) => addDays(d, -1));
      if (e.key === "ArrowRight") setDate((d) => addDays(d, 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-save
  const save = useCallback((updated: StandupRecord) => {
    pendingRecordRef.current = updated;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      pendingRecordRef.current = null;
      try {
        const res = await fetch("/api/standup", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        if (res.ok) {
          setSaveState("saved");
          setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
        } else {
          setSaveState("error");
        }
      } catch {
        setSaveState("error");
      }
    }, 800);
  }, []);

  const update = useCallback(
    (patch: Partial<StandupRecord>) => {
      setRecord((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch, is_template: undefined };
        save(next);
        return next;
      });
    },
    [save]
  );

  // Action items helpers
  const addActionItem = () => {
    const item: ActionItem = { id: uid(), title: "", owner: "", status: "in_progress", notes: "" };
    update({ action_items: [...(record?.action_items ?? []), item] });
  };

  const addActionItemWithTitle = (title: string) => {
    const item: ActionItem = { id: uid(), title, owner: "", status: "in_progress", notes: "" };
    update({ action_items: [...(record?.action_items ?? []), item] });
  };

  const updateActionItem = (id: string, patch: Partial<ActionItem>) => {
    update({
      action_items: (record?.action_items ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const removeActionItem = (id: string) => {
    update({ action_items: (record?.action_items ?? []).filter((a) => a.id !== id) });
  };

  // Plans helpers
  const addPlan = () => {
    const item: PlanItem = { id: uid(), title: "", notes: "" };
    update({ upcoming_plans: [...(record?.upcoming_plans ?? []), item] });
  };

  const addPlanWithTitle = (title: string) => {
    const item: PlanItem = { id: uid(), title, notes: "" };
    update({ upcoming_plans: [...(record?.upcoming_plans ?? []), item] });
  };

  const updatePlan = (id: string, patch: Partial<PlanItem>) => {
    update({
      upcoming_plans: (record?.upcoming_plans ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const removePlan = (id: string) => {
    update({ upcoming_plans: (record?.upcoming_plans ?? []).filter((p) => p.id !== id) });
  };

  const [copying, setCopying] = useState(false);
  const copyFromPrevDay = async () => {
    const prevDate = addDays(date, -1);
    setCopying(true);
    try {
      const res = await fetch(`/api/standup?date=${prevDate}`);
      const prev = res.ok ? await res.json() : null;
      if (!prev) return;
      const curr = record ?? { core_problems: "", strategy: "", action_items: [], upcoming_plans: [] };
      const currProblems = (curr.core_problems ?? "").trim();
      const prevProblems = (prev.core_problems ?? "").trim();
      const currStrategy = (curr.strategy ?? "").trim();
      const prevStrategy = (prev.strategy ?? "").trim();
      const mergedProblems = [currProblems, prevProblems].filter(Boolean).join("\n");
      const mergedStrategy = [currStrategy, prevStrategy].filter(Boolean).join("\n");
      const prevActionItems = (prev.action_items ?? []).map((a: ActionItem) => ({ ...a, id: uid() }));
      const prevPlans = (prev.upcoming_plans ?? []).map((p: PlanItem) => ({ ...p, id: uid() }));
      const merged: StandupRecord = {
        date,
        core_problems: mergedProblems,
        strategy: mergedStrategy,
        action_items: [...(curr.action_items ?? []), ...prevActionItems],
        upcoming_plans: [...(curr.upcoming_plans ?? []), ...prevPlans],
      };
      setRecord(merged);
      await fetch("/api/standup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    } finally {
      setCopying(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  /* ── Render ── */
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-xl"
        style={cardStyle}
      >
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[11px] text-[var(--secondary-text)] hover:text-[var(--accent)]">
              ← Dashboard
            </a>
            <span className="text-[var(--border)]">|</span>
            <a href="/ops-daily" className="text-[11px] text-[var(--secondary-text)] hover:text-[var(--accent)]">
              Ops Daily
            </a>
            <h1 className="text-base font-semibold tracking-tight">Daily Standup</h1>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            {authEnabled && (
              <button
                onClick={handleSignOut}
                className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--secondary-text)] hover:bg-[var(--pill-bg)]"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-8">
        {/* Date navigation */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="rounded-full p-2 text-[var(--secondary-text)] transition-colors hover:bg-black/5"
            title="Previous day"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h2 className="text-sm font-semibold tabular-nums">{fmtDate(date)}</h2>
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="rounded-full p-2 text-[var(--secondary-text)] transition-colors hover:bg-black/5"
            title="Next day"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {date !== todayStr() && (
            <button
              onClick={() => setDate(todayStr())}
              className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--secondary-text)] transition-colors hover:bg-black/5 hover:text-[var(--foreground)]"
            >
              Today
            </button>
          )}
          {record?.is_template && (
            <span className="rounded-full bg-[var(--pill-bg)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--secondary-text)]">
              Carried over — edit to save
            </span>
          )}
          <button
            onClick={copyFromPrevDay}
            disabled={copying || loading}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--secondary-text)] transition-colors hover:bg-black/5 hover:text-[var(--foreground)] disabled:opacity-50"
            title="Copy from yesterday"
          >
            {copying ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            Copy from yesterday
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Flywheel Funnel (past 7 days) */}
            <div className="mb-6">
              <FlywheelSection
                nodes={flywheelData.nodes}
                overallScore={flywheelData.overallScore}
                summary={flywheelData.summary}
                days={flywheelData.days}
                t={t as (key: string) => string}
              />
            </div>

            {/* 2. Core Problems */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <h3 className="mb-4 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                <SectionIcon icon="problem" />
                Core Problems to Solve
              </h3>
              <LineListInput
                value={record?.core_problems ?? ""}
                onChange={(v) => update({ core_problems: v })}
                placeholder="Add problem..."
              />
            </section>

            {/* 3. Strategy */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <h3 className="mb-4 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                <SectionIcon icon="strategy" />
                Overall Strategy
              </h3>
              <LineListInput
                value={record?.strategy ?? ""}
                onChange={(v) => update({ strategy: v })}
                placeholder="Add strategy..."
              />
            </section>

            {/* 4. Action Items */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <h3 className="mb-4 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                <SectionIcon icon="action" />
                Action Items
              </h3>
              <input
                type="text"
                className="mb-4 w-full rounded-xl px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder-[var(--secondary-text)] placeholder:opacity-50 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                placeholder="Add task..."
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const title = actionInput.trim();
                    if (title) {
                      addActionItemWithTitle(title);
                      setActionInput("");
                    }
                  }
                }}
              />
              {(record?.action_items ?? []).length > 0 && (
                <div className="space-y-2">
                  {(record?.action_items ?? []).map((item, idx) => (
                    <div
                      key={item.id}
                      className="group flex gap-3 rounded-xl p-3"
                      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-[var(--secondary-text)]" style={{ backgroundColor: "var(--pill-bg)" }}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--foreground)] outline-none placeholder-[var(--secondary-text)]"
                            placeholder="Task title"
                            value={item.title}
                            onChange={(e) => updateActionItem(item.id, { title: e.target.value })}
                          />
                          <StatusSelector
                            status={item.status}
                            onChange={(status) => updateActionItem(item.id, { status })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="w-28 bg-transparent text-[11px] text-[var(--secondary-text)] outline-none placeholder-[var(--secondary-text)]"
                            placeholder="Owner"
                            value={item.owner}
                            onChange={(e) => updateActionItem(item.id, { owner: e.target.value })}
                          />
                          <input
                            className="flex-1 bg-transparent text-[11px] text-[var(--secondary-text)] outline-none placeholder-[var(--secondary-text)]"
                            placeholder="Notes"
                            value={item.notes}
                            onChange={(e) => updateActionItem(item.id, { notes: e.target.value })}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeActionItem(item.id)}
                        className="self-start rounded-full p-1.5 text-[var(--secondary-text)] opacity-0 transition-opacity hover:bg-black/5 hover:text-[var(--negative)] group-hover:opacity-100"
                        title="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Upcoming Plans */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <h3 className="mb-4 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                <SectionIcon icon="plan" />
                Upcoming Plans
              </h3>
              <input
                type="text"
                className="mb-4 w-full rounded-xl px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder-[var(--secondary-text)] placeholder:opacity-50 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                placeholder="Add plan..."
                value={planInput}
                onChange={(e) => setPlanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const title = planInput.trim();
                    if (title) {
                      addPlanWithTitle(title);
                      setPlanInput("");
                    }
                  }
                }}
              />
              {(record?.upcoming_plans ?? []).length > 0 && (
                <div className="space-y-2">
                  {(record?.upcoming_plans ?? []).map((plan, idx) => (
                    <div
                      key={plan.id}
                      className="group flex gap-3 rounded-xl p-3"
                      style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-[var(--secondary-text)]" style={{ backgroundColor: "var(--pill-bg)" }}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <input
                          className="w-full bg-transparent text-[13px] font-medium text-[var(--foreground)] outline-none placeholder-[var(--secondary-text)]"
                          placeholder="Plan title"
                          value={plan.title}
                          onChange={(e) => updatePlan(plan.id, { title: e.target.value })}
                        />
                        <input
                          className="w-full bg-transparent text-[12px] text-[var(--secondary-text)] outline-none placeholder-[var(--secondary-text)]"
                          placeholder="Notes"
                          value={plan.notes}
                          onChange={(e) => updatePlan(plan.id, { notes: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={() => removePlan(plan.id)}
                        className="self-start rounded-full p-1.5 text-[var(--secondary-text)] opacity-0 transition-opacity hover:bg-black/5 hover:text-[var(--negative)] group-hover:opacity-100"
                        title="Remove"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card-bg)]/50 py-4 text-center text-[10px] text-[var(--secondary-text)]">
        Ahoy Daily Standup
      </footer>
    </div>
  );
}
