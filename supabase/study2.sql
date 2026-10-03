-- Study upgrades: follow classes ("My classes") and opt-in email reminders the day before tests.
create table if not exists public.study_follows (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  class_id   bigint not null references public.study_classes on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, class_id)
);
alter table public.study_follows enable row level security;
create policy "follows own" on public.study_follows for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select public.is_study()));
revoke all on public.study_follows from anon, authenticated;
grant select, insert, delete on public.study_follows to authenticated;

alter table public.members add column if not exists study_reminders boolean not null default false;
grant update (email_opt_in, study_reminders) on public.members to authenticated;

-- One reminder per person per event (makes the daily job safe to run more than once).
create table if not exists public.study_reminder_log (
  user_id uuid not null references auth.users on delete cascade,
  post_id bigint not null references public.study_posts on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.study_reminder_log enable row level security;
revoke all on public.study_reminder_log from anon, authenticated;

-- Daily job at 01:30 UTC (evening in Las Vegas) that calls the study-reminders edge function.
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule('study-reminders', '30 1 * * *',
  $$select net.http_post(url := 'https://xkmuakmlrttnyxdddkmd.supabase.co/functions/v1/study-reminders', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)$$);
