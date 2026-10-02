# Assembles games-src/*.page files into games-site/<dir>/index.html with the shared layout.
# A .page file has sections separated by lines "@@ name": meta (key: value), css, body, js.
import os, re, glob
SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SRC, '..', 'games-site')
HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/games.css?v={v}">
<style>
{css}
</style>
</head>
<body data-page="{page}"{gameattr}>
<main class="wrap">
{body}
</main>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="/assets/common.js?v={v}"></script>
{extra}<script>
{js}
</script>
</body>
</html>
'''
V = '1'
for f in sorted(glob.glob(os.path.join(SRC, '*.page'))):
    parts = dict(re.findall(r'^@@ (\w+)\n(.*?)(?=^@@ |\Z)', open(f).read(), re.S | re.M))
    meta = dict(l.split(': ', 1) for l in parts.get('meta', '').strip().splitlines() if l.strip())
    out_dir = os.path.join(OUT, meta.get('dir', ''))
    os.makedirs(out_dir, exist_ok=True)
    extra = ''.join(f'<script src="{s.strip()}?v={V}"></script>\n' for s in meta.get('scripts', '').split(',') if s.strip())
    html = HEAD.format(title=meta['title'], desc=meta.get('desc', ''), v=V, css=parts.get('css', '').strip(),
                       page=meta.get('page', ''), gameattr=f' data-game="{meta["game"]}"' if meta.get('game') else '',
                       body=parts.get('body', '').strip(), extra=extra, js=parts.get('js', '').strip())
    open(os.path.join(out_dir, 'index.html'), 'w').write(html)
    print('built', meta.get('dir') or '/', len(html))
