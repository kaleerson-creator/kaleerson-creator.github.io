-- ════════════════════════════════════════════════════════════════
-- Private vault behind /contact + admin tools.
-- Applied after schema.sql. Safe to re-run.
-- ════════════════════════════════════════════════════════════════

-- ── Code tiers ──────────────────────────────────────────────────
alter table public.contact_codes add column if not exists tier text not null default 'basic';
do $$ begin
  alter table public.contact_codes add constraint contact_codes_tier_check check (tier in ('basic','vip'));
exception when duplicate_object then null; end $$;

-- ── Admins ──────────────────────────────────────────────────────
create table if not exists public.admins (user_id uuid primary key references auth.users on delete cascade);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id = (select auth.uid()));

-- Admins manage codes directly (list, relabel, change tier, delete = revoke).
drop policy if exists "admin codes" on public.contact_codes;
create policy "admin codes" on public.contact_codes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Sections ────────────────────────────────────────────────────
create table if not exists public.vault_sections (
  id         bigint generated always as identity primary key,
  slug       text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  title      text not null,
  kind       text not null default 'text'  check (kind in ('text','files')),
  tier       text not null default 'vip'   check (tier in ('basic','vip')),
  color      text not null default 'card'  check (color in ('card','moss','sky','peach','butter','lilac','forest')),
  body       text not null default '',
  sort       int  not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.vault_sections enable row level security;
drop policy if exists "admin sections" on public.vault_sections;
create policy "admin sections" on public.vault_sections for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Device sessions (one per unlock) ────────────────────────────
create table if not exists public.vault_sessions (
  id         bigint generated always as identity primary key,
  token_hash text not null unique,
  tier       text not null check (tier in ('basic','vip')),
  code_id    bigint references public.contact_codes on delete cascade,  -- deleting a code revokes its devices
  code_label text,
  device     text,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
create index if not exists vault_sessions_code on public.vault_sessions (code_id);
alter table public.vault_sessions enable row level security;
drop policy if exists "admin sessions" on public.vault_sessions;
create policy "admin sessions" on public.vault_sessions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Files bucket (private) ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "vault admin read"   on storage.objects;
drop policy if exists "vault admin write"  on storage.objects;
drop policy if exists "vault admin update" on storage.objects;
drop policy if exists "vault admin delete" on storage.objects;
create policy "vault admin read"   on storage.objects for select to authenticated using (bucket_id = 'vault' and (select public.is_admin()));
create policy "vault admin write"  on storage.objects for insert to authenticated with check (bucket_id = 'vault' and (select public.is_admin()));
create policy "vault admin update" on storage.objects for update to authenticated using (bucket_id = 'vault' and (select public.is_admin()));
create policy "vault admin delete" on storage.objects for delete to authenticated using (bucket_id = 'vault' and (select public.is_admin()));

-- ── What a tier can see ─────────────────────────────────────────
create or replace function public.vault_payload(t text)
returns jsonb language sql stable security definer set search_path = public, storage as $$
  select jsonb_build_object('tier', t, 'sections', coalesce(jsonb_agg(
    jsonb_build_object('slug', s.slug, 'title', s.title, 'kind', s.kind, 'color', s.color, 'tier', s.tier, 'body', s.body,
      'files', case when s.kind = 'files' then coalesce((
        select jsonb_agg(jsonb_build_object('path', o.name, 'size', (o.metadata->>'size')::bigint, 'type', o.metadata->>'mimetype') order by o.created_at)
        from storage.objects o
        where o.bucket_id = 'vault' and o.name like s.slug || '/%' and o.name not like '%.emptyFolderPlaceholder'), '[]'::jsonb) end)
    order by s.sort, s.id), '[]'::jsonb))
  from public.vault_sections s
  where t = 'vip' or s.tier = 'basic';
$$;
revoke execute on function public.vault_payload(text) from public, anon, authenticated;

-- Enter a code: returns a device token plus the content, or null if the code is wrong/used.
create or replace function public.vault_unlock(code text, device text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  c public.contact_codes;
  tok text;
begin
  if (select count(*) from public.contact_attempts where at > now() - interval '10 minutes' and not ok) > 30 then
    raise exception 'Too many wrong codes. Try again in 10 minutes.';
  end if;
  select * into c from public.contact_codes
    where code_hash = encode(digest(upper(trim(code)), 'sha256'), 'hex') for update;
  if not found or (c.expires_at is not null and c.expires_at < now()) or (c.single_use and c.used_at is not null) then
    insert into public.contact_attempts (ok) values (false);
    return null;
  end if;
  if c.single_use then update public.contact_codes set used_at = now() where id = c.id; end if;
  insert into public.contact_attempts (ok) values (true);
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.vault_sessions (token_hash, tier, code_id, code_label, device)
    values (encode(digest(tok, 'sha256'), 'hex'), c.tier, c.id, c.label, left(device, 160));
  return jsonb_build_object('token', tok) || public.vault_payload(c.tier);
end $$;
revoke execute on function public.vault_unlock(text, text) from public;
grant execute on function public.vault_unlock(text, text) to anon, authenticated;

-- Returning visitor: token from their device. Null means revoked.
create or replace function public.vault_open(token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s public.vault_sessions;
begin
  update public.vault_sessions set last_seen = now()
    where token_hash = encode(digest(token, 'sha256'), 'hex') returning * into s;
  if not found then return null; end if;
  return public.vault_payload(s.tier);
end $$;
revoke execute on function public.vault_open(text) from public;
grant execute on function public.vault_open(text) to anon, authenticated;

-- Used by the vault-files edge function (service role only).
create or replace function public.vault_tier(token text)
returns text language sql stable security definer set search_path = public, extensions as $$
  select tier from public.vault_sessions where token_hash = encode(digest(token, 'sha256'), 'hex');
$$;
revoke execute on function public.vault_tier(text) from public, anon, authenticated;

-- ── Admin: make codes ───────────────────────────────────────────
create or replace function public.admin_make_codes(n int default 10, tier text default 'basic', label text default null)
returns setof text language plpgsql security definer set search_path = public, extensions as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if n < 1 or n > 200 then raise exception 'Make between 1 and 200 codes at a time'; end if;
  for i in 1..n loop
    code := '';
    for j in 1..8 loop
      code := code || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
      if j = 4 then code := code || '-'; end if;
    end loop;
    insert into public.contact_codes (code_hash, single_use, label, tier)
      values (encode(digest(code, 'sha256'), 'hex'), true, label, tier);
    return next code;
  end loop;
end $$;
revoke execute on function public.admin_make_codes(int, text, text) from public, anon;
grant execute on function public.admin_make_codes(int, text, text) to authenticated;

create or replace function public.admin_set_password(phrase text, tier text default 'basic', label text default 'Shared password')
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if length(trim(phrase)) < 8 then raise exception 'Use at least 8 characters'; end if;
  insert into public.contact_codes (code_hash, single_use, label, tier)
    values (encode(digest(upper(trim(phrase)), 'sha256'), 'hex'), false, label, tier)
  on conflict (code_hash) do update set label = excluded.label, tier = excluded.tier, single_use = false, expires_at = null;
end $$;
revoke execute on function public.admin_set_password(text, text, text) from public, anon;
grant execute on function public.admin_set_password(text, text, text) to authenticated;
