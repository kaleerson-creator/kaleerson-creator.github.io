[index (1).html](https://github.com/user-attachments/files/28906170/index.1.html)
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kale — Founder & Builder</title>
<meta name="description" content="Founder building STEM and engineering ventures. Based in Las Vegas.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #fafaf8;
  --bg2: #f4f3ef;
  --bg3: #eeecea;
  --ink: #0f0f0d;
  --ink2: #5a5953;
  --ink3: #a8a69f;
  --line: #e5e3de;
  --accent: #1a1a18;
  --green: #2d6a4f;
  --green-bg: #edf4f0;
  --amber: #92400e;
  --amber-bg: #fef3c7;
  --blue: #1e3a5f;
  --blue-bg: #eff4fb;
  --sans: 'Geist', system-ui, sans-serif;
  --serif: 'Instrument Serif', Georgia, serif;
  --r: 10px;
  --r-lg: 16px;
  --ease: 0.22s cubic-bezier(0.4,0,0.2,1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: var(--line); }

/* ── NAV ── */
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(250,250,248,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}

.nav-logo {
  font-family: var(--serif);
  font-size: 19px;
  color: var(--ink);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  list-style: none;
}

.nav-links a {
  color: var(--ink2);
  text-decoration: none;
  font-size: 13px;
  font-weight: 400;
  padding: 6px 13px;
  border-radius: 7px;
  transition: var(--ease);
  letter-spacing: 0.01em;
}

.nav-links a:hover { color: var(--ink); background: var(--bg2); }

.nav-cta-link {
  background: var(--ink) !important;
  color: var(--bg) !important;
  font-weight: 500 !important;
}
.nav-cta-link:hover { opacity: 0.85; background: var(--ink) !important; }

/* ── HERO ── */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 100px 32px 80px;
  max-width: 780px;
  margin: 0 auto;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 32px;
}

.hero-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--green);
}

.hero h1 {
  font-family: var(--serif);
  font-size: clamp(3rem, 7vw, 5.2rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 28px;
  max-width: 680px;
}

.hero h1 em {
  font-style: italic;
  color: var(--ink2);
}

.hero-sub {
  font-size: 1.05rem;
  color: var(--ink2);
  line-height: 1.75;
  max-width: 480px;
  font-weight: 300;
  margin-bottom: 40px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--sans);
  text-decoration: none;
  cursor: pointer;
  transition: var(--ease);
  border: 1px solid transparent;
  outline: none;
  letter-spacing: 0.01em;
}

.btn-dark { background: var(--ink); color: var(--bg); }
.btn-dark:hover { opacity: 0.82; }

.btn-ghost { background: transparent; color: var(--ink2); border-color: var(--line); }
.btn-ghost:hover { background: var(--bg2); color: var(--ink); border-color: var(--line); }

.hero-meta {
  display: flex;
  gap: 28px;
  margin-top: 56px;
  padding-top: 32px;
  border-top: 1px solid var(--line);
}

.hero-meta-item {}
.hero-meta-num {
  font-family: var(--serif);
  font-size: 2rem;
  line-height: 1;
  color: var(--ink);
  margin-bottom: 3px;
}
.hero-meta-label {
  font-size: 12px;
  color: var(--ink3);
  font-weight: 400;
  letter-spacing: 0.03em;
}

/* ── LAYOUT ── */
.page-section { padding: 80px 32px; max-width: 780px; margin: 0 auto; }

.rule { height: 1px; background: var(--line); max-width: 780px; margin: 0 auto; }

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 40px;
}

.section-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink3);
}

.section-title {
  font-family: var(--serif);
  font-size: clamp(1.6rem, 3.5vw, 2.2rem);
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.15;
  margin-top: 8px;
}

/* ── ABOUT ── */
.about-body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 60px;
  align-items: start;
}

.about-text p {
  font-size: 1rem;
  color: var(--ink2);
  line-height: 1.8;
  font-weight: 300;
  margin-bottom: 18px;
}

.about-text p strong { color: var(--ink); font-weight: 500; }

.about-text p:last-child { margin-bottom: 0; }

.about-sidebar {}

.sidebar-block {
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 22px;
  margin-bottom: 12px;
}

