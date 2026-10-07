#!/usr/bin/env python3
"""
Build restaurant demo sites from the prospect sheets.

  GOOGLE_API_KEY=... python3 _tools/build_demo.py --area springdale --top 10
  python3 _tools/build_demo.py --slug parkhouse            # rebuild one from its config
  python3 _tools/build_demo.py --all                       # rebuild every config in _demos/

For each restaurant it:
  1. fetches Google place details (hours, services, time zone), cached
  2. writes _demos/<slug>.json the first time. This is the file you edit: menu,
     photos, email, and the add-on slots (Square, DoorDash, Resy, Tripleseat...)
  3. builds demos/<slug>/index.html and demos/<slug>/qr.html (printable table card)

Add-ons render only when their slot is filled, so a demo never shows a button
that goes nowhere. "demo": true adds a preview banner and keeps search engines
away; set it to false when the site goes live on the restaurant's own domain.
"""
import argparse, datetime, unicodedata, glob, hashlib, html, json, os, re, sys, urllib.error, urllib.parse, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PROSPECTS = os.path.join(ROOT, '_notes', 'prospects')
CONFIGS = os.path.join(ROOT, '_demos')
OUT = os.path.join(ROOT, 'demos')
CACHE = os.path.join(PROSPECTS, '.cache')
KEY = os.environ.get('GOOGLE_API_KEY', '')
SELLER = {'name': 'Kale Erson', 'url': 'https://kaleerson.com', 'contact': 'https://kaleerson.com/contact/'}

DETAIL_FIELDS = ('id,displayName,formattedAddress,shortFormattedAddress,addressComponents,location,'
                 'nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,utcOffsetMinutes,'
                 'googleMapsUri,websiteUri,rating,userRatingCount,priceLevel,primaryType,'
                 'primaryTypeDisplayName,editorialSummary,servesBreakfast,servesBrunch,servesLunch,'
                 'servesDinner,servesBeer,servesWine,servesCocktails,servesCoffee,servesDessert,'
                 'servesVegetarianFood,takeout,delivery,dineIn,curbsidePickup,reservable,'
                 'outdoorSeating,liveMusic,goodForChildren,goodForGroups,allowsDogs,menuForChildren,'
                 'paymentOptions,parkingOptions,accessibilityOptions')

# Every add-on slot. Links are plain URLs. *_embed fields take the HTML snippet
# exactly as the vendor's dashboard gives it (Resy: Venue > Widget; OpenTable:
# Marketing > Widgets; Tripleseat: Settings > Lead Forms > Setup Codes).
ADDONS = {
    'order': {  # online ordering, first one becomes the main button
        'square_url': 'Square Online ordering page',
        'toast_url': 'Toast online ordering',
        'doordash_storefront_url': 'DoorDash Storefront (commission-free)',
        'chownow_url': 'ChowNow', 'slice_url': 'Slice', 'clover_url': 'Clover online ordering',
        'doordash_url': 'DoorDash marketplace page', 'ubereats_url': 'Uber Eats page',
        'grubhub_url': 'Grubhub page', 'postmates_url': 'Postmates page',
    },
    'reserve': {
        'resy_embed': 'Resy widget code', 'resy_url': 'Resy page',
        'opentable_embed': 'OpenTable widget code', 'opentable_url': 'OpenTable page',
        'tock_url': 'Tock page', 'sevenrooms_url': 'SevenRooms page', 'yelp_reservations_url': 'Yelp reservations',
    },
    'events': {
        'tripleseat_embed': 'Tripleseat lead form code', 'tripleseat_url': 'Tripleseat hosted form link',
        'catering_url': 'Catering ordering link (ezCater etc.)',
    },
    'extras': {
        'gift_card_url': 'Gift cards (Square, Toast...)', 'menu_url': 'Menu link or PDF',
        'jobs_url': 'Job application link', 'newsletter_url': 'Email list signup link',
        'instagram': 'Instagram URL', 'facebook': 'Facebook URL', 'tiktok': 'TikTok URL',
        'yelp': 'Yelp URL',
    },
}
ORDER_LABEL = {'square_url': 'Order online', 'toast_url': 'Order online', 'doordash_storefront_url': 'Order online',
               'chownow_url': 'Order online', 'slice_url': 'Order online', 'clover_url': 'Order online',
               'doordash_url': 'DoorDash', 'ubereats_url': 'Uber Eats', 'grubhub_url': 'Grubhub',
               'postmates_url': 'Postmates'}
RESERVE_LABEL = {'resy_url': 'Reserve on Resy', 'opentable_url': 'Reserve on OpenTable', 'tock_url': 'Reserve on Tock',
                 'sevenrooms_url': 'Reserve a table', 'yelp_reservations_url': 'Reserve on Yelp'}

# Palettes by cuisine: bg, card, ink, muted, accent, on-accent, soft
THEMES = {
    'mexican':   ('#FBF4EA', '#FFFFFF', '#2B1A12', '#6E5A4C', '#C2410C', '#FFFFFF', '#F7DCC4'),
    'pizza':     ('#FBF6EF', '#FFFFFF', '#231A14', '#6B5E52', '#B91C1C', '#FFFFFF', '#F6D6CF'),
    'cafe':      ('#F6F1EA', '#FFFFFF', '#2A211B', '#6E6258', '#7C4A2D', '#FFFFFF', '#EBDCCB'),
    'breakfast': ('#FDF8EC', '#FFFFFF', '#28241A', '#6B6450', '#B45309', '#FFFFFF', '#F7E6B5'),
    'asian':     ('#F7F5F2', '#FFFFFF', '#1A1A1A', '#5F5F5F', '#B4232A', '#FFFFFF', '#F1D5D2'),
    'bbq':       ('#F5F2EE', '#FFFFFF', '#1F1B18', '#655D57', '#9A3412', '#FFFFFF', '#EAD3C3'),
    'default':   ('#F3F5EF', '#FFFFFF', '#18201A', '#5C665E', '#1F5132', '#FFFFFF', '#D6E6D0'),
}
def theme_for(t):
    t = (t or '').lower()
    for k, keys in [('mexican', ['mexican', 'latin', 'taco']), ('pizza', ['pizza', 'italian']),
                    ('cafe', ['cafe', 'coffee', 'bakery', 'tea', 'dessert', 'ice_cream', 'juice']),
                    ('breakfast', ['breakfast', 'brunch', 'diner']),
                    ('asian', ['japanese', 'sushi', 'chinese', 'thai', 'vietnamese', 'korean', 'ramen', 'asian', 'indian']),
                    ('bbq', ['barbecue', 'steak', 'american', 'hamburger', 'bar_and_grill', 'pub'])]:
        if any(x in t for x in keys):
            return THEMES[k]
    return THEMES['default']

