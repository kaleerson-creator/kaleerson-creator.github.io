# Self-hosted 3D games. Each _edu-src/games3d/<slug>.json entry gets:
#   - a wrapper page _edu-src/g3d-<slug>.page  (built by _edu-src/build.py into edu/<slug>/index.html)
#   - a tile on the games hub (between the 3d markers in _edu-src/index.page)
#   - a row in the command palette (between the 3d markers in assets/site.js)
# The game's own files live in edu/3d/<slug>/ (index.html + assets + LICENSE) and are loaded in a
# same-origin iframe by the wrapper. Run:  python3 _tools/games3d.py && python3 _edu-src/build.py
import json, os, re, html
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)
# One JSON object per game in _edu-src/games3d/<slug>.json (keeps additions conflict-free); sorted by "order" then title.
REG = []
for f in sorted(os.listdir('_edu-src/games3d')):
    if f.endswith('.json'):
        g = json.load(open(os.path.join('_edu-src/games3d', f)))
        g.setdefault('slug', f[:-5]); REG.append(g)
REG.sort(key=lambda g: (g.get('order', 50), g['title'].lower()))
e = lambda v: html.escape(str(v), quote=True)

PAGE = '''@@ meta
dir: {slug}
title: {title} · Kale's Games
desc: {desc}
page: {slug}
game: g3d-{slug}
@@ css
.g3{{width:100%;max-width:1100px;display:grid;gap:12px}}
.frame{{position:relative;width:100%;aspect-ratio:{aspect};border-radius:22px;overflow:hidden;background:#0f1210;isolation:isolate}}
.frame iframe{{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#0f1210}}
.frame:fullscreen{{border-radius:0;background:#000}}
.cover{{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;color:#fff;cursor:pointer;background:radial-gradient(circle at 25% 25%,{glow1},transparent 45%),radial-gradient(circle at 80% 75%,{glow2},transparent 45%),#0f1210}}
.cover h2{{font:800 clamp(34px,8vw,72px)/.95 var(--display);letter-spacing:-.04em;color:#fff}}
.cover p{{color:#cfd6cb;margin-top:10px;font-weight:600;font-size:15px;max-width:46ch}}
.cover .go{{display:inline-block;margin-top:18px;background:#fff;color:#141613;font-weight:700;padding:14px 28px;border-radius:999px;font-size:16px}}
.cover small{{display:block;margin-top:14px;color:#9aa397;font-size:12px}}
.g3bar{{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;width:100%}}
.keys{{display:flex;gap:6px;flex-wrap:wrap}}
.keys span{{padding:6px 10px;border-radius:10px;background:var(--paper);font-weight:600;font-size:13px}}
.credit{{display:grid;gap:6px;font-size:14px;color:var(--ink2);width:100%}}
.credit a{{text-decoration:underline}}.credit b{{color:var(--ink)}}
.focus{{display:none;font-size:13px;color:var(--ink2)}}
html.g3lock{{overflow:hidden}}
.started .focus{{display:block}}
@media (max-width:600px){{.frame{{aspect-ratio:auto;height:64vh;min-height:320px}}}}
@@ body
<div class="ghead"><div><h1>{title}</h1><p>{tagline}</p></div><a class="btn sm ghost" href="{repo}" target="_blank" rel="noopener">Source &amp; license ↗</a></div>
<div class="stage">
  <div class="g3" id="g3">
    <div class="frame" id="frame">
      <div class="cover" id="cover" role="button" tabindex="0" aria-label="Play {title}"><div><h2>{title}</h2><p>{blurb}</p><span class="go">Play</span><small>{size_note}{touch_note}</small></div></div>
    </div>
    <div class="g3bar">
      <div class="keys" aria-label="Controls">{keys}</div>
      <div class="row"><button class="btn sm ghost" id="reload" hidden>Restart</button><button class="btn sm" id="full" hidden>Fullscreen</button></div>
    </div>
    <p class="focus">If the keys do nothing, click inside the game once. Click outside it to scroll the page again.</p>
    <div class="credit">
      <span><b>{title}</b> is by <a href="{author_url}" target="_blank" rel="noopener">{author}</a> and is shared under the {license} license (<a href="/edu/3d/{slug}/{license_file}" target="_blank">read it</a>). I host a copy here so it works on school Wi-Fi; the original is at <a href="{repo}" target="_blank" rel="noopener">{repo_host}</a>.</span>
      <span>Nothing from this game is saved to your kaleerson.com account.{extra_credit}</span>
    </div>
  </div>
</div>
@@ js
const SRC='/edu/3d/{slug}/{entry}';
const frame=document.getElementById('frame'),cover=document.getElementById('cover'),full=document.getElementById('full'),reload=document.getElementById('reload'),g3=document.getElementById('g3');
let game=null;
function start(){{
  if(game)return;
  game=document.createElement('iframe');
  game.src=SRC;game.title={title_js};game.allow='autoplay; fullscreen; gamepad';
  frame.append(game);cover.remove();full.hidden=false;reload.hidden=false;g3.classList.add('started');
  try{{frame.scrollIntoView({{block:'center',behavior:'smooth'}})}}catch(e){{}}
  setTimeout(()=>{{try{{game.focus()}}catch(e){{}}}},300);
}}
// Arrow keys inside the game would also scroll this page; lock page scrolling while the game has focus.
window.addEventListener('blur',()=>{{setTimeout(()=>{{if(game&&document.activeElement===game)document.documentElement.classList.add('g3lock')}},0)}});
window.addEventListener('focus',()=>{{document.documentElement.classList.remove('g3lock')}});
document.addEventListener('pointerdown',ev=>{{if(!frame.contains(ev.target))document.documentElement.classList.remove('g3lock')}});
cover.addEventListener('click',start);
cover.addEventListener('keydown',ev=>{{if(ev.key==='Enter'||ev.key===' '){{ev.preventDefault();start()}}}});
reload.addEventListener('click',()=>{{if(game){{game.src=SRC}}}});
const canFull=!!(frame.requestFullscreen||frame.webkitRequestFullscreen);
if(!canFull)full.hidden=true;
full.addEventListener('click',()=>{{
  const el=document.fullscreenElement||document.webkitFullscreenElement;
  if(el){{(document.exitFullscreen||document.webkitExitFullscreen).call(document)}}
  else{{(frame.requestFullscreen||frame.webkitRequestFullscreen).call(frame).catch(()=>{{}});setTimeout(()=>{{try{{game&&game.focus()}}catch(e){{}}}},200)}}
}});
document.addEventListener('fullscreenchange',()=>{{full.textContent=document.fullscreenElement?'Exit fullscreen':'Fullscreen'}});
'''

