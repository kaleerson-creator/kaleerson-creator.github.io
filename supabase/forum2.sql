-- forum2.sql — Forum: "helpful" hearts and pinned threads. Run AFTER study.sql (and study3.sql).
-- Safe to paste into the SQL editor more than once. Until it runs, the forum hides the hearts,
-- the "Top" sort and the Pin button on its own; nothing else changes.
--
-- 1) forum_threads.pinned: admins can pin a thread so it stays at the top of every list.
--    Uses the existing "forum admin update" policy; the column grant pattern from study.sql is
--    extended so members' clients may send (locked, pinned) and nothing else (the policy still
--    limits the actual update to admins).
-- 2) forum_votes: one row per member per thread or reply they marked helpful. Anyone can read the
--    counts, members add or remove only their own rows, nobody updates a vote in place.
-- 3) forum_vote_counts(ids, ttype): one call returns the count per target and whether the caller
--    voted, for a page of threads or the replies of one thread.

-- ── 1) pinned threads ───────────────────────────────────────────
alter table public.forum_threads add column if not exists pinned boolean not null default false;
create index if not exists forum_threads_pinned on public.forum_threads (pinned desc, last_post_at desc);
revoke update on public.forum_threads from authenticated;
grant update (locked, pinned) on public.forum_threads to authenticated;

-- ── 2) helpful votes ────────────────────────────────────────────
create table if not exists public.forum_votes (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  target_type text not null check (target_type in ('thread', 'reply')),
  target_id   bigint not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index if not exists forum_votes_target on public.forum_votes (target_type, target_id);

alter table public.forum_votes enable row level security;
drop policy if exists "forum votes read" on public.forum_votes;
create policy "forum votes read" on public.forum_votes for select to anon, authenticated using (true);
drop policy if exists "forum votes add own" on public.forum_votes;
create policy "forum votes add own" on public.forum_votes for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "forum votes remove own" on public.forum_votes;
create policy "forum votes remove own" on public.forum_votes for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.forum_votes from anon, authenticated;
grant select on public.forum_votes to anon, authenticated;
grant insert (user_id, target_type, target_id) on public.forum_votes to authenticated;
grant delete on public.forum_votes to authenticated;

-- A vote must point at a thread or reply that exists (the id columns are polymorphic, so no FK).
create or replace function public.forum_vote_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'thread' and not exists (select 1 from public.forum_threads t where t.id = new.target_id)
     or new.target_type = 'reply' and not exists (select 1 from public.forum_replies r where r.id = new.target_id) then
    raise exception 'That post is gone.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.forum_vote_check() from public, anon, authenticated;
drop trigger if exists forum_votes_check on public.forum_votes;
create trigger forum_votes_check before insert on public.forum_votes for each row execute function public.forum_vote_check();

-- Votes go away with the thread or reply they belong to.
create or replace function public.forum_votes_clean()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.forum_votes where target_type = tg_argv[0] and target_id = old.id;
  return null;
end $$;
revoke execute on function public.forum_votes_clean() from public, anon, authenticated;
drop trigger if exists forum_threads_votes_clean on public.forum_threads;
create trigger forum_threads_votes_clean after delete on public.forum_threads for each row execute function public.forum_votes_clean('thread');
drop trigger if exists forum_replies_votes_clean on public.forum_replies;
create trigger forum_replies_votes_clean after delete on public.forum_replies for each row execute function public.forum_votes_clean('reply');

-- ── 3) counts in one call ───────────────────────────────────────
-- select * from forum_vote_counts(array[1,2,3], 'thread')  ->  (target_id, votes, mine)
-- "mine" is whether the caller (auth.uid()) voted; false for anonymous readers.
drop function if exists public.forum_vote_counts(bigint[], text);
create or replace function public.forum_vote_counts(ids bigint[], ttype text)
returns table (target_id bigint, votes int, mine boolean)
language sql stable security definer set search_path = public as $$
  select i.id as target_id,
         count(v.user_id)::int as votes,
         coalesce(bool_or(v.user_id = auth.uid()), false) as mine
  from unnest(coalesce(ids, '{}'::bigint[])) as i(id)
  left join public.forum_votes v on v.target_type = ttype and v.target_id = i.id
  where ttype in ('thread', 'reply')
  group by i.id;
$$;
revoke execute on function public.forum_vote_counts(bigint[], text) from public;
grant execute on function public.forum_vote_counts(bigint[], text) to anon, authenticated;
