// Shared header and footer. Mark the current page with <body data-page="work">.
(function () {
  var page = document.body.dataset.page || '';
  var links = [['work', 'Work', '/work/'], ['tools', 'Tools', '/tools/'], ['updates', 'Updates', '/updates/'], ['games', 'Games', '/games/'], ['forum', 'Forum', '/forum/'], ['about', 'About', '/about/'], ['contact', 'Contact', '/contact/']];
  var nav = document.createElement('header');
  nav.className = 'nav';
  nav.innerHTML =
    '<div class="wrap"><a class="logo" href="/"><i></i>Kale Erson</a>' +
    '<nav class="links" aria-label="Main">' + links.map(function (l) {
      return '<a href="' + l[2] + '"' + (l[0] === page ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
    }).join('') + '</nav>' +
    '<div class="row"><a class="navcta" href="/join/">Join</a><button class="menubtn" aria-label="Menu" aria-expanded="false">☰</button></div></div>';
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
    links.map(function (l) { return '<a href="' + l[2] + '">' + l[1] + '</a>'; }).join('') + '<a href="/join/">Join</a></nav></div>';
  document.body.append(foot);
})();

window.SITE = {
  arrow: '<span class="arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg></span>',
  statusChip: function (s) { return '<span class="chip ' + s + '">' + ({ live: 'Active', dev: 'In development', done: 'Completed', dropped: 'Dropped' }[s] || s) + '</span>'; },
  month: function (ym) { var d = new Date(ym + '-01T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); },
  esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
};
