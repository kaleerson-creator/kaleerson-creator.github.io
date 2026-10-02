# Connecting the site to Supabase

This takes about 10 minutes. Until it's done, the site keeps working: Snapwit stays open to everyone with estimated percentiles, and `/join` and `/contact` say they aren't connected yet.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and sign up (free plan).
2. Click **New project**. Name it `kaleerson`, set a database password (save it in your password manager), and pick the region closest to Las Vegas (US West).
3. Wait about 2 minutes for it to finish setting up.

## 2. Create the database tables

1. In the left sidebar, open **SQL Editor** → **New query**.
2. Open [`schema.sql`](schema.sql) in this folder, copy all of it, paste it in, and click **Run**.
3. You should see "Success. No rows returned."

## 3. Set up sign-in emails

1. Open **Authentication** → **URL Configuration**.
2. Set **Site URL** to `https://kaleerson.com`
3. Under **Redirect URLs**, add both:
   - `https://kaleerson.com/**`
   - `https://kaleerson-creator.github.io/**`
4. Open **Authentication** → **Sign In / Providers** → **Email**. Make sure Email is enabled and **Confirm email** is on.

The built-in email sender only sends a few emails per hour. That's fine for testing. Before you share the sign-up link widely, connect a real email sender (step 7).

## 4. Send Claude the two keys

Open **Project Settings** → **API Keys** (or **API**) and copy:

- **Project URL**, which looks like `https://abcdefgh.supabase.co`
- **anon** or **publishable** key

Paste both in the chat. These are designed to be public, so sharing them is safe. **Never share** the `service_role` or `secret` key.

## 5. Write your contact page

In **SQL Editor**, run this with your own details. Lines starting with `#` become the title, `##` become section labels, and emails, phone numbers and links become tappable.

```sql
update public.contact_page set updated_at = now(), body =
'# Kale Erson
Founder, Las Vegas
## Email
you@example.com
## Phone
+1 702 555 0100
## Elsewhere
https://www.linkedin.com/in/your-name';
```

## 6. Make passwords and codes

All of these are run in the **SQL Editor**. Codes aren't case-sensitive.

**A shared password** that works any number of times. Use something long:

```sql
select add_contact_code('pick-a-long-phrase-here', false, 'shared password');
```

**A batch of one-time codes.** It returns codes like `K7QF-2MXR`. Copy them into your notes and give one to each person:

```sql
select * from make_contact_codes(10, 'October batch');
```

**A one-time code that also expires:**

```sql
select add_contact_code('MEETUP-2026', true, 'meetup', interval '7 days');
```

**See which codes were used:**

```sql
select label, single_use, used_at, expires_at, created_at from contact_codes order by created_at desc;
```

**Turn off the old shared password** (for example, after you change it):

```sql
delete from contact_codes where label = 'shared password';
```

## 7. Your mailing list

Everyone who verifies their email shows up in **Table Editor** → **members**, with an `email_opt_in` column. To get a list of people who want emails:

```sql
select email from members where email_opt_in order by joined_at;
```

To send emails from your own domain and raise the sending limit, create a free [Resend](https://resend.com) account, verify `kaleerson.com`, then paste its SMTP details into **Authentication** → **Emails** → **SMTP Settings**. Claude can walk you through it, and later set up newsletter sending with the same account.

## What's protected and how

| Thing | How it's protected |
|---|---|
| Contact info | Stored only in the database. The site's code never contains it. The database releases it only for a valid code, and locks everyone out for 10 minutes after 30 wrong guesses. |
| One-time codes | Stored as hashes, so even you can't read old codes back. Each code is marked used the moment it works. |
| Scores | Members can only add their own scores and read their own. Percentiles are calculated by the database. |
| Snapwit | The page asks for sign-in before you can play. The game code itself is public on GitHub, so this keeps casual visitors out but won't stop someone technical from copying it. |

## PVHS Study + forum

`study.sql` adds Study (invite-only, members redeem a code once on their account) and the public forum.
Already applied. In /admin → Codes, pick **Unlocks: Vault / Study / Both** when making codes.
Reports and Study members are under /admin → Study & forum.

## Site editor (/admin → Site editor)

Edge function `site-edit` (in `functions/site-edit/`) commits text edits to `main`. Only admins can call it.
It needs one secret, set in Supabase → Edge Functions → Secrets:

- `GITHUB_TOKEN`: a GitHub fine-grained token with access to only `kaleerson-creator.github.io`,
  permission **Contents: Read and write**, nothing else. Renew it when it expires.

## Sign-in help for blocked emails (/admin → People)

- `admin-users` edge function (admin-only): lists members, makes one-time sign-in links, gives/revokes personal links.
- `key-signin` edge function (public): trades a personal key from `kaleerson.com/join/#key=…` for a fresh one-time sign-in link.
- `access_keys` table stores only a SHA-256 hash of each personal key; no API access (service role only).
- Members can also set a password on /join/ and sign in with email + password.
- "Ask Kale to let me in": `login-request` edge function (public) + `login_requests` table (service role only).
  The waiting device holds a secret token (hash stored) and shows a 4-digit code; the admin approves in
  /admin → People → Waiting to get in, and the device's next poll gets a one-time sign-in link.
