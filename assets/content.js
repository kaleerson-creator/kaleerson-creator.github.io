// ── Site content ─────────────────────────────────────────────────
// Edit this file to update projects, tools and updates across every page.
// projects: status 'live' | 'dev' | 'done' | 'dropped'; desc is one plain sentence shown on /work/.
// tools: art must be a name in assets/art.js; quick:true = small utility shown in the "Quick tools" group.
// updates: newest first; href and body are optional.
window.CONTENT = {
  projects: [
    { name: 'Call of Jury Duty',               area: 'Game technology',        status: 'dev', color: 'peach',  year: '2026', note: 'Roblox game', desc: 'Roblox game, in development.' },
    { name: 'City Infrastructure Modelling',   area: 'Engineering simulation', status: 'dev', color: 'sky',    year: '2026', note: '', desc: 'Engineering simulation of how a city\'s systems fit together, in development.' },
    { name: 'AI-Operated Business',            area: 'Automated systems',      status: 'dev',  color: 'butter', year: '2026', note: '', desc: 'An experiment in running a small business on automated systems, in development.' },
    { name: 'Automated Production Systems',    area: 'Engineering operations', status: 'dropped', color: 'moss',   year: '2026', note: '', desc: 'Engineering operations venture from early 2026, now dropped.' }
  ],
  tools: [
    { name: 'Snapwit', art: 'snapwit',  href: '/snapwit/', color: 'peach', tag: '30 games',       note: 'Reaction, memory and party games' },
    { name: 'LD Timer', art: 'ldtimer', href: '/ldtimer/', color: 'sky',   tag: 'Debate',          note: 'Lincoln-Douglas round timer' },
    { name: 'Speech & Debate', art: 'debate', href: '/debate/', color: 'butter', tag: 'Debate',       note: 'PF, Policy, Congress and speech timers, flow, topics' },
    { name: 'Games', art: 'games', href: '/edu/', color: 'moss', tag: 'Play', note: 'Daily Word, 2048, Snake, Blocks, Breakout, trivia and online rooms', open: true },
    { name: 'PVHS Study', art: 'study', href: '/study/', color: 'lilac', tag: 'Study',           note: 'Palo Verde HS study site', status: 'live' },
    // quick tools: no account needed, work offline
    { name: 'Bell Schedule', art: 'bell',      href: '/bell/',      color: 'sky',    tag: 'School',  note: 'Current period and minutes until the bell at Palo Verde', open: true, quick: true },
    { name: 'Countdown',     art: 'countdown', href: '/countdown/', color: 'peach',  tag: 'Timer',   note: 'Big countdown to any date, shareable by link', open: true, quick: true },
    { name: 'GPA & Grades',  art: 'gpa',       href: '/gpa/',       color: 'moss',   tag: 'School',  note: 'Weighted GPA and what you need on the final', open: true, quick: true },
    { name: 'Picker',        art: 'pick',      href: '/pick/',      color: 'butter', tag: 'Fun',     note: 'Spin a wheel, make teams, roll dice, flip a coin', open: true, quick: true },
    { name: 'Focus Timer',   art: 'focus',     href: '/focus/',     color: 'lilac',  tag: 'Timer',   note: 'Pomodoro timer with tasks and session stats', open: true, quick: true },
    { name: 'Citations',     art: 'cite',      href: '/cite/',      color: 'sky',    tag: 'Writing', note: 'MLA and APA citations for websites, books and articles', open: true, quick: true },
    { name: 'QR Codes',      art: 'qr',        href: '/qr/',        color: 'moss',   tag: 'Share',   note: 'Make a QR code for any link, right in the browser', open: true, quick: true },
    { name: 'Word Counter',  art: 'words',     href: '/words/',     color: 'peach',  tag: 'Writing', note: 'Words, characters, reading time and readability', open: true, quick: true },
    { name: 'Whiteboard',    art: 'draw',      href: '/draw/',      color: 'peach',  tag: 'Make',    note: 'Sketch, annotate, save as PNG', open: true, quick: true },
    { name: 'Unit Converter', art: 'convert',  href: '/convert/',   color: 'sky',    tag: 'Math',    note: 'Length, weight, temperature, speed and more', open: true, quick: true },
    { name: 'Stopwatch',     art: 'stopwatch', href: '/stopwatch/', color: 'moss',   tag: 'Timer',   note: 'Laps and splits, keeps running in the background', open: true, quick: true }
  ],
  updates: [
    { date: '2026-10', tag: 'Product', title: 'Online Battleship and RPS, forum upvotes, deck import, flow sheet upgrades, three more tools', href: '/tools/' },
    { date: '2026-10', tag: 'Launch', title: 'Nine new games, eight quick tools, sharing and streaks', href: '/tools/',
      body: 'Speed Math, Reaction Time, Memory Match, Blocks, Breakout, Flap, Hangman, Simon and Connect Four, plus Bell Schedule, Countdown, GPA, Picker, Focus Timer, Citations, QR Codes and Word Counter.' },
    { date: '2026-10', tag: 'Product', title: 'Snapwit and LD Timer opened to members', href: '/tools/' },
    { date: '2026-06', tag: 'Launch',  title: 'Launched this site' },
    { date: '2026-05', tag: 'Venture', title: 'Automated Production Systems', href: '/work/' },
    { date: '2026-04', tag: 'Product', title: 'Call of Jury Duty: core systems complete', href: '/work/' },
    { date: '2026-03', tag: 'Research', title: 'AI-operated businesses', href: '/work/' }
  ]
};