FEATURES = [  # (place field, English, Spanish)
    ('dineIn', 'Dine-in', 'Para comer aquí'), ('takeout', 'Takeout', 'Para llevar'),
    ('delivery', 'Delivery', 'Entrega a domicilio'), ('curbsidePickup', 'Curbside pickup', 'Recogida en la acera'),
    ('reservable', 'Takes reservations', 'Acepta reservaciones'), ('outdoorSeating', 'Outdoor seating', 'Mesas al aire libre'),
    ('servesBreakfast', 'Breakfast', 'Desayuno'), ('servesBrunch', 'Brunch', 'Brunch'),
    ('servesLunch', 'Lunch', 'Almuerzo'), ('servesDinner', 'Dinner', 'Cena'),
    ('servesCoffee', 'Coffee', 'Café'), ('servesDessert', 'Dessert', 'Postres'),
    ('servesBeer', 'Beer', 'Cerveza'), ('servesWine', 'Wine', 'Vino'), ('servesCocktails', 'Cocktails', 'Cócteles'),
    ('servesVegetarianFood', 'Vegetarian options', 'Opciones vegetarianas'),
    ('goodForChildren', 'Good for kids', 'Ideal para niños'), ('menuForChildren', "Kids' menu", 'Menú infantil'),
    ('goodForGroups', 'Good for groups', 'Ideal para grupos'), ('allowsDogs', 'Dog friendly', 'Se admiten perros'),
    ('liveMusic', 'Live music', 'Música en vivo'),
]

def esc(s):
    return html.escape(str(s or ''), quote=True)

def safe_url(u):
    u = (u or '').strip()
    return u if re.match(r'^(https?:|mailto:|tel:)', u, re.I) else ''

def clean_name(name, city=''):
    # Google listings often carry extra text: "Birria El Compa | Charleston Location",
    # "Fisher's Deli (formerly Weiss Deli)", "Novella Italian Kitchen , Pizza".
    n = re.split(r'\s+[|•]\s+', name)[0]
    n = re.sub(r'\s*\([^)]*\)', '', n)
    m = re.match(r'^(.*?)\s+[-–—]\s+(.*)$', n)  # "All About Pho - Fullerton"
    if m and city and re.sub(r'[^a-z]', '', m.group(2).lower()).startswith(re.sub(r'[^a-z]', '', city.lower())[:5]):
        n = m.group(1)
    n = re.sub(r'\s+,', ',', n)
    return re.sub(r'\s{2,}', ' ', n).strip(' ,') or name

def slugify(name):
    n = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower().replace('&', ' and ').replace("'", '').replace('’', '')
    n = re.sub(r'[^a-z0-9]+', '-', n).strip('-')
    return re.sub(r'-(restaurant|restaurante)$', '', n)[:48] or 'restaurant'

# ---------------------------------------------------------------- data
def place_details(pid):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, 'details_' + hashlib.sha1(pid.encode()).hexdigest()[:16] + '.json')
    if os.path.exists(p):
        return json.load(open(p))
    if not KEY:
        sys.exit('GOOGLE_API_KEY is not set')
    req = urllib.request.Request('https://places.googleapis.com/v1/places/' + pid,
                                 headers={'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': DETAIL_FIELDS})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=40))
    except urllib.error.HTTPError as e:
        sys.exit(f'Place details error {e.code}: {e.read()[:300]}')
    json.dump(d, open(p, 'w'))
    return d

def new_config(lead, d):
    social = {}
    w = (d.get('websiteUri') or '').lower()
    for k, host in [('instagram', 'instagram.com'), ('facebook', 'facebook.com'), ('tiktok', 'tiktok.com'),
                    ('yelp', 'yelp.com')]:
        if host in w:
            social[k] = d['websiteUri']
    order = {}
    for host, k in [('toasttab.com', 'toast_url'), ('square.site', 'square_url'), ('doordash.com', 'doordash_url'),
                    ('ubereats.com', 'ubereats_url'), ('grubhub.com', 'grubhub_url'), ('chownow.com', 'chownow_url'),
                    ('slicelife.com', 'slice_url'), ('clover.com', 'clover_url')]:
        if host in w:
            order[k] = d['websiteUri']
    addons = {k: '' for group in ADDONS.values() for k in group}
    addons.update(social); addons.update(order)
    open_domains = [x['domain'] for x in lead.get('domains', []) if x.get('available')]
    return {
        'place_id': d['id'],
        'demo': True,
        'name': clean_name(d['displayName']['text'], city_of(d)),
        'tagline': '',
        'about': '',
        'email': '',
        'spanish': True,
        'domain_ideas': open_domains,
        'photos': [],
        'menu': [],
        'specials': '',
        'addons': addons,
        '_help': {
            'menu': 'List of sections: [{"name": "Tacos", "items": [{"name": "Al pastor", "price": "3.50", "desc": "..."}]}]',
            'photos': 'Image URLs or files placed in demos/<slug>/ (use only photos the owner gave you)',
            'addons': {k: v for group in ADDONS.values() for k, v in group.items()},
            'demo': 'true shows the preview banner and hides the page from search engines',
        },
    }

