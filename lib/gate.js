// Members-only gate for a page. Include after lib/sb.js:
//   <script src="/lib/gate.js"></script>
// When Supabase isn't configured the page stays open. Otherwise visitors without a
// session see a sign-up screen instead of the page.
(function () {
  if (!window.SB) return;
  var hide = document.createElement('style');
  hide.id = 'gate-hide';
  hide.textContent = 'body>*:not(#gate-screen){display:none!important}';
  document.head.appendChild(hide);

  function lock() {
    if (document.getElementById('gate-screen')) return;
    var next = encodeURIComponent(location.pathname);
    var g = document.createElement('div');
    g.id = 'gate-screen';
    g.innerHTML =
      '<style>#gate-screen{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px 16px;background:#fafaf8;color:#0f0f0d;font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}' +
      '#gate-screen .b{max-width:340px;display:grid;gap:14px;justify-items:center}' +
      '#gate-screen .i{width:56px;height:56px;border-radius:16px;background:#fff;border:1px solid #e5e3de;display:grid;place-items:center}' +
      '#gate-screen h1{font:600 26px/1.15 system-ui,sans-serif;margin:0;text-transform:none;letter-spacing:normal;color:#0f0f0d}#gate-screen p{margin:0;color:#5a5953;text-transform:none;letter-spacing:normal}' +
      '#gate-screen a{display:inline-block;background:#0f0f0d;color:#fff;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:12px}' +
      '#gate-screen small{color:#a8a69f}</style>' +
      '<div class="b"><div class="i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f0f0d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>' +
      '<h1>Members only</h1><p>' + (document.title || 'This tool') + ' is free for members. Sign up with your email to use it.</p>' +
      '<a href="/join/?next=' + next + '">Sign up or sign in</a><small>Already a member? Use the same button.</small></div>';
    document.body.appendChild(g);
  }
  function unlock() {
    var g = document.getElementById('gate-screen'); if (g) g.remove();
    var h = document.getElementById('gate-hide'); if (h) h.remove();
  }
  function ready(fn) { document.body ? fn() : document.addEventListener('DOMContentLoaded', fn); }

  SB.auth.getSession().then(function (r) { ready(r.data.session ? unlock : lock); });
  SB.auth.onAuthStateChange(function (evt, s) { if (evt === 'SIGNED_OUT' || !s) ready(lock); });
})();
