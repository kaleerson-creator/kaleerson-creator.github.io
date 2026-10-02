// "Ask Kale to let me in" for members whose email blocks sign-in messages.
//   create {email, device} -> {id, token, code}   (the device keeps the token; only its hash is stored)
//   poll   {id, token}     -> {status: pending | approved (+link) | denied | expired}
// When the admin approves in /admin -> People, the next poll returns a one-time sign-in link
// for that email, and the waiting page follows it. Public: the device token is the proof.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED = ["https://kaleerson.com", "https://www.kaleerson.com", "https://kaleerson-creator.github.io", "http://kaleerson.com"];
const SITE = "https://kaleerson.com";
const TTL_MS = 30 * 60 * 1000;

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const randToken = () => {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

Deno.serve(async (req: Request) => {
  const headers = { ...cors(req.headers.get("Origin")), "Content-Type": "application/json" };
  const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  let body: { action?: string; email?: string; device?: string; id?: string; token?: string };
  try { body = await req.json(); } catch { return out({ error: "Bad request" }, 400); }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  try {
    if (body.action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return out({ error: "Enter a valid email." }, 400);
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: mine } = await admin.from("login_requests").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
      const { count: all } = await admin.from("login_requests").select("id", { count: "exact", head: true }).gte("created_at", since);
      if ((mine ?? 0) >= 5 || (all ?? 0) >= 60) return out({ error: "Too many requests. Wait a few minutes and try again." }, 429);
      const token = randToken();
      const code = String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
      const { data, error } = await admin.from("login_requests")
        .insert({ email, token_hash: await sha256(token), code, device: String(body.device ?? "").slice(0, 160) })
        .select("id").single();
      if (error) throw error;
      return out({ id: data.id, token, code });
    }

    if (body.action === "poll") {
      const id = String(body.id ?? ""), token = String(body.token ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id) || !token) return out({ status: "expired" });
      const { data: r } = await admin.from("login_requests").select("*").eq("id", id).maybeSingle();
      if (!r || r.token_hash !== await sha256(token) || r.used_at) return out({ status: "expired" });
      if (r.denied_at) return out({ status: "denied" });
      if (!r.approved_at) return out({ status: Date.now() - Date.parse(r.created_at) > TTL_MS ? "expired" : "pending" });

      // Approved: make sure the account exists (and is verified), then hand back a one-time link.
      let { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: r.email, options: { redirectTo: SITE + "/join/" } });
      if (error) {
        await admin.auth.admin.createUser({ email: r.email, email_confirm: true });
        ({ data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: r.email, options: { redirectTo: SITE + "/join/" } }));
      }
      if (error || !data?.properties?.action_link) return out({ error: "Couldn't sign you in. Ask Kale to try again." }, 500);
      await admin.from("login_requests").update({ used_at: new Date().toISOString() }).eq("id", id);
      return out({ status: "approved", link: data.properties.action_link });
    }

    return out({ error: "Unknown action" }, 400);
  } catch (err) {
    return out({ error: String((err as Error).message ?? err) }, 500);
  }
});
