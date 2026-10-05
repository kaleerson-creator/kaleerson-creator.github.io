# Adds the site icon, web app manifest, theme colors and link-preview (Open Graph / Twitter)
# tags to every page. Safe to re-run: it replaces the block between the <!-- meta --> markers.
# Run after rebuilding /edu:  python3 _tools/meta.py
import glob, html, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = 'https://kaleerson.com'
# --paper in assets/site.css, light and dark. Keep in sync with manifest.webmanifest and site.js.
PAPER_LIGHT, PAPER_DARK = '#EEF0EA', '#111310'
DEFAULT_DESC = {
    'contact/index.html': 'Contact Kale Erson.',
    'study/index.html': 'PVHS Study: notes, test dates, study tips and flashcards for Palo Verde High School classes.',
    'admin/index.html': 'Admin.',
    '404.html': 'That page moved or never existed.',
}
os.chdir(ROOT)
files = sorted(glob.glob('**/index.html', recursive=True)) + (['404.html'] if os.path.exists('404.html') else [])
for f in files:
    if f.startswith(('design/', '_')):
        continue
    s = open(f).read()
    m = re.search(r'<title>(.*?)</title>', s)
    if not m:
        continue
    title = html.unescape(m.group(1))
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    desc = html.unescape(d.group(1)) if d else DEFAULT_DESC.get(f, 'Tools, games and study help by Kale Erson.')
    path = '/' + (f[:-len('index.html')] if f.endswith('index.html') else f)
    e = lambda v: html.escape(v, quote=True)
    # A page that sets its own theme-color outside the meta block (the business card, Snapwit)
    # keeps it: we don't add ours. A stale copy of the plain paper color does not count.
    rest = re.sub(r'<!-- meta -->.*?<!-- /meta -->', '', s, flags=re.S)
    own = [c.upper() for c in re.findall(r'<meta name="theme-color" content="([^"]*)"', rest)]
    custom = any(c not in (PAPER_LIGHT, PAPER_DARK) for c in own)
    theme = '' if custom else (f'<meta name="theme-color" content="{PAPER_LIGHT}" media="(prefers-color-scheme: light)">\n'
                               f'<meta name="theme-color" content="{PAPER_DARK}" media="(prefers-color-scheme: dark)">\n')
    block = ('<!-- meta -->\n'
             # Theme before first paint: saved choice, else the device setting. Snapwit, LD Timer and
             # the business card keep their own light look.
             '<script>try{var t=localStorage.getItem("theme");if(!/^\\/(snapwit|ldtimer|card)\\//.test(location.pathname)){'
             'if(t!=="light"&&(t==="dark"||matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark"}}catch(e){}</script>\n'
             '<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">\n'
             '<link rel="apple-touch-icon" href="/assets/icon-180.png">\n'
             '<link rel="manifest" href="/manifest.webmanifest">\n'
             + theme +
             f'<meta property="og:site_name" content="Kale Erson">\n'
             f'<meta property="og:type" content="website">\n'
             f'<meta property="og:title" content="{e(title)}">\n'
             f'<meta property="og:description" content="{e(desc)}">\n'
             f'<meta property="og:url" content="{SITE}{path}">\n'
             f'<meta property="og:image" content="{SITE}/assets/og.png">\n'
             '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
             '<meta name="twitter:card" content="summary_large_image">\n'
             '<!-- /meta -->')
    if '<!-- meta -->' in s:
        s = re.sub(r'<!-- meta -->.*?<!-- /meta -->', lambda _: block, s, flags=re.S)
    else:
        s = s.replace(m.group(0), m.group(0) + '\n' + block, 1)
    open(f, 'w').write(s)
    print('meta', f)
