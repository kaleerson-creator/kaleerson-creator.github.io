-- study3.sql — Study fixes (re-runnable, safe to paste into the SQL editor more than once).
-- Run AFTER study.sql, study2.sql and ratings.sql.
--
-- 1) content_guard: the "8 inserts per minute" flood check also ran on study_cards, so adding
--    the 9th flashcard in a minute failed with "You're posting too fast", and "Copy deck" (one
--    multi-row insert) failed for any deck with 9+ cards. Flashcards now get 60 per minute;
--    posts, forum threads/replies and ratings keep the limit of 8. The answer-key check is
--    unchanged and still runs on every table.
-- 2) forum_bump: deleting a reply decremented reply_count but left last_post_at at the deleted
--    reply's time, so the thread stayed at the top of the "active" ordering. It is now
--    recomputed from the remaining replies (or the thread's own created_at).
-- 3) study_posts.updated_at: posts can be edited in place now; the page shows "edited" when
--    updated_at is later than created_at.

-- ── 1) content_guard ────────────────────────────────────────────
create or replace function public.content_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  txt text := coalesce(to_jsonb(new)->>'title', '') || ' ' || coalesce(to_jsonb(new)->>'body', '')
              || ' ' || coalesce(to_jsonb(new)->>'front', '') || ' ' || coalesce(to_jsonb(new)->>'back', '')
              || ' ' || coalesce(to_jsonb(new)->>'comment', '');
  recent int;
  cap int := case when tg_table_name = 'study_cards' then 60 else 8 end;
begin
  if (select count(*) from regexp_matches(txt, '(?<![0-9])[0-9]{1,3}\s*[.):-]\s*[A-Ea-e](?![A-Za-z])', 'g')) >= 5
     or txt ~* '\m(answer key|answer sheet|test answers|quiz answers)\M' then
    raise exception 'This looks like test or assignment answers, which aren''t allowed. Share topics and study tips instead.'
      using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    execute format('select count(*) from public.%I where created_by = $1 and created_at > now() - interval ''1 minute''', tg_table_name)
      into recent using new.created_by;
    if recent >= cap then
      raise exception 'You''re posting too fast. Wait a minute and try again.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.content_guard() from public, anon, authenticated;

-- ── 2) forum_bump ───────────────────────────────────────────────
create or replace function public.forum_bump()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_threads set reply_count = reply_count + 1, last_post_at = now() where id = new.thread_id;
  else
    update public.forum_threads t
      set reply_count = greatest(reply_count - 1, 0),
          last_post_at = coalesce((select max(r.created_at) from public.forum_replies r where r.thread_id = old.thread_id), t.created_at)
      where t.id = old.thread_id;
  end if;
  return null;
end $$;
revoke execute on function public.forum_bump() from public, anon, authenticated;
-- The trigger forum_replies_bump (study.sql) already points at this function; nothing to recreate.

-- ── 3) study_posts.updated_at ───────────────────────────────────
alter table public.study_posts add column if not exists updated_at timestamptz;
create or replace function public.study_posts_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.study_posts_touch() from public, anon, authenticated;
drop trigger if exists study_posts_touch on public.study_posts;
create trigger study_posts_touch before update on public.study_posts for each row execute function public.study_posts_touch();
