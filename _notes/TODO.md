# kaleerson.com — to-do list

Last updated: Oct 2, 2026. Folders starting with `_` aren't published, so this note only lives in the repo.

## For Kale to do

- [ ] **Run one SQL snippet** for the debate Team page: open Supabase → SQL Editor, paste everything in `supabase/teams_leave.sql`, Run. (Lets people leave or delete a team. It deletes rows, so it needs your OK.)
- [ ] **Turn on email alerts first** (below): Study reminder emails also use it.

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

## Done in this round

- [x] Usernames (permanent), name colors + tags set in /admin, account Settings tab
- [x] Speech & Debate: speech drill, ballot helper, private case + evidence library, team sharing with join codes
- [x] Study: follow classes ("My classes"), reminder emails the evening before tests, search all posts, copy decks to another class
- [x] Games: Daily Challenge, Letter Rush (solo + online race), more trivia, admin Games tab to delete bad scores
- [x] Pictures on every clickable box (assets/art.js), full light/dark check of every page

## Ideas for later

- Speech drill: save recordings to your account
- Team page: coach view of everyone's drill stats
- More online games (Battleship, Pictionary)

## Notes

- Leaderboard scores come from the player's browser, so they can't be made cheat-proof. Impossible scores are blocked, and the Daily Word allows one result per day.
- Study's answer filter only catches obvious answer lists. The Report button and admin removal are the real safeguard.
- "Not secure" showing on some of Kale's Chrome profiles is local browser state. The site's certificate is valid.
- Games source: `_edu-src/` (`.page` files). Run `python3 _edu-src/build.py` to rebuild `edu/` (it also re-runs `_tools/meta.py`).
- Usernames: lowercase letters, numbers and `_`, 3–20 long. A database trigger blocks changes once set (admins can change one in the Supabase table editor). Name colors and tags are only writable through `admin_set_style`.
- Box pictures: `assets/art.js` draws them from `data-art="name"`. Add a new drawing there to use it on a new box.
- Study reminders: pg_cron job `study-reminders` runs 01:30 UTC daily and calls the `study-reminders` edge function (needs RESEND_API_KEY).
- Link previews and icon: `_tools/meta.py` adds them to every page. Re-run it after adding a new page.
