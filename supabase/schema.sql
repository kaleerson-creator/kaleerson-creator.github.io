-- ════════════════════════════════════════════════════════════════
-- kaleerson.com — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again after changes; it replaces what it created.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── MEMBERS (your mailing list) ─────────────────────────────────
-- A row appears once someone verifies their email.
create table if not exists public.members (
  id           uuid primary key references auth.users on delete cascade,
  email        text not null,
  joined_at    timestamptz not null default now(),
  email_opt_in boolean not null default true
);
alter table public.members enable row level security;

drop policy if exists "members read own" on public.members;
create policy "members read own" on public.members
  for select to authenticated using (id = auth.uid());

drop policy if exists "members update own" on public.members;
create policy "members update own" on public.members
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Members may only change their email preference, nothing else.
revoke update on public.members from authenticated;
grant update (email_opt_in) on public.members to authenticated;

create or replace function public.handle_verified_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null then
    insert into public.members (id, email) values (new.id, new.email)
    on conflict (id) do update set email = excluded.email;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_verified_user();

-- ── SNAPWIT SCORES ──────────────────────────────────────────────
create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  game       text not null check (game ~ '^[a-z0-9]{2,20}$'),
  value      numeric not null check (value >= 0 and value < 1000000),
  created_at timestamptz not null default now()
);
create index if not exists scores_game_value on public.scores (game, value);
create index if not exists scores_user_time on public.scores (user_id, created_at desc);
alter table public.scores enable row level security;

drop policy if exists "scores insert own" on public.scores;
create policy "scores insert own" on public.scores
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "scores read own" on public.scores;
create policy "scores read own" on public.scores
  for select to authenticated using (user_id = auth.uid());

-- One score per second per member, to stop scripted spam.
create or replace function public.scores_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.scores
             where user_id = new.user_id and created_at > now() - interval '1 second') then
    raise exception 'Too many scores at once';
  end if;
  return new;
end $$;

drop trigger if exists scores_rate on public.scores;
create trigger scores_rate before insert on public.scores
  for each row execute function public.scores_rate_limit();

-- Percentile of each requested score against every run ever submitted.
-- items: [{"game":"react","value":231,"lower":true}, ...]
-- lower=true means smaller is better (reaction times).
create or replace function public.rank_scores(items jsonb)
returns table (game text, value numeric, pct numeric, players int)
language sql stable security definer set search_path = public as $$
  with req as (
    select x->>'game' as game,
           (x->>'value')::numeric as value,
           coalesce((x->>'lower')::boolean, false) as lower
    from jsonb_array_elements(items) x
    limit 40
  )
  select r.game, r.value,
         round(100.0 * avg(
           case when (r.lower and s.value > r.value) or (not r.lower and s.value < r.value) then 1
                when s.value = r.value then 0.5
                else 0 end
         ) filter (where s.id is not null), 1) as pct,
         count(s.id)::int as players
  from req r
  left join public.scores s on s.game = r.game
  group by r.game, r.value, r.lower;
$$;
revoke execute on function public.rank_scores(jsonb) from public, anon;
grant execute on function public.rank_scores(jsonb) to authenticated;

-- ── /contact PAGE ───────────────────────────────────────────────
-- The page text lives here, never in the website's code.
create table if not exists public.contact_page (
  id         int primary key default 1 check (id = 1),
  body       text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.contact_page enable row level security;  -- no policies: nobody reads it directly

create table if not exists public.contact_codes (
  id         bigint generated always as identity primary key,
  code_hash  text not null unique,
  label      text,
  single_use boolean not null default true,
  used_at    timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.contact_codes enable row level security;

create table if not exists public.contact_attempts (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ok boolean not null
);
alter table public.contact_attempts enable row level security;

create or replace function public.unlock_contact(code text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  h text;
  c public.contact_codes;
begin
  if (select count(*) from public.contact_attempts
      where at > now() - interval '10 minutes' and not ok) > 30 then
    raise exception 'Too many wrong codes. Try again in 10 minutes.';
  end if;

  h := encode(digest(upper(trim(code)), 'sha256'), 'hex');
  select * into c from public.contact_codes where code_hash = h for update;

  if not found
     or (c.expires_at is not null and c.expires_at < now())
     or (c.single_use and c.used_at is not null) then
    insert into public.contact_attempts (ok) values (false);
    return null;
  end if;

  if c.single_use then
    update public.contact_codes set used_at = now() where id = c.id;
  end if;
  insert into public.contact_attempts (ok) values (true);
  return (select body from public.contact_page where id = 1);
end $$;
revoke execute on function public.unlock_contact(text) from public;
grant execute on function public.unlock_contact(text) to anon, authenticated;

-- ── ADMIN HELPERS (only you can run these, from the SQL Editor) ──

-- Add a code. single_use=false makes it a reusable shared password.
create or replace function public.add_contact_code(
  code text, single_use boolean default true, label text default null, expires_in interval default null)
returns void language sql security definer set search_path = public, extensions as $$
  insert into public.contact_codes (code_hash, single_use, label, expires_at)
  values (encode(digest(upper(trim(code)), 'sha256'), 'hex'), single_use, label,
          case when expires_in is null then null else now() + expires_in end);
$$;

-- Make n random one-time codes like K7QF-2MXR and list them.
create or replace function public.make_contact_codes(n int default 10, label text default null)
returns setof text language plpgsql security definer set search_path = public, extensions as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  for i in 1..n loop
    code := '';
    for j in 1..8 loop
      code := code || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
      if j = 4 then code := code || '-'; end if;
    end loop;
    perform public.add_contact_code(code, true, label);
    return next code;
  end loop;
end $$;

revoke execute on function public.add_contact_code(text, boolean, text, interval) from public, anon, authenticated;
revoke execute on function public.make_contact_codes(int, text) from public, anon, authenticated;

-- Starter row so the contact page exists.
insert into public.contact_page (id, body) values (1, '# Kale Erson' || chr(10) || 'Edit this text in Supabase.')
on conflict (id) do nothing;
