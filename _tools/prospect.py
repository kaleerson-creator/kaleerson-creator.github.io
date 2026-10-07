#!/usr/bin/env python3
"""
Restaurant prospecting.

Finds highly rated restaurants in an area that have no website or a weak one,
scores the site they do have, and checks which domains are open for them.

  GOOGLE_API_KEY=... python3 _tools/prospect.py --area vegas
  python3 _tools/prospect.py --area all
  python3 _tools/prospect.py --area springdale --no-psi --no-domains   # Places only
  python3 _tools/prospect.py --area vegas --limit 15                   # quick test
  python3 _tools/prospect.py --list                                    # show areas and spots

Needs
  GOOGLE_API_KEY  a Google Cloud key with "Places API (New)" and
                  "PageSpeed Insights API" enabled.
  Network         places.googleapis.com, www.googleapis.com, rdap.org

Writes
  _notes/prospects/<area>.md     the prospect sheet (best leads first)
  _notes/prospects/<area>.json   everything, for building demo sites
  _notes/prospects/.cache/       raw API replies, so re-runs are free

Cost: Places text search bills per page of 20 results (Enterprise tier, since we
ask for rating, review count, website and phone). A whole area is a few hundred
pages at most. PageSpeed and RDAP are free.
"""
import argparse, concurrent.futures as cf, hashlib, json, math, os, re, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT_DIR = os.path.join(ROOT, '_notes', 'prospects')
CACHE_DIR = os.path.join(OUT_DIR, '.cache')
KEY = os.environ.get('GOOGLE_API_KEY', '')

# ---------------------------------------------------------------- areas
# (label, lat, lng, radius in metres). Circles bias the search; Google still
# returns the best matches, so neighbouring circles overlap on purpose and
# results are de-duplicated by place id.
AREAS = {
    'vegas': {
        'title': 'Las Vegas',
        'min_reviews': 150,
        'city_words': ['lv', 'lasvegas', 'vegas'],
        'spots': [
            ('Downtown / Fremont', 36.1699, -115.1398, 3000),
            ('Arts District', 36.1600, -115.1520, 2000),
            ('Chinatown / Spring Mountain', 36.1263, -115.1950, 3500),
            ('The Strip (off-casino)', 36.1147, -115.1728, 3500),
            ('Summerlin', 36.1800, -115.3270, 7000),
            ('Southwest / Spring Valley', 36.1080, -115.2450, 6000),
            ('Henderson', 36.0395, -114.9817, 7000),
            ('Green Valley', 36.0400, -115.0800, 5000),
            ('North Las Vegas', 36.1989, -115.1175, 6000),
            ('Centennial Hills', 36.2800, -115.2600, 6000),
            ('East Las Vegas', 36.1400, -115.0600, 6000),
            ('Boulder City', 35.9786, -114.8325, 4000),
        ],
    },
    'socal': {
        'title': 'Southern California',
        'min_reviews': 150,
        'city_words': [],  # taken from each address
        'spots': [
            ('Downtown LA', 34.0407, -118.2468, 4000),
            ('Hollywood / West Hollywood', 34.0900, -118.3500, 4000),
            ('Silver Lake / Echo Park', 34.0869, -118.2702, 3000),
            ('Koreatown', 34.0617, -118.3000, 2500),
            ('Santa Monica / Venice', 34.0195, -118.4912, 5000),
            ('Culver City', 34.0211, -118.3965, 4000),
            ('Pasadena', 34.1478, -118.1445, 5000),
            ('San Gabriel Valley', 34.0950, -118.1000, 6000),
            ('Burbank / Glendale', 34.1650, -118.3000, 6000),
            ('Sherman Oaks / Studio City', 34.1500, -118.4300, 5000),
            ('Long Beach', 33.7701, -118.1937, 6000),
            ('South Bay', 33.8358, -118.3406, 6000),
            ('Anaheim / Fullerton', 33.8366, -117.9143, 7000),
            ('Santa Ana / Orange', 33.7455, -117.8677, 6000),
            ('Irvine', 33.6846, -117.8265, 7000),
            ('Costa Mesa', 33.6411, -117.9187, 4000),
            ('Huntington / Newport Beach', 33.6500, -117.9500, 7000),
            ('San Diego Downtown', 32.7157, -117.1611, 3000),
            ('North Park / Hillcrest', 32.7500, -117.1300, 3000),
            ('La Jolla', 32.8328, -117.2713, 4000),
            ('Pacific Beach', 32.7978, -117.2558, 3000),
            ('Oceanside / Carlsbad', 33.1700, -117.3300, 7000),
            ('Temecula', 33.4936, -117.1484, 7000),
            ('Riverside', 33.9806, -117.3755, 7000),
            ('Palm Springs', 33.8303, -116.5453, 8000),
            ('Ventura / Oxnard', 34.2600, -119.2400, 8000),
            ('Santa Barbara', 34.4208, -119.6982, 6000),
        ],
    },
    'springdale': {
        'title': 'Springdale, Utah (Zion)',
        'min_reviews': 60,
        'city_words': ['zion', 'utah', 'springdale'],
        'spots': [
            ('Springdale / Rockville', 37.1889, -112.9986, 6000),
            ('Hurricane / La Verkin', 37.1753, -113.2899, 8000),
            ('Kanab', 37.0475, -112.5263, 5000),
            # St. George is bigger; add it with --spots "St. George" if wanted
            ('St. George', 37.0965, -113.5684, 9000),
        ],
        'default_skip': ['St. George'],
    },
}

