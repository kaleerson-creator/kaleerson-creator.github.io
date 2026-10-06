-- ════════════════════════════════════════════════════════════════
-- Snapwit round 2: a Top 10 per game for the result screen.
-- Run after schema.sql (public.scores) and study.sql (public.profiles).
-- Safe to run again: it replaces what it created.
-- ════════════════════════════════════════════════════════════════

-- top_scores('react', true)  ->  the best run per member for one game, ranked, plus the caller's
-- own row even when it sits below the cut. lower=true ranks smaller values first (ms games).
-- Only the public display name leaves the database: no email, no user id.
drop function if exists public.top_scores(text, boolean, int);
create or replace function public.top_scores(g text, lower boolean default false, lim int default 10)
returns table (rank int, display_name text, best numeric, mine boolean)
language sql stable security definer set search_path = public as $$
  with best as (
    select s.user_id,
           case when top_scores.lower then min(s.value) else max(s.value) end as best
    from public.scores s
    where s.game = g
    group by s.user_id
  ),
  ranked as (
    select b.user_id, b.best,
           (rank() over (order by case when top_scores.lower then b.best else -b.best end))::int as rank,
           (row_number() over (order by case when top_scores.lower then b.best else -b.best end, b.user_id))::int as rn
    from best b
  )
  select r.rank,
         coalesce(nullif(trim(p.display_name), ''), 'Member') as display_name,
         r.best,
         coalesce(r.user_id = auth.uid(), false) as mine
  from ranked r
  left join public.profiles p on p.user_id = r.user_id
  where r.rn <= least(greatest(coalesce(lim, 10), 1), 100)
     or r.user_id = auth.uid()
  order by r.rank, r.rn;
$$;
revoke execute on function public.top_scores(text, boolean, int) from public;
grant execute on function public.top_scores(text, boolean, int) to anon, authenticated;
