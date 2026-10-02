// Safe mini-formatter for vault text. Everything is escaped first, then:
//   # Title        ## Small heading      - bullet
//   **bold**       [label](https://link)  bare links, emails and phone numbers become tappable
window.VaultMD = (function () {
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) {
    var links = [];
    s = esc(s)
      .replace(/\[([^\]]{1,80})\]\((https?:\/\/[^\s)]+)\)/g, function (_, t, u) { links.push('<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>'); return '\u0000' + (links.length - 1) + '\u0000'; })
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, function (_, p, u) { links.push('<a href="' + u + '" target="_blank" rel="noopener">' + u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') + '</a>'); return p + '\u0000' + (links.length - 1) + '\u0000'; })
      .replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, '<a href="mailto:$1">$1</a><button class="copy" data-copy="$1">Copy</button>')
      .replace(/(\+?\d[\d\s().-]{7,}\d)/g, function (m) { if (m.replace(/\D/g, '').length < 10) return m; return '<a href="tel:' + m.replace(/[^\d+]/g, '') + '">' + m + '</a><button class="copy" data-copy="' + m + '">Copy</button>'; });
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return links[+i]; });
  }
  function render(text) {
    var out = [], list = false;
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (/^[-*] /.test(t)) { if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + inline(t.slice(2)) + '</li>'); return; }
      if (list) { out.push('</ul>'); list = false; }
      if (!t) return;
      if (t.indexOf('## ') === 0) out.push('<h4>' + esc(t.slice(3)) + '</h4>');
      else if (t.indexOf('# ') === 0) out.push('<h3>' + esc(t.slice(2)) + '</h3>');
      else out.push('<p>' + inline(t) + '</p>');
    });
    if (list) out.push('</ul>');
    return out.join('');
  }
  function size(n) { if (!n && n !== 0) return ''; return n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
  return { render: render, esc: esc, size: size };
})();

document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
  e.preventDefault();
  var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done).catch(function () {});
});
