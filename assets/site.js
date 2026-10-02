// Shared header and footer. Mark the current page with <body data-page="work">.
(function () {
  var page = document.body.dataset.page || '';
  var links = [['work', 'Work', '/work/'], ['tools', 'Tools', '/tools/'], ['updates', 'Updates', '/updates/'], ['games', 'Games', '/edu/'], ['forum', 'Forum', '/forum/'], ['about', 'About', '/about/'], ['contact', 'Contact', '/contact/']];
  // Signed in? (supabase-js keeps the session in localStorage.) Show the name instead of Join.
  var signedIn = false, myName = null;
  try { signedIn = !!localStorage.getItem('sb-xkmuakmlrttnyxdddkmd-auth-token'); myName = localStorage.getItem('site_name'); } catch (e) {}
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var me = signedIn ? ['account', myName || 'Account', '/account/'] : ['join', 'Join', '/join/'];
  var nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML =
    '<div class="wrap"><a class="logo" href="/"><i></i>Kale Erson</a>' +
    '<nav class="links" aria-label="Main">' + links.map(function (l) {
      return '<a href="' + l[2] + '"' + (l[0] === page ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
    }).join('') + '<a class="mob" href="' + me[2] + '"' + (me[0] === page ? ' aria-current="page"' : '') + '>' + esc(signedIn ? 'Account' : 'Join') + '</a></nav>' +
    '<div class="row"><a class="navcta" href="' + me[2] + '" title="' + esc(signedIn ? 'Your account' : 'Join') + '">' + esc(me[1]) + '</a><button class="menubtn" aria-label="Menu" aria-expanded="false">☰</button></div></div>';
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

  var st = document.createElement('script');
  st.src = '/assets/stats.js?v=20261003';
  st.defer = true;
  document.head.append(st);
})();

window.SITE = {
  arrow: '<span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span>',
  statusChip: function (s) { return '<span class="chip ' + s + '">' + ({ live: 'Active', dev: 'In development', done: 'Completed', dropped: 'Dropped' }[s] || s) + '</span>'; },
  month: function (ym) { var d = new Date(ym + '-01T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); },
  // Remember the display name for the header (null = signed out).
  setName: function (n) {
    try { n ? localStorage.setItem('site_name', n) : localStorage.removeItem('site_name'); } catch (e) {}
    var a = document.querySelector('.navcta'); if (a && n) a.textContent = n;
  },
  esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
};