QUERIES = ['restaurants', 'best restaurants', 'family owned restaurant',
           'mexican restaurant', 'cafe', 'breakfast']

FOOD_TYPES = {'restaurant', 'cafe', 'coffee_shop', 'bakery', 'bar', 'meal_takeaway',
              'meal_delivery', 'sandwich_shop', 'ice_cream_shop', 'diner', 'steak_house',
              'food_court', 'pub', 'wine_bar', 'dessert_shop', 'juice_shop', 'tea_house',
              'donut_shop', 'bagel_shop', 'deli', 'cafeteria', 'brewpub', 'bar_and_grill',
              'buffet_restaurant', 'fast_food_restaurant', 'acai_shop', 'candy_store',
              'chocolate_shop', 'confectionery', 'dessert_restaurant', 'food'}

CHAINS = ['mcdonald', 'starbucks', 'chipotle', 'in-n-out', 'in n out', 'panda express',
          'subway', "domino", 'chick-fil-a', "raising cane", 'taco bell', "denny", 'ihop',
          'olive garden', 'cheesecake factory', 'applebee', "chili's", 'buffalo wild',
          'wingstop', 'panera', 'five guys', 'shake shack', 'jack in the box', "carl's jr",
          "wendy", 'burger king', 'popeyes', 'kfc', 'sonic', "dutch bros", 'jamba',
          'pf chang', 'yard house', 'bj\'s restaurant', 'red robin', 'outback', 'texas roadhouse',
          'cracker barrel', 'waffle house', 'del taco', 'el pollo loco', 'habit burger',
          'cafe rio', 'costa vida', 'firehouse subs', 'jersey mike', 'jimmy john',
          'dave\'s hot chicken', 'capital grille', 'nobu', 'gordon ramsay', 'guy fieri',
          'hard rock', 'rainforest cafe', 'bubba gump', 'cafe zupas', 'zaxby', 'culver',
          'whataburger', 'blaze pizza', 'mod pizza', 'pieology', 'sweetgreen', 'cava ',
          'noodles & company', 'einstein', 'crumbl', 'nothing bundt', 'baskin', 'dairy queen']

SOCIAL = ('facebook.com', 'fb.com', 'instagram.com', 'linktr.ee', 'yelp.com', 'tiktok.com',
          'twitter.com', 'x.com', 'threads.net', 'beacons.ai', 'bio.site')
ORDER_ONLY = ('doordash.com', 'ubereats.com', 'grubhub.com', 'postmates.com', 'toasttab.com',
              'square.site', 'squareup.com', 'clover.com', 'chownow.com', 'slicelife.com',
              'menufy.com', 'order.online', 'spoton.com', 'ordering.app', 'owner.com',
              'mealsy.ca', 'zmenu.com', 'allmenus.com', 'menupages.com', 'restaurantji.com',
              'untappd.com', 'order.toasttab.com')
