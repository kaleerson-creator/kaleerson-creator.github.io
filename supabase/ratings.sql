-- ════════════════════════════════════════════════════════════════
-- Rate my teacher (PVHS Study members only). Applied after study.sql.
-- Ratings are anonymous to students: nobody can read created_by through
-- the API. Students read through functions that leave it out; only the
-- admin functions return who wrote what.
-- ════════════════════════════════════════════════════════════════

create table public.teacher_ratings (
  id         bigint generated always as identity primary key,
  teacher_id bigint not null references public.study_teachers on delete cascade,
  class_id   bigint references public.study_classes on delete set null,
  quality    smallint not null check (quality between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  take_again boolean not null,
  tags       text[] not null default '{}' check (cardinality(tags) <= 3 and tags <@ array[
    'Clear lectures','Helpful','Caring','Inspiring','Fair grader','Tough grader','Lots of homework',
    'Little homework','Gives extra credit','Group projects','Test heavy','Lecture heavy',
    'Hilarious','Respected','Easy to reach']::text[]),
  comment    text not null default '' check (char_length(comment) <= 1000),
  created_by uuid not null default auth.uid() references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, created_by)
);
create index teacher_ratings_teacher on public.teacher_ratings (teacher_id);
alter table public.teacher_ratings enable row level security;
-- No direct table access at all; everything goes through the functions below.
revoke all on public.teacher_ratings from anon, authenticated;

create trigger guard before insert or update on public.teacher_ratings
  for each row execute function public.content_guard();

-- content_guard reads title/body/front/back; teach it about comment too.
create or replace function public.content_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  txt text := coalesce(to_jsonb(new)->>'title', '') || ' ' || coalesce(to_jsonb(new)->>'body', '')
              || ' ' || coalesce(to_jsonb(new)->>'front', '') || ' ' || coalesce(to_jsonb(new)->>'back', '')
              || ' ' || coalesce(to_jsonb(new)->>'comment', '');
  recent int;
begin
  if (select count(*) from regexp_matches(txt, '(?<![0-9])[0-9]{1,3}\s*[.):-]\s*[A-Ea-e](?![A-Za-z])', 'g')) >= 5
     or txt ~* '\m(answer key|answer sheet|test answers|quiz answers)\M' then
    raise exception 'This looks like test or assignment answers, which aren''t allowed. Share topics and study tips instead.'
      using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    execute format('select count(*) from public.%I where created_by = $1 and created_at > now() - interval ''1 minute''', tg_table_name)
      into recent using new.created_by;
    if recent >= 8 then
      raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.content_guard() from public, anon, authenticated;

-- Reports can point at ratings.
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('study_post', 'study_card', 'study_deck', 'forum_thread', 'forum_reply', 'teacher_rating'));

-- ── Student functions ───────────────────────────────────────────
-- Averages for every teacher (directory).
create or replace function public.teacher_rating_summary()
returns table (teacher_id bigint, n int, quality numeric, difficulty numeric, take_again int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_study() then raise exception 'Not allowed'; end if;
  return query
    select r.teacher_id, count(*)::int, round(avg(r.quality), 1), round(avg(r.difficulty), 1),
           round(100.0 * avg(case when r.take_again then 1 else 0 end))::int
    from public.teacher_ratings r group by r.teacher_id;
end $$;

-- Ratings for one teacher, without who wrote them. "mine" marks your own.
create or replace function public.teacher_ratings_for(t bigint)
returns table (id bigint, class_id bigint, quality smallint, difficulty smallint, take_again boolean,
               tags text[], comment text, created_at timestamptz, updated_at timestamptz, mine boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_study() then raise exception 'Not allowed'; end if;
  return query
    select r.id, r.class_id, r.quality, r.difficulty, r.take_again, r.tags, r.comment,
           r.created_at, r.updated_at, r.created_by = auth.uid()
    from public.teacher_ratings r where r.teacher_id = t order by r.created_at desc;
end $$;

-- Add or update your rating (one per teacher).
create or replace function public.rate_teacher(t bigint, cls bigint, q int, d int, again boolean, tg text[], note text)
returns bigint language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if not public.is_study() then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.profiles where user_id = auth.uid()) then raise exception 'Pick a display name first'; end if;
  if cls is not null and not exists (select 1 from public.study_classes where id = cls and teacher_id = t) then cls := null; end if;
  insert into public.teacher_ratings (teacher_id, class_id, quality, difficulty, take_again, tags, comment, created_by)
    values (t, cls, q, d, again, coalesce(tg, '{}'), coalesce(trim(note), ''), auth.uid())
  on conflict (teacher_id, created_by) do update
    set class_id = excluded.class_id, quality = excluded.quality, difficulty = excluded.difficulty,
        take_again = excluded.take_again, tags = excluded.tags, comment = excluded.comment, updated_at = now()
  returning id into rid;
  return rid;
end $$;

create or replace function public.delete_my_rating(t bigint)
returns void language sql security definer set search_path = public as $$
  delete from public.teacher_ratings where teacher_id = t and created_by = auth.uid();
$$;

-- ── Admin functions (show who wrote what) ───────────────────────
create or replace function public.admin_teacher_ratings(ids bigint[] default null)
returns table (id bigint, teacher_id bigint, teacher text, quality smallint, difficulty smallint, take_again boolean,
               tags text[], comment text, created_at timestamptz, author text, author_id uuid)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select r.id, r.teacher_id, t.name, r.quality, r.difficulty, r.take_again, r.tags, r.comment, r.created_at,
           p.display_name, r.created_by
    from public.teacher_ratings r
    join public.study_teachers t on t.id = r.teacher_id
    left join public.profiles p on p.user_id = r.created_by
    where ids is null or r.id = any(ids)
    order by r.created_at desc limit 300;
end $$;

create or replace function public.admin_delete_rating(rid bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  delete from public.teacher_ratings where id = rid;
end $$;

do $$
declare f text;
begin
  foreach f in array array['teacher_rating_summary()','teacher_ratings_for(bigint)',
    'rate_teacher(bigint, bigint, int, int, boolean, text[], text)','delete_my_rating(bigint)',
    'admin_teacher_ratings(bigint[])','admin_delete_rating(bigint)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
