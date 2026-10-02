# kaleerson.com — to-do list

Last updated: Oct 2, 2026. Folders starting with `_` aren't published, so this note only lives in the repo.

## For Kale to do

- [ ] **Test the games with a friend.** Open kaleerson.com/edu/play on two devices, make a room on one, join with the code on the other. This is the first real run of online rooms.
- [ ] **Try a leaderboard.** Sign in (Join), play any game on kaleerson.com/edu, and check that your score shows up.
- [ ] **Turn on email alerts.** Resend → API Keys → Create (Sending access, kaleerson.com) → Supabase → Edge Functions → Secrets → add `RESEND_API_KEY`. /admin → People shows the steps until it works.
- [ ] **Hand out Study codes.** /admin → Codes → set *Unlocks* to **Study** (or **Both**) → Make codes.
- [ ] **Fill in the vault.** /admin → Sections and Files (contact, socials, resume, projects, photos).
- [ ] **Renew the Site editor's GitHub token before Oct 31.** Calendar reminder on Oct 24; /admin shows a banner from Oct 17. Steps are in the calendar event.
- [ ] **Business cards.** When they arrive, scan one to check the QR opens kaleerson.com/card.
- [ ] **GitHub Pages → Enforce HTTPS** for kaleerson.com, if it isn't ticked yet.
- [ ] **PVHS Study** still says "In development" on Tools. Say the word to switch it to Active.

### No longer needed
- The `games` repo, the `games` CNAME at Namecheap and the Supabase redirect URL for games.kaleerson.com. The games now live at kaleerson.com/edu and use the normal Join page. If the repo or DNS record was already made, it can stay or be deleted.

## Waiting on a decision

- **More Speech & Debate tools** (pick any): case library, evidence cards, speech drills (record + filler-word count), private team page, judge ballot helper, official topic tracker.
- **Move games to games.kaleerson.com later** if school filters start blocking kaleerson.com. The site is built so this is a quick move.

## Ideas / backlog

- Admin tab to delete bad leaderboard scores (the database already allows admin deletes).
- Games: more online games (e.g. Battleship, word race), daily Sudoku, more trivia questions.
- Study: email reminders before tests, flashcard sharing between classes.

## Notes

- Leaderboard scores come from the player's browser, so they can't be made cheat-proof. Impossible scores are blocked, and the Daily Word allows one result per day.
- Study's answer filter only catches obvious answer lists. The Report button and admin removal are the real safeguard.
- "Not secure" showing on some of Kale's Chrome profiles is local browser state. The site's certificate is valid.
- Games source: `_edu-src/` (`.page` files). Run `python3 _edu-src/build.py` to rebuild `edu/` (it also re-runs `_tools/meta.py`).
- Link previews and icon: `_tools/meta.py` adds them to every page. Re-run it after adding a new page.
