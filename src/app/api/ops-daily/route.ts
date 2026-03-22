import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const DEFAULT_TEMPLATE: { title: string; assignee: string }[] = [
  { title: "Content Quality Build-up", assignee: "Sherry" },
  { title: "Push", assignee: "Michael" },
  { title: "In App Push", assignee: "Anna" },
  { title: "Banner Campaign Update", assignee: "Anna" },
  { title: "Banner Poster Update", assignee: "Anna" },
  { title: "Facebook Content Creation & Posting", assignee: "Anna" },
  { title: "Instagram Content Creation & Posting", assignee: "Anna" },
  { title: "Withdrawal Approval", assignee: "Sherry" },
  { title: "App Store Review Replies", assignee: "Anna" },
  { title: "Email Replies", assignee: "Anna" },
  { title: "Log User Issues & Submit to Tech", assignee: "Anna" },
  { title: "Follow Up on User Issues", assignee: "Anna" },
  { title: "User Ops Tasks", assignee: "Sherry" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function templateChecklist() {
  return DEFAULT_TEMPLATE.map((t) => ({
    id: uid(),
    title: t.title,
    assignee: t.assignee,
    done: false,
    done_by: "",
    is_template: true,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const reset = searchParams.get("reset") === "1";

  if (reset) {
    return NextResponse.json({
      date,
      checklist: templateChecklist(),
      strategy: "",
      notes: "",
      issues: "",
      is_template: true,
    });
  }

  const db = getSupabase();
  const { data, error } = await db
    .from("ops_daily_records")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.error("Ops daily GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data) {
    return NextResponse.json(data);
  }

  const { data: prevRaw, error: prevErr } = await db
    .from("ops_daily_records")
    .select("*")
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(1);

  if (prevErr) {
    console.error("Ops daily carry-over error:", prevErr);
  }

  const prev = Array.isArray(prevRaw) ? prevRaw[0] ?? null : prevRaw;

  const carriedChecklist = prev?.checklist
    ? (prev.checklist as { id: string; title: string; assignee: string; done: boolean; is_template: boolean }[])
        .filter((item) => !item.done)
        .map((item) => ({ ...item, id: uid(), done: false, done_by: "" }))
    : templateChecklist();

  const template = {
    date,
    checklist: carriedChecklist,
    strategy: prev?.strategy ?? "",
    notes: prev?.notes ?? "",
    issues: prev?.issues ?? "",
    is_template: true,
  };

  return NextResponse.json(template);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { date, checklist, strategy, notes, issues } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const db = getSupabase();
  const { data, error } = await db
    .from("ops_daily_records")
    .upsert(
      {
        date,
        checklist: checklist ?? [],
        strategy: strategy ?? "",
        notes: notes ?? "",
        issues: issues ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "date" }
    )
    .select()
    .single();

  if (error) {
    console.error("Ops daily PUT error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