.sidebar-block:last-child { margin-bottom: 0; }

.sidebar-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink3);
  margin-bottom: 12px;
}

.sidebar-value {
  font-size: 14px;
  color: var(--ink);
  font-weight: 400;
  line-height: 1.6;
}

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }

.tag {
  font-size: 12px;
  color: var(--ink2);
  background: var(--bg3);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 3px 10px;
  font-weight: 400;
}

/* ── VENTURES (formerly projects) ── */
.ventures-list { display: flex; flex-direction: column; gap: 1px; }

.venture-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 20px;
  padding: 28px 0;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
  color: inherit;
  transition: var(--ease);
  cursor: pointer;
}

.venture-row:first-child { border-top: 1px solid var(--line); }

.venture-row:hover .venture-arrow { transform: translate(3px, -3px); }

.venture-category {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink3);
  margin-bottom: 6px;
}

.venture-name {
  font-family: var(--serif);
  font-size: 1.25rem;
  color: var(--ink);
  letter-spacing: -0.01em;
  margin-bottom: 6px;
}

.venture-desc {
  font-size: 13px;
  color: var(--ink2);
  font-weight: 300;
  max-width: 520px;
  line-height: 1.65;
}

.venture-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }

.venture-arrow {
  color: var(--ink3);
  transition: transform var(--ease);
  font-size: 18px;
  line-height: 1;
}

.status-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.pill-active   { background: var(--green-bg);  color: var(--green); }
.pill-building { background: var(--amber-bg);  color: var(--amber); }
.pill-planned  { background: var(--blue-bg);   color: var(--blue); }

/* ── FOCUS AREAS ── */
.focus-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.focus-card {
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 24px;
  transition: var(--ease);
}

.focus-card:hover { border-color: #c8c6c0; }

.focus-icon {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: var(--bg3);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  margin-bottom: 14px;
}

.focus-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 6px;
}

.focus-desc {
  font-size: 12px;
  color: var(--ink3);
  line-height: 1.6;
  font-weight: 400;
}

/* ── UPDATES ── */
.updates-list { display: flex; flex-direction: column; }

.update-item {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 24px;
  padding: 24px 0;
  border-bottom: 1px solid var(--line);
  align-items: start;
}

.update-item:first-child { border-top: 1px solid var(--line); }

.update-date {
  font-size: 12px;
  color: var(--ink3);
  font-weight: 400;
  padding-top: 3px;
  white-space: nowrap;
}

.update-content {}

.update-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink3);
  margin-bottom: 5px;
}

.update-text {
  font-size: 14px;
  color: var(--ink2);
  line-height: 1.65;
  font-weight: 300;
}

.update-text strong { color: var(--ink); font-weight: 500; }

/* ── CONTACT ── */
.contact-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
}

.contact-left p {
  font-size: 1rem;
  color: var(--ink2);
  font-weight: 300;
  line-height: 1.75;
  margin-bottom: 28px;
}

.contact-links { display: flex; flex-direction: column; gap: 8px; }

.contact-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: var(--r);
  text-decoration: none;
  transition: var(--ease);
  color: inherit;
}

.contact-link:hover { border-color: #c8c6c0; background: var(--bg3); }

.contact-link-left { display: flex; align-items: center; gap: 11px; }

.contact-link-icon {
  width: 30px; height: 30px;
  border-radius: 7px;
  background: var(--bg3);
  border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.contact-link-label { font-size: 13px; font-weight: 500; color: var(--ink); }
.contact-link-val { font-size: 12px; color: var(--ink3); }
.contact-link-arrow { color: var(--ink3); font-size: 13px; }

.contact-form { display: flex; flex-direction: column; gap: 12px; }

.field { display: flex; flex-direction: column; gap: 5px; }

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink2);
  letter-spacing: 0.03em;
}

.field input, .field textarea {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--ink);
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 300;
  outline: none;
  transition: var(--ease);
}

.field textarea { resize: vertical; min-height: 100px; }

