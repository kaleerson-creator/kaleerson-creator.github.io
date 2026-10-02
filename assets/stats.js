// Visit counter for kaleerson.com (see /privacy/).
// - Counts each page view in our own database. No ads, no third-party trackers.
// - Asks once. If the visitor says OK, a first-party cookie "kv" holds a random id so
//   we can tell new and returning visitors apart. "No thanks" means no cookie.
// - Browsers sending Global Privacy Control or Do Not Track are never given the cookie or the notice.
(function () {
  try {
    var URL = 'https://xkmuakmlrttnyxdddkmd.supabase.co', KEY = 'sb_publishable_0fYR1Q8RJDOs-hhmjid2dQ_vDEPdKHR';
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
      var s = JSON.parse(ls('sb-xkmuakmlrttnyxdddkmd-auth-token') || 'null');
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
    send(token).then(function (r) { if (!r.ok && token !== KEY) send(KEY); }).catch(function () {});

    if (choice) return;
    // One-time notice.
    var bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie notice');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);z-index:80;max-width:560px;margin:0 auto;background:#141613;color:#F1F3EC;border-radius:18px;padding:14px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font:14px/1.45 Geist,system-ui,sans-serif;box-shadow:0 18px 40px #14161340';
    bar.innerHTML = '<span style="flex:1;min-width:200px">This site uses one cookie to count visits. No ads, no tracking across sites. <a href="/privacy/" style="color:inherit;text-decoration:underline">Privacy</a></span>' +
      '<button data-kv="yes" style="font:600 14px Geist,system-ui,sans-serif;border:0;border-radius:999px;padding:9px 16px;background:#F3E39B;color:#141613;cursor:pointer">OK</button>' +
      '<button data-kv="no" style="font:600 14px Geist,system-ui,sans-serif;border:0;border-radius:999px;padding:9px 14px;background:transparent;color:#F1F3EC;box-shadow:inset 0 0 0 1.5px #ffffff40;cursor:pointer">No thanks</button>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kv]'); if (!b) return;
      ls('kv_choice', b.dataset.kv);
      if (b.dataset.kv === 'yes') setId(); else clearId();
      bar.remove();
    });
    var show = function () { document.body.append(bar); };
    document.body ? show() : document.addEventListener('DOMContentLoaded', show);
  } catch (e) {}
})();
