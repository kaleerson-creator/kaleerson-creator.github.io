-- Usernames (set once), plus name colors and tags that only admins can set.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists name_color text;
alter table public.profiles add column if not exists tags text[] not null default '{}';
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_]{3,20}$');
alter table public.profiles add constraint profiles_color_format check (name_color is null or name_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.profiles add constraint profiles_tags_limit check (cardinality(tags) <= 5);
create unique index if not exists profiles_username_unique on public.profiles (username);

-- Members may only write their own display name and username; colors and tags are admin-only.
revoke insert, update on public.profiles from authenticated, anon;
grant insert (user_id, display_name, username) on public.profiles to authenticated;
grant update (display_name, username) on public.profiles to authenticated;

-- A username can be picked once. Only an admin can change it after that.
create or replace function public.profiles_username_lock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.username is not null then new.username := lower(new.username); end if;
  if tg_op = 'UPDATE' and old.username is not null and new.username is distinct from old.username and not public.is_admin() then
    raise exception 'Usernames can''t be changed.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.profiles_username_lock() from public, anon, authenticated;
create trigger username_lock before insert or update on public.profiles for each row execute function public.profiles_username_lock();

create or replace function public.username_available(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select lower(u) ~ '^[a-z0-9_]{3,20}$' and not exists (select 1 from public.profiles where username = lower(u));
$$;
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.admin_set_style(uid uuid, color text, tg text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  update public.profiles
     set name_color = nullif(color, ''),
         tags = coalesce((select array_agg(distinct left(trim(t), 20)) from unnest(coalesce(tg, '{}')) t where trim(t) <> ''), '{}')
   where user_id = uid;
  if not found then raise exception 'That member has no profile yet.'; end if;
end $$;
revoke execute on function public.admin_set_style(uuid, text, text[]) from public, anon;
grant execute on function public.admin_set_style(uuid, text, text[]) to authenticated;

-- Leaderboard with name styling (new name so the old one keeps working until clients update).
create or replace function public.game_board(g text, period text default 'week', lim int default 20)
returns table (rank int, name text, username text, color text, tags text[], score int, mine boolean)
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
         pr.display_name, pr.username, pr.name_color, pr.tags, b.score, b.user_id = auth.uid()
  from best b join public.profiles pr on pr.user_id = b.user_id
  order by 1, pr.display_name
  limit least(greatest(lim, 1), 100);
$$;
revoke execute on function public.game_board(text, text, int) from public;
grant execute on function public.game_board(text, text, int) to anon, authenticated;
