// Shared bits for /study and /forum: who's signed in, display names, reports, dates.
window.Community = (function () {
  var E = window.VaultMD ? VaultMD.esc : function (s) { return String(s); };
  var me = { session: null, uid: null, name: null, username: null, admin: false };
  var PROFILE_COLS = 'display_name,username,name_color,tags';

  // Display name with the admin-set color, @username and tags. p = {display_name, username, name_color, tags}.
  function nameHTML(p, fallback) {
    if (!p || !p.display_name) return E(fallback || 'Someone');
    var c = /^#[0-9a-fA-F]{6}$/.test(p.name_color || '') ? ' style="--nc:' + p.name_color + '"' : '';
    return '<span class="cm-name"' + c + (p.username ? ' title="@' + E(p.username) + '"' : '') + '>' + E(p.display_name) + '</span>' +
      (p.tags || []).map(function (t) { return ' <span class="cm-tag">' + E(t) + '</span>'; }).join('');
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

  // Friendly text for errors from the database (content guard, rate limit, RLS).
  function errText(error) {
    if (!error) return '';
    var m = error.message || String(error);
    if (/row-level security|permission denied/i.test(m)) return 'You don\'t have access to do that.';
    if (/violates check constraint/i.test(m)) return 'Something is too short or too long. Check what you typed.';
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

  return { me: me, PROFILE_COLS: PROFILE_COLS, nameHTML: nameHTML, load: load, setName: setName, askName: askName, report: report, modal: modal, ago: ago, errText: errText };
})();
