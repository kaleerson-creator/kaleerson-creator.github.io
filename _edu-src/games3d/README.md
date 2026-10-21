One JSON file per self-hosted 3D game. Fields:
  slug (defaults to the file name), title, tagline (one line, shown on the tile), blurb (cover text), desc (link preview),
  author, authorUrl, repo, license (name), licenseFile (default LICENSE, inside edu/3d/<slug>/), entry (default index.html),
  controls (list of short strings), touch (bool), sizeMb (number), color (sky|moss|peach|butter|lilac), art (art.js name, default game3d),
  aspect (default "16/9"), tags (palette search words), order (lower first), extraCredit (optional sentence).
The game's files live in edu/3d/<slug>/ with its LICENSE. Then: python3 _edu-src/build.py