# ---------------------------------------------------------------- page
I18N = {
    'en': {'menu': 'Menu', 'order': 'Order', 'reserve': 'Reserve', 'events': 'Events', 'visit': 'Visit',
           'call': 'Call', 'directions': 'Directions', 'open': 'Open now', 'closed': 'Closed now',
           'closes': 'Closes', 'opens': 'Opens', 'hours': 'Hours', 'today': 'Today',
           'reviews': 'Google reviews', 'order_h': 'Order online', 'order_p': 'Pickup or delivery, straight from us.',
           'delivery_p': 'Also on your favorite delivery app:',
           'call_order': 'Call to order', 'reserve_h': 'Reserve a table', 'call_reserve': 'Call to reserve',
           'walkins': 'Walk-ins welcome. Call ahead for large groups.',
           'events_h': 'Private events & catering',
           'events_p': 'Birthdays, team dinners, rehearsal dinners and catering. Tell us what you have in mind.',
           'f_name': 'Name', 'f_email': 'Email', 'f_phone': 'Phone', 'f_date': 'Date', 'f_guests': 'Guests',
           'f_msg': 'Tell us about it', 'f_send': 'Send inquiry', 'visit_h': 'Come visit',
           'review_h': 'Had a great meal?', 'review_p': 'A quick Google review helps a local business more than you think.',
           'review_btn': 'Leave a review', 'gift': 'Gift cards', 'jobs': 'Jobs', 'news': 'Email list',
           'menu_soon': 'Full menu coming soon. Call us for today’s specials.', 'menu_view': 'View full menu',
           'apple': 'Apple Maps', 'google': 'Google Maps', 'specials': 'Today', 'features': 'Good to know',
           'by': 'Website by'},
    'es': {'menu': 'Menú', 'order': 'Ordenar', 'reserve': 'Reservar', 'events': 'Eventos', 'visit': 'Visítanos',
           'call': 'Llamar', 'directions': 'Cómo llegar', 'open': 'Abierto ahora', 'closed': 'Cerrado ahora',
           'closes': 'Cierra', 'opens': 'Abre', 'hours': 'Horario', 'today': 'Hoy',
           'reviews': 'reseñas en Google', 'order_h': 'Ordena en línea', 'order_p': 'Para recoger o a domicilio, directo con nosotros.',
           'delivery_p': 'También en tu app de entregas favorita:',
           'call_order': 'Llama para ordenar', 'reserve_h': 'Reserva una mesa', 'call_reserve': 'Llama para reservar',
           'walkins': 'Sin reservación también. Llama antes para grupos grandes.',
           'events_h': 'Eventos privados y catering',
           'events_p': 'Cumpleaños, cenas de equipo y catering. Cuéntanos tu idea.',
           'f_name': 'Nombre', 'f_email': 'Correo', 'f_phone': 'Teléfono', 'f_date': 'Fecha', 'f_guests': 'Personas',
           'f_msg': 'Cuéntanos más', 'f_send': 'Enviar', 'visit_h': 'Visítanos',
           'review_h': '¿Te gustó?', 'review_p': 'Una reseña rápida en Google ayuda mucho a un negocio local.',
           'review_btn': 'Dejar una reseña', 'gift': 'Tarjetas de regalo', 'jobs': 'Empleos', 'news': 'Boletín',
           'menu_soon': 'Menú completo próximamente. Llámanos para los especiales de hoy.', 'menu_view': 'Ver el menú',
           'apple': 'Apple Maps', 'google': 'Google Maps', 'specials': 'Hoy', 'features': 'Información',
           'by': 'Sitio web por'},
}

def t(key):
    return f'<span data-t="{key}">{esc(I18N["en"][key])}</span>'

def city_of(d):
    for c in d.get('addressComponents', []):
        if 'locality' in c.get('types', []):
            return c.get('longText', '')
    return ''

