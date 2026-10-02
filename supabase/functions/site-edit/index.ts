// Site editor backend: reads site files from GitHub and commits text edits to main.
// Only signed-in admins can call it (JWT verified by Supabase, then is_admin() checked here).
// Needs the secret GITHUB_TOKEN: a fine-grained token for this one repo with Contents read/write.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OWNER = "kaleerson-creator";
const REPO = "kaleerson-creator.github.io";
const BRANCH = "main";
const ALLOWED = ["https://kaleerson.com", "https://www.kaleerson.com", "https://kaleerson-creator.github.io", "http://kaleerson.com"];

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const okPath = (p: unknown): p is string =>
  typeof p === "string" && p.length < 200 && /^[A-Za-z0-9_\-./]+\.(html|js|css)$/.test(p) &&
  !p.includes("..") && !p.startsWith("/") && !/^(supabase|\.github|design)\//.test(p);

const b64enc = (s: string) => {
  const b = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64dec = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path ? "/" + path : ""}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "kaleerson-site-editor",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  // Fine-grained tokens report their expiry on every response, e.g. "2026-10-31 00:00:00 UTC".
  const exp = res.headers.get("github-authentication-token-expiration");
  if (exp) tokenExpires = exp;
  if (res.status === 401) throw new Error("token_expired");
  return { status: res.status, body };
}
let tokenExpires: string | null = null;

async function readFile(path: string) {
  const r = await gh(`contents/${path}?ref=${BRANCH}`);
  if (r.status !== 200 || typeof r.body.content !== "string") throw new Error(`Couldn't read ${path} (${r.status})`);
  return { content: b64dec(r.body.content), sha: r.body.sha as string };
}

type Edit = { start: number; end: number; expect: string; text: string };

Deno.serve(async (req: Request) => {
  const headers = { ...cors(req.headers.get("Origin")), "Content-Type": "application/json" };
  const out = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  // Admin check with the caller's own session.
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data: isAdmin } = await user.rpc("is_admin");
  if (isAdmin !== true) return out({ error: "Not allowed" }, 403);
  if (!Deno.env.get("GITHUB_TOKEN")) return out({ error: "not_configured" }, 503);

  let body: { action?: string; paths?: unknown[]; files?: { path?: unknown; edits?: Edit[] }[]; page?: string };
  try { body = await req.json(); } catch { return out({ error: "Bad request" }, 400); }

  try {
    if (body.action === "status") {
      await gh("");
      return out({ tokenExpires });
    }

    if (body.action === "read") {
      const paths = (body.paths ?? []).filter(okPath).slice(0, 20);
      const files: Record<string, string> = {};
      await Promise.all(paths.map(async (p) => { try { files[p] = (await readFile(p)).content; } catch (e) { if ((e as Error).message === "token_expired") throw e; /* else: missing file */ } }));
      return out({ files, tokenExpires });
    }

    if (body.action === "save") {
      const results: { path: string; content: string; commit: string }[] = [];
      for (const f of (body.files ?? []).slice(0, 20)) {
        if (!okPath(f.path) || !Array.isArray(f.edits) || !f.edits.length || f.edits.length > 200) return out({ error: "Bad request" }, 400);
        const path = f.path;
        const { content, sha } = await readFile(path);
        // Re-locate each edit in the current file. If the exact spot moved, accept a single unique match.
        const placed: Edit[] = [];
        for (const e of f.edits) {
          if (typeof e.expect !== "string" || typeof e.text !== "string" || !e.expect || e.text.length > 10000) return out({ error: "Bad request" }, 400);
          let start = Number(e.start);
          if (content.slice(start, start + e.expect.length) !== e.expect) {
            const first = content.indexOf(e.expect);
            if (first < 0 || content.indexOf(e.expect, first + 1) >= 0) {
              return out({ error: `“${e.expect.slice(0, 60)}” changed in ${path} since you opened it. Reload and try again.` }, 409);
            }
            start = first;
          }
          placed.push({ ...e, start, end: start + e.expect.length });
        }
        placed.sort((a, b) => b.start - a.start);
        for (let i = 1; i < placed.length; i++) if (placed[i].end > placed[i - 1].start) return out({ error: "Two edits overlap. Save them one at a time." }, 400);
        let next = content;
        for (const e of placed) next = next.slice(0, e.start) + e.text + next.slice(e.end);
        if (next === content) continue;
        const where = String(body.page ?? path).slice(0, 80);
        const put = await gh(`contents/${path}`, {
          method: "PUT",
          body: JSON.stringify({ message: `Site editor: update text (${where})`, content: b64enc(next), sha, branch: BRANCH }),
        });
        if (put.status !== 200 && put.status !== 201) {
          return out({ error: put.status === 409 ? `${path} changed on GitHub at the same moment. Try again.` : `GitHub said no (${put.status}): ${put.body.message ?? ""}` }, 502);
        }
        results.push({ path, content: next, commit: put.body.commit?.html_url ?? "" });
      }
      return out({ saved: results });
    }

    return out({ error: "Unknown action" }, 400);
  } catch (err) {
    const msg = String((err as Error).message ?? err);
    return out({ error: msg }, msg === "token_expired" ? 503 : 500);
  }
});
