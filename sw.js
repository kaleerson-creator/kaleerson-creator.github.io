// Service worker for kaleerson.com. Keeps the shell and games usable on a flaky connection.
// - Pages: network first, cached copy if offline, /404.html as the last resort.
// - /assets/, /edu/assets/ and /edu/<game>/: cached copy first, refreshed in the background.
// - Never caches account, admin, join or contact pages, or anything from Supabase.
// Bump VERSION whenever the precache list or the strategy changes; old caches are deleted on activate.
var VERSION = 'kale-v1';
var PRECACHE = ['/', '/edu/', '/404.html', '/assets/site.css', '/assets/site.js', '/assets/art.js', '/assets/content.js', '/edu/assets/common.js', '/edu/assets/games.css'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // Add each file on its own so one missing file does not block the install.
    return Promise.all(PRECACHE.map(function (u) {
      return fetch(u, { cache: 'no-cache' }).then(function (r) { if (r.ok && r.type === 'basic') return c.put(u, r); }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

var NEVER = /^\/(admin|account|join|contact)\//;
// Only plain 200s from this origin. A redirected response (e.g. /bell -> /bell/) must not be stored:
// browsers refuse to use one for a later navigation, which would turn an offline visit into an error page.
var cacheable = function (r) { return r && r.ok && r.status === 200 && r.type === 'basic' && !r.redirected; };
var put = function (req, res) { return caches.open(VERSION).then(function (c) { return c.put(req, res); }).catch(function () {}); };

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;            // supabase, fonts, CDNs: not ours
  if (/\.supabase\.co/.test(url.hostname) || NEVER.test(url.pathname)) return;
  var path = url.pathname;
  var isNav = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') >= 0;

  if (isNav) {
    // Network first; fall back to the cached page, then the offline 404.
    e.respondWith(fetch(req).then(function (r) {
      if (cacheable(r)) put(req, r.clone());
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (c) {
        return c || caches.match('/404.html');
      }).then(function (c) { return c || Response.error(); });
    }));
    return;
  }

  if (/^\/assets\//.test(path) || /^\/edu\/assets\//.test(path) || /^\/edu\/[a-z0-9-]+\//.test(path)) {
    // Stale while revalidate.
    e.respondWith(caches.match(req).then(function (cached) {
      var fresh = fetch(req).then(function (r) { if (cacheable(r)) put(req, r.clone()); return r; }).catch(function () { return cached || Response.error(); });
      return cached || fresh;
    }));
  }
});
