-- Public profile pages (/u/#username). Applied after profiles2.sql and the games SQL.
-- One read-only RPC returns everything the page shows: the styled name, when they joined,
-- their best score per game and where that puts them this week. Nothing private (no email,
-- no user id) leaves the database. Safe to run again.

create or replace function public.public_profile(u text)
returns jsonb language sql stable security definer set search_path = public as $$
  with p as (
    select user_id, display_name, username, name_color, tags, created_at
    from public.profiles
    where username = lower(trim(both '@' from trim(coalesce(u, ''))))
    limit 1
  ),
  low as (select array['minesweeper','sudoku','word','reaction','memory']::text[] as keys),
  best as (
    -- best score per game: lowest for time/guess games, highest for the rest
    select s.game,
           case when s.game = any((select keys from low)) then min(s.score) else max(s.score) end as score,
           count(*)::int as plays
    from public.game_scores s join p on s.user_id = p.user_id
    group by s.game
  ),
  week as (
    -- rank among every member's best this week, for each game they played this week
    select w.game, w.rnk from (
      select s.game, s.user_id,
             rank() over (partition by s.game
                          order by case when s.game = any((select keys from low)) then min(s.score) else -max(s.score) end)::int as rnk
      from public.game_scores s
      where s.day > (now() at time zone 'America/Los_Angeles')::date - 7
      group by s.game, s.user_id
    ) w join p on w.user_id = p.user_id
  )
  select case when exists (select 1 from p) then jsonb_build_object(
    'display_name', (select display_name from p),
    'username',     (select username from p),
    'name_color',   (select name_color from p),
    'tags',         to_jsonb(coalesce((select tags from p), '{}'::text[])),
    'joined',       (select created_at from p),
    'best',         coalesce((select jsonb_object_agg(game, score) from best), '{}'::jsonb),
    'plays',        coalesce((select sum(plays) from best), 0),
    'week_rank',    coalesce((select jsonb_object_agg(game, rnk) from week), '{}'::jsonb)
  ) end;
$$;
revoke execute on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;
