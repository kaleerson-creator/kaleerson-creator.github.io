// Visit counter for kaleerson.com (see /privacy/).
// - Counts each page view in our own database. No ads, no third-party trackers.
// - Asks once. If the visitor says OK, a first-party cookie "kv" holds a random id so
//   we can tell new and returning visitors apart. "No thanks" means no cookie.
// - Browsers sending Global Privacy Control or Do Not Track are never given the cookie or the notice.
(function () {
  try {
    var URL = 'https://xkmuakmlrttnyxdddkmd.supabase.co', KEY = 'sb_publishable_0fYR1Q8RJDOs-hhmjid2dQ_vDEPdKHR';
    try { if (window.SITE_CONFIG && SITE_CONFIG.supabaseUrl && SITE_CONFIG.supabaseKey) { URL = SITE_CONFIG.supabaseUrl.replace(/\/$/, ''); KEY = SITE_CONFIG.supabaseKey; } } catch (e) {}
    var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
    if (/^\/admin\//.test(location.pathname) || ls('kv_ignore')) return;
    var optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
    var choice = optedOut ? 'no' : ls('kv_choice');
    var getId = function () { var m = document.cookie.match(/(?:^|; )kv=([A-Za-z0-9_-]{16,40})/); return m ? m[1] : null; };
    var setId = function () {
      var b = new Uint8Array(16); crypto.getRandomValues(b);
      var id = btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      document.cookie = 'kv=' + id + '; Max-Age=31536000; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
      return id;
    };
    var clearId = function () { document.cookie = 'kv=; Max-Age=0; Path=/; SameSite=Lax'; };
    var visitor = choice === 'yes' ? (getId() || setId()) : null;
    if (choice !== 'yes') clearId();

    // Use the signed-in session if there is one, so stats can show the share of members.
    var token = KEY;
    try {
      var skey = 'sb-' + new window.URL(URL).hostname.split('.')[0] + '-auth-token';
      var s = JSON.parse(ls(skey) || 'null');
      if (s && s.access_token && s.expires_at * 1000 > Date.now() + 30000) token = s.access_token;
    } catch (e) {}
    var ref = '';
    try { if (document.referrer) { var h = new window.URL(document.referrer).hostname; if (h !== location.hostname) ref = h.toLowerCase(); } } catch (e) {}
    var send = function (tok) {
      return fetch(URL + '/rest/v1/rpc/log_view', {
        method: 'POST', keepalive: true,
        headers: { apikey: KEY, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: location.pathname, v: visitor, ref: ref || null, m: matchMedia('(max-width: 760px)').matches })
      });
    };
    var log = function () { send(token).then(function (r) { if (!r.ok && token !== KEY) send(KEY); }).catch(function () {}); };
    log();

    if (choice) return;
    // One-time notice: a slim bar along the bottom. It sits under any modal (z-index 80) and
    // pads the page while it shows so it never covers a button. Colors are fixed on purpose so
    // it looks the same in both themes and before site.css loads.
    var bar = document.createElement('div');
    bar.id = 'kvbar';
    bar.className = 'site-ui';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie notice');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:80;background:#141613;color:#F1F3EC;padding:8px 10px calc(env(safe-area-inset-bottom,0px) + 8px);display:flex;gap:6px;align-items:center;justify-content:center;font:13px/1.35 Geist,system-ui,sans-serif';
    bar.innerHTML = '<span style="min-width:0">A cookie to count visits. <a href="/privacy/" style="color:inherit;text-decoration:underline;text-underline-offset:2px">Privacy</a></span>' +
      '<button data-kv="yes" style="font:600 13px Geist,system-ui,sans-serif;border:0;border-radius:999px;padding:6px 12px;background:#F3E39B;color:#141613;cursor:pointer;flex:none">OK</button>' +
      '<button data-kv="no" style="font:600 13px Geist,system-ui,sans-serif;border:0;border-radius:999px;padding:6px 9px;background:transparent;color:#F1F3EC;box-shadow:inset 0 0 0 1.5px #ffffff40;cursor:pointer;flex:none;white-space:nowrap">No thanks</button>';
    // Pad the page by the bar's height so nothing ends up under it; scroll-padding keeps
    // scrollIntoView() and focus() clear of it too.
    var pad = function () {
      var h = Math.ceil(bar.offsetHeight);
      document.body.style.paddingBottom = h + 'px';
      document.body.style.setProperty('--kvbar', h + 'px');
      document.documentElement.style.scrollPaddingBottom = h + 'px';
    };
    var unpad = function () { document.body.style.paddingBottom = ''; document.body.style.removeProperty('--kvbar'); document.documentElement.style.scrollPaddingBottom = ''; };
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kv]'); if (!b) return;
      ls('kv_choice', b.dataset.kv);
      if (b.dataset.kv === 'yes') { visitor = setId(); log(); } // count this first view with the new id
      else clearId();
      bar.remove();
      unpad();
    });
    var show = function () { document.body.append(bar); pad(); window.addEventListener('resize', function () { if (bar.parentNode) pad(); }); };
    document.body ? show() : document.addEventListener('DOMContentLoaded', show);
  } catch (e) {}
})();
