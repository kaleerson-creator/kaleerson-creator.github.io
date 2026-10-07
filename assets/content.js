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
    { date: '2026-10', tag: 'Launch', title: 'Play online: Battleship and Rock Paper Scissors', href: '/edu/play/',
      body: 'Two new room games next to tic-tac-toe, Connect Four, the trivia race and Letter Rush. Every room now has reactions, a chat line, an invite link with a QR code and a Rematch button.' },
    { date: '2026-10', tag: 'Launch', title: 'Nine new games', href: '/edu/',
      body: 'Speed Math, Reaction Time, Memory Match, Blocks, Breakout, Flap, Hangman, Simon and Connect Four vs AI, all with leaderboards. Memory Match and Sudoku got a daily puzzle that is the same for everyone, 2048 got three undos, trivia got categories and 40 new questions.' },
    { date: '2026-10', tag: 'Product', title: 'Share your score, challenge a friend, keep a streak', href: '/edu/',
      body: 'Every game-over screen can share your score or copy a challenge link like /edu/2048/?beat=1840. Daily Word shares a spoiler-free emoji grid. Daily Word and Daily Challenge count streaks, with a 30-day calendar.' },
    { date: '2026-10', tag: 'Launch', title: 'Eleven quick tools', href: '/tools/',
      body: 'Bell Schedule, Countdown, GPA & Grades, Picker, Focus Timer, Citations, QR Codes, Word Counter, Whiteboard, Unit Converter and Stopwatch. No account needed, everything stays on your device.' },
    { date: '2026-10', tag: 'Product', title: 'Search with Ctrl+K, install as an app, pick an accent', href: '/',
      body: 'Press Ctrl+K (or the search button) to jump to any page or game. Press ? for keyboard shortcuts. The site installs to your home screen and solo games work offline. Pick an accent color in Account, Settings.' },
    { date: '2026-10', tag: 'Product', title: 'Public profiles and badges', href: '/account/',
      body: 'Every member gets a page at kaleerson.com/u/#username with their best scores and weekly ranks. The account page shows your stats, badges and a download of your data.' },
    { date: '2026-10', tag: 'Product', title: 'Study: Learn and Match modes, import and share decks', href: '/study/',
      body: 'Learn mode spaces out cards you miss, Match is a timed pairs game, quizzes can be typed. Paste cards from Quizlet-style text, export a deck, share it with a QR code, and see test dates on your calendar.' },
    { date: '2026-10', tag: 'Product', title: 'Forum: hearts, search, mentions and quotes', href: '/forum/',
      body: 'Mark replies helpful, search threads, sort by Top, quote a reply, mention someone with @username, and see what is new since your last visit.' },
    { date: '2026-10', tag: 'Product', title: 'Speech & Debate: judge view, flow sheet upgrades, Congress tools', href: '/debate/',
      body: 'Fullscreen judge view with both prep clocks, an impromptu drill, argument sprints, a speaker-point rubric, a card cutter with auto-cite, an extemp prep pad, flow tags and extends with print and export, a Congress motions table and questioning queue, grace periods, and drill stats.' },
    { date: '2026-10', tag: 'Product', title: 'Snapwit: four new games and Top 10s', href: '/snapwit/',
      body: 'Type Sprint, Word Unscramble, Track It and Pattern Next, a Top 10 for every game, a sound toggle, practice mode and challenge links.' },
    { date: '2026-10', tag: 'Product', title: 'Snapwit and LD Timer opened to members', href: '/tools/' },
    { date: '2026-06', tag: 'Launch',  title: 'Launched this site' },
    { date: '2026-05', tag: 'Venture', title: 'Automated Production Systems', href: '/work/' },
    { date: '2026-04', tag: 'Product', title: 'Call of Jury Duty: core systems complete', href: '/work/' },
    { date: '2026-03', tag: 'Research', title: 'AI-operated businesses', href: '/work/' }
  ]
};
