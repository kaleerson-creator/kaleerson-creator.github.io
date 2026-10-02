// Personal sign-in links: kaleerson.com/join/#key=... posts the key here.
// If it matches a key an admin gave out, we return a fresh one-time sign-in link for
// that member, and the browser follows it. Public (no JWT): the key itself is the proof.
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
const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req: Request) => {
  const headers = { ...cors(req.headers.get("Origin")), "Content-Type": "application/json" };
  const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  let body: { key?: string };
  try { body = await req.json(); } catch { return out({ error: "Bad request" }, 400); }
  const key = String(body.key ?? "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(key)) return out({ error: "invalid" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: row } = await admin.from("access_keys").select("user_id, uses").eq("key_hash", await sha256(key)).maybeSingle();
  if (!row) return out({ error: "invalid" }, 404);

  const { data: u } = await admin.auth.admin.getUserById(row.user_id);
  if (!u?.user?.email) return out({ error: "invalid" }, 404);
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email, options: { redirectTo: SITE + "/join/" } });
  if (error || !data.properties?.action_link) return out({ error: "failed" }, 500);
  await admin.from("access_keys").update({ last_used_at: new Date().toISOString(), uses: (row.uses ?? 0) + 1 }).eq("user_id", row.user_id);
  return out({ link: data.properties.action_link });
});