def build(slug, cfg, d):
    a = {k: v for k, v in (cfg.get('addons') or {}).items() if v}
    name = cfg.get('name') or clean_name(d['displayName']['text'], city_of(d))
    kind = (d.get('primaryTypeDisplayName') or {}).get('text', 'Restaurant')
    city = city_of(d)
    bg, card, ink, muted, accent, on_accent, soft = theme_for(d.get('primaryType'))
    phone = d.get('nationalPhoneNumber', '')
    tel = re.sub(r'[^0-9+]', '', d.get('internationalPhoneNumber', '') or phone)
    addr = d.get('formattedAddress', '')
    short_addr = d.get('shortFormattedAddress', addr)
    loc = d.get('location', {})
    maps_url = d.get('googleMapsUri', '')
    q = urllib.parse.quote(f'{name}, {addr}')
    apple_url = f'https://maps.apple.com/?q={urllib.parse.quote(name)}&address={urllib.parse.quote(addr)}'
    if loc:
        apple_url += f'&ll={loc.get("latitude")},{loc.get("longitude")}'
    embed_map = f'https://maps.google.com/maps?q={q}&output=embed'
    review_url = f'https://search.google.com/local/writereview?placeid={urllib.parse.quote(d["id"])}'
    tagline = cfg.get('tagline') or (d.get('editorialSummary') or {}).get('text') or f'{kind} in {city}' if city else kind
    about = cfg.get('about', '')
    hours = d.get('regularOpeningHours', {})
    periods = hours.get('periods', [])
    offset = d.get('utcOffsetMinutes')
    site_url = f'https://kaleerson.com/demos/{slug}/'
    demo = cfg.get('demo', True)

    order_main = [k for k in ['square_url', 'toast_url', 'doordash_storefront_url', 'chownow_url', 'slice_url', 'clover_url'] if a.get(k)]
    order_apps = [k for k in ['doordash_url', 'ubereats_url', 'grubhub_url', 'postmates_url'] if a.get(k)]
    res_embeds = [a[k] for k in ['resy_embed', 'opentable_embed'] if a.get(k)]
    res_links = [k for k in ['resy_url', 'opentable_url', 'tock_url', 'sevenrooms_url', 'yelp_reservations_url'] if a.get(k)]
    has_menu = bool(cfg.get('menu')) or bool(a.get('menu_url'))
    show_reserve = bool(res_embeds or res_links or d.get('reservable'))
    show_order = bool(order_main or order_apps or d.get('takeout') or d.get('delivery'))

    primary = None
    if order_main:
        primary = (safe_url(a[order_main[0]]), 'order_h')
    elif res_links:
        primary = (safe_url(a[res_links[0]]), 'reserve')
    elif tel:
        primary = (f'tel:{tel}', 'call')

    nav = []
    if has_menu or demo: nav.append(('menu', 'menu'))
    if show_order: nav.append(('order', 'order'))
    if show_reserve: nav.append(('reserve', 'reserve'))
    nav.append(('events', 'events'))
    nav.append(('visit', 'visit'))

    P = []  # page parts
    P.append(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{esc(name)} | {esc(kind)}{' in ' + esc(city) if city else ''}</title>
<meta name="description" content="{esc(tagline)}. {esc(short_addr)}. {esc(phone)}">
{'<meta name="robots" content="noindex,nofollow">' if demo else ''}
<meta property="og:title" content="{esc(name)}">
<meta property="og:description" content="{esc(tagline)}">
<meta property="og:type" content="restaurant.restaurant">
<meta name="theme-color" content="{accent}">
<link rel="icon" href="data:image/svg+xml,{urllib.parse.quote(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="{accent}"/><text x="32" y="44" font-size="34" text-anchor="middle" fill="{on_accent}" font-family="Georgia,serif" font-weight="700">{esc(name[:1])}</text></svg>')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">{json.dumps(jsonld(name, d, cfg, a, site_url, tagline), ensure_ascii=False)}</script>
<style>
:root{{--bg:{bg};--card:{card};--ink:{ink};--muted:{muted};--accent:{accent};--on:{on_accent};--soft:{soft};--line:color-mix(in srgb,var(--ink) 12%,transparent);--r:22px;--disp:'Fraunces',Georgia,serif;--body:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme=light]){{--bg:#151311;--card:#1F1C19;--ink:#F4EFE8;--muted:#B5ADA3;--soft:color-mix(in srgb,{accent} 28%,#151311);--line:#ffffff1c}}}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
html{{scroll-behavior:smooth;-webkit-text-size-adjust:100%}}
body{{background:var(--bg);color:var(--ink);font:16px/1.6 var(--body);-webkit-font-smoothing:antialiased;padding-bottom:76px}}
@media (min-width:760px){{body{{padding-bottom:0}}}}
a{{color:inherit}}
img{{max-width:100%;display:block}}
h1,h2,h3{{font-family:var(--disp);font-weight:800;line-height:1.02;letter-spacing:-.02em;text-wrap:balance}}
h2{{font-size:clamp(28px,5vw,44px);margin-bottom:10px}}
.wrap{{max-width:1080px;margin:0 auto;padding:0 16px}}
:focus-visible{{outline:3px solid var(--accent);outline-offset:3px;border-radius:6px}}
.demo{{background:var(--ink);color:var(--bg);font-size:13.5px;text-align:center;padding:9px 16px}}
.demo a{{font-weight:600}}
header{{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--bg) 86%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}}
header .wrap{{display:flex;align-items:center;gap:14px;height:64px}}
.brand{{font-family:var(--disp);font-weight:800;font-size:21px;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}}
nav{{display:none;gap:4px}}
nav a{{text-decoration:none;font-size:14.5px;font-weight:500;color:var(--muted);padding:8px 12px;border-radius:999px}}
nav a:hover{{color:var(--ink);background:var(--soft)}}
@media (min-width:860px){{nav{{display:flex}}}}
.lang{{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;font:600 13px var(--body);padding:7px 11px;cursor:pointer}}
.btn{{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-weight:600;font-size:15.5px;border-radius:999px;padding:13px 22px;border:1.5px solid transparent;cursor:pointer;font-family:var(--body);min-height:48px}}
.btn.main{{background:var(--accent);color:var(--on)}}
.btn.main:hover{{filter:brightness(1.08)}}
.btn.line{{border-color:var(--line);background:var(--card);color:var(--ink)}}
.btn.line:hover{{border-color:var(--accent)}}
.hdr-cta{{display:none}}
@media (min-width:600px){{.hdr-cta{{display:inline-flex;padding:9px 16px;min-height:0;font-size:14px}}}}
.hero{{padding:56px 0 40px;position:relative;overflow:hidden}}
.hero::before{{content:"";position:absolute;inset:-40% -10% auto auto;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,var(--soft),transparent 70%);z-index:-1}}
.kicker{{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}}
.hero h1{{font-size:clamp(44px,10vw,96px);margin:10px 0 14px}}
.hero p.tag{{font-size:clamp(17px,2.4vw,21px);color:var(--muted);max-width:640px}}
.meta{{display:flex;flex-wrap:wrap;gap:8px 18px;margin:20px 0 26px;font-size:15px;color:var(--muted)}}
.meta b{{color:var(--ink)}}
.star{{color:#E8A317}}
.dot{{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:1px;background:#9CA3AF}}
.dot.on{{background:#16A34A;box-shadow:0 0 0 4px #16a34a26}}
.ctas{{display:flex;flex-wrap:wrap;gap:10px}}
.hero-photo{{margin-top:34px;border-radius:var(--r);overflow:hidden;aspect-ratio:21/9;background:var(--soft)}}
.hero-photo img{{width:100%;height:100%;object-fit:cover}}
section{{padding:56px 0;border-top:1px solid var(--line)}}
.lead{{color:var(--muted);max-width:620px;margin-bottom:24px}}
.grid{{display:grid;gap:14px}}
@media (min-width:760px){{.g2{{grid-template-columns:1fr 1fr}}.g3{{grid-template-columns:repeat(3,1fr)}}}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:24px}}
.menu-sec h3{{font-size:24px;margin-bottom:12px}}
.item{{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px dashed var(--line)}}
.item:last-child{{border-bottom:0}}
.item b{{font-weight:600}}
.item small{{display:block;color:var(--muted);font-size:14px}}
.price{{font-weight:600;white-space:nowrap}}
.placeholder{{border:2px dashed color-mix(in srgb,var(--accent) 45%,transparent);background:transparent;color:var(--muted)}}
.apps{{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}}
.chips{{display:flex;flex-wrap:wrap;gap:8px}}
.chip{{background:var(--soft);border-radius:999px;padding:7px 14px;font-size:14px;font-weight:500}}
form.inq{{display:grid;gap:12px}}
@media (min-width:600px){{form.inq{{grid-template-columns:1fr 1fr}}form.inq .full{{grid-column:1/-1}}}}
label{{display:grid;gap:5px;font-size:14px;font-weight:500}}
input,textarea{{font:16px var(--body);color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;width:100%}}
textarea{{min-height:110px;resize:vertical}}
.hours{{width:100%;border-collapse:collapse;font-size:15.5px}}
.hours td{{padding:8px 0;border-bottom:1px solid var(--line)}}
.hours td:last-child{{text-align:right;color:var(--muted)}}
.hours tr.today td{{font-weight:600;color:var(--ink)}}
.map{{border:0;width:100%;height:100%;min-height:320px;border-radius:var(--r);background:var(--soft)}}
.photos{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}}
.photos img{{border-radius:16px;aspect-ratio:4/3;object-fit:cover;width:100%}}
footer{{padding:40px 0 30px;border-top:1px solid var(--line);font-size:14.5px;color:var(--muted)}}
footer .wrap{{display:flex;flex-wrap:wrap;gap:14px 26px;justify-content:space-between}}
footer a{{text-decoration:none}}
footer a:hover{{color:var(--ink)}}
.links{{display:flex;flex-wrap:wrap;gap:8px 18px}}
.bar{{position:fixed;left:0;right:0;bottom:0;z-index:50;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line)}}
.bar .btn{{padding:11px 8px;font-size:14.5px;min-height:46px}}
@media (min-width:760px){{.bar{{display:none}}}}
.embed{{min-height:60px}}
</style>
</head>
<body>''')
    if demo:
        P.append(f'<div class="demo">Preview website made for {esc(name)} by <a href="{SELLER["url"]}">{SELLER["name"]}</a>. '
                 f'Not the official site yet. <a href="{SELLER["contact"]}">Like it? Get in touch</a></div>')
    P.append(f'''<header><div class="wrap">
<a class="brand" href="#top">{esc(name)}</a>
<nav aria-label="Sections">{''.join(f'<a href="#{i}">{t(k)}</a>' for i, k in nav)}</nav>
{f'<button class="lang" id="lang" type="button" aria-label="Español / English">ES</button>' if cfg.get('spanish', True) else ''}
{f'<a class="btn main hdr-cta" href="{esc(primary[0])}">{t(primary[1])}</a>' if primary else ''}
</div></header>
<main id="top">
<div class="hero"><div class="wrap">
<div class="kicker">{esc(kind)}{' · ' + esc(city) if city else ''}</div>
<h1>{esc(name)}</h1>
<p class="tag">{esc(tagline)}</p>
<div class="meta">''')
    if d.get('rating'):
        P.append(f'<span><span class="star">★</span> <b>{d["rating"]}</b> · {d.get("userRatingCount", 0):,} {t("reviews")}</span>')
    if periods:
        P.append('<span id="status"><span class="dot"></span><span id="status-t"></span></span>')
    P.append(f'<span>{esc(short_addr)}</span></div><div class="ctas">')
    if order_main:
        P.append(f'<a class="btn main" href="{esc(safe_url(a[order_main[0]]))}">{t("order_h")}</a>')
    if res_links:
        P.append(f'<a class="btn {"line" if order_main else "main"}" href="{esc(safe_url(a[res_links[0]]))}">{t("reserve")}</a>')
    elif res_embeds:
        P.append(f'<a class="btn {"line" if order_main else "main"}" href="#reserve">{t("reserve")}</a>')
    if tel:
        P.append(f'<a class="btn {"line" if (order_main or res_links or res_embeds) else "main"}" href="tel:{esc(tel)}">{t("call")} {esc(phone)}</a>')
    P.append(f'<a class="btn line" href="{esc(maps_url or apple_url)}" target="_blank" rel="noopener">{t("directions")}</a>')
    P.append('</div>')
    photos = [p for p in cfg.get('photos', []) if p]
    if photos:
        P.append(f'<div class="hero-photo"><img src="{esc(photos[0])}" alt="{esc(name)}"></div>')
    P.append('</div></div>')

    if cfg.get('specials'):
        P.append(f'<section><div class="wrap"><div class="card" style="background:var(--soft);border:0"><div class="kicker">{t("specials")}</div>'
                 f'<p style="font-size:19px;margin-top:6px">{esc(cfg["specials"])}</p></div></div></section>')
    if about:
        P.append(f'<section><div class="wrap"><p style="font-size:clamp(19px,2.6vw,24px);max-width:760px;font-family:var(--disp);font-weight:600;line-height:1.35">{esc(about)}</p></div></section>')

    # menu
    if cfg.get('menu'):
        P.append(f'<section id="menu"><div class="wrap"><h2>{t("menu")}</h2><div class="grid g2" style="margin-top:20px">')
        for sec in cfg['menu']:
            P.append(f'<div class="card menu-sec"><h3>{esc(sec.get("name"))}</h3>')
            for it in sec.get('items', []):
                price = it.get('price', '')
                desc = '<small>' + esc(it['desc']) + '</small>' if it.get('desc') else ''
                P.append(f'<div class="item"><div><b>{esc(it.get("name"))}</b>{desc}</div>'
                         f'<div class="price">{"$" + esc(price) if price and not str(price).startswith("$") else esc(price)}</div></div>')
            P.append('</div>')
        P.append('</div>')
        if a.get('menu_url'):
            P.append(f'<p style="margin-top:18px"><a class="btn line" href="{esc(safe_url(a["menu_url"]))}" target="_blank" rel="noopener">{t("menu_view")}</a></p>')
        P.append('</div></section>')
    elif a.get('menu_url'):
        P.append(f'<section id="menu"><div class="wrap"><h2>{t("menu")}</h2><p style="margin-top:14px"><a class="btn main" href="{esc(safe_url(a["menu_url"]))}" target="_blank" rel="noopener">{t("menu_view")}</a></p></div></section>')
    elif demo:
        P.append(f'<section id="menu"><div class="wrap"><h2>{t("menu")}</h2><div class="card placeholder" style="margin-top:18px">'
                 f'<p><b>Your full menu goes here</b>, with prices, photos and specials you can update from your phone. '
                 f'Send a photo of your menu and it’s added within a day.</p></div></div></section>')

    # order
    if show_order:
        P.append(f'<section id="order"><div class="wrap"><h2>{t("order_h")}</h2>')
        if order_main:
            P.append(f'<p class="lead">{t("order_p")}</p><div class="ctas"><a class="btn main" href="{esc(safe_url(a[order_main[0]]))}">{t("order_h")}</a></div>')
        elif demo:
            P.append('<div class="card placeholder" style="margin:14px 0"><p><b>Online ordering goes here.</b> Works with Square, Toast, '
                     'DoorDash Storefront (no commission), ChowNow or Clover, whichever you already use.</p></div>')
        if order_apps:
            P.append(f'<p class="lead" style="margin:22px 0 0">{t("delivery_p")}</p><div class="apps">'
                     + ''.join(f'<a class="btn line" href="{esc(safe_url(a[k]))}" target="_blank" rel="noopener">{ORDER_LABEL[k]}</a>' for k in order_apps)
                     + '</div>')
        if not order_main and tel:
            P.append(f'<div class="ctas" style="margin-top:16px"><a class="btn {"line" if order_apps else "main"}" href="tel:{esc(tel)}">{t("call_order")} · {esc(phone)}</a></div>')
        P.append('</div></section>')

    # reserve
    if show_reserve:
        P.append(f'<section id="reserve"><div class="wrap"><h2>{t("reserve_h")}</h2>')
        for e in res_embeds:
            P.append(f'<div class="embed" style="margin-top:18px">{e}</div>')
        if res_links:
            P.append('<div class="apps">' + ''.join(f'<a class="btn {"main" if i == 0 and not res_embeds else "line"}" href="{esc(safe_url(a[k]))}" target="_blank" rel="noopener">{RESERVE_LABEL[k]}</a>' for i, k in enumerate(res_links)) + '</div>')
        if not res_embeds and not res_links:
            if demo:
                P.append('<div class="card placeholder" style="margin:14px 0"><p><b>Book-a-table button goes here.</b> Connects to Resy, OpenTable, Tock or SevenRooms.</p></div>')
            P.append(f'<p class="lead">{t("walkins")}</p>')
            if tel:
                P.append(f'<a class="btn main" href="tel:{esc(tel)}">{t("call_reserve")} · {esc(phone)}</a>')
        P.append('</div></section>')

    # events
    P.append(f'<section id="events"><div class="wrap"><h2>{t("events_h")}</h2><p class="lead">{t("events_p")}</p>')
    if a.get('tripleseat_embed'):
        P.append(f'<div class="embed card">{a["tripleseat_embed"]}</div>')
    elif a.get('tripleseat_url'):
        P.append(f'<a class="btn main" href="{esc(safe_url(a["tripleseat_url"]))}" target="_blank" rel="noopener">{t("events_h")}</a>')
    else:
        to = cfg.get('email', '')
        P.append(f'''<form class="inq card" id="inq" data-to="{esc(to)}" data-name="{esc(name)}">
<label>{t("f_name")}<input name="name" required autocomplete="name"></label>
<label>{t("f_phone")}<input name="phone" type="tel" autocomplete="tel"></label>
<label>{t("f_date")}<input name="date" type="date"></label>
<label>{t("f_guests")}<input name="guests" type="number" min="1" inputmode="numeric"></label>
<label class="full">{t("f_msg")}<textarea name="msg"></textarea></label>
<div class="full"><button class="btn main" type="submit">{t("f_send")}</button></div>
</form>''')
    if a.get('catering_url'):
        P.append(f'<p style="margin-top:14px"><a class="btn line" href="{esc(safe_url(a["catering_url"]))}" target="_blank" rel="noopener">Catering</a></p>')
    P.append('</div></section>')

    # features + photos
    feats = [(en, es) for f, en, es in FEATURES if d.get(f)]
    if feats:
        P.append(f'<section><div class="wrap"><h2 style="font-size:28px">{t("features")}</h2><div class="chips" style="margin-top:14px">'
                 + ''.join(f'<span class="chip" data-en="{esc(en)}" data-es="{esc(es)}">{esc(en)}</span>' for en, es in feats) + '</div></div></section>')
    if len(photos) > 1:
        P.append('<section><div class="wrap"><div class="photos">' + ''.join(f'<img src="{esc(p)}" alt="" loading="lazy">' for p in photos[1:]) + '</div></div></section>')

    # visit
    P.append(f'<section id="visit"><div class="wrap"><h2>{t("visit_h")}</h2><div class="grid g2" style="margin-top:20px"><div class="card">')
    P.append(f'<p style="font-size:18px;font-weight:600">{esc(addr)}</p>')
    if phone:
        P.append(f'<p style="margin:4px 0 14px"><a href="tel:{esc(tel)}">{esc(phone)}</a></p>')
    P.append(f'<div class="apps" style="margin:0 0 20px"><a class="btn line" href="{esc(maps_url)}" target="_blank" rel="noopener">{t("google")}</a>'
             f'<a class="btn line" href="{esc(apple_url)}" target="_blank" rel="noopener">{t("apple")}</a></div>')
    if periods:
        P.append(f'<h3 style="font-size:20px;margin-bottom:6px">{t("hours")}</h3><table class="hours" id="hours"></table>')
    P.append(f'</div><iframe class="map" title="Map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="{esc(embed_map)}"></iframe></div></div></section>')

    # review
    P.append(f'''<section><div class="wrap"><div class="card" style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between;background:var(--soft);border:0">
<div><h2 style="font-size:28px;margin:0">{t("review_h")}</h2><p style="color:var(--muted)">{t("review_p")}</p></div>
<a class="btn main" href="{esc(review_url)}" target="_blank" rel="noopener">★ {t("review_btn")}</a></div></div></section>
</main>''')

    # footer
    links = [(k, lbl) for k, lbl in [('gift_card_url', 'gift'), ('jobs_url', 'jobs'), ('newsletter_url', 'news')] if a.get(k)]
    socials = [(k, n) for k, n in [('instagram', 'Instagram'), ('facebook', 'Facebook'), ('tiktok', 'TikTok'), ('yelp', 'Yelp')] if a.get(k)]
    P.append(f'''<footer><div class="wrap">
<div><b style="color:var(--ink);font-family:var(--disp);font-size:18px">{esc(name)}</b><br>{esc(addr)}<br>{f'<a href="tel:{esc(tel)}">{esc(phone)}</a>' if phone else ''}</div>
<div class="links">{''.join(f'<a href="{esc(safe_url(a[k]))}" target="_blank" rel="noopener">{t(lbl)}</a>' for k, lbl in links)}{''.join(f'<a href="{esc(safe_url(a[k]))}" target="_blank" rel="noopener">{n}</a>' for k, n in socials)}</div>
<div>{t("by")} <a href="{SELLER["url"]}">{SELLER["name"]}</a></div>
</div></footer>''')

    # sticky mobile bar
    bar = []
    if tel: bar.append(f'<a class="btn line" href="tel:{esc(tel)}">{t("call")}</a>')
    bar.append(f'<a class="btn line" href="{esc(maps_url or apple_url)}" target="_blank" rel="noopener">{t("directions")}</a>')
    if order_main: bar.append(f'<a class="btn main" href="{esc(safe_url(a[order_main[0]]))}">{t("order")}</a>')
    elif res_links: bar.append(f'<a class="btn main" href="{esc(safe_url(a[res_links[0]]))}">{t("reserve")}</a>')
    elif has_menu or demo: bar.append(f'<a class="btn main" href="#menu">{t("menu")}</a>')
    P.append('<div class="bar">' + ''.join(bar) + '</div>')

    P.append(f'''<script>
(function(){{
var I={json.dumps(I18N, ensure_ascii=False)};
var periods={json.dumps(periods)}, offset={json.dumps(offset)};
var lang='en';
try{{var s=localStorage.getItem('lang');if(s==='es'||s==='en')lang=s;else if(/^es/i.test(navigator.language||'')&&{json.dumps(bool(cfg.get('spanish', True)))})lang='es'}}catch(e){{}}
function fmt(h,m){{var d=new Date(Date.UTC(2020,0,1,h,m));return d.toLocaleTimeString(lang==='es'?'es-US':'en-US',{{hour:'numeric',minute:m?'2-digit':undefined,timeZone:'UTC'}})}}
function dayName(i){{return new Date(Date.UTC(2023,0,1+i)).toLocaleDateString(lang==='es'?'es-US':'en-US',{{weekday:'long',timeZone:'UTC'}})}}
function local(){{var n=new Date();if(offset===null)return n;return new Date(n.getTime()+offset*60000)}}
function nowMin(){{var l=local();var get=offset===null?['getDay','getHours','getMinutes']:['getUTCDay','getUTCHours','getUTCMinutes'];return l[get[0]]()*1440+l[get[1]]()*60+l[get[2]]()}}
function status(){{
  if(!periods.length)return null;
  if(periods.length===1&&!periods[0].close)return {{open:true,text:I[lang].open+' · 24/7'}};
  var n=nowMin(),W=7*1440,best=null;
  for(var i=0;i<periods.length;i++){{var p=periods[i];if(!p.close)continue;
    var o=p.open.day*1440+p.open.hour*60+p.open.minute,c=p.close.day*1440+p.close.hour*60+p.close.minute;if(c<=o)c+=W;
    for(var k=-1;k<=0;k++){{var oo=o+k*W,cc=c+k*W;if(n>=oo&&n<cc)return {{open:true,text:I[lang].open+' · '+I[lang].closes+' '+fmt(p.close.hour,p.close.minute)}}}}
    var until=(o-n+W)%W;if(best===null||until<best.until)best={{until:until,p:p}}}}
  if(!best)return null;
  var dd=best.p.open.day===local()[offset===null?'getDay':'getUTCDay']()?'':' '+dayName(best.p.open.day);
  return {{open:false,text:I[lang].closed+' · '+I[lang].opens+dd+' '+fmt(best.p.open.hour,best.p.open.minute)}};
}}
function hours(){{
  var t=document.getElementById('hours');if(!t)return;var today=local()[offset===null?'getDay':'getUTCDay'](),rows='';
  for(var j=1;j<=7;j++){{var day=j%7,txt=[];
    periods.forEach(function(p){{if(p.open.day===day)txt.push(p.close?fmt(p.open.hour,p.open.minute)+' – '+fmt(p.close.hour,p.close.minute):'24h')}});
    rows+='<tr'+(day===today?' class="today"':'')+'><td>'+dayName(day)+'</td><td>'+(txt.join(', ')||(lang==='es'?'Cerrado':'Closed'))+'</td></tr>'}}
  t.innerHTML=rows;
}}
function render(){{
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-t]').forEach(function(e){{var v=I[lang][e.dataset.t];if(v)e.textContent=v}});
  document.querySelectorAll('[data-'+lang+']').forEach(function(e){{e.textContent=e.dataset[lang]}});
  var b=document.getElementById('lang');if(b)b.textContent=lang==='en'?'ES':'EN';
  var s=status(),st=document.getElementById('status');
  if(st&&s){{st.querySelector('.dot').className='dot'+(s.open?' on':'');document.getElementById('status-t').textContent=s.text}}
  hours();
}}
var lb=document.getElementById('lang');
if(lb)lb.addEventListener('click',function(){{lang=lang==='en'?'es':'en';try{{localStorage.setItem('lang',lang)}}catch(e){{}}render()}});
var f=document.getElementById('inq');
if(f)f.addEventListener('submit',function(e){{e.preventDefault();var d=new FormData(f),body='';
  if(!f.dataset.to){{alert('Preview only: on the live site this goes straight to the restaurant\u2019s inbox.');return}}
  d.forEach(function(v,k){{if(v)body+=k+': '+v+'\\n'}});
  location.href='mailto:'+f.dataset.to+'?subject='+encodeURIComponent('Event inquiry: '+f.dataset.name)+'&body='+encodeURIComponent(body)}});
render();setInterval(render,60000);
}})();
</script>
</body>
</html>''')
    return '\n'.join(P)

def jsonld(name, d, cfg, a, url, tagline):
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    spec = []
    for p in d.get('regularOpeningHours', {}).get('periods', []):
        if not p.get('close'):
            continue
        spec.append({'@type': 'OpeningHoursSpecification', 'dayOfWeek': days[p['open']['day']],
                     'opens': f'{p["open"]["hour"]:02d}:{p["open"]["minute"]:02d}',
                     'closes': f'{p["close"]["hour"]:02d}:{p["close"]["minute"]:02d}'})
    comp = {}
    for c in d.get('addressComponents', []):
        for ty in c.get('types', []):
            comp.setdefault(ty, c.get('shortText') or c.get('longText'))
    j = {'@context': 'https://schema.org', '@type': 'Restaurant', 'name': name, 'url': url,
         'description': tagline, 'telephone': d.get('internationalPhoneNumber', ''),
         'address': {'@type': 'PostalAddress',
                     'streetAddress': ' '.join(x for x in [comp.get('street_number', ''), comp.get('route', '')] if x),
                     'addressLocality': comp.get('locality', ''), 'addressRegion': comp.get('administrative_area_level_1', ''),
                     'postalCode': comp.get('postal_code', ''), 'addressCountry': comp.get('country', 'US')},
         'servesCuisine': (d.get('primaryTypeDisplayName') or {}).get('text', ''),
         'acceptsReservations': bool(d.get('reservable')), 'hasMap': d.get('googleMapsUri', '')}
    if d.get('location'):
        j['geo'] = {'@type': 'GeoCoordinates', 'latitude': d['location']['latitude'], 'longitude': d['location']['longitude']}
    if spec:
        j['openingHoursSpecification'] = spec
    if a.get('menu_url'):
        j['hasMenu'] = a['menu_url']
    same = [a[k] for k in ['instagram', 'facebook', 'tiktok', 'yelp'] if a.get(k)]
    if same:
        j['sameAs'] = same
    if cfg.get('photos'):
        j['image'] = cfg['photos'][:3]
    return j

def qr_page(slug, cfg, d):
    name = cfg.get('name') or d['displayName']['text']
    url = f'https://kaleerson.com/demos/{slug}/'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>{esc(name)} table card</title>
<style>body{{font-family:Georgia,serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fff;color:#111}}
.card{{border:2px solid #111;border-radius:24px;padding:36px 40px;text-align:center;width:340px}}
h1{{font-size:30px;margin:0 0 6px}}p{{font:16px system-ui,sans-serif;margin:0 0 22px}}#q{{display:grid;place-items:center;margin:0 auto 18px}}
small{{font:13px system-ui,sans-serif;color:#555}}@media print{{button{{display:none}}}}
button{{margin-top:24px;font:600 15px system-ui;padding:10px 18px;border-radius:999px;border:1px solid #111;background:#fff;cursor:pointer}}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script></head>
<body><div><div class="card"><h1>{esc(name)}</h1><p>Scan for our menu, hours &amp; online ordering</p><div id="q"></div>
<small>{esc(url.replace("https://", ""))}</small></div><div style="text-align:center"><button onclick="print()">Print</button></div></div>
<script>new QRCode(document.getElementById('q'),{{text:{json.dumps(url)},width:220,height:220}});</script></body></html>'''

# ---------------------------------------------------------------- main
def load_leads(area):
    p = os.path.join(PROSPECTS, f'{area}.json')
    if not os.path.exists(p):
        sys.exit(f'no prospect sheet for {area}; run _tools/prospect.py --area {area} first')
    return json.load(open(p))['leads']

def make(slug, cfg):
    d = place_details(cfg['place_id'])
    os.makedirs(os.path.join(OUT, slug), exist_ok=True)
    open(os.path.join(OUT, slug, 'index.html'), 'w').write(build(slug, cfg, d))
    open(os.path.join(OUT, slug, 'qr.html'), 'w').write(qr_page(slug, cfg, d))
    return d

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--area', help='springdale | vegas | socal')
    ap.add_argument('--top', type=int, default=10, help='how many of the best leads')
    ap.add_argument('--only', choices=['none', 'social', 'any'], default='any',
                    help='none = only places with no website at all; social = no site or only a social page')
    ap.add_argument('--slug', help='rebuild one restaurant from _demos/<slug>.json')
    ap.add_argument('--all', action='store_true', help='rebuild every config in _demos/')
    args = ap.parse_args()
    os.makedirs(CONFIGS, exist_ok=True)
    built = []
    if args.slug or args.all:
        files = [os.path.join(CONFIGS, args.slug + '.json')] if args.slug else sorted(glob.glob(os.path.join(CONFIGS, '*.json')))
        for f in files:
            slug = os.path.basename(f)[:-5]
            cfg = json.load(open(f))
            make(slug, cfg); built.append((slug, cfg['name']))
    elif args.area:
        ok = {'none': {'none'}, 'social': {'none', 'social'},
              'any': {'none', 'social', 'broken', 'ordering-only', 'free-builder', 'site', 'unchecked'}}[args.only]
        # skip "no website" listings that probably have one (their name .com is registered)
        # only leads checked by hand as having no site or a weak one
        leads = [l for l in load_leads(args.area) if l['site']['status'] in ok and not l['site'].get('maybe')
                 and l.get('checked', {}).get('verdict') in ('no_site', 'social_only', 'ordering_page_only', 'weak_site')][:args.top]
        for lead in leads:
            d = place_details(lead['id'])
            slug = slugify(clean_name(d['displayName']['text'], city_of(d)))
            f = os.path.join(CONFIGS, slug + '.json')
            if os.path.exists(f):
                cfg = json.load(open(f))
                if cfg.get('place_id') != d['id']:  # same name, different place
                    slug = slugify(clean_name(d['displayName']['text'], city_of(d)) + ' ' + city_of(d)); f = os.path.join(CONFIGS, slug + '.json')
            if not os.path.exists(f):
                json.dump(new_config(lead, d), open(f, 'w'), indent=2, ensure_ascii=False)
            cfg = json.load(open(f))
            make(slug, cfg); built.append((slug, cfg['name']))
    else:
        ap.print_help(); return
    for slug, name in built:
        print(f'{name:40s} demos/{slug}/  ->  https://kaleerson.com/demos/{slug}/')

if __name__ == '__main__':
    main()
