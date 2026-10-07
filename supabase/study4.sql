-- study4.sql — Public deck links (re-runnable, safe to paste into the SQL editor more than once).
-- Run AFTER study.sql, study2.sql, ratings.sql and study3.sql.
--
-- A deck's owner (or an admin) can flip "Public link" in the deck's Share box. Anyone who opens
-- https://kaleerson.com/study/#/p/<deck id> then gets the deck title and its cards through
-- public_deck(), with no account and no invite code. Nothing else leaks: no class, teacher,
-- author or other decks, and a deck that is not public returns null. Decks are private by
-- default. Until this file has been run the page says "Public decks aren't turned on yet."

-- ── 1) study_decks.public ───────────────────────────────────────
alter table public.study_decks add column if not exists public boolean not null default false;
-- Who may flip it: the existing "study edit own" policy on study_decks (owner or admin). The
-- column grant is explicit so the intent survives if table-level update is ever revoked.
grant update (public) on public.study_decks to authenticated;

-- ── 2) public_deck(deck_id) ─────────────────────────────────────
drop function if exists public.public_deck(bigint);
create function public.public_deck(deck_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', d.id,
    'title', d.title,
    'cards', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'front', c.front, 'back', c.back) order by c.id)
                       from public.study_cards c where c.deck_id = d.id), '[]'::jsonb))
  from public.study_decks d
  where d.id = public_deck.deck_id and d.public;
$$;
revoke execute on function public.public_deck(bigint) from public;
grant execute on function public.public_deck(bigint) to anon, authenticated;
