// Shared bits for /study and /forum: who's signed in, display names, reports, dates.
window.Community = (function () {
  var E = window.VaultMD ? VaultMD.esc : function (s) { return String(s); };
  var me = { session: null, uid: null, name: null, username: null, admin: false };
  var PROFILE_COLS = 'display_name,username,name_color,tags';

  // Display name with the admin-set color, @username and tags. p = {display_name, username, name_color, tags}.
  // When the member has a username the whole thing (name + tag chips) opens their page at /u/#username.
  // It is a role=link span, not an <a>, so it is safe inside clickable tiles that are already links
  // (nested <a> tags break the HTML parser); a document-level handler below does the navigation.
  function nameHTML(p, fallback, opts) {
    if (!p || !p.display_name) return E(fallback || 'Someone');
    var c = /^#[0-9a-fA-F]{6}$/.test(p.name_color || '') ? ' style="--nc:' + p.name_color + '"' : '';
    var u = /^[a-z0-9_]{3,20}$/.test(p.username || '') ? p.username : '';
    var inner = '<span class="cm-name"' + c + (u ? ' title="@' + E(u) + '"' : '') + '>' + E(p.display_name) + '</span>' +
      (p.tags || []).map(function (t) { return ' <span class="cm-tag">' + E(t) + '</span>'; }).join('');
    if (!u || (opts && opts.link === false)) return inner;
    return '<span class="cm-user" role="link" tabindex="0" data-user="' + E(u) + '" aria-label="' + E(p.display_name) + ' (@' + E(u) + ')">' + inner + '</span>';
  }
  function userURL(u) { return '/u/#' + encodeURIComponent(String(u || '').replace(/^@/, '').toLowerCase()); }
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('.cm-user[data-user]');
    if (!n) return;
    e.preventDefault();
    location.href = userURL(n.dataset.user);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var n = e.target.closest && e.target.closest('.cm-user[data-user]');
    if (!n) return;
    e.preventDefault();
    location.href = userURL(n.dataset.user);
  });
  try {
    var st = document.createElement('style');
    st.textContent = '.cm-user{cursor:pointer;border-radius:6px}.cm-user:hover .cm-name,.cm-user:focus-visible .cm-name{text-decoration:underline}.cm-user:focus-visible{outline:2px solid var(--ink,currentColor);outline-offset:2px}.cm-at{font-weight:600;text-decoration:underline}.md blockquote{margin:0;padding:2px 0 2px 12px;border-left:3px solid var(--line,#ccc);color:var(--ink2,inherit)}';
    (document.head || document.documentElement).append(st);
  } catch (e) {}

  // @username tokens in rendered HTML become links to that member's page. Runs on HTML that is
  // already escaped (VaultMD.render output): text outside tags only, and never inside an existing
  // link, so URLs and emails that were auto-linked stay as they are.
  function mentions(html) {
    var depth = 0;
    return String(html || '').split(/(<[^>]*>)/).map(function (part) {
      if (part.charAt(0) === '<') {
        if (/^<a[\s>]/i.test(part)) depth++;
        else if (/^<\/a>/i.test(part)) depth = Math.max(0, depth - 1);
        return part;
      }
      if (depth || part.indexOf('@') < 0) return part;
      return part.replace(/(^|[^\w\/&.])@([a-z0-9_]{3,20})(?![\w@])/gi, function (_, pre, u) {
        return pre + '<a class="cm-at" href="' + userURL(u) + '">@' + u.toLowerCase() + '</a>';
      });
    }).join('');
  }
  // Body text -> HTML: VaultMD (escapes everything first), then "> quoted" lines, then @mentions.
  function md(text) {
    var html = window.VaultMD ? VaultMD.render(text) : '<p>' + E(text) + '</p>';
    html = html.replace(/<p>&gt;\s?([\s\S]*?)<\/p>/g, '<blockquote>$1</blockquote>').replace(/<\/blockquote><blockquote>/g, '<br>');
    return mentions(html);
  }

  async function load() {
    if (!window.SB) return me;
    var r = await SB.auth.getSession();
    me.session = r.data.session;
    me.uid = me.session ? me.session.user.id : null;
    if (me.uid) {
      var p = await SB.from('profiles').select('display_name,username').eq('user_id', me.uid).maybeSingle();
      me.name = p.data ? p.data.display_name : null;
      me.username = p.data ? p.data.username : null;
      if (me.name && window.SITE && SITE.setName) SITE.setName(me.name);
      var a = await SB.rpc('is_admin');
      me.admin = !!a.data;
      // Members from before usernames existed: ask once per visit.
      if (me.name && !me.username) {
        var asked = false; try { asked = !!sessionStorage.getItem('askedUsername'); sessionStorage.setItem('askedUsername', '1'); } catch (e) {}
        if (!asked) setTimeout(function () { askName('Usernames are new. Pick yours once and it\'s yours for good.'); }, 600);
      }
    }
    return me;
  }

  function cleanUsername(u) { return String(u || '').trim().replace(/^@/, '').toLowerCase(); }
  function usernameProblem(u) {
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return 'Usernames are 3 to 20 letters, numbers or _ (no spaces).';
    return null;
  }

  async function setName(name, username) {
    name = String(name || '').trim();
    if (name.length < 2 || name.length > 30) return 'Pick a name between 2 and 30 characters.';
    var row = { display_name: name };
    if (!me.username) {
      username = cleanUsername(username);
      var bad = usernameProblem(username);
      if (bad) return bad;
      row.username = username;
    }
    var r = me.name
      ? await SB.from('profiles').update(row).eq('user_id', me.uid)
      : await SB.from('profiles').insert(row);
    if (r.error) return r.error.code === '23505'
      ? (/username/.test(r.error.message) ? 'That username is taken. Try another.' : 'Someone already has that display name. Try another.')
      : r.error.message;
    me.name = name;
    if (row.username) me.username = row.username;
    if (window.SITE && SITE.setName) SITE.setName(name);
    return null;
  }

  // Friendly text for errors from the database (content guard, rate limit, RLS) and the network.
  function errText(error) {
    if (!error) return '';
    var m = error.message || String(error), code = String(error.code || '');
    if (code === 'TIMEOUT' || /failed to fetch|load failed|networkerror|network request failed|fetch failed|timed out/i.test(m) || error.name === 'TypeError' || error.name === 'AbortError') return 'Can\'t reach the server right now.';
    if (code === '23505' || /duplicate key/i.test(m)) return 'That already exists.';
    if (/row-level security|permission denied/i.test(m)) return 'You don\'t have access to do that.';
    if (code === '23514' || /violates check constraint/i.test(m)) {
      return /_(title|body|name|reason|front|back|comment|display_name)_check/i.test(m) ? 'Something is too short or too long. Check what you typed.' : 'That doesn\'t fit the rules here.';
    }
    if (code === '42P01' || code === '42883' || code === '42703') return 'That part of the site isn\'t set up yet.';
    return m;
  }

  function ago(ts) {
    var s = (Date.now() - new Date(ts).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function modal(html) {
    var m = document.createElement('div');
    m.className = 'cm-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="cm-box">' + html + '</div>';
    var close = function () { m.remove(); document.removeEventListener('keydown', esc); };
    var esc = function (e) { if (e.key === 'Escape') close(); };
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', esc);
    document.body.append(m);
    var f = m.querySelector('textarea,input,button');
    if (f) f.focus();
    return { el: m, close: close };
  }

  function report(type, id) {
    if (!me.uid) {
      modal('<h2>Report</h2><p>Sign in to report a post.</p><div class="cm-row"><button class="btn ghost" data-close>Close</button><a class="btn" href="/join/?next=' + encodeURIComponent(location.pathname + location.hash) + '">Sign in</a></div>');
      return;
    }
    var m = modal('<h2>Report this?</h2><p>Tell me what\'s wrong. Kale will look at it and remove it if it breaks the rules.</p>' +
      '<textarea maxlength="300" placeholder="e.g. Has test answers, rude, spam"></textarea><div class="cm-msg" hidden></div>' +
      '<div class="cm-row"><button class="btn ghost" data-close>Cancel</button><button class="btn" data-send>Send report</button></div>');
    m.el.querySelector('[data-send]').addEventListener('click', async function () {
      var reason = m.el.querySelector('textarea').value.trim();
      var msg = m.el.querySelector('.cm-msg');
      if (reason.length < 2) { msg.textContent = 'Add a short reason.'; msg.hidden = false; return; }
      this.disabled = true;
      var r = await SB.from('reports').insert({ target_type: type, target_id: id, reason: reason });
      if (r.error) { msg.textContent = errText(r.error); msg.hidden = false; this.disabled = false; return; }
      SB.functions.invoke('notify', { body: { kind: 'report' } }).catch(function () {});
      m.el.querySelector('.cm-box').innerHTML = '<h2>Thanks</h2><p>Your report was sent.</p><div class="cm-row"><button class="btn" data-close>Done</button></div>';
    });
  }

  // Ask for a display name. Resolves true once set.
  function askName(why) {
    return new Promise(function (resolve) {
      var m = modal('<h2>' + (me.name ? (me.username ? 'Change your name' : 'Pick a username') : 'Pick a display name') + '</h2><p>' + E(why || 'This shows next to everything you post.') + '</p>' +
        (me.username ? '' : '<label class="cm-lbl">Username <small>can\'t be changed later</small><input data-u maxlength="21" placeholder="e.g. kale_e" autocapitalize="off" spellcheck="false"></label>') +
        '<label class="cm-lbl">Display name <small>you can change this anytime</small><input data-n maxlength="30" placeholder="e.g. Kale E." value="' + E(me.name || '') + '"></label><div class="cm-msg" hidden></div>' +
        '<div class="cm-row"><button class="btn ghost" data-close>Cancel</button><button class="btn" data-save>Save</button></div>');
      var done = false;
      var save = async function () {
        var msg = m.el.querySelector('.cm-msg');
        var u = m.el.querySelector('[data-u]');
        var err = await setName(m.el.querySelector('[data-n]').value, u && u.value);
        if (err) { msg.textContent = err; msg.hidden = false; return; }
        done = true; m.close(); resolve(true);
      };
      m.el.querySelector('[data-save]').addEventListener('click', save);
      m.el.querySelectorAll('input').forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); }); });
      new MutationObserver(function (_, o) { if (!m.el.isConnected) { o.disconnect(); if (!done) resolve(false); } }).observe(document.body, { childList: true });
    });
  }

  return { me: me, PROFILE_COLS: PROFILE_COLS, nameHTML: nameHTML, userURL: userURL, mentions: mentions, md: md, load: load, setName: setName, askName: askName, report: report, modal: modal, ago: ago, errText: errText };
})();
