-- ════════════════════════════════════════════════════════════════
-- PVHS Study + public forum. Applied after schema.sql and vault.sql.
-- ════════════════════════════════════════════════════════════════

-- ── Codes can unlock the vault, Study, or both ──────────────────
alter table public.contact_codes add column if not exists for_vault boolean not null default true;
alter table public.contact_codes add column if not exists for_study boolean not null default false;
alter table public.contact_codes add column if not exists study_used_at timestamptz;

-- ── Public display names ────────────────────────────────────────
create table public.profiles (
  user_id      uuid primary key references auth.users on delete cascade default auth.uid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 30),
  created_at   timestamptz not null default now()
);
create unique index profiles_name_unique on public.profiles (lower(trim(display_name)));
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to anon, authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Study access ────────────────────────────────────────────────
create table public.study_members (
  user_id    uuid primary key references auth.users on delete cascade,
  code_id    bigint references public.contact_codes on delete set null,
  code_label text,
  granted_at timestamptz not null default now()
);
alter table public.study_members enable row level security;
create policy "study members read self" on public.study_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "study members admin delete" on public.study_members for delete to authenticated using ((select public.is_admin()));

create or replace function public.is_study()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.study_members where user_id = auth.uid()) or public.is_admin();
$$;
revoke execute on function public.is_study() from public;
grant execute on function public.is_study() to anon, authenticated;

-- ── Classes ─────────────────────────────────────────────────────
create table public.study_teachers (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(trim(name)) between 2 and 60),
  created_by uuid default auth.uid() references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index study_teachers_name on public.study_teachers (lower(trim(name)));

