// Emails the admins when something needs attention. Called by the site after a member
// reports a post ({kind: "report"}); the report itself is checked in the database, so a
// caller can't make up alerts. Needs the RESEND_API_KEY secret; without it nothing is sent.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED = ["https://kaleerson.com", "https://www.kaleerson.com", "https://kaleerson-creator.github.io", "http://kaleerson.com"];
const LABEL: Record<string, string> = {
  study_post: "a Study post", study_card: "a flashcard", study_deck: "a flashcard deck",
  forum_thread: "a forum thread", forum_reply: "a forum reply", teacher_rating: "a teacher rating",
};

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Shared with login-request (kept in sync by hand): email every admin, at most once a minute per kind.
async function alertAdmins(admin: ReturnType<typeof createClient>, kind: string, subject: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const { data: last } = await admin.from("alert_log").select("sent_at").eq("kind", kind).order("sent_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - Date.parse(last.sent_at) < 60_000) return false;
  const { data: admins } = await admin.from("admins").select("user_id");
  const to: string[] = [];
  for (const a of admins ?? []) {
    const { data } = await admin.auth.admin.getUserById(a.user_id);
    if (data?.user?.email) to.push(data.user.email);
  }
  if (!to.length) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "kaleerson.com <hello@kaleerson.com>", to, subject, text }),
  });
  if (res.ok) await admin.from("alert_log").insert({ kind });
  return res.ok;
}

Deno.serve(async (req: Request) => {
  const headers = { ...cors(req.headers.get("Origin")), "Content-Type": "application/json" };
  const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);
  let body: { kind?: string };
  try { body = await req.json(); } catch { return out({ error: "Bad request" }, 400); }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (body.kind === "report") {
    const since = new Date(Date.now() - 2 * 60_000).toISOString();
    const { data: r } = await admin.from("reports").select("target_type, reason, created_at").gte("created_at", since)
      .is("resolved_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!r) return out({ sent: false });
    const sent = await alertAdmins(admin, "report", "Someone reported " + (LABEL[r.target_type] ?? "a post"),
      `Someone reported ${LABEL[r.target_type] ?? "a post"} on kaleerson.com.\n\nReason: ${String(r.reason).slice(0, 300)}\n\nReview it: https://kaleerson.com/admin/ (Study & forum tab)`);
    return out({ sent });
  }
  return out({ error: "Unknown kind" }, 400);
});