FREE_BUILDER = ('wixsite.com', 'weebly.com', 'godaddysites.com', 'business.site',
                'sites.google.com', 'wordpress.com', 'webnode.', 'strikingly.com', 'carrd.co',
                'mystrikingly.com', 'square.site', 'webs.com', 'yolasite.com', 'jimdosite.com',
                'wix.com', 'site123.me', 'ueniweb.com', 'bizland', 'homestead.com')

STACK = [  # (needle in a URL, label)
    ('resy.com', 'Resy'), ('opentable.com', 'OpenTable'), ('exploretock.com', 'Tock'),
    ('tripleseat.com', 'Tripleseat'), ('toasttab.com', 'Toast'), ('squareup.com', 'Square'),
    ('square.site', 'Square'), ('squarecdn.com', 'Square'), ('doordash.com', 'DoorDash'),
    ('ubereats.com', 'Uber Eats'), ('grubhub.com', 'Grubhub'), ('chownow.com', 'ChowNow'),
    ('slicelife.com', 'Slice'), ('clover.com', 'Clover'), ('menufy.com', 'Menufy'),
    ('popmenu', 'Popmenu'), ('getbento.com', 'BentoBox'), ('bentobox', 'BentoBox'),
    ('owner.com', 'Owner.com'), ('spoton.com', 'SpotOn'), ('sevenrooms.com', 'SevenRooms'),
    ('yelp.com/reservations', 'Yelp Reservations'), ('wixstatic.com', 'Wix'),
    ('parastorage.com', 'Wix'), ('wix.com', 'Wix'), ('squarespace.com', 'Squarespace'),
    ('sqspcdn.com', 'Squarespace'), ('wsimg.com', 'GoDaddy'), ('secureserver.net', 'GoDaddy'),
    ('godaddysites', 'GoDaddy'), ('wp-content', 'WordPress'), ('wp-includes', 'WordPress'),
    ('weebly', 'Weebly'), ('shopify', 'Shopify'), ('mailchimp', 'Mailchimp'),
    ('googletagmanager', 'Google Tag Manager'), ('google-analytics', 'Google Analytics'),
]

# Namecheap list prices, USD, first year / renewal. Approximate; confirm at checkout.
TLD_PRICE = {'com': (11, 17), 'net': (13, 17), 'co': (13, 35), 'menu': (32, 38),
             'restaurant': (45, 62), 'cafe': (6, 35), 'pizza': (10, 55), 'bar': (70, 80),
             'kitchen': (30, 45), 'coffee': (10, 32), 'sushi': (60, 65)}
TYPE_TLD = {'cafe': 'cafe', 'coffee_shop': 'coffee', 'pizza_restaurant': 'pizza', 'bar': 'bar',
            'wine_bar': 'bar', 'pub': 'bar', 'bakery': 'cafe',
            'brewpub': 'bar', 'bar_and_grill': 'bar'}

# ---------------------------------------------------------------- helpers
def log(*a):
    print(*a, file=sys.stderr, flush=True)

def cached(name, fn):
    os.makedirs(CACHE_DIR, exist_ok=True)
    p = os.path.join(CACHE_DIR, name + '.json')
    if os.path.exists(p):
        with open(p) as f:
            return json.load(f)
    data = fn()
    # don't keep failures, so the next run retries them
    # (a site that is truly broken is a final answer and does get kept)
    if not (isinstance(data, dict) and (('error' in data and not data.get('final')) or data.get('available', False) is None)):
        with open(p, 'w') as f:
            json.dump(data, f)
    return data

