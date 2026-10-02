// Admin-only: list members and make one-time sign-in links for people whose email
// (often school email) blocks the sign-in message. Uses the service role key, which
// never leaves this function. Caller must be signed in and is_admin().
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED = ["https://kaleerson.com", "https://www.kaleerson.com", "https://kaleerson-creator.github.io", "http://kaleerson.com"];
const SITE = "https://kaleerson.com";

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const headers = { ...cors(req.headers.get("Origin")), "Content-Type": "application/json" };
  const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: isAdmin } = await user.rpc("is_admin");
  if (isAdmin !== true) return out({ error: "Not allowed" }, 403);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let body: { action?: string; email?: string; next?: string };
  try { body = await req.json(); } catch { return out({ error: "Bad request" }, 400); }

  try {
    if (body.action === "list") {
      const users: Record<string, unknown>[] = [];
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        users.push(...data.users.map((u) => ({
          id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
          confirmed: !!(u.email_confirmed_at || u.confirmed_at),
        })));
        if (data.users.length < 200) break;
      }
      const { data: profiles } = await admin.from("profiles").select("user_id, display_name");
      const { data: study } = await admin.from("study_members").select("user_id");
      const names = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name]));
      const inStudy = new Set((study ?? []).map((s) => s.user_id));
      return out({ users: users.map((u) => ({ ...u, name: names[u.id as string] ?? null, study: inStudy.has(u.id as string) })) });
    }

    if (body.action === "link") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return out({ error: "Bad email" }, 400);
      const next = /^\/[\w\-/]*$/.test(String(body.next ?? "")) ? String(body.next) : "";
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: SITE + "/join/" + (next ? "?next=" + encodeURIComponent(next) : "") },
      });
      if (error) return out({ error: /not found/i.test(error.message) ? "No member with that email. They need to sign up first." : error.message }, 400);
      return out({ link: data.properties?.action_link });
    }

    return out({ error: "Unknown action" }, 400);
  } catch (err) {
    return out({ error: String((err as Error).message ?? err) }, 500);
  }
});
