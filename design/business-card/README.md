# Business card

Standard US size: 3.5 × 2 in, with 0.125 in bleed on every side (files are 3.75 × 2.25 in).

| File | Use |
|---|---|
| `kale-business-card.pdf` | Upload this to the printer. Page 1 is the front, page 2 the back. |
| `kale-card-front.png`, `kale-card-back.png` | 600 dpi images, for printers that want images or for previews. |
| `build.js` | Regenerates everything. Needs `qrcode`, `playwright-core`, `@fontsource/bricolage-grotesque`, `@fontsource/geist-sans`. |

The QR code opens `https://kaleerson.com/card`, which links to the website, the contact page and sign-up.

When ordering: choose 3.5 × 2 in, "full bleed", matte finish. Turn off any "auto-fit" or "add margins" option.