def http(url, body=None, headers=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()

def host_of(url):
    try:
        return urllib.parse.urlsplit(url).netloc.lower().removeprefix('www.')
    except Exception:
        return ''

# ---------------------------------------------------------------- places
FIELDS = ('places.id,places.displayName,places.formattedAddress,places.rating,'
          'places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,'
          'places.googleMapsUri,places.primaryType,places.types,places.priceLevel,'
          'places.businessStatus,places.location,nextPageToken')

def places_search(query, lat, lng, radius, min_rating, max_pages):
    out, token = [], None
    for page in range(max_pages):
        body = {'textQuery': query, 'pageSize': 20, 'minRating': min_rating,
                'locationBias': {'circle': {'center': {'latitude': lat, 'longitude': lng},
                                            'radius': radius}}}
        if token:
            body['pageToken'] = token
        key = 'places_' + hashlib.sha1(json.dumps(body, sort_keys=True).encode()).hexdigest()[:16]
        def call():
            if not KEY:
                sys.exit('GOOGLE_API_KEY is not set (see the docstring at the top of this file).')
            for attempt in range(4):
                try:
                    _, raw = http('https://places.googleapis.com/v1/places:searchText', body,
                                  {'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY,
                                   'X-Goog-FieldMask': FIELDS})
                    return json.loads(raw)
                except urllib.error.HTTPError as e:
                    msg = e.read().decode(errors='replace')[:300]
                    if e.code in (429, 500, 503) and attempt < 3:
                        time.sleep(2 ** attempt); continue
                    sys.exit(f'Places API error {e.code}: {msg}')
        d = cached(key, call)
        out += d.get('places', [])
        token = d.get('nextPageToken')
        if not token:
            break
        time.sleep(1.2)  # Google needs a moment before a page token is valid
    return out

def km_between(lat1, lng1, lat2, lng2):
    r = math.radians
    a = (math.sin(r(lat2 - lat1) / 2) ** 2
         + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lng2 - lng1) / 2) ** 2)
    return 6371 * 2 * math.asin(math.sqrt(a))

def is_food(p):
    t = p.get('primaryType', '') or ''
    return t.endswith('_restaurant') or t in FOOD_TYPES or 'restaurant' in p.get('types', [])

def is_chain(name):
    n = name.lower()
    return any(c in n for c in CHAINS)

# ---------------------------------------------------------------- site check
def classify_site(url):
    if not url:
        return 'none'
    h = host_of(url)
    if any(h == s or h.endswith('.' + s) for s in SOCIAL):
        return 'social'
    if any(s in h for s in FREE_BUILDER):
        return 'free-builder'
    if any(s in h or s in url.lower() for s in ORDER_ONLY):
        return 'ordering-only'
    return 'site'

def pagespeed(url):
    key = 'psi_' + hashlib.sha1(url.encode()).hexdigest()[:16]
    def call():
        q = urllib.parse.urlencode([('url', url), ('strategy', 'mobile'),
                                    ('category', 'performance'), ('category', 'seo'),
                                    ('category', 'accessibility'), ('category', 'best-practices')]
                                   + ([('key', KEY)] if KEY else []))
        for attempt in range(3):
            try:
                _, raw = http('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + q,
                              timeout=120)
                return json.loads(raw)
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors='replace')
                if e.code == 429 and attempt < 2:
                    time.sleep(5 * (attempt + 1)); continue
                # 400 from Lighthouse means it reached the site and the site failed: keep that
                return {'error': {'code': e.code, 'message': msg[:300]}, 'final': e.code == 400}
            except Exception as e:  # timeouts, resets
                if attempt < 2:
                    time.sleep(3); continue
                return {'error': {'code': 0, 'message': str(e)[:300]}}
    return cached(key, call)

def summarize_psi(d):
    if 'error' in d:
        m = d['error'].get('message', '')
        broken = any(s in m for s in ('FAILED_DOCUMENT_REQUEST', 'ERRORED_DOCUMENT_REQUEST',
                                      'DNS_FAILURE', 'NO_FCP', 'net::ERR', 'Lighthouse returned error'))
        return {'status': 'broken' if broken else 'unchecked', 'error': m[:160]}
    lr = d.get('lighthouseResult', {})
    if lr.get('runtimeError'):
        return {'status': 'broken', 'error': lr['runtimeError'].get('message', '')[:160]}
    cats = lr.get('categories', {})
    sc = lambda c: round((cats.get(c, {}).get('score') or 0) * 100)
    aud = lr.get('audits', {})
    urls = [i.get('url', '') for i in aud.get('network-requests', {}).get('details', {}).get('items', [])]
    stack = []
    for needle, label in STACK:
        if label not in stack and any(needle in u for u in urls):
            stack.append(label)
    return {'status': 'site', 'final_url': lr.get('finalUrl', ''),
            'performance': sc('performance'), 'seo': sc('seo'),
            'accessibility': sc('accessibility'), 'best_practices': sc('best-practices'),
            # Lighthouse 13 calls the mobile layout check viewport-insight; older ones, viewport.
            'viewport_ok': (aud.get('viewport-insight', aud.get('viewport', {})).get('score') or 0) >= 1,
            'https': (aud.get('is-on-https', {}).get('score') or 0) >= 1,
            'stack': stack}

