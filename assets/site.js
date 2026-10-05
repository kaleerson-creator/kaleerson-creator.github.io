// Shared header and footer. Mark the current page with <body data-page="work">.
(function () {
  var page = document.body.dataset.page || '';
  var links = [['work', 'Work', '/work/'], ['tools', 'Tools', '/tools/'], ['updates', 'Updates', '/updates/'], ['games', 'Games', '/edu/'], ['forum', 'Forum', '/forum/'], ['about', 'About', '/about/'], ['contact', 'Contact', '/contact/']];
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  // Signed in? supabase-js keeps the session in localStorage under sb-<project ref>-auth-token.
  // Only count it when the token is still valid or can be refreshed (a stale key means signed out).
  var signedIn = false, myName = null;
  try {
    var key = 'sb-xkmuakmlrttnyxdddkmd-auth-token';
    try { if (window.SITE_CONFIG && SITE_CONFIG.supabaseUrl) key = 'sb-' + new URL(SITE_CONFIG.supabaseUrl).hostname.split('.')[0] + '-auth-token'; } catch (e) {}
    var sess = JSON.parse(ls(key) || 'null');
    signedIn = !!(sess && typeof sess === 'object' && (sess.refresh_token || (sess.expires_at && sess.expires_at * 1000 > Date.now())));
    myName = ls('site_name');
  } catch (e) {}
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var me = signedIn ? ['account', myName || 'Account', '/account/'] : ['join', 'Join', '/join/'];
  var SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>';
  var nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML =
    '<div class="wrap"><a class="logo" href="/"><i></i>Kale Erson</a>' +
    '<nav class="links" aria-label="Main">' + links.map(function (l) {
      return '<a href="' + l[2] + '"' + (l[0] === page ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
    }).join('') + '<a class="mob" href="' + me[2] + '"' + (me[0] === page ? ' aria-current="page"' : '') + '>' + esc(signedIn ? 'Account' : 'Join') + '</a></nav>' +
    '<div class="row"><a class="navcta" href="' + me[2] + '" title="' + esc(signedIn ? 'Your account' : 'Join') + '">' + esc(me[1]) + '</a>' +
    '<button class="searchbtn" type="button" aria-label="Search the site" title="Search (Ctrl+K)">' + SEARCH_ICON + '</button>' +
    '<button class="menubtn" aria-label="Menu" aria-expanded="false">☰</button></div></div>';
  document.body.prepend(nav);
  var btn = nav.querySelector('.menubtn');
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? '✕' : '☰';
  });

  var foot = document.createElement('footer');
  foot.className = 'foot-site';
  foot.innerHTML = '<div class="wrap"><span>© ' + new Date().getFullYear() + ' Kale Erson · Las Vegas</span><nav>' +
    links.map(function (l) { return '<a href="' + l[2] + '">' + l[1] + '</a>'; }).join('') + '<a href="' + me[2] + '">' + (signedIn ? 'Account' : 'Join') + '</a><a href="/privacy/">Privacy</a></nav></div>';
  document.body.append(foot);

  // Theme toggle in the footer: Auto (device setting) → Dark → Light.
  var themeApi = null;
  var fixedLight = /^\/(snapwit|ldtimer|card)\//.test(location.pathname);
  var PAPER = { light: '#EEF0EA', dark: '#111310' };
  var themeNow = function () { return ls('theme') || 'auto'; };
  var isDark = function () { var t = themeNow(); return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); };
  if (!fixedLight) {
    var tb = document.createElement('button');
    tb.className = 'themebtn';
    var applyTheme = function (t) {
      var dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
      // Keep the browser toolbar color in step with a forced theme (the tags are per-scheme by default).
      document.querySelectorAll('meta[name=theme-color]').forEach(function (m) { m.setAttribute('content', dark ? PAPER.dark : PAPER.light); });
      tb.textContent = 'Theme: ' + t.charAt(0).toUpperCase() + t.slice(1);
      document.dispatchEvent(new CustomEvent('themechange'));
    };
    var setTheme = function (t) {
      ls('theme', t === 'auto' ? null : t);
      applyTheme(t);
    };
    tb.addEventListener('click', function () { setTheme({ auto: 'dark', dark: 'light', light: 'auto' }[themeNow()]); });
    themeApi = { get: themeNow, set: setTheme };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (themeNow() === 'auto') applyTheme('auto'); });
    tb.textContent = 'Theme: ' + themeNow().charAt(0).toUpperCase() + themeNow().slice(1);
    foot.querySelector('nav').append(tb);
  }

  var st = document.createElement('script');
  st.src = '/assets/stats.js?v=20261007';
  st.defer = true;
  document.head.append(st);
  window.SITE_THEME = themeApi;

  // Pictures for the clickable boxes (elements with data-art="…"); see /assets/art.js.
  var art = document.createElement('script');
  art.src = '/assets/art.js?v=2';
  art.defer = true;
  document.head.append(art);

  // ── Install as an app (PWA). The button only shows when the browser offers to install. ──
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvt = e;
    if (foot.querySelector('.installbtn')) return;
    var ib = document.createElement('button');
    ib.className = 'installbtn';
    ib.type = 'button';
    ib.textContent = 'Install app';
    ib.addEventListener('click', function () {
      if (!installEvt) return;
      var ev = installEvt; installEvt = null;
      ib.remove();
      try { ev.prompt(); } catch (err) {}
    });
    foot.querySelector('nav').append(ib);
  });
  window.addEventListener('appinstalled', function () { var ib = foot.querySelector('.installbtn'); if (ib) ib.remove(); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }

  // ── Command palette: search button in the header or Ctrl/Cmd+K. ──
  var G = 'Game', T = 'Tool', P = 'Page';
  var INDEX = [
    ['Home', '/', P, 'start front'],
    ['Work', '/work/', P, 'projects'],
    ['Tools', '/tools/', P, 'all tools'],
    ['Updates', '/updates/', P, 'news changelog'],
    ['About', '/about/', P, 'kale erson bio'],
    ['Contact', '/contact/', P, 'email code'],
    signedIn ? ['Account', '/account/', P, 'profile settings sign out'] : ['Join', '/join/', P, 'sign up sign in account members'],
    ['Forum', '/forum/', P, 'community posts questions'],
    ['Study', '/study/', P, 'pvhs palo verde notes flashcards classes'],
    ['Speech & Debate', '/debate/', T, 'pf policy congress timers flow topics'],
    ['LD Timer', '/ldtimer/', T, 'lincoln douglas round timer debate'],
    ['Snapwit', '/snapwit/', T, 'reaction memory party games'],
    ['Games', '/edu/', P, 'games hub play arcade'],
    ['Play online', '/edu/play/', G, 'rooms multiplayer race friends'],
    ['Leaderboards', '/edu/leaderboards/', P, 'scores ranking high score'],
    ['2048', '/edu/2048/', G, 'tiles numbers puzzle'],
    ['Snake', '/edu/snake/', G, 'arcade classic'],
    ['Minesweeper', '/edu/minesweeper/', G, 'mines puzzle'],
    ['Sudoku', '/edu/sudoku/', G, 'numbers puzzle'],
    ['Daily Word', '/edu/word/', G, 'wordle guess letters'],
    ['Daily Challenge', '/edu/daily/', G, 'today streak'],
    ['Typing Test', '/edu/typing/', G, 'wpm speed keyboard'],
    ['Letter Rush', '/edu/letters/', G, 'words race'],
    ['Trivia', '/edu/trivia/', G, 'quiz questions'],
    ['Speed Math', '/edu/math/', G, 'arithmetic mental quick'],
    ['Reaction Time', '/edu/reaction/', G, 'reflex ms fast'],
    ['Memory Match', '/edu/memory/', G, 'cards pairs'],
    ['Blocks', '/edu/blocks/', G, 'tetris falling'],
    ['Breakout', '/edu/breakout/', G, 'bricks paddle ball'],
    ['Flap', '/edu/flap/', G, 'bird pipes flappy'],
    ['Hangman', '/edu/hangman/', G, 'words guess'],
    ['Simon', '/edu/simon/', G, 'sequence memory colors'],
    ['Connect Four', '/edu/connect/', G, 'four in a row vs ai'],
    ['Bell Schedule', '/bell/', T, 'period minutes until bell pvhs school'],
    ['Countdown', '/countdown/', T, 'days until date event'],
    ['GPA & Grades', '/gpa/', T, 'grade calculator final weighted'],
    ['Picker', '/pick/', T, 'wheel spin teams dice coin random'],
    ['Focus Timer', '/focus/', T, 'pomodoro study timer tasks'],
    ['Citations', '/cite/', T, 'mla apa cite bibliography'],
    ['QR Codes', '/qr/', T, 'qr code link'],
    ['Word Counter', '/words/', T, 'characters reading time readability'],
    ['Privacy', '/privacy/', P, 'cookie policy'],
    ['Toggle theme', '#theme', 'Action', 'dark light mode auto'],
    ['Random game', '#random', 'Action', 'surprise me play something']
  ].map(function (r) { return { t: r[0], h: r[1], g: r[2], k: (r[0] + ' ' + r[3]).toLowerCase() }; });
  var GAMES = INDEX.filter(function (i) { return i.g === G; });

  var score = function (it, q) {
    var hay = it.k, t = it.t.toLowerCase();
    if (t === q) return 1000;
    if (t.indexOf(q) === 0) return 900 - t.length;
    if (hay.indexOf(' ' + q) >= 0 || hay.indexOf(q) === 0) return 800 - t.length;
    if (hay.indexOf(q) >= 0) return 700 - t.length;
    // subsequence: every query character appears in order; closer together is better
    var pos = -1, gaps = 0;
    for (var i = 0; i < q.length; i++) {
      var c = q[i]; if (c === ' ') continue;
      var n = hay.indexOf(c, pos + 1); if (n < 0) return 0;
      gaps += n - pos - 1; pos = n;
    }
    return Math.max(1, 300 - gaps * 4 - t.length);
  };
  var recent = function () { try { var r = JSON.parse(ls('palette_recent') || '[]'); return Array.isArray(r) ? r : []; } catch (e) { return []; } };
  var remember = function (h) { var r = recent().filter(function (x) { return x !== h; }); r.unshift(h); ls('palette_recent', JSON.stringify(r.slice(0, 5))); };

  var pal = document.createElement('div');
  pal.className = 'pal site-ui';
  pal.hidden = true;
  pal.innerHTML = '<div class="pal-bg"></div><div class="pal-box" role="dialog" aria-modal="true" aria-label="Search the site">' +
    '<div class="pal-top">' + SEARCH_ICON + '<input class="pal-in" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search pages, games and tools" aria-label="Search">' +
    '<button type="button" class="pal-x" aria-label="Close">✕</button></div>' +
    '<ul class="pal-list" id="pal-list" role="listbox"></ul>' +
    '<div class="pal-hint"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div></div>';
  document.body.append(pal);
  var input = pal.querySelector('.pal-in'), list = pal.querySelector('.pal-list');
  var items = [], cur = 0, lastFocus = null;
  var render = function () {
    var q = input.value.trim().toLowerCase();
    var out = [];
    if (!q) {
      var rec = recent();
      rec.forEach(function (h) { var it = INDEX.filter(function (i) { return i.h === h; })[0]; if (it) out.push({ it: it, sec: 'Recent' }); });
      INDEX.forEach(function (it) { if (rec.indexOf(it.h) < 0) out.push({ it: it, sec: 'Everything' }); });
    } else {
      out = INDEX.map(function (it) { return { it: it, s: score(it, q) }; }).filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, 12);
    }
    items = out.map(function (x) { return x.it; });
    cur = 0;
    var html = '', sec = '';
    out.forEach(function (x, i) {
      if (x.sec && x.sec !== sec) { sec = x.sec; html += '<li class="pal-sec" role="presentation">' + sec + '</li>'; }
      html += '<li role="option" id="pal-o' + i + '" data-i="' + i + '"' + (i === 0 ? ' aria-selected="true"' : '') + '><span class="pal-t">' + esc(x.it.t) + '</span><span class="pal-k">' + esc(x.it.g) + '</span></li>';
    });
    if (!out.length) html = '<li class="pal-none" role="presentation">Nothing matches. Try a game or tool name.</li>';
    list.innerHTML = html;
    input.setAttribute('aria-activedescendant', out.length ? 'pal-o0' : '');
  };
  var select = function (i) {
    if (!items.length) return;
    cur = (i + items.length) % items.length;
    list.querySelectorAll('[role=option]').forEach(function (li, j) { li.setAttribute('aria-selected', j === cur ? 'true' : 'false'); });
    input.setAttribute('aria-activedescendant', 'pal-o' + cur);
    var li = list.querySelector('#pal-o' + cur); if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
  };
  var close = function () {
    if (pal.hidden) return;
    pal.hidden = true;
    document.body.classList.remove('pal-open');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  };
  var open = function () {
    if (!pal.hidden) { input.focus(); return; }
    lastFocus = document.activeElement;
    if (nav.classList.contains('open')) btn.click();
    pal.hidden = false;
    document.body.classList.add('pal-open');
    input.value = '';
    render();
    input.focus();
  };
  var go = function (it) {
    if (!it) return;
    if (it.h === '#theme') {
      close();
      if (themeApi) { var next = { auto: 'dark', dark: 'light', light: 'auto' }[themeApi.get()]; themeApi.set(next); window.SITE.toast('Theme: ' + next.charAt(0).toUpperCase() + next.slice(1)); }
      else window.SITE.toast('This page keeps its own look.');
      return;
    }
    if (it.h === '#random') { it = GAMES[Math.floor(Math.random() * GAMES.length)]; }
    remember(it.h);
    close();
    location.href = it.h;
  };
  nav.querySelector('.searchbtn').addEventListener('click', open);
  pal.querySelector('.pal-bg').addEventListener('click', close);
  pal.querySelector('.pal-x').addEventListener('click', close);
  input.addEventListener('input', render);
  list.addEventListener('click', function (e) { var li = e.target.closest('[role=option]'); if (li) go(items[+li.dataset.i]); });
  list.addEventListener('mousemove', function (e) { var li = e.target.closest('[role=option]'); if (li && +li.dataset.i !== cur) select(+li.dataset.i); });
  pal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); select(cur + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(cur - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[cur]); }
    else if (e.key === 'Tab') {
      // keep focus inside the dialog
      var f = [input, pal.querySelector('.pal-x')];
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); pal.hidden ? open() : close(); }
  });
  window.SITE_PALETTE = { open: open, close: close };
})();

