-- Private case and evidence library for /debate (#/cases). Each member only ever sees their own.
create table if not exists public.debate_cards (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null default 'card' check (kind in ('card', 'case')),
  title      text not null check (char_length(trim(title)) between 1 and 200),
  cite       text not null default '' check (char_length(cite) <= 600),
  body       text not null default '' check (char_length(body) <= 40000),
  topic      text not null default '' check (char_length(topic) <= 80),
  side       text not null default 'both' check (side in ('aff', 'neg', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists debate_cards_user on public.debate_cards (user_id, updated_at desc);
alter table public.debate_cards enable row level security;
create policy "own cards" on public.debate_cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.debate_cards from anon, authenticated;
grant select, insert, delete on public.debate_cards to authenticated;
grant update (kind, title, cite, body, topic, side, updated_at) on public.debate_cards to authenticated;

create or replace function public.debate_cards_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.debate_cards where user_id = new.user_id) >= 1000 then
    raise exception 'Your library is full (1000 items). Delete some old ones first.' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.debate_cards_guard() from public, anon, authenticated;
create trigger guard before insert or update on public.debate_cards for each row execute function public.debate_cards_guard();