def badness(site):
    s = site['status']
    base = {'none': 100, 'broken': 95, 'social': 95, 'ordering-only': 90,
            'free-builder': 85, 'unchecked': 60}.get(s)
    if base is not None:
        return base
    score = (site['performance'] * .4 + site['seo'] * .3 + site['accessibility'] * .15
             + site['best_practices'] * .15)
    b = 100 - score
    if not site['viewport_ok']: b += 20
    if not site['https']: b += 10
    return int(max(0, min(100, b)))

# ---------------------------------------------------------------- domains
NAME_FILLER = {'restaurant', 'restaurante', 'the', 'and', 'of', 'in', 'at', 'by', 'llc', 'inc', 'co'}

def clean_listing_name(name, city=''):
    # "All About Pho - Fullerton", "Tacos La 26! (Previously Ave 26)", "Birria El Compa | Charleston"
    n = re.split(r'\s+[|•]\s+', name)[0]
    n = re.sub(r'\s*\([^)]*\)', '', n)
    m = re.match(r'^(.*?)\s+[-–—]\s+(.*)$', n)
    if m and city and re.sub(r'[^a-z]', '', m.group(2).lower()).startswith(city[:5]):
        n = m.group(1)
    return n.strip() or name

def name_words(name):
    n = name.lower().replace('&', ' ').replace("'", '').replace('’', '')
    n = re.sub(r'[^a-z0-9 ]+', ' ', n)
    return [w for w in n.split() if w not in NAME_FILLER] or n.split()

def slug(name):
    return ''.join(name_words(name))[:40]

def city_from_address(addr):
    # "123 Main St, Pasadena, CA 91101, USA" -> "pasadena"
    parts = [p.strip() for p in addr.split(',')]
    return re.sub(r'[^a-z]', '', parts[-3].lower()) if len(parts) >= 3 else ''

def domain_candidates(p, area):
    words = name_words(clean_listing_name(p['displayName']['text'], city_from_address(p.get('formattedAddress', ''))))
    if not words:
        return []
    full = ''.join(words)
    n = 2  # first two words, but never stop on "el", "de", "la"...
    while n < len(words) and words[n - 1] in ('el', 'la', 'los', 'las', 'de', 'del', 'y', 'di', 'da', 'le', 'a', 'on', 'at', 'for', 'to', 'all', 'my', 'our'):
        n += 1
    short = ''.join(words[:n])
    c = city_from_address(p.get('formattedAddress', ''))
    cities = [x for x in [c] + list(area.get('city_words') or []) if x]
    city = next((x for x in cities if x not in full), '')
    tld = TYPE_TLD.get(p.get('primaryType', ''), 'restaurant')
    cands = []
    if len(full) <= 22:
        cands += [f'{full}.com']
    cands += [f'{short}.com']
    if city:
        cands += [f'{short}{city}.com']
    cands += [f'{short}.{tld}', f'{short}.menu', f'eat{short}.com', f'{short}.net']
    if len(full) <= 22:
        cands += [f'{full}.{tld}']
    seen, out = {host_of(p.get('websiteUri', ''))}, []  # never suggest the one they have
    for d in cands:
        if d not in seen and len(d.split('.')[0]) <= 30:
            seen.add(d); out.append(d)
    return out[:6]