create table public.study_classes (
  id         bigint generated always as identity primary key,
  teacher_id bigint not null references public.study_teachers on delete cascade,
  name       text not null check (char_length(trim(name)) between 2 and 60),
  period     text check (period is null or char_length(trim(period)) between 1 and 12),
  created_by uuid default auth.uid() references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index study_classes_unique on public.study_classes (teacher_id, lower(trim(name)), lower(coalesce(trim(period), '')));

-- ── Posts: notes, upcoming tests/assignments, "what to study" ───
create table public.study_posts (
  id         bigint generated always as identity primary key,
  class_id   bigint not null references public.study_classes on delete cascade,
  kind       text not null check (kind in ('note', 'event', 'tips')),
  title      text not null check (char_length(trim(title)) between 2 and 140),
  body       text not null default '' check (char_length(body) <= 8000),
  event_type text check (event_type in ('test', 'quiz', 'assignment', 'project')),
  event_date date,
  created_by uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index study_posts_class on public.study_posts (class_id, created_at desc);
create index study_posts_events on public.study_posts (event_date) where kind = 'event';

-- ── Flashcard decks (also used for practice quizzes) ────────────
create table public.study_decks (
  id         bigint generated always as identity primary key,
  class_id   bigint not null references public.study_classes on delete cascade,
  title      text not null check (char_length(trim(title)) between 2 and 100),
  created_by uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.study_cards (
  id         bigint generated always as identity primary key,
  deck_id    bigint not null references public.study_decks on delete cascade,
  front      text not null check (char_length(trim(front)) between 1 and 500),
  back       text not null check (char_length(trim(back)) between 1 and 500),
  created_by uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index study_cards_deck on public.study_cards (deck_id);

-- RLS for every study table: members read and add; owners or admin edit/delete.
do $$
declare t text;
begin
  foreach t in array array['study_teachers','study_classes','study_posts','study_decks','study_cards'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "study read" on public.%I for select to authenticated using ((select public.is_study()))', t);
    execute format('create policy "study add" on public.%I for insert to authenticated with check ((select public.is_study()) and created_by = (select auth.uid()))', t);
    execute format('create policy "study edit own" on public.%I for update to authenticated using ((select public.is_study()) and (created_by = (select auth.uid()) or (select public.is_admin()))) with check ((select public.is_study()))', t);
    execute format('create policy "study delete own" on public.%I for delete to authenticated using (created_by = (select auth.uid()) or (select public.is_admin()))', t);
  end loop;
end $$;

-- ── Public forum ────────────────────────────────────────────────
create table public.forum_threads (
  id           bigint generated always as identity primary key,
  category     text not null default 'general' check (category in ('general', 'classes', 'clubs', 'help', 'ideas')),
  title        text not null check (char_length(trim(title)) between 3 and 140),
  body         text not null check (char_length(trim(body)) between 1 and 8000),
  created_by   uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_post_at timestamptz not null default now(),
  reply_count  int not null default 0,
  locked       boolean not null default false
);
create index forum_threads_recent on public.forum_threads (last_post_at desc);
create table public.forum_replies (
  id         bigint generated always as identity primary key,
  thread_id  bigint not null references public.forum_threads on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 8000),
  created_by uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index forum_replies_thread on public.forum_replies (thread_id, created_at);

alter table public.forum_threads enable row level security;
alter table public.forum_replies enable row level security;
create policy "forum read threads" on public.forum_threads for select to anon, authenticated using (true);
create policy "forum read replies" on public.forum_replies for select to anon, authenticated using (true);
create policy "forum add thread" on public.forum_threads for insert to authenticated
  with check (created_by = (select auth.uid()) and not locked and reply_count = 0);
create policy "forum add reply" on public.forum_replies for insert to authenticated
  with check (created_by = (select auth.uid())
              and not exists (select 1 from public.forum_threads t where t.id = thread_id and t.locked));
create policy "forum delete thread" on public.forum_threads for delete to authenticated using (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "forum delete reply" on public.forum_replies for delete to authenticated using (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "forum admin update" on public.forum_threads for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- Members can't change counters or lock state themselves; only these columns are writable by users.
revoke update on public.forum_threads from authenticated;
grant update (locked) on public.forum_threads to authenticated;

create or replace function public.forum_bump()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_threads set reply_count = reply_count + 1, last_post_at = now() where id = new.thread_id;
  else
    update public.forum_threads set reply_count = greatest(reply_count - 1, 0) where id = old.thread_id;
  end if;
  return null;
end $$;
revoke execute on function public.forum_bump() from public, anon, authenticated;
create trigger forum_replies_bump after insert or delete on public.forum_replies
  for each row execute function public.forum_bump();

-- ── Reports ─────────────────────────────────────────────────────
create table public.reports (
  id          bigint generated always as identity primary key,
  target_type text not null check (target_type in ('study_post', 'study_card', 'study_deck', 'forum_thread', 'forum_reply')),
  target_id   bigint not null,
  reason      text not null check (char_length(trim(reason)) between 2 and 300),
  created_by  uuid not null default auth.uid() references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.reports enable row level security;
create policy "reports add" on public.reports for insert to authenticated with check (created_by = (select auth.uid()));
create policy "reports admin" on public.reports for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Guards: answer lists and flooding ───────────────────────────
-- Blocks posts that look like answer keys (e.g. "1. B  2. D  3. A ...") and caps posting speed.
create or replace function public.content_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  txt text := coalesce(to_jsonb(new)->>'title', '') || ' ' || coalesce(to_jsonb(new)->>'body', '')
              || ' ' || coalesce(to_jsonb(new)->>'front', '') || ' ' || coalesce(to_jsonb(new)->>'back', '');
  recent int;
begin
  if (select count(*) from regexp_matches(txt, '(?<![0-9])[0-9]{1,3}\s*[.):-]\s*[A-Ea-e](?![A-Za-z])', 'g')) >= 5
     or txt ~* '\m(answer key|answer sheet|test answers|quiz answers)\M' then
    raise exception 'This looks like test or assignment answers, which aren''t allowed. Share topics and study tips instead.'
      using errcode = 'P0001';
  end if;
  execute format('select count(*) from public.%I where created_by = $1 and created_at > now() - interval ''1 minute''', tg_table_name)
    into recent using new.created_by;
  if recent >= 8 then
    raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.content_guard() from public, anon, authenticated;
create trigger guard before insert or update on public.study_posts  for each row execute function public.content_guard();
create trigger guard before insert or update on public.study_cards  for each row execute function public.content_guard();
create trigger guard before insert on public.forum_threads for each row execute function public.content_guard();
create trigger guard before insert on public.forum_replies for each row execute function public.content_guard();

-- ── Study images (private bucket, members only) ─────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study', 'study', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf']);

create policy "study files read" on storage.objects for select to authenticated
  using (bucket_id = 'study' and (select public.is_study()));
create policy "study files add" on storage.objects for insert to authenticated
  with check (bucket_id = 'study' and (select public.is_study())
              and exists (select 1 from public.study_posts p
                          where p.id::text = split_part(name, '/', 1) and p.created_by = (select auth.uid())));
create policy "study files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'study' and (owner = (select auth.uid()) or (select public.is_admin())));

-- ── Redeem a study code (signed-in members) ─────────────────────
create or replace function public.study_redeem(code text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  c public.contact_codes;
  norm text := upper(trim(code));
  bare text := regexp_replace(upper(trim(code)), '[\s-]', '', 'g');
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.study_members where user_id = auth.uid()) then return true; end if;
  if (select count(*) from public.contact_attempts where at > now() - interval '10 minutes' and not ok) > 30 then
    raise exception 'Too many wrong codes. Try again in 10 minutes.';
  end if;
  select * into c from public.contact_codes
    where for_study and code_hash in (encode(digest(norm, 'sha256'), 'hex'),
                        case when bare ~ '^[A-Z2-9]{8}$' then encode(digest(left(bare,4) || '-' || right(bare,4), 'sha256'), 'hex') end)
    order by id limit 1 for update;
  if not found or (c.expires_at is not null and c.expires_at < now()) or (c.single_use and c.study_used_at is not null) then
    insert into public.contact_attempts (ok) values (false);
    return false;
  end if;
  if c.single_use then update public.contact_codes set study_used_at = now() where id = c.id; end if;
  insert into public.contact_attempts (ok) values (true);
  insert into public.study_members (user_id, code_id, code_label) values (auth.uid(), c.id, c.label);
  return true;
end $$;
revoke execute on function public.study_redeem(text) from public, anon;
grant execute on function public.study_redeem(text) to authenticated;

-- ── Vault only accepts codes that unlock the vault ──────────────
create or replace function public.vault_unlock(code text, device text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  c public.contact_codes;
  tok text;
  norm text;
  bare text;
begin
  if (select count(*) from public.contact_attempts where at > now() - interval '10 minutes' and not ok) > 30 then
    raise exception 'Too many wrong codes. Try again in 10 minutes.';
  end if;
  norm := upper(trim(code));
  bare := regexp_replace(norm, '[\s-]', '', 'g');
  select * into c from public.contact_codes
    where for_vault and code_hash in (encode(digest(norm, 'sha256'), 'hex'),
                        case when bare ~ '^[A-Z2-9]{8}$' then encode(digest(left(bare,4) || '-' || right(bare,4), 'sha256'), 'hex') end)
    order by id limit 1 for update;
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

-- ── Admin: codes that unlock vault and/or Study ─────────────────
create or replace function public.admin_make_codes_for(n int, tier text, label text, vault boolean, study boolean)
returns setof text language plpgsql security definer set search_path = public, extensions as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if n < 1 or n > 200 then raise exception 'Make between 1 and 200 codes at a time'; end if;
  if not (vault or study) then raise exception 'A code has to unlock the vault, Study, or both'; end if;
  for i in 1..n loop
    code := '';
    for j in 1..8 loop
      code := code || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
      if j = 4 then code := code || '-'; end if;
    end loop;
    insert into public.contact_codes (code_hash, single_use, label, tier, for_vault, for_study)
      values (encode(digest(code, 'sha256'), 'hex'), true, label, tier, vault, study);
    return next code;
  end loop;
end $$;
revoke execute on function public.admin_make_codes_for(int, text, text, boolean, boolean) from public, anon;
grant execute on function public.admin_make_codes_for(int, text, text, boolean, boolean) to authenticated;

create or replace function public.admin_set_password_for(phrase text, tier text, label text, vault boolean, study boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if length(trim(phrase)) < 8 then raise exception 'Use at least 8 characters'; end if;
  if not (vault or study) then raise exception 'A password has to unlock the vault, Study, or both'; end if;
  insert into public.contact_codes (code_hash, single_use, label, tier, for_vault, for_study)
    values (encode(digest(upper(trim(phrase)), 'sha256'), 'hex'), false, label, tier, vault, study)
  on conflict (code_hash) do update set label = excluded.label, tier = excluded.tier, single_use = false,
    expires_at = null, for_vault = excluded.for_vault, for_study = excluded.for_study;
end $$;
revoke execute on function public.admin_set_password_for(text, text, text, boolean, boolean) from public, anon;
grant execute on function public.admin_set_password_for(text, text, text, boolean, boolean) to authenticated;
