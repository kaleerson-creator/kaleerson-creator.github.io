// Small pictures for the clickable boxes. Any element with data-art="name" gets the matching
// drawing. Lines use the page's ink color and surfaces use the card color, so they work in
// light and dark mode. Loaded by site.js only on pages that use them.
(function () {
  var S = 'stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  var W = 'fill="var(--card)" ' + S;
  var R = '#E5484D', B = '#3B6FE0', Y = '#F3C93B', G = '#4f8a4a', O = '#F08C3A', P = '#8E6BE8';
  var F = 'font-family="Bricolage Grotesque,Geist,system-ui,sans-serif" font-weight="800" text-anchor="middle"';
  var t = function (x, y, s, size, fill) { return '<text x="' + x + '" y="' + y + '" ' + F + ' font-size="' + (size || 20) + '" fill="' + (fill || 'var(--ink)') + '">' + s + '</text>'; };
  var rect = function (x, y, w, h, r, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 8) + '" ' + (fill ? 'fill="' + fill + '" ' + S : W) + '/>'; };
  var circ = function (x, y, r, fill) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + (fill ? 'fill="' + fill + '" ' + S : W) + '/>'; };
  var path = function (d, fill) { return '<path d="' + d + '" ' + (fill === 'none' ? 'fill="none" ' + S : fill ? 'fill="' + fill + '" ' + S : W) + '/>'; };

  var stopwatch = function (inner) {
    return rect(52, 6, 16, 10, 3, Y) + path('M86 26l8-8', 'none') + circ(60, 66, 44) + circ(60, 66, 34, 'none') +
      (inner || path('M60 66V44', 'none') + path('M60 66l14 10', 'none') + circ(60, 66, 4, 'var(--ink)'));
  };
  var bubble = function (x, y, w, h, fill, tail) {
    return path('M' + (x + 10) + ' ' + y + 'h' + (w - 20) + 'a10 10 0 0 1 10 10v' + (h - 20) + 'a10 10 0 0 1-10 10H' + (tail === 'r' ? (x + w - 14) + 'l6 12-16-12' : (x + 26) + 'l-16 12 6-12') + 'H' + (x + 10) + 'a10 10 0 0 1-10-10v' + -(h - 20) + 'a10 10 0 0 1 10-10z', fill);
  };
  var lines = function (x, y, w, n, gap) { var s = ''; for (var i = 0; i < n; i++) s += path('M' + x + ' ' + (y + i * (gap || 9)) + 'h' + (i === n - 1 ? w * 0.6 : w), 'none'); return s; };
  var tile = function (x, y, s, fill, color, size) { return rect(x, y, 26, 26, 6, fill) + t(x + 13, y + 20, s, size || 15, color || (fill === Y ? '#141613' : 'var(--ink)')); };

  var ART = {
    // ── site tools ──
    snapwit: stopwatch(path('M64 40L48 70h14l-6 24 18-32H60z', Y)),
    ldtimer: stopwatch(t(60, 75, 'LD', 26)),
    debate: bubble(6, 14, 64, 44, B) + bubble(48, 50, 66, 44, R, 'r') + lines(18, 32, 38, 2) + lines(62, 68, 40, 2),
    games: path('M22 46h76a18 18 0 0 1 18 18v6a20 20 0 0 1-36 12l-6-8H46l-6 8a20 20 0 0 1-36-12v-6a18 18 0 0 1 18-18z') +
      path('M30 64h16M38 56v16', 'none') + circ(82, 60, 5, R) + circ(94, 70, 5, B),
    study: path('M60 34C46 24 26 22 10 26v62c16-4 36-2 50 8 14-10 34-12 50-8V26c-16-4-36-2-50 8z') + path('M60 34v62', 'none') +
      lines(20, 42, 28, 3) + lines(72, 42, 28, 3) + path('M84 6l14 14-30 30-16 4 4-16z', Y),
    forum: bubble(8, 10, 70, 46, B) + bubble(40, 52, 72, 46, 'var(--card)', 'r') + circ(58, 75, 3, 'var(--ink)') + circ(74, 75, 3, 'var(--ink)') + circ(90, 75, 3, 'var(--ink)') + lines(20, 28, 44, 2),
    join: rect(14, 30, 92, 62, 12) + circ(40, 56, 11, Y) + path('M24 82c4-10 28-10 32 0', 'none') + lines(66, 52, 28, 3),
    // ── games ──
    '2048': rect(8, 8, 104, 104, 14) + rect(18, 18, 40, 40, 8, '#EEE4DA') + t(38, 45, '2', 20, '#776E65') + rect(62, 18, 40, 40, 8, '#EDE0C8') + t(82, 45, '4', 20, '#776E65') +
      rect(18, 62, 40, 40, 8, '#F2B179') + t(38, 89, '8', 20, '#fff') + rect(62, 62, 40, 40, 8, '#F59563') + t(82, 89, '16', 18, '#fff'),
    snake: rect(8, 8, 104, 104, 14) + path('M24 92V64h36V40h36', 'none').replace('stroke-width="3"', 'stroke-width="14"').replace('var(--ink)', G) +
      circ(96, 40, 7, G) + circ(36, 30, 9, R) + path('M36 21c2-5 6-7 10-7', 'none'),
    minesweeper: rect(8, 8, 104, 104, 14) + (function () { var s = ''; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) s += rect(16 + j * 32, 16 + i * 32, 26, 26, 5, (i + j) % 2 ? 'var(--paper)' : 'var(--card)'); return s; })() +
      t(29, 35, '1', 16, B) + t(61, 67, '2', 16, G) + circ(93, 93, 7, 'var(--ink)') + path('M93 82v-4M93 108v-4M82 93h-4M108 93h-4', 'none') + path('M88 22v18M88 22l12 5-12 5', R),
    sudoku: rect(8, 8, 104, 104, 10) + path('M42.7 8v104M77.3 8v104M8 42.7h104M8 77.3h104', 'none') + t(25, 33, '5', 18) + t(60, 68, '3', 18, B) + t(95, 33, '7', 18) + t(25, 103, '9', 18, B) + t(95, 103, '1', 18) + t(60, 33, '8', 18),
    typing: rect(6, 30, 108, 64, 12) + (function () { var s = ''; for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) s += rect(14 + c * 16 + (r % 2) * 6, 38 + r * 15, 12, 11, 3, r === 1 && c === 2 ? Y : 'var(--paper)'); return s; })() + rect(30, 84, 60, 6, 3, 'var(--paper)'),
    trivia: rect(20, 10, 80, 100, 14, P) + t(60, 82, '?', 64, '#fff'),
    daily: rect(12, 18, 96, 90, 12) + path('M12 44h96', 'none') + rect(12, 18, 96, 26, 12, R) + path('M36 10v16M84 10v16', 'none') + path('M60 56l6 13 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2z', Y),
    word: (function () { var s = '', L = ['W', 'O', 'R', 'D', 'S'], C = [G, Y, 'var(--paper)', G, 'var(--paper)']; for (var i = 0; i < 5; i++) s += rect(4 + i * 23, 44, 20, 22, 4, C[i]) + t(14 + i * 23, 61, L[i], 14, C[i] === 'var(--paper)' ? 'var(--ink)' : '#fff'); return s; })() +
      (function () { var s = ''; for (var i = 0; i < 5; i++) s += rect(4 + i * 23, 72, 20, 22, 4, 'var(--card)'); return s; })(),
    play: circ(32, 46, 16, B) + path('M8 100c2-20 46-20 48 0', B) + circ(88, 46, 16, R) + path('M64 100c2-20 46-20 48 0', R) + path('M60 14l-8 14h10l-6 14', 'none'),
    letters: tile(10, 50, 'R', Y, null, 16) + tile(40, 34, 'U', Y, null, 16) + tile(70, 50, 'S', Y, null, 16) + tile(26, 80, 'H', Y, null, 16) + tile(58, 80, 'A', Y, null, 16) + tile(88, 22, 'Z', 'var(--card)', null, 16),
    leaderboards: rect(44, 50, 32, 60, 4, Y) + rect(10, 70, 32, 40, 4, 'var(--card)') + rect(78, 80, 32, 30, 4, O) + t(60, 86, '1', 22, '#141613') + t(26, 98, '2', 20) + t(94, 103, '3', 18, '#141613') +
      path('M48 14h24v10a12 12 0 0 1-24 0z', Y) + path('M60 36v8M52 46h16', 'none'),
    // ── speech & debate ──
    ld: path('M30 52h60l-8 58H38z') + rect(22, 40, 76, 14, 5, B) + path('M60 40V22', 'none') + circ(60, 18, 7, 'var(--ink)') + t(60, 88, 'LD', 18),
    pf: bubble(4, 12, 56, 40, B) + bubble(60, 12, 56, 40, R, 'r') + bubble(4, 66, 56, 40, B) + bubble(60, 66, 56, 40, R, 'r') + t(32, 39, 'PRO', 13, '#fff') + t(88, 39, 'CON', 13, '#fff'),
    policy: path('M12 44h96v62a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z') + path('M8 30h104v14H8z', O) + rect(24, 14, 30, 22, 3) + rect(48, 8, 30, 28, 3) + rect(70, 16, 30, 20, 3) + rect(44, 62, 32, 12, 4, 'var(--paper)'),
    congress: rect(10, 90, 100, 14, 5) + path('M28 64l30-30 14 14-30 30z', O) + path('M64 42l14-14M70 48l28 28', 'none') + rect(84, 66, 14, 30, 4, O).replace('x="84" y="66"', 'x="84" y="66" transform="rotate(-45 91 81)"'),
    speech: rect(44, 8, 32, 58, 16, 'var(--card)') + path('M50 24h20M50 34h20M50 44h20', 'none') + path('M32 50a28 28 0 0 0 56 0', 'none') + path('M60 78v22M42 104h36', 'none') + path('M98 30a30 30 0 0 1 0 36M106 22a42 42 0 0 1 0 52', 'none'),
    flow: rect(6, 14, 108, 92, 10) + path('M42 14v92M78 14v92', 'none') + lines(14, 32, 20, 3) + lines(50, 46, 20, 3) + lines(86, 60, 20, 3) + path('M34 36l14 10M70 50l14 10', 'none'),
    topics: path('M60 10a30 30 0 0 1 18 54v14H42V64a30 30 0 0 1 18-54z', Y) + rect(42, 84, 36, 10, 4) + rect(46, 98, 28, 10, 4) + path('M52 46l8 10 8-10', 'none'),
    drill: rect(8, 26, 104, 68, 14) + path('M20 60h6l6-18 8 36 8-28 6 20 6-10h10', 'none') + rect(76, 40, 28, 18, 9, Y) + t(90, 54, 'um', 12, '#141613') + path('M78 62l24-26', R),
    cases: rect(20, 16, 84, 96, 8) + rect(10, 8, 84, 96, 8) + path('M22 26h48', 'none').replace('stroke-width="3"', 'stroke-width="4"') + path('M22 42h58M22 54h58M22 66h58M22 78h40', 'none') + rect(20, 49, 46, 10, 2, 'rgba(243,201,59,.75)').replace(S, 'stroke="none"'),
    news: path('M14 46l56-26v80L14 74z', R) + rect(6, 46, 16, 28, 4) + path('M30 76l8 26h12l-6-24', 'none') + path('M84 44l18-10M86 60h22M84 76l18 10', 'none'),
    lock: rect(18, 52, 84, 60, 12, Y) + path('M36 52V38a24 24 0 0 1 48 0v14', 'none') + circ(60, 78, 8, 'var(--ink)') + path('M60 84v12', 'none'),
    cards: rect(30, 18, 74, 52, 8, P) + rect(16, 34, 74, 52, 8, Y) + rect(8, 50, 80, 56, 8) + t(48, 85, 'Aa', 22),
    ballot: rect(18, 14, 84, 98, 10) + rect(42, 6, 36, 16, 5, B) + rect(30, 38, 14, 14, 3, 'var(--paper)') + path('M33 45l4 4 8-10', 'none') + lines(52, 45, 38, 1) + rect(30, 62, 14, 14, 3, 'var(--paper)') + lines(52, 69, 38, 1) + lines(30, 90, 56, 2),
    // ── more games ──
    math: rect(10, 12, 100, 96, 14) + t(60, 54, '7×8', 30) + rect(26, 66, 68, 28, 8, Y) + t(60, 87, '= 56', 18, '#141613') + path('M96 6l8 14M100 4l-4 16', 'none'),
    reaction: circ(60, 62, 44, G) + circ(60, 62, 34, 'none') + path('M66 32L46 68h16l-6 26 20-36H62z', Y) + t(60, 116, 'ms', 13),
    memory: rect(10, 24, 46, 62, 8, B) + t(33, 66, '?', 34, '#fff') + rect(62, 34, 46, 62, 8) + path('M85 44l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z', Y),
    blocks: rect(6, 8, 108, 104, 14) + (function () { var s = '', q = function (x, y, c) { return rect(x, y, 22, 22, 3, c); };
      s += q(14, 64, P) + q(36, 64, P) + q(58, 64, P) + q(36, 42, P); // T
      s += q(14, 86, B) + q(36, 86, B) + q(58, 86, B) + q(80, 86, B); // I
      s += q(84, 14, O) + q(84, 36, O) + q(62, 36, O) + q(62, 14, O); // O (falling)
      return s; })(),
    breakout: (function () { var s = '', C = [R, O, Y]; for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) s += rect(8 + c * 36, 8 + r * 22, 32, 18, 4, C[(r + c) % 3]); return s; })() +
      circ(60, 72, 9, 'var(--ink)') + rect(30, 100, 60, 12, 6, B),
    flap: rect(86, 4, 26, 38, 4, G) + rect(82, 36, 34, 10, 3, G) + rect(86, 82, 26, 34, 4, G) + rect(82, 76, 34, 10, 3, G) +
      circ(40, 62, 28, Y) + path('M18 68c-8 2-12 10-10 18 10 0 18-6 20-10z', Y) + circ(52, 52, 8, 'var(--card)') + circ(54, 52, 4, 'var(--ink)') + path('M62 68l18 2-18 8z', O),
    hangman: path('M14 112h44M34 112V12h42v14', 'none') + circ(76, 38, 11) + path('M76 49v22M76 56l-12 12M76 56l12 12M76 71l-10 18M76 71l10 18', 'none') +
      rect(8, 92, 12, 4, 2, 'var(--ink)') + rect(24, 92, 12, 4, 2, 'var(--ink)') + rect(40, 92, 12, 4, 2, 'var(--ink3)'),
    simon: path('M60 60V14A46 46 0 0 1 106 60z', G) + path('M60 60h46a46 46 0 0 1-46 46z', R) + path('M60 60v46A46 46 0 0 1 14 60z', Y) + path('M60 60H14A46 46 0 0 1 60 14z', B) + circ(60, 60, 16),
    connect: rect(8, 18, 104, 92, 12, B) + (function () { var s = '', M = [['c', 'c', 'c', 'c'], ['c', 'c', R, 'c'], ['c', R, Y, 'c'], [R, Y, Y, R]]; for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) s += circ(24 + c * 24, 34 + r * 21, 8, M[r][c] === 'c' ? 'var(--card)' : M[r][c]); return s; })(),
    molecules: path('M46 30L68 56M68 56L94 36M68 56L90 90', 'none') + rect(30, 14, 32, 32, 8, B) + path('M94 18l16 30H78z', R) + circ(68, 56, 20, Y) + circ(61, 52, 2.5, '#141613') + circ(75, 52, 2.5, '#141613') + path('M60 62q8 7 16 0', 'none') + circ(92, 92, 11),
    // ── quick tools ──
    bell: circ(60, 12, 5, 'var(--ink)') + path('M60 16c-18 0-30 14-30 32v20L20 84h80L90 68V48c0-18-12-32-30-32z', Y) + path('M48 90a12 12 0 0 0 24 0', 'var(--ink)') + path('M14 36a30 30 0 0 1 8-20M106 36a30 30 0 0 0-8-20', 'none'),
    countdown: rect(26, 6, 68, 10, 4) + rect(26, 104, 68, 10, 4) + path('M34 16h52v8L68 52v16l18 28v8H34v-8l18-28V52L34 24z') + path('M44 24h32l-16 20z', Y) + path('M48 94l12-16 12 16z', Y) + path('M60 56v12', 'none'),
    gpa: rect(14, 8, 92, 104, 12) + t(48, 84, 'A', 60, G) + t(86, 52, '+', 32, G) + lines(70, 76, 24, 3),
    pick: (function () { var s = '', C = [R, O, Y, G, B, P], cx = 60, cy = 64, r = 44; for (var i = 0; i < 6; i++) { var a = (i * 60 - 90) * Math.PI / 180, b = ((i + 1) * 60 - 90) * Math.PI / 180;
      s += path('M' + cx + ' ' + cy + 'L' + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + (cx + r * Math.cos(b)).toFixed(1) + ' ' + (cy + r * Math.sin(b)).toFixed(1) + 'z', C[i]); }
      return s + circ(cx, cy, 9) + path('M60 4l10 18H50z', 'var(--ink)'); })(),
    focus: circ(60, 70, 40, R) + path('M60 30c-6-10-16-12-24-8 8 2 14 6 24 8zM60 30c6-10 16-12 24-8-8 2-14 6-24 8z', G) + path('M60 30V14', 'none') + path('M60 70V52M60 70l12 8', 'none') + circ(60, 70, 3, 'var(--ink)'),
    cite: rect(16, 8, 88, 104, 12) + t(44, 80, '\u201C', 84, B) + lines(26, 86, 64, 2) + lines(66, 36, 24, 3),
    qr: rect(8, 8, 104, 104, 12) + rect(18, 18, 28, 28, 5) + rect(27, 27, 10, 10, 2, 'var(--ink)') + rect(74, 18, 28, 28, 5) + rect(83, 27, 10, 10, 2, 'var(--ink)') + rect(18, 74, 28, 28, 5) + rect(27, 83, 10, 10, 2, 'var(--ink)') +
      (function () { var s = '', M = [[54, 20], [62, 28], [54, 36], [62, 44], [20, 54], [36, 54], [54, 54], [70, 54], [86, 54], [54, 70], [62, 78], [78, 70], [94, 78], [54, 86], [70, 94], [86, 94], [94, 86]]; for (var i = 0; i < M.length; i++) s += rect(M[i][0], M[i][1], 8, 8, 2, 'var(--ink)').replace(S, 'stroke="none"'); return s; })(),
    words: rect(14, 8, 92, 104, 12) + lines(26, 26, 66, 5) + rect(50, 78, 50, 26, 13, Y) + t(75, 96, '128', 15, '#141613'),
    draw: rect(6, 14, 108, 78, 10) + rect(44, 98, 32, 8, 4, 'var(--ink)') + path('M60 92v6', 'none') +
      path('M20 66c8-26 20-26 30-6s20 22 30-6', 'none').replace('stroke-width="3"', 'stroke-width="6"').replace('var(--ink)', B) +
      circ(88, 36, 11, 'none').replace('stroke-width="3"', 'stroke-width="5"').replace('var(--ink)', R) +
      path('M78 70l24 24 8-8-24-24z', Y) + path('M106 94l6 6-4 4-6-6z', 'var(--ink)'),
    convert: rect(8, 40, 48, 36, 10, Y) + t(32, 65, 'km', 18, '#141613') + rect(64, 40, 48, 36, 10, B) + t(88, 65, 'mi', 18, '#fff') +
      path('M28 24h62M80 14l10 10-10 10', 'none') + path('M92 92H30M40 82L30 92l10 10', 'none'),
    stopwatch: stopwatch(circ(60, 42, 3.5, R) + t(60, 76, '0:42', 20) + path('M44 86h32', 'none').replace('var(--ink)', 'var(--line)')),
    // ── site ──
    search: circ(50, 50, 34) + circ(50, 50, 24, 'none').replace('stroke="var(--ink)"', 'stroke="var(--ink)" opacity=".3"') + path('M76 76l30 30', 'none').replace('stroke-width="3"', 'stroke-width="12"') + path('M36 40a16 16 0 0 1 10-10', 'none'),
    random: rect(52, 8, 56, 56, 12, R) + circ(66, 22, 5, '#fff') + circ(94, 22, 5, '#fff') + circ(80, 36, 5, '#fff') + circ(66, 50, 5, '#fff') + circ(94, 50, 5, '#fff') +
      rect(10, 48, 60, 60, 12) + circ(25, 63, 5, 'var(--ink)') + circ(55, 63, 5, 'var(--ink)') + circ(40, 78, 5, 'var(--ink)') + circ(25, 93, 5, 'var(--ink)') + circ(55, 93, 5, 'var(--ink)')
  };
  window.ART = ART;
  var draw = function (root) {
    (root || document).querySelectorAll('[data-art]:not([data-drawn])').forEach(function (el) {
      var a = ART[el.dataset.art]; if (!a) return;
      el.dataset.drawn = '1';
      el.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">' + a + '</svg>';
    });
  };
  window.drawArt = draw;
  draw();
  new MutationObserver(function () { draw(); }).observe(document.body, { childList: true, subtree: true });
})();