def rdap_available(domain):
    key = 'rdap_' + hashlib.sha1(domain.encode()).hexdigest()[:16]
    def call():
        for attempt in range(5):
            try:
                st, _ = http('https://rdap.org/domain/' + domain, timeout=25)
                return {'available': False, 'code': st}
            except urllib.error.HTTPError as e:
                if e.code == 429 or e.code >= 500:  # registry says slow down
                    time.sleep(3 * (attempt + 1)); continue
                # A 404 only means "free" when it comes from the registry itself. rdap.org
                # answers 404 on its own for endings it has no registry for (.co, .sushi).
                if e.code == 404 and host_of(e.geturl() or '') not in ('', 'rdap.org'):
                    return {'available': True, 'code': 404}
                if e.code == 404:
                    return {'available': None, 'code': 404, 'error': 'no registry lookup for this ending'}
                return {'available': False, 'code': e.code}
            except Exception as e:
                if attempt < 4:
                    time.sleep(2); continue
                return {'available': None, 'code': 0, 'error': str(e)[:120]}
        return {'available': None, 'code': 429, 'error': 'registry kept rate limiting'}
    return cached(key, call)

def price_str(domain):
    tld = domain.rsplit('.', 1)[-1]
    f, r = TLD_PRICE.get(tld, (0, 0))
    return f'~${f}/yr then ~${r}' if f else 'price?'

# ---------------------------------------------------------------- main
def run(area_key, a, args):
    spots = a['spots']
    if args.spots:
        want = [s.strip().lower() for s in args.spots.split(',')]
        spots = [s for s in spots if any(w in s[0].lower() for w in want)]
    else:
        spots = [s for s in spots if s[0] not in a.get('default_skip', [])]
    min_reviews = args.min_reviews if args.min_reviews is not None else a['min_reviews']
    queries = [q.strip() for q in args.queries.split(',')] if args.queries else QUERIES

    log(f'== {a["title"]}: {len(spots)} spots x {len(queries)} queries, up to {args.pages} pages each')
    seen = {}
    for label, lat, lng, radius in spots:
        for q in queries:
            for p in places_search(f'{q} near {label}', lat, lng, radius, args.min_rating, args.pages):
                pid = p.get('id')
                loc = p.get('location') or {}
                # The search only leans toward the circle; drop places well outside it
                # (e.g. "near Rockville" also finds Rockville, Maryland).
                if loc and km_between(lat, lng, loc.get('latitude', 0), loc.get('longitude', 0)) > radius / 1000 * 2:
                    continue
                if pid and pid not in seen:
                    p['_spot'] = label
                    seen[pid] = p
        log(f'  {label}: {len(seen)} unique so far')

    rows = []
    for p in seen.values():
        name = p.get('displayName', {}).get('text', '')
        if not name or not is_food(p) or is_chain(name):
            continue
        if p.get('businessStatus', 'OPERATIONAL') != 'OPERATIONAL':
            continue
        if (p.get('rating') or 0) < args.min_rating or (p.get('userRatingCount') or 0) < min_reviews:
            continue
        if (p.get('userRatingCount') or 0) > args.max_reviews:
            continue
        rows.append(p)
    rows.sort(key=lambda p: -(p.get('userRatingCount') or 0))
    if args.limit:
        rows = rows[:args.limit]
    log(f'  {len(rows)} restaurants pass the filters')

    # site check
    for p in rows:
        st = classify_site(p.get('websiteUri', ''))
        p['site'] = {'status': 'unchecked' if (st == 'site' and args.no_psi) else st, 'stack': []}
    if not args.no_psi:
        todo = [p for p in rows if p['site']['status'] == 'site']
        log(f'  Lighthouse on {len(todo)} sites (this is the slow part)')
        done = [0]
        def one(p):
            d = pagespeed(p['websiteUri'])
            done[0] += 1
            if done[0] % 100 == 0:
                log(f'    {done[0]}/{len(todo)}')
            return d
        with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
            for p, d in zip(todo, ex.map(one, todo)):
                p['site'].update(summarize_psi(d))
    for p in rows:
        for needle, label in STACK:  # the website host itself can give it away too
            if needle in (p.get('websiteUri') or '').lower() and label not in p['site']['stack']:
                p['site']['stack'].append(label)
        p['badness'] = badness(p['site'])
        rf = (p.get('rating') or 0) / 5
        vf = min(1.0, math.log10((p.get('userRatingCount') or 0) + 1) / 3.3)
        p['lead_score'] = round(p['badness'] * rf * vf)

    skip = set()
    sp = os.path.join(OUT_DIR, 'skip.txt')
    if os.path.exists(sp):
        skip = {l.split('#')[0].strip() for l in open(sp) if l.split('#')[0].strip()}
    for p in rows:
        t = size_tier(p); p['size'] = t; p['suggested'] = {'setup': PRICING[t][1], 'monthly': PRICING[t][2]}
    leads = [p for p in rows if p['badness'] >= args.min_badness and p['id'] not in skip]
    leads.sort(key=lambda p: -p['lead_score'])
    log(f'  {len(leads)} leads with a weak or missing site')

    # domains
    if not args.no_domains:
        checks = [(p, d) for p in leads for d in domain_candidates(p, a)]
        log(f'  RDAP on {len(checks)} domain names')
        with cf.ThreadPoolExecutor(max_workers=3) as ex:
            results = list(ex.map(lambda pd: rdap_available(pd[1]), checks))
        for (p, d), r in zip(checks, results):
            p.setdefault('domains', []).append({'domain': d, **r, 'price': price_str(d)})
        # Google showing no website doesn't prove there isn't one. If the restaurant's
        # exact name as a .com is registered, flag it to check by hand and rank it lower.
        quiet = [p for p in leads if p['site']['status'] in ('none', 'social')]
        names = [''.join(name_words(clean_listing_name(p['displayName']['text'],
                 city_from_address(p.get('formattedAddress', ''))))) + '.com' for p in quiet]
        with cf.ThreadPoolExecutor(max_workers=3) as ex:
            taken = list(ex.map(rdap_available, names))
        for p, dom, r in zip(quiet, names, taken):
            if r.get('available') is False:
                p['site']['maybe'] = dom
                p['badness'] = 70
                rf = (p.get('rating') or 0) / 5
                vf = min(1.0, math.log10((p.get('userRatingCount') or 0) + 1) / 3.3)
                p['lead_score'] = round(p['badness'] * rf * vf)
        leads.sort(key=lambda p: -p['lead_score'])

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, f'{area_key}.json'), 'w') as f:
        json.dump({'area': a['title'], 'generated': time.strftime('%Y-%m-%d'),
                   'filters': {'min_rating': args.min_rating, 'min_reviews': min_reviews},
                   'leads': leads, 'all': rows}, f, indent=1)
    write_md(area_key, a, leads, rows, args, min_reviews)

