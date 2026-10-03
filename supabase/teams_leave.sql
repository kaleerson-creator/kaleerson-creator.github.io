-- Run this one in Supabase → SQL Editor (it deletes rows, so it needs your OK).
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

revoke execute on function public.leave_team(bigint) from public, anon;
grant execute on function public.leave_team(bigint) to authenticated;
