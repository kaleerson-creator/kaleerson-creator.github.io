// Admin-only: list members, make one-time sign-in links, and give or revoke reusable
// personal sign-in links for people whose email (often school email) blocks sign-in
// messages. Uses the service role key, which never leaves this function.
// Caller must be signed in and is_admin().
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED = ["https://kaleerson.com", "https://www.kaleerson.com", "https://kaleerson-creator.github.io", "http://kaleerson.com"];
const SITE = "https://kaleerson.com";

const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const newKey = () => {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

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
  let body: { action?: string; email?: string; next?: string; user_id?: string };
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
      const { data: keys } = await admin.from("access_keys").select("user_id, last_used_at, uses");
      const keyOf = Object.fromEntries((keys ?? []).map((k) => [k.user_id, k]));
      const names = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name]));
      const inStudy = new Set((study ?? []).map((s) => s.user_id));
      return out({ users: users.map((u) => ({ ...u, name: names[u.id as string] ?? null, study: inStudy.has(u.id as string), key: keyOf[u.id as string] ?? null })) });
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

    // Personal link: reusable until revoked. Making a new one replaces (and turns off) the old one.
    if (body.action === "key") {
      const id = String(body.user_id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return out({ error: "Bad request" }, 400);
      const { data: u, error: ue } = await admin.auth.admin.getUserById(id);
      if (ue || !u.user) return out({ error: "No such member" }, 404);
      const key = newKey();
      const { error } = await admin.from("access_keys").upsert({ user_id: id, key_hash: await sha256(key), created_at: new Date().toISOString(), last_used_at: null, uses: 0 });
      if (error) throw error;
      return out({ link: SITE + "/join/#key=" + key });
    }
    if (body.action === "revoke") {
      const id = String(body.user_id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return out({ error: "Bad request" }, 400);
      const { error } = await admin.from("access_keys").delete().eq("user_id", id);
      if (error) throw error;
      return out({ ok: true });
    }

    // "Ask Kale to let me in" requests from the Join page (see login-request function).
    if (body.action === "requests") {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data, error } = await admin.from("login_requests").select("id, email, code, device, created_at")
        .is("used_at", null).is("denied_at", null).is("approved_at", null).gte("created_at", since).order("created_at", { ascending: false });
      if (error) throw error;
      return out({ requests: data });
    }
    if (body.action === "approve" || body.action === "deny") {
      const id = String(body.user_id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return out({ error: "Bad request" }, 400);
      const col = body.action === "approve" ? "approved_at" : "denied_at";
      const { error } = await admin.from("login_requests").update({ [col]: new Date().toISOString() }).eq("id", id).is("used_at", null);
      if (error) throw error;
      return out({ ok: true });
    }

    return out({ error: "Unknown action" }, 400);
  } catch (err) {
    return out({ error: String((err as Error).message ?? err) }, 500);
  }
});
