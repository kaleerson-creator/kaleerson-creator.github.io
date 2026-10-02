# Kale's Games

Source for [games.kaleerson.com](https://games.kaleerson.com): quick browser games, online rooms and PVHS leaderboards.

- Static site on GitHub Pages (custom domain in `CNAME`).
- Sign-in, scores and online rooms use the same Supabase project as kaleerson.com
  (`game_scores` table + `game_leaderboard()`; rooms use Realtime broadcast/presence).
- Each game is a folder with an `index.html`. Shared files live in `assets/`.