GLOW = {'sky': ('#3B6FE066', '#4f8a4a55'), 'moss': ('#4f8a4a66', '#F3C93B44'), 'peach': ('#F08C3A66', '#E5484D44'), 'butter': ('#F3C93B66', '#3B6FE044'), 'lilac': ('#8E6BE866', '#3B6FE044')}

tiles, rows, pages = [], [], []
for g in REG:
    slug = g['slug']
    if not os.path.isfile(os.path.join('edu', '3d', slug, g.get('entry', 'index.html'))):
        raise SystemExit(f'missing build: edu/3d/{slug}/{g.get("entry", "index.html")}')
    lic_file = g.get('licenseFile', 'LICENSE')
    lic_path = os.path.join('edu', '3d', slug, lic_file)
    if not os.path.isfile(lic_path):
        raise SystemExit(f'missing license file: edu/3d/{slug}/{lic_file}')
    if not lic_file.lower().endswith(('.txt', '.md')):
        # GitHub Pages serves extensionless files as downloads; link a .txt copy instead
        txt = lic_file + '.txt'
        open(os.path.join('edu', '3d', slug, txt), 'wb').write(open(lic_path, 'rb').read())
        lic_file = txt
    glow1, glow2 = GLOW.get(g.get('color', 'sky'), GLOW['sky'])
    keys = ''.join(f'<span>{e(k)}</span>' for k in g.get('controls', []))
    size = g.get('sizeMb')
    size_note = f'About {size} MB to load the first time.' if size else ''
    touch_note = ' Works with touch.' if g.get('touch') else ' Needs a keyboard.'
    repo_host = re.sub(r'^https?://(www\.)?', '', g['repo']).split('/')[0]
    page = PAGE.format(
        slug=slug, title=e(g['title']), title_js=json.dumps(g['title']), desc=e(g.get('desc') or g['tagline']), tagline=e(g['tagline']),
        blurb=e(g.get('blurb', g['tagline'])), aspect=g.get('aspect', '16/9'), glow1=glow1, glow2=glow2, keys=keys, size_note=size_note, touch_note=touch_note,
        repo=e(g['repo']), repo_host=e(repo_host), author=e(g['author']), author_url=e(g.get('authorUrl', g['repo'])), license=e(g['license']),
        license_file=e(lic_file), entry=e(g.get('entry', 'index.html')), extra_credit=(' ' + e(g['extraCredit'])) if g.get('extraCredit') else '')
    open(f'_edu-src/g3d-{slug}.page', 'w').write(page)
    pages.append(slug)
    tiles.append(f'  <a class="b {e(g.get("color", "sky"))} w2" href="/edu/{slug}/"><span class="art" data-art="{e(g.get("art", "game3d"))}"></span><span class="lbl">3D · by {e(g["author"])}</span><h2>{e(g["title"])}</h2><div class="foot"><span class="muted">{e(g["tagline"])}</span><span class="go">→</span></div></a>')
    rows.append(f"    ['{g['title'].replace(chr(39), chr(92) + chr(39))}', '/edu/{slug}/', G, '3d {e(g.get('tags', ''))}'],")

def between(path, start, end, body):
    s = open(path).read()
    assert start in s and end in s, f'{path}: markers {start!r}/{end!r} missing'
    pre, rest = s.split(start, 1)
    _, post = rest.split(end, 1)
    open(path, 'w').write(pre + start + '\n' + body + ('\n' if body else '') + end + post)

between('_edu-src/index.page', '  <!-- 3d:start -->', '  <!-- 3d:end -->', '\n'.join(tiles))
between('assets/site.js', '    // 3d:start', '    // 3d:end', '\n'.join(rows))
# remove wrapper pages for games no longer in the registry
for f in os.listdir('_edu-src'):
    m = re.match(r'g3d-([a-z0-9-]+)\.page$', f)
    if m and m.group(1) not in pages:
        os.remove(os.path.join('_edu-src', f))
print('3d games:', ', '.join(pages) or 'none')
