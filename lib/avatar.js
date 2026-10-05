// Avatars made from a name: no upload, no storage. The same name always gets the same
// color and initials. Colors are site tokens (var(--moss) etc), so they follow dark mode.
//   Avatar.svg(name, size)  -> inline <svg> markup (safe to drop into innerHTML)
//   Avatar.el(name, size)   -> a <span class="avatar"> element holding that svg
//   Avatar.uri(name, size)  -> data: URI with the token resolved to a hex color (for <img src>)
window.Avatar = (function () {
  var TOKENS = ['moss', 'sky', 'peach', 'butter', 'lilac'];
  var FONT = "'Bricolage Grotesque','Geist',system-ui,sans-serif";
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hash(s) { var h = 5381; s = String(s || '').toLowerCase(); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; }
  function initials(name) {
    var words = String(name || '').trim().replace(/^@/, '').split(/[\s_.\-]+/).filter(Boolean);
    if (!words.length) return '?';
    var a = words[0], b = words.length > 1 ? words[words.length - 1] : '';
    var s = b ? a[0] + b[0] : a.slice(0, 2);
    return s.toUpperCase();
  }
  function token(name) { return TOKENS[hash(name) % TOKENS.length]; }
  function svg(name, size, fill) {
    size = size || 40;
    var t = initials(name), fs = t.length > 1 ? 26 : 30;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(name || '') + '" style="display:block;flex:none;border-radius:38%">' +
      '<rect width="64" height="64" rx="24" fill="' + (fill || 'var(--' + token(name) + ')') + '"/>' +
      '<text x="32" y="34" text-anchor="middle" dominant-baseline="middle" font-family="' + FONT + '" font-weight="800" font-size="' + fs + '" letter-spacing="-0.03em" fill="var(--ink)">' + esc(t) + '</text></svg>';
  }
  function el(name, size) { var s = document.createElement('span'); s.className = 'avatar'; s.style.cssText = 'display:inline-block;line-height:0;flex:none'; s.innerHTML = svg(name, size); return s; }
  function uri(name, size) {
    var cs = getComputedStyle(document.documentElement);
    var bg = (cs.getPropertyValue('--' + token(name)) || '#CFE0B4').trim(), ink = (cs.getPropertyValue('--ink') || '#141613').trim();
    var m = svg(name, size, bg).replace('fill="var(--ink)"', 'fill="' + ink + '"');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m);
  }
  return { svg: svg, el: el, uri: uri, initials: initials, token: token };
})();
