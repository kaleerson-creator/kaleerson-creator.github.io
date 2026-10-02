# Adds the site icon and link-preview (Open Graph / Twitter) tags to every page.
# Safe to re-run: it replaces the block between the <!-- meta --> markers.
# Run after rebuilding /edu:  python3 _tools/meta.py
import glob, html, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = 'https://kaleerson.com'
DEFAULT_DESC = {
    'contact/index.html': 'Contact Kale Erson.',
    'study/index.html': 'PVHS Study: notes, test dates, study tips and flashcards for Palo Verde High School classes.',
    'admin/index.html': 'Admin.',
}
os.chdir(ROOT)
for f in sorted(glob.glob('**/index.html', recursive=True)):
    if f.startswith(('design/', '_')):
        continue
    s = open(f).read()
    m = re.search(r'<title>(.*?)</title>', s)
    if not m:
        continue
    title = html.unescape(m.group(1))
    d = re.search(r'<meta name="description" content="([^"]*)"', s)
    desc = html.unescape(d.group(1)) if d else DEFAULT_DESC.get(f, 'Tools, games and study help by Kale Erson.')
    path = '/' + f[:-len('index.html')]
    e = lambda v: html.escape(v, quote=True)
    block = ('<!-- meta -->\n'
             '<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">\n'
             '<link rel="apple-touch-icon" href="/assets/icon-180.png">\n'
             '<meta name="theme-color" content="#EEF0EA">\n'
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
