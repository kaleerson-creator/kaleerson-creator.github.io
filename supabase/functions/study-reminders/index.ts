// Daily Study reminders: emails members who turned on reminders about tests, quizzes and due
// dates happening tomorrow in the classes they follow. Run once a day by pg_cron (see study2.sql).
// Public on purpose, but harmless to call: it only works in the afternoon/evening (LA time),
// only covers tomorrow, and the log makes sure nobody gets the same reminder twice.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TYPES: Record<string, string> = { test: "Test", quiz: "Quiz", assignment: "Assignment due", project: "Project due" };
const laNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

Deno.serve(async () => {
  const json = (d: unknown) => new Response(JSON.stringify(d), { headers: { "Content-Type": "application/json" } });
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return json({ sent: 0, reason: "no RESEND_API_KEY" });
  const now = laNow();
  if (now.getHours() < 15) return json({ sent: 0, reason: "too early" });
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const day = ymd(tomorrow);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: events } = await admin.from("study_posts").select("id, class_id, title, event_type").eq("kind", "event").eq("event_date", day);
  if (!events?.length) return json({ sent: 0 });
  const classIds = [...new Set(events.map((e) => e.class_id))];
  const { data: follows } = await admin.from("study_follows").select("user_id, class_id").in("class_id", classIds);
  if (!follows?.length) return json({ sent: 0 });
  const userIds = [...new Set(follows.map((f) => f.user_id))];
  const [{ data: members }, { data: classes }, { data: log }, { data: study }] = await Promise.all([
    admin.from("members").select("id, email").in("id", userIds).eq("study_reminders", true),
    admin.from("study_classes").select("id, name, period, study_teachers(name)").in("id", classIds),
    admin.from("study_reminder_log").select("user_id, post_id").in("post_id", events.map((e) => e.id)),
    admin.from("study_members").select("user_id").in("user_id", userIds),
  ]);
  const inStudy = new Set((study ?? []).map((s) => s.user_id));
  const done = new Set((log ?? []).map((l) => l.user_id + ":" + l.post_id));
  const cls = Object.fromEntries((classes ?? []).map((c) => [c.id, c]));
  let sent = 0;
  for (const m of members ?? []) {
    if (!inStudy.has(m.id) || !m.email) continue;
    const mine = new Set(follows.filter((f) => f.user_id === m.id).map((f) => f.class_id));
    const todo = events.filter((e) => mine.has(e.class_id) && !done.has(m.id + ":" + e.id));
    if (!todo.length) continue;
    const lines = todo.map((e) => {
      const c = cls[e.class_id];
      // deno-lint-ignore no-explicit-any
      const teacher = (c?.study_teachers as any)?.name;
      return `• ${TYPES[e.event_type] ?? "Due"}: ${e.title}\n  ${c?.name ?? "Class"}${teacher ? " · " + teacher : ""}${c?.period ? " · P" + c.period : ""}\n  https://kaleerson.com/study/#/c/${e.class_id}`;
    });
    const subject = todo.length === 1 ? `Tomorrow: ${todo[0].title}` : `Tomorrow: ${todo.length} things in your classes`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "PVHS Study <hello@kaleerson.com>", to: [m.email], subject,
        text: `Heads up, this is tomorrow:\n\n${lines.join("\n\n")}\n\nGood luck!\n\nTo stop these, turn off Study reminders: https://kaleerson.com/account/#settings`,
      }),
    });
    if (res.ok) {
      await admin.from("study_reminder_log").insert(todo.map((e) => ({ user_id: m.id, post_id: e.id })));
      sent++;
    }
  }
  return json({ sent });
});
