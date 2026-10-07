#!/usr/bin/env python3
"""
One pitch list across all areas, built only from leads that were checked by hand
(_notes/prospects/verified.json). Run after prospect.py:

  python3 _tools/pitch_list.py      ->  _notes/prospects/PITCH-LIST.md
"""
import glob, json, os, re

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
P = os.path.join(ROOT, '_notes', 'prospects')
AREAS = [('vegas', 'Las Vegas'), ('springdale', 'Springdale, Zion and Kanab'), ('socal', 'Southern California')]
ORDER = {'no_site': 0, 'social_only': 1, 'ordering_page_only': 2, 'weak_site': 3}
LABEL = {'no_site': 'No website', 'social_only': 'Social page only', 'ordering_page_only': 'Ordering page only',
         'weak_site': 'Weak website'}

def demos():
    out = {}
    for f in glob.glob(os.path.join(ROOT, '_demos', '*.json')):
        c = json.load(open(f))
        out[c['place_id']] = os.path.basename(f)[:-5]
    return out

def town(addr):
    parts = [x.strip() for x in addr.split(',')]
    return parts[-3] if len(parts) >= 3 else ''

def talking_point(c):
    v, miss, uses = c['verdict'], c.get('missing') or [], c.get('uses') or []
    tools = [u for u in uses if u in ('Toast', 'Square', 'DoorDash', 'Uber Eats', 'Grubhub', 'SpotOn', 'Clover',
                                      'ChowNow', 'Resy', 'OpenTable', 'Yelp Reservations', 'Tripleseat')]
    hook = f' I can put your {", ".join(tools[:2])} ordering right on it.' if tools else ''
    if v == 'no_site':
        return 'People searching for you only find Google, Yelp and delivery apps, nothing that\'s yours.' + hook
    if v == 'social_only':
        return 'Customers land on a social page with no menu or hours they can trust.' + hook
    if v == 'ordering_page_only':
        return 'Your ordering page takes orders, but there\'s no home page with your story, hours, events or catering.' + hook
    if miss:
        return f'Your current site is missing {", ".join(miss[:3])}.' + hook
    return 'Your current site is outdated.' + hook

def cell(x):
    return str(x or '').replace('|', '/').replace('\n', ' ')

def main():
    dm = demos()
    L = ['# Pitch list', '',
         'Only restaurants that were checked by hand: a web search for their own site, then opening it to confirm and grade it. '
         'Las Vegas first (walk-ins), then Springdale and Southern California. Within each area: no website first, then social page only, '
         'ordering page only, weak website. Price is a starting point from the size guess.', '',
         'Demo links work once the branch with the demos is merged into main.', '']
    total = 0
    for key, title in AREAS:
        f = os.path.join(P, f'{key}.json')
        if not os.path.exists(f):
            continue
        leads = [p for p in json.load(open(f))['leads'] if p.get('checked', {}).get('verdict') in ORDER]
        leads.sort(key=lambda p: (ORDER[p['checked']['verdict']], -p['lead_score']))
        if not leads:
            continue
        total += len(leads)
        L += [f'## {title} ({len(leads)})', '',
              '| Restaurant | What they have now | Say this | Demo | Domains to offer | Price | Phone |',
              '|---|---|---|---|---|---|---|']
        for p in leads:
            c = p['checked']
            name = cell(p['displayName']['text'])
            now = f'**{LABEL[c["verdict"]]}**'
            if c.get('official_url'):
                now += f' ({cell(c["official_url"])})'
            warn = re.search(r'(Ask first[^.]*\.|[^.]*ask who runs it[^.]*\.)', c.get('notes', ''), re.I)
            if warn:
                now += f'<br>⚠ {cell(warn.group(1).strip())}'
            slug = dm.get(p['id'])
            demo = f'[open](https://kaleerson.com/demos/{slug}/)' if slug else 'not built yet'
            doms = ', '.join(d['domain'] for d in p.get('domains', []) if d.get('available'))
            doms = ', '.join(doms.split(', ')[:2]) or '—'
            s = p.get('suggested', {})
            price = f'${s.get("setup", 0):,} + ${s.get("monthly", 0)}/mo' if s else ''
            L.append(f'| [{name}]({p.get("googleMapsUri", "")})<br><small>{cell(town(p.get("formattedAddress", "")))} · '
                     f'{p.get("rating")}★ ({p.get("userRatingCount")})</small> | {now} | {cell(talking_point(c))} | {demo} '
                     f'| {cell(doms)} | {price} | {cell(p.get("nationalPhoneNumber", ""))} |')
        L.append('')
    L.insert(5, f'{total} restaurants ready to pitch.')
    open(os.path.join(P, 'PITCH-LIST.md'), 'w').write('\n'.join(L) + '\n')
    print(f'wrote _notes/prospects/PITCH-LIST.md with {total} restaurants')

if __name__ == '__main__':
    main()
