-- More games: Daily Challenge (same 10 trivia questions for everyone, one try a day)
-- and Letter Rush (make words from 7 letters in 90 seconds).
alter table public.game_scores drop constraint game_scores_game_check;
alter table public.game_scores drop constraint game_scores_bounds;
alter table public.game_scores add constraint game_scores_game_check
  check (game in ('2048','snake','minesweeper','sudoku','word','typing','trivia','daily','letters'));
alter table public.game_scores add constraint game_scores_bounds check (case game
  when '2048'        then score between 0 and 4000000
  when 'snake'       then score between 0 and 2000
  when 'minesweeper' then score between 3 and 36000
  when 'sudoku'      then score between 30 and 36000
  when 'word'        then score between 1 and 6
  when 'typing'      then score between 1 and 250
  when 'trivia'      then score between 0 and 100000
  when 'daily'       then score between 0 and 2500
  when 'letters'     then score between 0 and 6000
end);
create unique index if not exists game_scores_daily_once on public.game_scores (user_id, day) where game = 'daily';
