# Prompt for Claude Design: restaurant site template

Paste everything inside the box below into Claude Design. When it's done, share or publish it and paste only the link into the Claude Code chat. If it only gives a file, upload it to the repo instead: GitHub → this repo → Add file → Upload files → put it in a folder named `_design` → Commit. Then say "uploaded".

```text
Design ONE reusable website template for independent restaurants. I'll fill it with each restaurant's data automatically, so it must look great for a busy brunch spot, a taco shop or a sushi bar, with or without photos, and with any mix of optional sections switched off.

Show it filled in with this real sample restaurant:
- The Park House, Breakfast Restaurant, Springdale, Utah (next to Zion National Park)
- "An array of classic American fare with a focus on small plates, burgers, & brunch in a homey space."
- 4.8 stars, 934 Google reviews
- 1880 Zion – Mount Carmel Hwy, Springdale, UT 84767 · (435) 772-0100
- Open every day 8 AM – 2 PM
- Dine-in, takeout, reservations, outdoor seating, breakfast, brunch, lunch, coffee, beer, vegetarian options, good for kids, good for groups
- Use a believable 3-section brunch menu with prices, clearly marked as sample content.

STYLE: "printed menu meets modern editorial"
- Feels like a well-designed paper menu and a good food magazine, not a SaaS landing page.
- Type: Gloock (headings, large and confident) + Instrument Sans (everything else), both from Google Fonts. Small-caps or letter-spaced uppercase labels for section kickers.
- Layout: asymmetric editorial grid, generous whitespace, thin 1px rules between sections, numbered section markers (01 Menu, 02 Order...), menu items with dot leaders to the price.
- Detail: very subtle paper grain on the background; the hours block styled like a small printed ticket or receipt; today's hours highlighted; a live "Open now / Closed · opens 8 AM" pill.
- Corners: small radius (4–8px) on cards and photos; buttons are solid rectangles with a slight radius, not pills everywhere.
- Avoid the generic AI-website look: no gradients, no blurry blobs, no glassmorphism, no emoji, no icon-in-a-circle feature grids, no centering everything, no stock-photo hero with a dark overlay.
- Three color themes, switchable with data-theme on <html>, all colors as CSS variables in :root:
  1. "diner" (breakfast, cafe, American): paper #F6EFE3, ink #1E1A16, accent tomato #D2451E, second butter #F2C14E
  2. "taqueria" (Mexican, Latin): paper #F4EDE4, ink #1B1712, accent chile #B5281C, second agave #3F6B4F, highlight marigold #E8A33D
  3. "evening" (sushi, Asian, steak, wine bar): dark paper #151412, text #EDE8E0, accent vermilion #E0482F, second brass #C59A5B
  Also a dark-mode version of themes 1 and 2 via prefers-color-scheme.

SECTIONS, in order. Every optional one must look intentional when it's missing or partly filled:
1. Thin top banner (optional): "Preview website made for The Park House by Kale Erson. Not the official site yet. Like it? Get in touch" (link).
2. Header: restaurant name as the logo (no logo image needed), section links, EN/ES language toggle, one primary button (Order online, or Call if there's no ordering).
3. Hero: cuisine · town kicker, big name, one-line description, rating with review count, open-now pill, short address, 2–4 buttons (Order online, Reserve, Call, Directions). Must look strong with NO photo (use type, color and a texture or pattern) and also with one wide photo.
4. Today's special strip (optional, one sentence).
5. 01 Menu: sections with item name, short description, price and small dietary tags (V, GF). Alternate state: "Menu coming soon" card.
6. 02 Order: primary "Order online" button (links to Square, Toast or DoorDash Storefront), then a row of plain text buttons for DoorDash, Uber Eats and Grubhub (no brand logos). Alternate state: no online ordering, just "Call to order".
7. 03 Reserve: a slot for an embedded third-party booking widget (Resy or OpenTable, about 420px tall), or link buttons, or "Walk-ins welcome · Call to reserve".
8. 04 Events & catering: short pitch plus a form (name, phone, email, date, guests, message). Alternate state: a slot for an embedded Tripleseat form.
9. Photo gallery (optional, 3–8 images, editorial mosaic).
10. Good to know: amenities as quiet tags (Outdoor seating, Good for kids...).
11. 05 Visit: address, phone, Google Maps and Apple Maps buttons, the hours ticket, and a map embed (iframe).
12. Review prompt: "Had a great meal? Leave a Google review" with button.
13. Footer: name, address, phone, links (Gift cards, Jobs, Instagram, Facebook), "Website by Kale Erson".
14. Mobile only: sticky bottom bar with 3 buttons (Call, Directions, Order or Menu).

TECHNICAL (important, I generate pages from this automatically):
- One self-contained HTML file: inline <style> and a small amount of vanilla JS. No frameworks, no Tailwind, no build step, no external JS. Google Fonts is the only external resource.
- Mobile first: perfect at 375px wide with no sideways scrolling, scales up to a 1200px max-width desktop layout.
- Mark everything that changes per restaurant: text as {{double_brace}} placeholders in comments next to the sample text, repeatable blocks wrapped in <!-- repeat: menu-item --> ... <!-- /repeat -->, optional sections wrapped in <!-- optional: order --> ... <!-- /optional -->.
- Accessible: WCAG AA contrast in every theme, 44px minimum tap targets, visible focus states, real <button>/<a> elements, alt text.
- Light: under 60KB excluding fonts and photos.
- Show the result at phone width and desktop width, and include a short list of the CSS variables and placeholders at the end.
```