window.SITE = {
  arrow: '<span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span>',
  statusChip: function (s) { return '<span class="chip ' + s + '">' + ({ live: 'Active', dev: 'In development', done: 'Completed', dropped: 'Dropped' }[s] || s) + '</span>'; },
  month: function (ym) { var d = new Date(ym + '-01T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); },
  // Remember the display name for the header (null = signed out).
  // Theme for the account settings page: SITE.theme() -> 'auto' | 'dark' | 'light'; SITE.setTheme(t).
  theme: function () { return window.SITE_THEME ? SITE_THEME.get() : 'auto'; },
  setTheme: function (t) { if (window.SITE_THEME) SITE_THEME.set(t); },
  setName: function (n) {
    try { n ? localStorage.setItem('site_name', n) : localStorage.removeItem('site_name'); } catch (e) {}
    var a = document.querySelector('.navcta'); if (a && n) a.textContent = n;
  },
  esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
  // Search palette: SITE.search() opens it (same as Ctrl/Cmd+K).
  search: function () { if (window.SITE_PALETTE) SITE_PALETTE.open(); },
  // Bottom pill message. SITE.toast('Saved', {ms:2500}). Screen readers hear it (aria-live).
  toast: function (text, opts) {
    opts = opts || {};
    var el = document.getElementById('site-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'site-toast';
      el.className = 'site-ui';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.append(el);
    }
    clearTimeout(el._t);
    el.textContent = String(text == null ? '' : text);
    el.classList.toggle('ok', !!opts.ok);
    el.classList.toggle('err', !!opts.err);
    el.classList.remove('show');
    void el.offsetWidth; // restart the slide-in
    el.classList.add('show');
    el._t = setTimeout(function () { el.classList.remove('show'); }, opts.ms || 2500);
    return el;
  },
  // Quick confetti burst (about 80 pieces, 1.2 s). Does nothing when the visitor prefers reduced motion.
  confetti: function (opts) {
    try {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      opts = opts || {};
      var cv = document.createElement('canvas');
      cv.className = 'confetti site-ui';
      cv.setAttribute('aria-hidden', 'true');
      var W = cv.width = innerWidth, H = cv.height = innerHeight;
      document.body.append(cv);
      var ctx = cv.getContext('2d');
      var cs = getComputedStyle(document.documentElement);
      var cols = ['--moss', '--sky', '--peach', '--butter', '--lilac'].map(function (v) { return cs.getPropertyValue(v).trim() || '#F3E39B'; });
      var n = opts.count || 80, ps = [], x0 = opts.x == null ? W / 2 : opts.x, y0 = opts.y == null ? H * 0.42 : opts.y;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
        ps.push({ x: x0, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, c: cols[i % cols.length] });
      }
      var t0 = performance.now(), dur = opts.ms || 1200;
      var step = function (now) {
        var k = (now - t0) / dur;
        if (k >= 1 || !cv.parentNode) { cv.remove(); return; }
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = k < .7 ? 1 : 1 - (k - .7) / .3;
        ps.forEach(function (p) {
          p.vy += .25; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        });
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      return true;
    } catch (e) { return false; }
  }
};
