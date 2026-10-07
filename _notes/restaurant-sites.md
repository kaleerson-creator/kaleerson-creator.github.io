# Restaurant sites: playbook

How to go from a lead in `_notes/prospects/` to a paying customer. Not published (the `_notes` folder stays in the repo only).

## The offer

One sentence: "A fast website on your own domain, with your menu, hours, online ordering and reservations hooked up, and I keep it all running and updated for a monthly fee."

| Size (guess from the lead sheet) | Setup | Monthly | Who this usually is |
|---|---|---|---|
| Small | $500 | $79 | Cafe, taco shop, food truck, under ~400 reviews |
| Medium | $1,000 | $129 | Busy sit-down place, 400 to 1,500 reviews |
| Large | $1,800 | $199 | 1,500+ reviews, pricier menu, events or catering |

- The size column in each lead sheet is a guess from review count, price level and type. Adjust it once you see the place: number of tables, how busy it is, whether there's a bar or event space.
- Comparison to mention: Popmenu charges $179 to $499 a month and Owner.com $499 a month. Yours is cheaper and they deal with a real person.
- Setup can be split over 3 months if they hesitate. Don't go below half the setup price. Walk away rather than drop the monthly fee under $79.
- What the monthly fee covers: the domain renewal, hosting, SSL and DDoS protection (Cloudflare), menu, hours and specials updates within 2 business days, keeping ordering and booking buttons working when vendors change things, a monthly check that everything loads.
- Your real costs per site: about $11 to $17 a year for a .com. Hosting and Cloudflare are free. The monthly fee is mostly paying for your time and for being reliable.

## This week, in order

1. Merge the branch so the demos are live at kaleerson.com/demos/<name>/. Open 5 on your phone and make sure they look right.
2. Pick 10 leads you can visit in person (Las Vegas first, it's local). Prefer "no website" leads with lots of reviews. Skip anything flagged "is registered: check it" until you've looked.
3. Visit between 2 and 4 pm on a weekday (after lunch, before dinner). Ask for the owner or manager. Show the demo on your phone.
4. Same day: text or email the link plus the price. Follow up once after 3 days and once after a week. Then stop.
5. For Springdale and SoCal, call instead of visiting. Get an email or a cell number for the text.
6. Track every contact in a simple sheet: date, who you talked to, what they said, next step. Add anyone who says no to `_notes/prospects/skip.txt`.

## What to say

**In person (30 seconds):**
> Hi, I'm Kale. I build websites for local restaurants. I noticed [name] has great reviews on Google but no website, so people searching for you only get Google or Yelp. I made you a preview, can I show you? [show phone] It has your hours, call and directions buttons, and I can hook up online ordering through [Square/Toast/DoorDash, whatever they use] and reservations. I'd set it up on [their domain] for [setup] and keep it running and updated for [monthly] a month. Can I text you the link?

**Text or email follow-up:**
> Hi [name], it's Kale from earlier. Here's the preview of your website: kaleerson.com/demos/[slug]/
> I can put it live at [domain] this week. It's [setup] to set up, then [monthly]/month and I handle updates, hosting and keeping your ordering and booking buttons working. Want me to reserve the domain before someone else takes it?

**If they say "how much do you want?" or "too expensive":** offer the setup split over 3 months, or the first month free. Don't ask them to name a price.

**Cold email rules (US law, CAN-SPAM):** use your real name, a truthful subject line, a mailing address at the bottom, and a line like "Reply 'no thanks' and I won't email again." Honor it.

## When they say yes: what to collect

Send this list, or fill it in together on the spot. Everything goes in `_demos/<slug>.json`, then tell Claude to launch it.

- [ ] Domain they want from the open list on their lead row (buy it the same day on Namecheap)
- [ ] Menu: a photo or PDF is fine
- [ ] 3 to 8 photos they own (food, inside, outside) and a logo if they have one
- [ ] Email where event and catering inquiries should go
- [ ] What they already use, and the link or code for each:
  - **Square ordering or gift cards:** Square Dashboard → Online → copy their ordering site link
  - **Toast:** their Toast online ordering link (Toast → Online ordering → share link)
  - **DoorDash Storefront (no commission):** DoorDash Merchant Portal → Storefront → copy link. If they don't have it, it's free to turn on there.
  - **DoorDash / Uber Eats / Grubhub:** just their public store page links
  - **Resy:** Resy OS → Venue → Widget → copy the code
  - **OpenTable:** Restaurant Center → Marketing → Widgets → copy the code
  - **Tripleseat:** Settings → Lead Forms → Setup Codes (or "View Live Page" link)
  - **Instagram, Facebook, TikTok, Yelp** links
- [ ] Signed agreement (below) and the first payment

## Monthly upkeep checklist (per client, ~15 minutes)

- [ ] Open the site on a phone. Click order, reserve, call, directions.
- [ ] Check hours still match Google. Apply any menu or specials changes they sent.
- [ ] Domain auto-renew is on and the card works (Namecheap).
- [ ] Invoice paid (Stripe or Square auto-pay).

## Getting paid

- Use Stripe or Square invoices with auto-pay for the monthly fee.
- **If you're under 18:** Stripe requires a parent or guardian to be the account owner before it can accept payments. Square also requires an adult. A parent should co-sign the agreements too, since contracts with minors can be cancelled.
- Keep a simple record of every payment and expense (domains). Once you earn more than $400 in a year from this, you file self-employment tax. Check whether your city or state wants a business license once it's a steady thing.

## Simple agreement (template, not legal advice)

> **Website services agreement**
>
> Between **[Restaurant legal name]** ("Client") and **Kale Erson** ("Provider"). Date: ______
>
> 1. **What Provider does.** Builds a website for Client at **[domain]**, sets up the domain, hosting, SSL and DDoS protection, and connects the ordering, reservation and other services Client chooses. Each month Provider keeps the site online, makes menu, hours and specials changes within 2 business days of a request, and fixes broken buttons or embeds.
> 2. **Fees.** Setup: **$[setup]**, due at signing (or in 3 monthly parts). Monthly: **$[monthly]**, billed automatically starting the month the site goes live.
> 3. **Term.** Month to month. Either side can cancel with 30 days' notice.
> 4. **Domain.** The domain belongs to Client. Provider registers and renews it for Client. If Client cancels and is paid up, Provider transfers the domain to Client's own account at no charge.
> 5. **Client's content.** Client provides the menu, prices, photos and logo, confirms it has the right to use them, and is responsible for prices and allergy information being accurate.
> 6. **Other services.** Ordering, payment and reservation services (Square, Toast, DoorDash, Resy, OpenTable, Tripleseat, etc.) are Client's own accounts under their own terms and fees. Provider connects them but is not responsible for their outages or charges.
> 7. **Late payment.** If a monthly payment is more than 30 days late, Provider may pause the site until it's paid.
> 8. **Uptime.** Provider uses reasonable care to keep the site online but can't guarantee it will never go down.
>
> Client: __________________ Name/title: __________________
> Provider: __________________ (Kale Erson)
> Parent/guardian of Provider (if under 18): __________________