.field input:focus, .field textarea:focus { border-color: #a8a6a0; }
.field input::placeholder, .field textarea::placeholder { color: var(--ink3); }

/* ── FOOTER ── */
footer {
  border-top: 1px solid var(--line);
  padding: 36px 32px;
}

.footer-inner {
  max-width: 780px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-logo {
  font-family: var(--serif);
  font-size: 17px;
  color: var(--ink);
}

.footer-links { display: flex; gap: 20px; }

.footer-links a {
  font-size: 12px;
  color: var(--ink3);
  text-decoration: none;
  transition: var(--ease);
}

.footer-links a:hover { color: var(--ink2); }

.footer-copy { font-size: 12px; color: var(--ink3); }

/* ── SEARCH ── */
.search-overlay {
  position: fixed; inset: 0;
  z-index: 200;
  background: rgba(15,15,13,0.3);
  display: none; align-items: flex-start; justify-content: center;
  padding-top: 90px;
  backdrop-filter: blur(6px);
}

.search-overlay.open { display: flex; }

.search-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  width: 100%; max-width: 520px;
  margin: 0 24px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08);
}

.search-row {
  display: flex; align-items: center;
  gap: 12px; padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.search-row svg { flex-shrink: 0; color: var(--ink3); }

.search-input {
  flex: 1; background: transparent; border: none;
  color: var(--ink); font-family: var(--sans);
  font-size: 16px; font-weight: 300; outline: none;
}

.search-input::placeholder { color: var(--ink3); }

.search-results { padding: 8px; max-height: 320px; overflow-y: auto; }

.s-result {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 12px; border-radius: 7px;
  cursor: pointer; transition: var(--ease);
}

.s-result:hover { background: var(--bg2); }
.s-result-type { font-size: 11px; font-weight: 500; color: var(--ink3); width: 64px; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
.s-result-name { font-size: 14px; color: var(--ink); }

/* ── FADE IN ── */
.fade {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.fade.in { opacity: 1; transform: none; }

/* ── MOBILE ── */
@media (max-width: 640px) {
  nav { padding: 0 20px; }
  nav .nav-links li:not(:last-child) { display: none; }
  .hero { padding: 100px 20px 60px; }
  .page-section { padding: 60px 20px; }
  .about-body { grid-template-columns: 1fr; gap: 32px; }
  .focus-grid { grid-template-columns: 1fr 1fr; }
  .contact-body { grid-template-columns: 1fr; gap: 32px; }
  .venture-row { grid-template-columns: 1fr; }
  .venture-right { flex-direction: row; align-items: center; }
  .footer-inner { flex-direction: column; gap: 16px; text-align: center; }
  .hero-meta { gap: 20px; }
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <a href="#" class="nav-logo">Kale</a>
  <ul class="nav-links">
    <li><a href="#about">About</a></li>
    <li><a href="#ventures">Ventures</a></li>
    <li><a href="#updates">Updates</a></li>
    <li><a href="#contact" class="nav-cta-link">Contact</a></li>
  </ul>
</nav>

<!-- SEARCH OVERLAY -->
<div class="search-overlay" id="searchWrap" onclick="this.classList.remove('open')">
  <div class="search-box" onclick="event.stopPropagation()">
    <div class="search-row">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 16 16"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
      <input class="search-input" id="searchInput" placeholder="Search…" oninput="doSearch(this.value)">
      <button onclick="document.getElementById('searchWrap').classList.remove('open')" style="background:none;border:none;color:var(--ink3);cursor:pointer;font-size:16px;line-height:1">✕</button>
    </div>
    <div class="search-results" id="searchResults"></div>
  </div>
</div>

<!-- HERO -->
<section class="hero">
  <div class="hero-eyebrow">
    <div class="hero-dot"></div>
    Based in Las Vegas · Open to partnerships
  </div>

  <h1>Building ventures at the edge of <em>engineering</em> and business.</h1>

  <p class="hero-sub">I found and operate businesses in STEM and engineering. My work lives at the intersection of systems thinking, technology, and building things that last.</p>

  <div class="hero-actions">
    <a href="#ventures" class="btn btn-dark">See my work</a>
    <a href="#contact" class="btn btn-ghost">Get in touch</a>
    <a href="kale.vcf" download class="btn btn-ghost">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2"/><line x1="4" y1="5" x2="10" y2="5"/><line x1="4" y1="8" x2="7" y2="8"/></svg>
      Save contact
    </a>
  </div>

  <div class="hero-meta">
    <div class="hero-meta-item">
      <div class="hero-meta-num">4</div>
      <div class="hero-meta-label">Active ventures</div>
    </div>
    <div class="hero-meta-item">
      <div class="hero-meta-num">3+</div>
      <div class="hero-meta-label">Years building</div>
    </div>
    <div class="hero-meta-item">
      <div class="hero-meta-num">LV</div>
      <div class="hero-meta-label">Nevada, USA</div>
    </div>
  </div>
</section>

<div class="rule"></div>

<!-- ABOUT -->
<section class="page-section" id="about">
  <div class="section-header">
    <span class="section-label">Who I am</span>
  </div>
  <h2 class="section-title" style="margin-bottom:40px">Founder. Operator. Builder.</h2>
  <div class="about-body">
    <div class="about-text fade">
      <p>I'm Kale — a founder and operator based in Las Vegas, Nevada. I build businesses and projects that sit at the intersection of <strong>engineering, STEM, and technology</strong>. My approach is commercial first: I think about markets, systems, and sustainability before I think about the technical details.</p>
      <p>I'm drawn to problems that require rigorous thinking — where getting the underlying model right is what separates a good business from a great one. Whether that's designing the economics of a software product, the architecture of an automated system, or the mechanics of a new venture, I care about building things that work at scale.</p>
      <p>I'm currently focused on building and launching new ventures while exploring how <strong>AI and automation</strong> can create durable, scalable businesses.</p>
    </div>
    <div class="about-sidebar fade">
      <div class="sidebar-block">
        <div class="sidebar-label">Location</div>
        <div class="sidebar-value">Las Vegas, Nevada</div>
      </div>
      <div class="sidebar-block">
        <div class="sidebar-label">Focus</div>
        <div class="sidebar-value">STEM ventures · Engineering businesses · Automation</div>
      </div>
      <div class="sidebar-block">
        <div class="sidebar-label">Domains</div>
        <div class="tag-row">
          <span class="tag">STEM</span>
          <span class="tag">Engineering</span>
          <span class="tag">Game tech</span>
          <span class="tag">Automation</span>
          <span class="tag">AI</span>
          <span class="tag">Systems design</span>
          <span class="tag">Software</span>
        </div>
      </div>
      <div class="sidebar-block">
        <div class="sidebar-label">Currently building</div>
        <div class="sidebar-value" style="font-style:italic;color:var(--ink2)">Ask me what's next →</div>
      </div>
    </div>
  </div>
</section>

<div class="rule"></div>

<!-- FOCUS AREAS -->
<section class="page-section" id="focus">
  <div class="section-header">
    <span class="section-label">Focus areas</span>
  </div>
  <div class="focus-grid">
    <div class="focus-card fade">
      <div class="focus-icon">⚙️</div>
      <div class="focus-name">Engineering systems</div>
      <div class="focus-desc">Building products and businesses around real engineering problems. Technical depth, commercial clarity.</div>
    </div>
    <div class="focus-card fade">
      <div class="focus-icon">📐</div>
      <div class="focus-name">STEM ventures</div>
      <div class="focus-desc">Projects in science, tech, and math that have a clear business model and a path to scale.</div>
    </div>
    <div class="focus-card fade">
      <div class="focus-icon">🤖</div>
      <div class="focus-name">AI & automation</div>
      <div class="focus-desc">Using intelligent systems to build leaner, more durable businesses — operationally and at the product layer.</div>
    </div>
  </div>
</section>

<div class="rule"></div>

<!-- VENTURES -->
<section class="page-section" id="ventures">
  <div class="section-header">
    <span class="section-label">Work</span>
  </div>
  <h2 class="section-title" style="margin-bottom:40px">Ventures & projects</h2>

  <div class="ventures-list">

    <div class="venture-row fade">
      <div>
        <div class="venture-category">Game Technology</div>
        <div class="venture-name">Call of Jury Duty</div>
        <div class="venture-desc">An independently developed Roblox game with custom-built game logic, round management, and player systems. A commercial entry into the game technology space — designed, scripted, and shipped.</div>
      </div>
      <div class="venture-right">
        <div class="venture-arrow">↗</div>
        <span class="status-pill pill-active">Active</span>
      </div>
    </div>

    <div class="venture-row fade">
      <div>
        <div class="venture-category">Engineering Simulation</div>
        <div class="venture-name">City Infrastructure Modelling</div>
        <div class="venture-desc">A structured simulation of city-scale systems — electricity, population, amenities, and economics. Built as a working model for STEM-adjacent education and planning tools.</div>
      </div>
      <div class="venture-right">
        <div class="venture-arrow">↗</div>
        <span class="status-pill pill-building">Completed</span>
      </div>
    </div>

    <div class="venture-row fade">
      <div>
        <div class="venture-category">Automated Systems</div>
        <div class="venture-name">AI-Operated Business</div>
        <div class="venture-desc">Building an end-to-end business where AI agents handle operations, fulfilment, and delivery. Exploring the frontier of what's possible when automation runs the full stack.</div>
      </div>
      <div class="venture-right">
        <div class="venture-arrow">↗</div>
        <span class="status-pill pill-planned">In development</span>
      </div>
    </div>

    <div class="venture-row fade">
      <div>
        <div class="venture-category">Engineering Operations</div>
        <div class="venture-name">Automated Production Systems</div>
        <div class="venture-desc">Designing and operating complex automated production systems — applied engineering that translates directly to real-world logistics and manufacturing concepts.</div>
      </div>
      <div class="venture-right">
        <div class="venture-arrow">↗</div>
        <span class="status-pill pill-active">Active</span>
      </div>
    </div>

  </div>
</section>

<div class="rule"></div>

<!-- UPDATES -->
<section class="page-section" id="updates">
  <div class="section-header">
    <span class="section-label">Updates</span>
  </div>
  <h2 class="section-title" style="margin-bottom:40px">What I'm working on</h2>

  <div class="updates-list">
    <div class="update-item fade">
      <div class="update-date">Jun 2026</div>
      <div class="update-content">
        <div class="update-tag">Launch</div>
        <div class="update-text"><strong>Launched this site</strong> — a central hub for my work, linked from a physical card via QR code. The goal: anyone I meet gets a complete picture of who I am and what I'm building.</div>
      </div>
    </div>
    <div class="update-item fade">
      <div class="update-date">May 2026</div>
      <div class="update-content">
        <div class="update-tag">Venture</div>
        <div class="update-text">Advancing the automated production systems project — designing logistics networks and throughput optimization for a STEM engineering context.</div>
      </div>
    </div>
    <div class="update-item fade">
      <div class="update-date">Apr 2026</div>
      <div class="update-content">
        <div class="update-tag">Product</div>
        <div class="update-text"><strong>Call of Jury Duty</strong> core systems complete. Custom round engine, player task management, and UI shipped. Moving into testing and distribution strategy.</div>
      </div>
    </div>
    <div class="update-item fade">
      <div class="update-date">Mar 2026</div>
      <div class="update-content">
        <div class="update-tag">Research</div>
        <div class="update-text">Mapping the landscape of AI-operated businesses — what's viable, what the unit economics look like, and where the real leverage is. Building a thesis before building the company.</div>
      </div>
    </div>
  </div>
</section>

<div class="rule"></div>

<!-- CONTACT -->
<section class="page-section" id="contact" style="padding-bottom:100px">
  <div class="section-header">
    <span class="section-label">Contact</span>
  </div>
  <h2 class="section-title" style="margin-bottom:40px">Let's talk</h2>

  <div class="contact-body">
    <div class="contact-left">
      <p>I'm always open to conversations about ventures, partnerships, and interesting problems in engineering and technology. Reach out directly — I read everything.</p>
      <div class="contact-links">
        <a href="mailto:hello@kale.com" class="contact-link">
          <div class="contact-link-left">
            <div class="contact-link-icon">✉</div>
            <div>
              <div class="contact-link-label">Email</div>
              <div class="contact-link-val">hello@kale.com</div>
            </div>
          </div>
          <div class="contact-link-arrow">↗</div>
        </a>
        <a href="#" class="contact-link">
          <div class="contact-link-left">
            <div class="contact-link-icon" style="font-size:11px; font-weight:600; color:var(--ink2)">𝕏</div>
            <div>
              <div class="contact-link-label">Twitter / X</div>
              <div class="contact-link-val">@yourhandle</div>
            </div>
          </div>
          <div class="contact-link-arrow">↗</div>
        </a>
        <a href="#" class="contact-link">
          <div class="contact-link-left">
            <div class="contact-link-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:var(--ink2)"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
            </div>
            <div>
              <div class="contact-link-label">LinkedIn</div>
              <div class="contact-link-val">linkedin.com/in/kale</div>
            </div>
          </div>
          <div class="contact-link-arrow">↗</div>
        </a>
        <a href="kale.vcf" download class="contact-link">
          <div class="contact-link-left">
            <div class="contact-link-icon">📇</div>
            <div>
              <div class="contact-link-label">Contact card</div>
              <div class="contact-link-val">Download .vcf</div>
            </div>
          </div>
          <div class="contact-link-arrow">↓</div>
        </a>
      </div>
    </div>

    <div class="contact-form">
      <div class="field">
        <label class="field-label" for="fname">Name</label>
        <input id="fname" type="text" placeholder="Your name">
      </div>
      <div class="field">
        <label class="field-label" for="femail">Email</label>
        <input id="femail" type="email" placeholder="you@company.com">
      </div>
      <div class="field">
        <label class="field-label" for="fmsg">Message</label>
        <textarea id="fmsg" placeholder="What's on your mind?"></textarea>
      </div>
      <button class="btn btn-dark" onclick="submitForm()" style="align-self:flex-start">Send message</button>
      <div id="formMsg" style="display:none;font-size:13px;color:var(--green)">Sent — I'll be in touch soon.</div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div class="footer-logo">Kale</div>
    <div class="footer-links">
      <a href="#about">About</a>
      <a href="#ventures">Ventures</a>
      <a href="#updates">Updates</a>
      <a href="#contact">Contact</a>
    </div>
    <div class="footer-copy">© 2026</div>
  </div>
</footer>

<script>
// Search
const items = [
  { type:'Venture', name:'Call of Jury Duty', id:'ventures' },
  { type:'Venture', name:'City Infrastructure Modelling', id:'ventures' },
  { type:'Venture', name:'AI-Operated Business', id:'ventures' },
  { type:'Section', name:'About', id:'about' },
  { type:'Section', name:'Focus areas', id:'focus' },
  { type:'Section', name:'Updates', id:'updates' },
  { type:'Section', name:'Contact', id:'contact' },
];

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const w = document.getElementById('searchWrap');
    w.classList.toggle('open');
    if (w.classList.contains('open')) setTimeout(() => document.getElementById('searchInput').focus(), 50);
  }
  if (e.key === 'Escape') document.getElementById('searchWrap').classList.remove('open');
});

function doSearch(q) {
  const res = document.getElementById('searchResults');
  if (!q.trim()) { res.innerHTML=''; return; }
  const matches = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase())).slice(0,5);
  if (!matches.length) { res.innerHTML='<div style="padding:12px 20px;font-size:13px;color:var(--ink3)">No results</div>'; return; }
  res.innerHTML = matches.map(m =>
    `<div class="s-result" onclick="go('${m.id}')">
      <span class="s-result-type">${m.type}</span>
      <span class="s-result-name">${m.name}</span>
    </div>`
  ).join('');
}

function go(id) {
  document.getElementById('searchWrap').classList.remove('open');
  document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });
}

// Form
function submitForm() {
  const n = document.getElementById('fname').value;
  const e = document.getElementById('femail').value;
  if (!n || !e) return;
  ['fname','femail','fmsg'].forEach(id => document.getElementById(id).value = '');
  const msg = document.getElementById('formMsg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 4000);
}

// Scroll fade
const obs = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      const delay = [...document.querySelectorAll('.fade')].indexOf(e.target) * 40;
      setTimeout(() => e.target.classList.add('in'), Math.min(delay, 200));
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.fade').forEach(el => obs.observe(el));
</script>
</body>
</html>