def site_cell(p):
    s = p['site']; st = s['status']; url = p.get('websiteUri', '')
    maybe = f' <br><small>{s["maybe"]} is registered: check it before pitching</small>' if s.get('maybe') else ''
    if st == 'none':
        return '**no website**' + maybe
    link = f'[{host_of(url)[:28]}]({url})'
    if st == 'site':
        bits = [f'perf {s.get("performance")}', f'seo {s.get("seo")}']
        if not s.get('viewport_ok', True): bits.append('not mobile')
        if not s.get('https', True): bits.append('no https')
        return f'{link} · ' + ', '.join(bits)
    return f'{link} · **{st}**' + (f' ({s.get("error","")[:40]})' if st == 'broken' else '') + maybe

# Rough size guess from public signals only. Lifetime Google reviews track how many
# people come through the door, and price level tracks the check size. This is a
# starting point for the conversation, not a revenue figure.
PRICING = {  # tier: (label, setup $, monthly $)
    'small': ('Small', 500, 79),
    'medium': ('Medium', 1000, 129),
    'large': ('Large', 1800, 199),
}
QUICK = ('cafe', 'coffee', 'bakery', 'food_truck', 'ice_cream', 'juice', 'dessert', 'donut', 'bagel',
         'sandwich', 'fast_food', 'meal_takeaway', 'acai', 'deli', 'taco', 'hot_dog', 'tea')

def size_tier(p):
    n = p.get('userRatingCount') or 0
    lvl = p.get('priceLevel') or ''
    quick = any(q in (p.get('primaryType') or '') for q in QUICK)
    pts = (n >= 400) + (n >= 1500) + (lvl in ('PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE')) \
          - (quick and n < 1500)
    return 'small' if pts <= 0 else 'medium' if pts == 1 else 'large'

