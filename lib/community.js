// Shared bits for /study and /forum: who's signed in, display names, reports, dates.
window.Community = (function () {
  var E = window.VaultMD ? VaultMD.esc : function (s) { return String(s); };
  var me = { session: null, uid: null, name: null, admin: false };

  async function load() {
    if (!window.SB) return me;
    var r = await SB.auth.getSession();
    me.session = r.data.session;
    me.uid = me.session ? me.session.user.id : null;
    if (me.uid) {
      var p = await SB.from('profiles').select('display_name').eq('user_id', me.uid).maybeSingle();
      me.name = p.data ? p.data.display_name : null;
      if (me.name && window.SITE && SITE.setName) SITE.setName(me.name);
      var a = await SB.rpc('is_admin');
      me.admin = !!a.data;
    }
    return me;
  }

  async function setName(name) {
    name = String(name || '').trim();
    if (name.length < 2 || name.length > 30) return 'Pick a name between 2 and 30 characters.';
    var r = me.name
      ? await SB.from('profiles').update({ display_name: name }).eq('user_id', me.uid)
      : await SB.from('profiles').insert({ display_name: name });
    if (r.error) return r.error.code === '23505' ? 'Someone already has that name. Try another.' : r.error.message;
    me.name = name;
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
      m.el.querySelector('.cm-box').innerHTML = '<h2>Thanks</h2><p>Your report was sent.</p><div class="cm-row"><button class="btn" data-close>Done</button></div>';
    });
  }

  // Ask for a display name. Resolves true once set.
  function askName(why) {
    return new Promise(function (resolve) {
      var m = modal('<h2>' + (me.name ? 'Change your name' : 'Pick a display name') + '</h2><p>' + E(why || 'This shows next to everything you post.') + '</p>' +
        '<input maxlength="30" placeholder="e.g. Kale E." value="' + E(me.name || '') + '"><div class="cm-msg" hidden></div>' +
        '<div class="cm-row"><button class="btn ghost" data-close>Cancel</button><button class="btn" data-save>Save</button></div>');
      var done = false;
      var save = async function () {
        var msg = m.el.querySelector('.cm-msg');
        var err = await setName(m.el.querySelector('input').value);
        if (err) { msg.textContent = err; msg.hidden = false; return; }
        done = true; m.close(); resolve(true);
      };
      m.el.querySelector('[data-save]').addEventListener('click', save);
      m.el.querySelector('input').addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); });
      new MutationObserver(function (_, o) { if (!m.el.isConnected) { o.disconnect(); if (!done) resolve(false); } }).observe(document.body, { childList: true });
    });
  }

  return { me: me, load: load, setName: setName, askName: askName, report: report, modal: modal, ago: ago, errText: errText };
})();
