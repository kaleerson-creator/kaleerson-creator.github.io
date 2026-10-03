-- Debate teams: a shared card library. Someone makes a team and gets a join code;
-- teammates join with the code and can read every card shared to the team.
create table if not exists public.debate_teams (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(trim(name)) between 2 and 60),
  code       text not null unique,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.debate_team_members (
  team_id   bigint not null references public.debate_teams on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create table if not exists public.debate_team_tries (
  user_id uuid not null references auth.users on delete cascade,
  at      timestamptz not null default now()
);
alter table public.debate_teams enable row level security;
alter table public.debate_team_members enable row level security;
alter table public.debate_team_tries enable row level security;
revoke all on public.debate_teams, public.debate_team_members, public.debate_team_tries from anon, authenticated;

create or replace function public.is_team_member(t bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.debate_team_members where team_id = t and user_id = auth.uid());
$$;
revoke execute on function public.is_team_member(bigint) from public, anon;
grant execute on function public.is_team_member(bigint) to authenticated;

-- Cards can be shared to one of your teams; teammates can read them (only the author edits).
alter table public.debate_cards add column if not exists team_id bigint references public.debate_teams on delete set null;
create index if not exists debate_cards_team on public.debate_cards (team_id, updated_at desc) where team_id is not null;
grant update (team_id) on public.debate_cards to authenticated;
create policy "team cards readable" on public.debate_cards for select to authenticated
  using (team_id is not null and (select public.is_team_member(team_id)));
create policy "share only to my teams" on public.debate_cards as restrictive for insert to authenticated
  with check (team_id is null or (select public.is_team_member(team_id)));
create policy "share only to my teams (edit)" on public.debate_cards as restrictive for update to authenticated
  with check (team_id is null or (select public.is_team_member(team_id)));

create or replace function public.my_teams()
returns table (id bigint, name text, code text, role text, members int)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, case when m.role = 'owner' then t.code end, m.role,
         (select count(*)::int from public.debate_team_members x where x.team_id = t.id)
  from public.debate_team_members m join public.debate_teams t on t.id = m.team_id
  where m.user_id = auth.uid() order by t.name;
$$;

create or replace function public.team_roster(t bigint)
returns table (name text, username text, role text)
language sql stable security definer set search_path = public as $$
  select p.display_name, p.username, m.role from public.debate_team_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.team_id = t and public.is_team_member(t) order by m.role desc, p.display_name;
$$;

create or replace function public.create_team(n text)
returns bigint language plpgsql security definer set search_path = public as $$
declare c text; tid bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if (select count(*) from public.debate_team_members where user_id = auth.uid() and role = 'owner') >= 5 then
    raise exception 'You can run up to 5 teams.' using errcode = 'P0001'; end if;
  loop
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.debate_teams where code = c);
  end loop;
  insert into public.debate_teams (name, code) values (trim(n), c) returning id into tid;
  insert into public.debate_team_members (team_id, user_id, role) values (tid, auth.uid(), 'owner');
  return tid;
end $$;

create or replace function public.join_team(c text)
returns bigint language plpgsql security definer set search_path = public as $$
declare tid bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if (select count(*) from public.debate_team_tries where user_id = auth.uid() and at > now() - interval '10 minutes') >= 10 then
    raise exception 'Too many tries. Wait a few minutes.' using errcode = 'P0001'; end if;
  insert into public.debate_team_tries (user_id) values (auth.uid());
  select id into tid from public.debate_teams where code = upper(regexp_replace(c, '[^A-Za-z0-9]', '', 'g'));
  if tid is null then raise exception 'No team has that code.' using errcode = 'P0001'; end if;
  if (select count(*) from public.debate_team_members where team_id = tid) >= 60 then
    raise exception 'That team is full.' using errcode = 'P0001'; end if;
  insert into public.debate_team_members (team_id, user_id) values (tid, auth.uid()) on conflict do nothing;
  return tid;
end $$;

-- Leaving takes your shared cards back to private. An owner leaving deletes the team.
create or replace function public.leave_team(t bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select role from public.debate_team_members where team_id = t and user_id = auth.uid()) = 'owner' then
    update public.debate_cards set team_id = null where team_id = t;
    delete from public.debate_teams where id = t;
  else
    update public.debate_cards set team_id = null where team_id = t and user_id = auth.uid();
    delete from public.debate_team_members where team_id = t and user_id = auth.uid();
  end if;
end $$;

create or replace function public.new_team_code(t bigint)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if (select role from public.debate_team_members where team_id = t and user_id = auth.uid()) is distinct from 'owner' then raise exception 'Not allowed'; end if;
  loop
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.debate_teams where code = c);
  end loop;
  update public.debate_teams set code = c where id = t;
  return c;
end $$;

revoke execute on function public.my_teams(), public.team_roster(bigint), public.create_team(text), public.join_team(text), public.leave_team(bigint), public.new_team_code(bigint) from public, anon;
grant execute on function public.my_teams(), public.team_roster(bigint), public.create_team(text), public.join_team(text), public.leave_team(bigint), public.new_team_code(bigint) to authenticated;
