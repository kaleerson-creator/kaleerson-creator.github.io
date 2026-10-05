-- ════════════════════════════════════════════════════════════════
-- games3.sql — registers the nine new games (Speed Math, Reaction Time, Memory
-- Match, Blocks, Breakout, Flap, Hangman, Simon, Connect Four vs AI) on the
-- game_scores leaderboard table.
--
-- Run this AFTER games.sql, games2.sql and profiles2.sql. It is re-runnable:
--   1. drops and re-adds game_scores_game_check with every allowed game key
--   2. drops and re-adds game_scores_bounds with the per-game score limits
--      (existing games keep the games2.sql bounds)
--   3. redefines the game_board RPC from profiles2.sql so lower-is-better also
--      covers reaction (ms) and memory (seconds); the body is otherwise identical
-- Client side, the same lower-is-better list lives in LOWER in edu/assets/common.js
-- and GLOW in admin/index.html.
-- ════════════════════════════════════════════════════════════════

alter table public.game_scores drop constraint if exists game_scores_game_check;
alter table public.game_scores drop constraint if exists game_scores_bounds;

alter table public.game_scores add constraint game_scores_game_check
  check (game in ('2048','snake','minesweeper','sudoku','word','typing','trivia','daily','letters',
                  'math','reaction','memory','blocks','breakout','flap','hangman','simon','connect'));

alter table public.game_scores add constraint game_scores_bounds check (case game
  when '2048'        then score between 0 and 4000000
  when 'snake'       then score between 0 and 2000
  when 'minesweeper' then score between 3 and 36000    -- seconds
  when 'sudoku'      then score between 30 and 36000   -- seconds
  when 'word'        then score between 1 and 6        -- guesses
  when 'typing'      then score between 1 and 250      -- words per minute
  when 'trivia'      then score between 0 and 100000
  when 'daily'       then score between 0 and 2500
  when 'letters'     then score between 0 and 6000
  when 'math'        then score between 0 and 400      -- points in 60s
  when 'reaction'    then score between 80 and 2000    -- average ms, lower is better
  when 'memory'      then score between 5 and 3600     -- seconds to clear 6x6, lower is better
  when 'blocks'      then score between 0 and 999999
  when 'breakout'    then score between 0 and 100000
  when 'flap'        then score between 0 and 9999     -- pipes passed
  when 'hangman'     then score between 0 and 500      -- words solved in a row
  when 'simon'       then score between 0 and 200      -- longest sequence
  when 'connect'     then score between 0 and 200      -- wins in a row on Hard
end);

-- Leaderboard with name styling (same as profiles2.sql, with the lower-is-better list extended).
create or replace function public.game_board(g text, period text default 'week', lim int default 20)
returns table (rank int, name text, username text, color text, tags text[], score int, mine boolean)
language sql stable security definer set search_path = public as $$
  with low as (select g in ('minesweeper','sudoku','word','reaction','memory') as lower_better),
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
         pr.display_name, pr.username, pr.name_color, pr.tags, b.score, b.user_id = auth.uid()
  from best b join public.profiles pr on pr.user_id = b.user_id
  order by 1, pr.display_name
  limit least(greatest(lim, 1), 100);
$$;
revoke execute on function public.game_board(text, text, int) from public;
grant execute on function public.game_board(text, text, int) to anon, authenticated;
