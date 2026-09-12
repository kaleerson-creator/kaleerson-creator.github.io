# CLAUDE.md

Guidance for AI assistants (Claude Code and similar) working in this repository.

## What this repository is

This is the personal portfolio website of Kale Erson, served by **GitHub Pages**
at the custom domain **https://kaleerson.com** (configured via the `CNAME` file).
Because the repo is named `<user>.github.io`, GitHub Pages deploys the `main`
branch automatically — there is no build step, CI pipeline, or deploy script.
Whatever is merged to `main` is live within minutes.

## Repository structure

```
.
├── CLAUDE.md    # This file
├── CNAME        # Custom domain for GitHub Pages: kaleerson.com (do not delete or edit casually)
└── index.html   # The entire site: markup, CSS, and JS in one self-contained file
```

That's it. There are no dependencies, no `package.json`, no framework, no
preprocessors, and no tests. `index.html` is the whole product.

## Architecture of index.html

Everything lives in one file, in this order:

1. **`<head>`** — meta tags, Google Fonts (`Instrument Serif` for headings,
   `Geist` for body text), and a single `<style>` block containing all CSS.
2. **`<body>`** — page sections in order: fixed nav, search overlay, hero,
   about, focus areas, ventures, updates, contact, footer.
3. **`<script>`** at the end of `<body>` — all JavaScript (vanilla, no libraries).

### CSS conventions

- All design values are CSS custom properties on `:root` (see the top of the
  `<style>` block): `--bg`/`--bg2`/`--bg3` backgrounds, `--ink`/`--ink2`/`--ink3`
  text colors (darkest to lightest), `--line` for borders, status colors
  (`--green`, `--amber`, `--blue` with matching `-bg` variants), fonts
  (`--sans`, `--serif`), radii (`--r`, `--r-lg`), and one transition (`--ease`).
  **Always use these variables instead of hardcoding colors, fonts, or radii.**
- The palette is a warm off-white light theme. There is no dark mode.
- CSS is organized into commented sections (`/* ── NAV ── */`, `/* ── HERO ── */`,
  etc.) matching the page sections. Add new styles in the matching section.
- Responsive layout is handled by a single `@media (max-width: 640px)` block at
  the bottom of the stylesheet. Any new multi-column layout needs a mobile rule
  added there.
- Content sections use `.page-section` (max-width 780px, centered) and are
  separated by `<div class="rule"></div>` horizontal dividers.

### JavaScript features

The `<script>` block implements three things:

- **Search overlay** (Cmd/Ctrl+K or Escape): searches a hardcoded `items` array
  of ventures and sections and smooth-scrolls to the matching section.
  **When adding or renaming a venture or section, update the `items` array too.**
- **Contact form**: front-end only — `submitForm()` clears the fields and shows
  a confirmation message. It does not actually send anything (no backend).
- **Scroll fade-in**: an `IntersectionObserver` adds the `.in` class to elements
  with class `fade`. Add `fade` to new cards/rows so they animate consistently.

## Content model

When editing content, keep these patterns intact:

- **Ventures** (`#ventures`): each is a `.venture-row` with a category label,
  serif name, description, arrow, and a status pill — `pill-active` ("Active"),
  `pill-building`, or `pill-planned`. Reuse this structure for new ventures.
- **Updates** (`#updates`): reverse-chronological `.update-item` entries with a
  date column and a tag (Launch / Venture / Product / Research). Add new
  updates at the top of the list.
- **Focus areas** (`#focus`): three `.focus-card` items in a grid.
- **About sidebar**: `.sidebar-block` cards (location, focus, domain tags).

### Known placeholders

Some contact details are placeholders, not real data: `hello@kale.com`,
`@yourhandle` (Twitter/X, links to `#`), and `linkedin.com/in/kale` (links to
`#`). The "Save contact" buttons reference `kale.vcf`, **which does not exist
in the repo** — that download link is currently broken. Don't invent real
values for these; ask the owner before changing them.

## Development workflow

- **Preview locally**: just open `index.html` in a browser, or run
  `python3 -m http.server` and visit `http://localhost:8000`. No build needed.
- **Verify changes**: check both desktop and the ~640px mobile breakpoint, and
  exercise the search overlay (Cmd/Ctrl+K) if you touched sections or ventures.
- **Deployment**: merging to `main` publishes to https://kaleerson.com
  automatically via GitHub Pages. Treat every change to `main` as a production
  deploy.
- **Never remove or rename `CNAME`** — deleting it breaks the custom domain
  (this has happened in the repo's history).

## Conventions for changes

- Keep the site a **single self-contained file**. Don't split CSS/JS into
  separate files, add a framework, or introduce a build step unless explicitly
  asked.
- No external JS libraries — the site is intentionally dependency-free apart
  from Google Fonts.
- Match the existing tone: short, confident copy; sentence-case labels;
  uppercase tracking-wide section labels via `.section-label`.
- Write commit messages as short imperative summaries (e.g. "Update footer
  logo text"), consistent with the existing history.
