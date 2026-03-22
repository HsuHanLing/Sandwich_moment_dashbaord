"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/* ── Types ── */

type ChecklistItem = {
  id: string;
  title: string;
  assignee: string;
  done: boolean;
  done_by: string;
  is_template: boolean;
};

type OpsRecord = {
  date: string;
  checklist: ChecklistItem[];
  strategy: string;
  notes: string;
  issues: string;
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

/* ── Section Icons ── */

function SectionIcon({ icon }: { icon: "checklist" | "strategy" | "notes" | "issues" }) {
  const className = "h-5 w-5 shrink-0 text-[var(--secondary-text)]";
  switch (icon) {
    case "checklist":
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--pill-bg)" }}>
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" />
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
    case "notes":
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--pill-bg)" }}>
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </span>
      );
    case "issues":
      return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--pill-bg)" }}>
          <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </span>
      );
    default:
      return null;
  }
}

/* ── Components ── */

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

const ITEM_SEP = "\n\n";
function LineListInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const raw = (value || "").trim();
  const lines = raw.includes(ITEM_SEP)
    ? raw.split(ITEM_SEP).filter(Boolean)
    : raw ? raw.split("\n").filter(Boolean) : [];
  const [current, setCurrent] = useState("");

  const removeLine = (i: number) => onChange(lines.filter((_, j) => j !== i).join(ITEM_SEP));
  const updateLine = (i: number, val: string) => {
    const next = [...lines];
    if (val.trim() === "") next.splice(i, 1);
    else next[i] = val;
    onChange(next.join(ITEM_SEP));
  };

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="group flex items-start gap-2">
          <span className="mt-3 w-5 shrink-0 text-right text-[12px] font-medium text-[var(--secondary-text)] tabular-nums">{i + 1}.</span>
          <textarea
            rows={2}
            className="min-w-0 flex-1 resize-y rounded-lg px-3 py-2.5 text-[13px] leading-snug text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", minHeight: 52 }}
            value={line}
            onChange={(e) => updateLine(i, e.target.value)}
            onBlur={(e) => { const v = e.target.value.trim(); if (v !== line) updateLine(i, v); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
          />
          <button
            type="button"
            onClick={() => removeLine(i)}
            className="mt-2 rounded-full p-1.5 text-[var(--secondary-text)] opacity-0 transition-opacity hover:bg-black/5 hover:text-[var(--negative)] group-hover:opacity-100"
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
      ))}
      <div className="flex items-start gap-2">
        <span className="mt-3 w-5 shrink-0 text-right text-[12px] font-medium text-[var(--secondary-text)] tabular-nums">{lines.length + 1}.</span>
        <textarea
          rows={2}
          className="min-w-0 flex-1 resize-y rounded-lg px-3 py-2.5 text-[13px] leading-snug text-[var(--foreground)] placeholder-[var(--secondary-text)] placeholder:opacity-50 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", minHeight: 52 }}
          placeholder={placeholder}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const v = current.trim();
              if (v) {
                onChange(lines.length ? lines.join(ITEM_SEP) + ITEM_SEP + v : v);
                setCurrent("");
              }
            }
          }}
        />
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function OpsDailyPage() {
  const [date, setDate] = useState(todayStr);
  const [record, setRecord] = useState<OpsRecord | null>(null);
  const [taskInput, setTaskInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<OpsRecord | null>(null);
  const recordRef = useRef<OpsRecord | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  recordRef.current = record;

  useEffect(() => {
    fetch("/api/auth/status").then((r) => r.json()).then((d) => setAuthEnabled(d.enabled)).catch(() => {});
  }, []);

  const flushSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const toSave = pendingRef.current ?? recordRef.current;
    if (!toSave?.date) return;
    pendingRef.current = null;
    try {
      await fetch("/api/ops-daily", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setSaveState("idle");
      await flushSave();
      if (cancelled) return;
      try {
        const res = await fetch(`/api/ops-daily?date=${date}`);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowLeft") setDate((d) => addDays(d, -1));
      if (e.key === "ArrowRight") setDate((d) => addDays(d, 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const save = useCallback((updated: OpsRecord) => {
    pendingRef.current = updated;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      pendingRef.current = null;
      try {
        const res = await fetch("/api/ops-daily", {
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
    (patch: Partial<OpsRecord>) => {
      setRecord((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch, is_template: undefined };
        save(next);
        return next;
      });
    },
    [save]
  );

  /* Checklist helpers */
  const toggleItem = (id: string) => {
    update({
      checklist: (record?.checklist ?? []).map((c) =>
        c.id === id ? { ...c, done: !c.done, done_by: c.done ? "" : c.assignee || "someone" } : c
      ),
    });
  };

  const updateItem = (id: string, patch: Partial<ChecklistItem>) => {
    update({
      checklist: (record?.checklist ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeItem = (id: string) => {
    update({ checklist: (record?.checklist ?? []).filter((c) => c.id !== id) });
  };

  const addCustomTask = (title: string) => {
    const item: ChecklistItem = { id: uid(), title, assignee: "", done: false, done_by: "", is_template: false };
    update({ checklist: [...(record?.checklist ?? []), item] });
  };

  const [resetting, setResetting] = useState(false);
  const resetToTemplate = async () => {
    if (!confirm("Reset checklist to default template? Custom tasks will be removed.")) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/ops-daily?date=${date}&reset=1`);
      const d = res.ok ? await res.json() : null;
      if (d) {
        setRecord(d);
        await fetch("/api/ops-daily", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, is_template: undefined }) });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      }
    } catch {
      setSaveState("error");
    } finally {
      setResetting(false);
    }
  };

  const [copying, setCopying] = useState(false);
  const copyFromPrevDay = async () => {
    const prevDate = addDays(date, -1);
    setCopying(true);
    try {
      const res = await fetch(`/api/ops-daily?date=${prevDate}`);
      const prev = res.ok ? await res.json() : null;
      if (!prev) return;
      const curr = record ?? { checklist: [], strategy: "", notes: "", issues: "" };
      const prevChecklist = (prev.checklist ?? []).map((c: ChecklistItem) => ({ ...c, id: uid() }));
      const merged: OpsRecord = {
        date,
        checklist: [...(curr.checklist ?? []), ...prevChecklist],
        strategy: [curr.strategy, prev.strategy].filter(Boolean).join("\n"),
        notes: [curr.notes, prev.notes].filter(Boolean).join("\n\n---\n\n"),
        issues: [curr.issues, prev.issues].filter(Boolean).join("\n"),
      };
      setRecord(merged);
      await fetch("/api/ops-daily", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(merged) });
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

  const checklist = record?.checklist ?? [];
  const assignees = [...new Set(checklist.map((c) => c.assignee).filter(Boolean))].sort();
  const filteredChecklist = assigneeFilter
    ? checklist.filter((c) => c.assignee === assigneeFilter)
    : checklist;
  const doneCount = filteredChecklist.filter((c) => c.done).length;
  const totalCount = filteredChecklist.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  /* ── Render ── */
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-xl" style={cardStyle}>
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[11px] text-[var(--secondary-text)] hover:text-[var(--accent)]">← Dashboard</a>
            <span className="text-[var(--border)]">|</span>
            <a href="/standup" className="text-[11px] text-[var(--secondary-text)] hover:text-[var(--accent)]">Standup</a>
            <h1 className="text-base font-semibold tracking-tight">User Ops Daily</h1>
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            {authEnabled && (
              <button onClick={handleSignOut} className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--secondary-text)] hover:bg-[var(--pill-bg)]">
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-8">
        {/* Date navigation */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button onClick={() => setDate(addDays(date, -1))} className="rounded-full p-2 text-[var(--secondary-text)] transition-colors hover:bg-black/5" title="Previous day">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h2 className="text-sm font-semibold tabular-nums">{fmtDate(date)}</h2>
          <button onClick={() => setDate(addDays(date, 1))} className="rounded-full p-2 text-[var(--secondary-text)] transition-colors hover:bg-black/5" title="Next day">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {date !== todayStr() && (
            <button onClick={() => setDate(todayStr())} className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--secondary-text)] transition-colors hover:bg-black/5 hover:text-[var(--foreground)]">
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
          <button
            onClick={resetToTemplate}
            disabled={resetting || loading}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--secondary-text)] transition-colors hover:bg-black/5 hover:text-[var(--foreground)] disabled:opacity-50"
            title="Reset checklist to default template"
          >
            {resetting ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 1 3.5-7.1L3 9" />
                <path d="M3 3v6h6" />
              </svg>
            )}
            Reset to template
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Daily Checklist */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                  <SectionIcon icon="checklist" />
                  Daily Checklist
                </h3>
                {totalCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[var(--secondary-text)]">{doneCount}/{totalCount}</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%`, backgroundColor: progressPct === 100 ? "var(--positive)" : "var(--accent)" }}
                      />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: progressPct === 100 ? "var(--positive)" : "var(--secondary-text)" }}>
                      {progressPct}%
                    </span>
                  </div>
                )}
              </div>

              {/* Assignee filter */}
              {assignees.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-[var(--secondary-text)]">Filter by:</span>
                  <button
                    onClick={() => setAssigneeFilter("")}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${assigneeFilter === "" ? "bg-[var(--accent)] text-white" : "bg-[var(--pill-bg)] text-[var(--secondary-text)] hover:bg-black/5"}`}
                  >
                    All
                  </button>
                  {assignees.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAssigneeFilter(a)}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${assigneeFilter === a ? "bg-[var(--accent)] text-white" : "bg-[var(--pill-bg)] text-[var(--secondary-text)] hover:bg-black/5"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}

              {/* Add task input */}
              <input
                type="text"
                className="mb-4 w-full rounded-xl px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder-[var(--secondary-text)] placeholder:opacity-50 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                placeholder="Add task… (Enter to add)"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const title = taskInput.trim();
                    if (title) { addCustomTask(title); setTaskInput(""); }
                  }
                }}
              />

              {/* Checklist items — 4-column grid */}
              {filteredChecklist.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredChecklist.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex min-h-[90px] flex-col gap-2 rounded-xl p-3.5 transition-colors"
                      style={{ backgroundColor: item.done ? "rgba(52,168,83,0.05)" : "rgba(0,0,0,0.02)" }}
                    >
                      {/* Checkbox + title */}
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
                          style={{
                            borderColor: item.done ? "var(--positive)" : "var(--border)",
                            backgroundColor: item.done ? "var(--positive)" : "transparent",
                          }}
                        >
                          {item.done && (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M3.5 8.5l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <textarea
                          rows={2}
                          className={`min-w-0 flex-1 resize-none bg-transparent text-[12px] font-medium leading-snug outline-none placeholder-[var(--secondary-text)] ${item.done ? "text-[var(--secondary-text)] line-through" : "text-[var(--foreground)]"}`}
                          placeholder="Task title"
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                        />
                      </div>

                      {/* Spacer to push bottom row down */}
                      <div className="flex-1" />

                      {/* Bottom row: assignee, badge, done_by, remove */}
                      <div className="flex items-center gap-1.5 pl-7">
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[var(--secondary-text)]">
                          <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <input
                          className="min-w-0 flex-1 bg-transparent text-[10px] text-[var(--secondary-text)] outline-none placeholder-[var(--secondary-text)]"
                          placeholder="Assignee"
                          value={item.assignee}
                          onChange={(e) => updateItem(item.id, { assignee: e.target.value })}
                        />
                        {item.done && item.done_by && (
                          <span className="whitespace-nowrap text-[9px] text-[var(--positive)]">✓ {item.done_by}</span>
                        )}
                        {item.is_template && (
                          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium" style={{ backgroundColor: "var(--pill-bg)", color: "var(--secondary-text)" }}>
                            template
                          </span>
                        )}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="shrink-0 rounded-full p-1 text-[var(--secondary-text)] opacity-0 transition-opacity hover:bg-black/5 hover:text-[var(--negative)] group-hover:opacity-100"
                          title="Remove"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Strategy & Thinking */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <h3 className="mb-4 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                <SectionIcon icon="strategy" />
                Strategy & Thinking
              </h3>
              <LineListInput
                value={record?.strategy ?? ""}
                onChange={(v) => update({ strategy: v })}
                placeholder="Add strategy point…"
              />
            </section>

            {/* 3. Notes */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <h3 className="mb-4 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                <SectionIcon icon="notes" />
                Notes
              </h3>
              <textarea
                className="w-full resize-y rounded-xl px-3 py-2.5 text-[13px] text-[var(--foreground)] placeholder-[var(--secondary-text)] placeholder:opacity-50 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", minHeight: 120 }}
                placeholder="Shared notes — anything the team should know…"
                value={record?.notes ?? ""}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </section>

            {/* 4. Issues & Blockers */}
            <section className="overflow-hidden rounded-2xl bg-[var(--card-bg)] p-5 sm:p-6" style={cardStyle}>
              <h3 className="mb-4 flex items-center gap-3 text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
                <SectionIcon icon="issues" />
                Issues & Blockers
              </h3>
              <LineListInput
                value={record?.issues ?? ""}
                onChange={(v) => update({ issues: v })}
                placeholder="Add issue or blocker…"
              />
            </section>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--card-bg)]/50 py-4 text-center text-[10px] text-[var(--secondary-text)]">
        User Ops Daily
      </footer>
    </div>
  );
}
