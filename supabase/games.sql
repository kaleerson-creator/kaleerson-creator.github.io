-- ════════════════════════════════════════════════════════════════
-- Leaderboards for games.kaleerson.com. Applied after study.sql (uses profiles).
-- Scores are public to read (display names only). Signed-in members with a
-- display name can add their own scores. Bounds per game block obvious fakes.
-- ════════════════════════════════════════════════════════════════

create table public.game_scores (
  id         bigint generated always as identity primary key,
  game       text not null check (game in ('2048','snake','minesweeper','sudoku','word','typing','trivia')),
  user_id    uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  score      int  not null,
  meta       jsonb not null default '{}' check (pg_column_size(meta) < 2000),
  day        date not null default (now() at time zone 'America/Los_Angeles')::date,
  created_at timestamptz not null default now(),
  constraint game_scores_bounds check (case game
    when '2048'        then score between 0 and 4000000
    when 'snake'       then score between 0 and 2000
    when 'minesweeper' then score between 3 and 36000   -- seconds
    when 'sudoku'      then score between 30 and 36000  -- seconds
    when 'word'        then score between 1 and 6       -- guesses
    when 'typing'      then score between 1 and 250     -- words per minute
    when 'trivia'      then score between 0 and 100000
  end)
);
create index game_scores_board on public.game_scores (game, day, score);
create index game_scores_user on public.game_scores (user_id, created_at);
alter table public.game_scores enable row level security;
create policy "scores readable" on public.game_scores for select to anon, authenticated using (true);
create policy "scores add own" on public.game_scores for insert to authenticated with check (user_id = (select auth.uid()));
create policy "scores admin delete" on public.game_scores for delete to authenticated using ((select public.is_admin()));
revoke update on public.game_scores from anon, authenticated;

-- One word-game result per person per day; at most 20 score saves per minute.
create unique index game_scores_word_daily on public.game_scores (user_id, day) where game = 'word';
create or replace function public.game_scores_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.day := (now() at time zone 'America/Los_Angeles')::date;
  new.created_at := now();
  if (select count(*) from public.game_scores where user_id = new.user_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Too many scores at once. Slow down.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.game_scores_guard() from public, anon, authenticated;
create trigger guard before insert on public.game_scores for each row execute function public.game_scores_guard();

-- Best score per person. period: 'day' (today), 'week' (last 7 days) or 'all'.
create or replace function public.game_leaderboard(g text, period text default 'week', lim int default 20)
returns table (rank int, name text, score int, mine boolean)
language sql stable security definer set search_path = public as $$
  with low as (select g in ('minesweeper','sudoku','word') as lower_better),
  pool as (
    select s.user_id, s.score from public.game_scores s
    where s.game = g
      and (period = 'all'
        or (period = 'day'  and s.day = (now() at time zone 'America/Los_Angeles')::date)
        or (period = 'week' and s.day > (now() at time zone 'America/Los_Angeles')::date - 7))
  ),
  best as (
    select p.user_id, case when (select lower_better from low) then min(p.score) else max(p.score) end as score
    from pool p group by p.user_id
  )
  select (rank() over (order by case when (select lower_better from low) then b.score else -b.score end))::int,
         pr.display_name, b.score, b.user_id = auth.uid()
  from best b join public.profiles pr on pr.user_id = b.user_id
  order by 1, pr.display_name
  limit least(greatest(lim, 1), 100);
$$;
revoke execute on function public.game_leaderboard(text, text, int) from public;
grant execute on function public.game_leaderboard(text, text, int) to anon, authenticated;
