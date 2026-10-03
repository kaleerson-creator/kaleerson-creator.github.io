// Games sub-nav, sign-in state, score saving and leaderboards for kaleerson.com/edu.
// Pages use <body data-page="games" data-sub="2048">. Sign-in is the main site's /join/ page.
(function () {
  var SUPABASE_URL = 'https://xkmuakmlrttnyxdddkmd.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_0fYR1Q8RJDOs-hhmjid2dQ_vDEPdKHR';
  window.SB = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'implicit' } }) : null;

  // Games sub-nav under the main site header (site.js adds the header and footer).
  var sub = document.body.dataset.sub || '';
  var links = [['home', 'All games', '/edu/'], ['play', 'Play online', '/edu/play/'], ['boards', 'Leaderboards', '/edu/leaderboards/']];
  var join = '/join/?next=' + encodeURIComponent(location.pathname);
  var bar = document.createElement('nav');
  bar.className = 'gsub';
  bar.setAttribute('aria-label', 'Games');
  bar.innerHTML = '<div class="gsub-links">' + links.map(function (l) {
    return '<a href="' + l[2] + '"' + (l[0] === sub ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
  }).join('') + '</div><a class="gacct" id="gacct" href="' + join + '">Sign in to save scores</a>';
  var main = document.querySelector('main');
  if (main) main.prepend(bar);

  var E = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var me = { uid: null, name: null, username: null, ready: null };
  me.ready = (async function () {
    if (!SB) return me;
    var r = await SB.auth.getSession();
    if (r.data.session) {
      me.uid = r.data.session.user.id;
      var p = await SB.from('profiles').select('display_name,username').eq('user_id', me.uid).maybeSingle();
      me.name = p.data ? p.data.display_name : null;
      me.username = p.data ? p.data.username : null;
      if (me.name && window.SITE && SITE.setName) SITE.setName(me.name);
    }
    var a = document.getElementById('gacct');
    if (a && me.uid) {
      a.textContent = !me.name ? 'Pick a display name' : me.username ? 'Playing as ' + me.name : 'Pick a username';
      a.href = me.username ? '/account/' : '#';
      a.onclick = function (e) { if (me.username) return; e.preventDefault(); askName(); };
    }
    return me;
  })();

  var local = {
    get: function (k, d) { try { var v = localStorage.getItem('g:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('g:' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var LOWER = { minesweeper: 1, sudoku: 1, word: 1 };
  var FMT = {
    minesweeper: function (s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
    sudoku: function (s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
    word: function (s) { return s + '/6'; },
    typing: function (s) { return s + ' wpm'; },
    daily: function (s) { return s + ' pts'; },
    letters: function (s) { return s + ' pts'; }
  };
  var fmt = function (g, s) { return FMT[g] ? FMT[g](s) : Number(s).toLocaleString(); };

  function modal(html) {
    var m = document.createElement('div');
    m.className = 'cm-modal';
    m.innerHTML = '<div class="cm-box">' + html + '</div>';
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) m.remove(); });
    document.body.append(m);
    return m;
  }

  // New members pick a username (permanent) and a display name; older members only add the username.
  async function askName() {
    return new Promise(function (resolve) {
      var needName = !me.name;
      var m = modal('<h2>' + (needName ? 'Pick a name' : 'Pick a username') + '</h2><p>It shows on leaderboards. Your email stays private. It\'s the same name you use on the forum and Study.</p>' +
        '<label class="cm-lbl">Username <small>can\'t be changed later</small><input data-u maxlength="21" placeholder="e.g. kale_e" autocapitalize="off" spellcheck="false"></label>' +
        (needName ? '<label class="cm-lbl">Display name <small>you can change this anytime</small><input data-n maxlength="30" placeholder="e.g. Kale E."></label>' : '') +
        '<div class="msg" hidden></div><div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancel</button><button class="btn" data-save>Save</button></div>');
      m.querySelector('input').focus();
      m.querySelector('[data-save]').onclick = async function () {
        var msg = m.querySelector('.msg'), fail = function (t) { msg.textContent = t; msg.hidden = false; };
        var u = m.querySelector('[data-u]').value.trim().replace(/^@/, '').toLowerCase();
        var n = needName ? m.querySelector('[data-n]').value.trim() : me.name;
        if (!/^[a-z0-9_]{3,20}$/.test(u)) return fail('Usernames are 3 to 20 letters, numbers or _ (no spaces).');
        if (n.length < 2 || n.length > 30) return fail('Display names are 2 to 30 characters.');
        var r = needName ? await SB.from('profiles').insert({ display_name: n, username: u })
          : await SB.from('profiles').update({ username: u }).eq('user_id', me.uid);
        if (r.error) return fail(r.error.code === '23505' ? (/username/.test(r.error.message) ? 'That username is taken.' : 'That display name is taken.') + ' Try another.' : r.error.message);
        me.name = n; me.username = u;
        if (window.SITE && SITE.setName) SITE.setName(n);
        var a = document.getElementById('gacct'); if (a) { a.textContent = 'Playing as ' + n; a.href = '/account/'; }
        m.remove(); resolve(true);
      };
      new MutationObserver(function (_, o) { if (!m.isConnected) { o.disconnect(); resolve(!!me.name); } }).observe(document.body, { childList: true });
    });
  }

  // Name with Kale's color and tags (same look as the forum).
  function nameHTML(x) {
    var c = /^#[0-9a-fA-F]{6}$/.test(x.color || '') ? ' style="--nc:' + x.color + '"' : '';
    return '<span class="cm-name"' + c + (x.username ? ' title="@' + E(x.username) + '"' : '') + '>' + E(x.name) + '</span>' +
      (x.tags || []).map(function (t) { return ' <span class="cm-tag">' + E(t) + '</span>'; }).join('');
  }

  // Save a score. Returns a short message for the game-over screen.
  async function submit(game, score, meta) {
    score = Math.round(score);
    var best = local.get('best:' + game, null);
    var isBest = best === null || (LOWER[game] ? score < best : score > best);
    if (isBest) local.set('best:' + game, score);
    if (!SB) return isBest ? 'New personal best!' : '';
    await me.ready;
    if (!me.uid) return (isBest ? 'New personal best! ' : '') + '<a href="' + join + '" style="text-decoration:underline">Sign in</a> to get on the leaderboard.';
    if (!me.name && !(await askName())) return 'Pick a display name to save scores.';
    var r = await SB.from('game_scores').insert({ game: game, score: score, meta: meta || {} });
    if (r.error) return r.error.code === '23505' ? 'Already saved today.' : (r.error.message || 'Couldn\'t save.');
    document.dispatchEvent(new CustomEvent('scoresaved'));
    return (isBest ? 'New personal best! ' : '') + 'Saved to the leaderboard.';
  }

  // Leaderboard widget: <div data-board="2048"></div>
  async function board(el, game, period) {
    el.innerHTML = '<div class="lb"><span class="empty">Loading…</span></div>';
    if (!SB) { el.innerHTML = '<div class="lb"><span class="empty">Leaderboards are offline.</span></div>'; return; }
    var r = await SB.rpc('game_board', { g: game, period: period || 'week', lim: 10 });
    var rows = r.data || [];
    el.innerHTML = '<div class="lb">' + (rows.map(function (x) {
      return '<div class="' + (x.mine ? 'me' : '') + '"><i>' + x.rank + '</i><span>' + nameHTML(x) + '</span><b>' + fmt(game, x.score) + '</b></div>';
    }).join('') || '<span class="empty">No scores yet. Be the first!</span>') + '</div>';
  }
  function boardBox(container, game, period) {
    period = period || 'week';
    container.innerHTML = '<div class="row" style="justify-content:space-between"><h2>Leaderboard</h2><div class="seg">' +
      [['day', 'Today'], ['week', 'Week'], ['all', 'All']].map(function (p) { return '<button data-p="' + p[0] + '" aria-pressed="' + (p[0] === period) + '">' + p[1] + '</button>'; }).join('') +
      '</div></div><div data-lb></div>';
    var target = container.querySelector('[data-lb]');
    var load = function () { board(target, game, period); };
    container.querySelectorAll('[data-p]').forEach(function (b) {
      b.onclick = function () { period = b.dataset.p; container.querySelectorAll('[data-p]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); load(); };
    });
    document.addEventListener('scoresaved', load);
    load();
  }

  window.G = { me: me, local: local, submit: submit, board: board, boardBox: boardBox, fmt: fmt, esc: E, modal: modal, askName: askName };
})();
