// Members-only gate for a page. Include after lib/sb.js:
//   <script src="/lib/gate.js"></script>
// When Supabase isn't configured (or blocked) the page stays open. Otherwise visitors without
// a session see a sign-up screen inside the normal site chrome: the header and footer stay,
// only the page itself is hidden.
// Optional: <body data-gate-features="Timers and flows|Your cases|Team sharing"> lists what
// members get (3 items, separated by | or ,). Styles live in /assets/site.css (#gate-screen).
(function () {
  if (!window.SB) return;
  var hide = document.createElement('style');
  hide.id = 'gate-hide';
  hide.textContent = 'body>*:not(#gate-screen):not(.nav):not(.foot-site):not(.site-ui){display:none!important}';
  document.head.appendChild(hide);
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function features() {
    var raw = (document.body && document.body.dataset.gateFeatures) || '';
    var parts = raw.split(raw.indexOf('|') >= 0 ? '|' : ',').map(function (s) { return s.trim(); }).filter(Boolean);
    return (parts.length ? parts : ['Timers and flows', 'Your cases and evidence', 'Team sharing']).slice(0, 3);
  }
  function lock() {
    if (document.getElementById('gate-screen')) return;
    var next = encodeURIComponent(location.pathname + location.search);
    var name = (document.title || 'This tool').replace(/\s*[·|-]\s*Kale Erson\s*$/, '').trim() || 'This tool';
    var g = document.createElement('div');
    g.id = 'gate-screen';
    g.innerHTML =
      '<div class="gate b"><span class="blob"></span><span class="blob b2"></span>' +
      '<span class="lbl">Members only</span>' +
      '<h1>' + esc(name) + ' is for members</h1>' +
      '<p>It\'s free. Sign up with your email and you\'re in.</p>' +
      '<span class="lbl">What you get</span><ul>' + features().map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
      '<a class="btn" href="/join/?next=' + next + '">Sign up or sign in</a>' +
      '<small>Already a member? Same button.</small></div>';
    var foot = document.querySelector('footer.foot-site');
    if (foot && foot.parentNode === document.body) document.body.insertBefore(g, foot); else document.body.appendChild(g);
  }
  function unlock() {
    var g = document.getElementById('gate-screen'); if (g) g.remove();
    var h = document.getElementById('gate-hide'); if (h) h.remove();
  }
  function ready(fn) { document.body ? fn() : document.addEventListener('DOMContentLoaded', fn); }

  SB.auth.getSession().then(function (r) { ready(r.data.session ? unlock : lock); }).catch(function () { ready(unlock); });
  SB.auth.onAuthStateChange(function (evt, s) {
    if (evt === 'SIGNED_OUT' || !s) { if (!document.getElementById('gate-hide')) document.head.appendChild(hide); ready(lock); }
    else if (evt === 'SIGNED_IN') ready(unlock);
  });
})();