def price_cell(p):
    label, setup, monthly = PRICING[size_tier(p)]
    return f'{label} · ${setup:,} + ${monthly}/mo'

def write_md(area_key, a, leads, rows, args, min_reviews):
    L = [f'# Prospects: {a["title"]}', '',
         f'Generated {time.strftime("%Y-%m-%d")} by `_tools/prospect.py`. Filters: rating ≥ {args.min_rating}, '
         f'reviews ≥ {min_reviews}, chains skipped. {len(rows)} restaurants checked, {len(leads)} leads.', '',
         'Lead score = how bad the current site is × how good the restaurant is. '
         'Domain prices are Namecheap list prices from memory; confirm at checkout. '
         'Size and price are a rough guess from review count, price level and type: adjust after you meet them.', '',
         '| # | Restaurant | Rating | Current site | Already uses | Open domains | Size · suggested price | Phone |',
         '|---|---|---|---|---|---|---|---|']
    for i, p in enumerate(leads, 1):
        name = p['displayName']['text']
        maps = p.get('googleMapsUri', '')
        addr = p.get('formattedAddress', '')
        doms = ', '.join(f'{d["domain"]} ({d["price"]})' for d in p.get('domains', []) if d.get('available'))
        unknown = sum(1 for d in p.get('domains', []) if d.get('available') is None)
        if unknown and not doms:
            doms = f'{unknown} checks failed (rdap.org blocked?)'
        L.append(f'| {i} | [{name}]({maps})<br><small>{addr}<br>{p.get("_spot","")} · lead {p["lead_score"]}</small> '
                 f'| {p.get("rating")} ({p.get("userRatingCount")}) '
                 f'| {site_cell(p)} | {", ".join(p["site"].get("stack", [])) or "—"} '
                 f'| {doms or "—"} | {price_cell(p)} | {p.get("nationalPhoneNumber", "")} |')
    L += ['', '## Everyone else that passed the filters (site looks fine)', '']
    for p in sorted(rows, key=lambda p: -(p.get('userRatingCount') or 0)):
        if p['badness'] < args.min_badness:
            L.append(f'- {p["displayName"]["text"]} — {p.get("rating")} ({p.get("userRatingCount")}) — {site_cell(p)}')
    with open(os.path.join(OUT_DIR, f'{area_key}.md'), 'w') as f:
        f.write('\n'.join(L) + '\n')
    log(f'  wrote _notes/prospects/{area_key}.md and .json')

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--area', default='vegas', help='vegas | socal | springdale | all')
    ap.add_argument('--spots', help='only these spots, comma separated, substring match')
    ap.add_argument('--queries', help='comma separated search phrases (default: a mix of 6)')
    ap.add_argument('--pages', type=int, default=3, help='pages of 20 per query (max 3)')
    ap.add_argument('--min-rating', type=float, default=4.5)
    ap.add_argument('--min-reviews', type=int, default=None, help='default depends on the area')
    ap.add_argument('--max-reviews', type=int, default=8000, help='skip mega venues above this')
    ap.add_argument('--min-badness', type=int, default=40, help='site badness needed to count as a lead')
    ap.add_argument('--limit', type=int, default=0, help='only the N most reviewed, for a quick test')
    ap.add_argument('--no-psi', action='store_true', help='skip the Lighthouse site scoring')
    ap.add_argument('--no-domains', action='store_true', help='skip the RDAP domain checks')
    ap.add_argument('--workers', type=int, default=12, help='Lighthouse checks at once')
    ap.add_argument('--list', action='store_true', help='print the areas and spots and exit')
    args = ap.parse_args()
    if args.list:
        for k, a in AREAS.items():
            print(f'{k}: {a["title"]} (min reviews {a["min_reviews"]})')
            for s in a['spots']:
                print(f'   {s[0]}' + ('  [skipped unless named with --spots]' if s[0] in a.get('default_skip', []) else ''))
        return
    keys = list(AREAS) if args.area == 'all' else [args.area]
    for k in keys:
        if k not in AREAS:
            sys.exit(f'unknown area {k}; use --list')
        run(k, AREAS[k], args)

if __name__ == '__main__':
    main()
