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
- [ ] **Give out name styles.** /admin → People → **Style** sets someone's name color and tags (e.g. *Owner*, *Mod*, *Debate*). Start with your own.
- [ ] **Pick your own username.** You'll be asked the next time you open the forum, Study or your Account page. It can't be changed later (except by you in Supabase).
- [ ] **Namecheap (optional).** Delete the `games` CNAME if you made one. Nothing else at Namecheap needs changing.

### No longer needed
- The `games` repo, the `games` CNAME at Namecheap and the Supabase redirect URL for games.kaleerson.com. The games now live at kaleerson.com/edu and use the normal Join page. If the repo or DNS record was already made, it can stay or be deleted.

## Waiting on a decision

- **Move games to games.kaleerson.com later** if school filters start blocking kaleerson.com. The site is built so this is a quick move.

## Claude is working on (in order)

- [x] Usernames (permanent), name colors + tags set in /admin, account Settings tab
- [ ] Speech & Debate extras: speech drills (record + filler-word count), judge ballot helper, private case library + evidence cards, team page
- [ ] Study upgrades: search notes, email reminders before tests, share decks between classes
- [ ] More games: daily challenge, more trivia, online word race / Battleship, admin tool to delete bad scores

## Notes

- Leaderboard scores come from the player's browser, so they can't be made cheat-proof. Impossible scores are blocked, and the Daily Word allows one result per day.
- Study's answer filter only catches obvious answer lists. The Report button and admin removal are the real safeguard.
- "Not secure" showing on some of Kale's Chrome profiles is local browser state. The site's certificate is valid.
- Games source: `_edu-src/` (`.page` files). Run `python3 _edu-src/build.py` to rebuild `edu/` (it also re-runs `_tools/meta.py`).
- Usernames: lowercase letters, numbers and `_`, 3–20 long. A database trigger blocks changes once set (admins can change one in the Supabase table editor). Name colors and tags are only writable through `admin_set_style`.
- Link previews and icon: `_tools/meta.py` adds them to every page. Re-run it after adding a new page.
