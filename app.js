/* =========================================================
   OSINT Hub — carnet de terrain · logique de l'application
   ---------------------------------------------------------
   Sommaire
     1. Configuration & utilitaires     10. Analyse photo
     2. Réglages (thème, effets)        11. Entraînement
     3. Activité (calendrier)           12. Enquêtes (données, tableau, chronologie)
     4. Navigation & transitions        13. Tableau de bord
     5. Décor : courbes de niveau       14. À propos, textes légaux, paramètres
     6. Accueil : globe & animations    15. Charte au premier lancement
     7. Chronomètre                     16. Palette de commandes & raccourcis
     8. Recherche                       17. Démarrage
     9. Carte GEOINT
   ========================================================= */

/* ---------- 1. CONFIGURATION & UTILITAIRES ---------- */
const VERSION = "5.0.0";
const TERMS_VERSION = "1.0";                 // ← augmente-le si tu modifies les conditions : l'accord sera redemandé
const REPO_URL = "https://github.com/fabienboulhabel/osint-hub";      // ← remplace par l'adresse de ton dépôt GitHub
const ACCENT = "#ff3b00";
const PREFIX = "osh.";                       // préfixe des données (évite les conflits avec tes autres sites *.github.io)
const LEGACY = ["cases", "activeCase", "tasks", "sessions", "gg", "ggMaps", "totalSecs", "searchHistory", "mapView", "mapLayer", "report"];

const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];
const enc = encodeURIComponent;
const pad = (n, l = 2) => String(n).padStart(l, "0");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const trunc = (s, n) => (s = String(s || "")).length > n ? s.slice(0, n - 1) + "…" : s;
const uid = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const openUrl = u => window.open(u, "_blank", "noopener");
const isTyping = () => ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function load(k, d) {
  try {
    let raw = localStorage.getItem(PREFIX + k);
    if (raw === null && LEGACY.includes(k)) raw = localStorage.getItem(k); // reprise des données des versions précédentes
    const v = JSON.parse(raw);
    return v ?? d;
  } catch { return d; }
}
const save = (k, v) => localStorage.setItem(PREFIX + k, JSON.stringify(v));

let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ---------- 2. RÉGLAGES ---------- */
let settings = { theme: "paper", fx: !reducedMotion, ...load("settings", {}) };
if (!["paper", "night"].includes(settings.theme)) settings.theme = "paper";
const fxOn = () => settings.fx && !reducedMotion;
function applySettings() {
  document.documentElement.dataset.theme = settings.theme;
  document.body.classList.toggle("fx", fxOn());
  $("fxToggle").checked = settings.fx;
  $$("#themeSeg button").forEach(b => b.classList.toggle("on", b.dataset.theme === settings.theme));
  document.querySelector('meta[name="theme-color"]').content = settings.theme === "night" ? "#0f100e" : "#0d0d0d";
  topo.refreshColors(); globe.refreshColors();
  if (current === "training") drawChart();
}
function setSetting(k, v) { settings[k] = v; save("settings", settings); applySettings(); }
$("themeBtn").onclick = () => setSetting("theme", settings.theme === "night" ? "paper" : "night");
$$("#themeSeg button").forEach(b => b.onclick = () => setSetting("theme", b.dataset.theme));
$("fxToggle").onchange = e => setSetting("fx", e.target.checked);

/* ---------- 3. ACTIVITÉ ---------- */
let activity = load("activity", {});
function bump(n = 1) { const k = todayKey(); activity[k] = (activity[k] || 0) + n; save("activity", activity); }
function streak() {
  const d = new Date(); let n = 0;
  if (!activity[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (activity[todayKey(d)] > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- 4. NAVIGATION & TRANSITIONS ---------- */
// Navigation par ancres (#search, #map…) : le bouton « retour » de la souris fonctionne
const VIEWS = {
  home: "Accueil", dashboard: "Tableau de bord", search: "Recherche", map: "Carte GEOINT",
  photo: "Analyse photo", training: "Entraînement", cases: "Enquêtes", about: "À propos"
};
const KEYS = ["home", "dashboard", "search", "map", "photo", "training", "cases"]; // touches 0 à 6
const onEnter = {};
let current = null, navToken = 0;

function go(v) { closeMenu(); closePalette(); if ((location.hash.slice(1) || "home") === v) show(v); else location.hash = v; }
function route() { const v = location.hash.slice(1); show(VIEWS[v] ? v : "home"); }
addEventListener("hashchange", route);

function show(v) {
  closeMenu(); closePalette();
  if (v === current) { onEnter[v]?.(); return; }
  const token = ++navToken;
  const apply = () => {
    if (token !== navToken) return;
    $$(".view").forEach(s => s.classList.toggle("active", s.id === "v-" + v));
    $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.v === v));
    document.body.dataset.view = v;
    current = v;
    window.scrollTo(0, 0);
    onEnter[v]?.();
    $$(`#v-${v} .m-head [data-scramble], #v-${v} .hero [data-scramble]`).forEach(scramble);
    onScroll();
  };
  if (!current || !fxOn()) return apply();
  const scan = $("scan");
  $("scanLbl").textContent = VIEWS[v].toUpperCase();
  scan.className = "in";
  setTimeout(() => {
    apply();
    scan.className = "out";
    setTimeout(() => { if (token === navToken) scan.className = ""; }, 450);
  }, 400);
}

// Menu plein écran
const closeMenu = () => $("menu").classList.remove("open");
$("menuBtn").onclick = () => $("menu").classList.add("open");
$("menuClose").onclick = closeMenu;
$$("#menu nav a").forEach(a => a.addEventListener("mouseenter", () => $("menuDesc").textContent = a.dataset.d));
document.addEventListener("click", e => { if (e.target.closest('a[href^="#"]')) closeMenu(); });

// Barre de progression de lecture + animations liées au défilement
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  $("progress").style.width = max > 0 ? (scrollY / max * 100) + "%" : "0";
  if (current !== "home") return;
  const path = $("stepsPath"), r = $("method").getBoundingClientRect();
  const k = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height * .7)));
  path.style.strokeDasharray = 1000; path.style.strokeDashoffset = 1000 * (1 - k);
}
addEventListener("scroll", onScroll, { passive: true });

// Effet « décodage » des titres
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_";
function scramble(el) {
  if (!el) return;
  const txt = el.dataset.txt ?? (el.dataset.txt = el.textContent);
  if (!fxOn()) { el.textContent = txt; return; }
  cancelAnimationFrame(el._raf);
  let f = 0; const total = txt.length * 2 + 10;
  const step = () => {
    let out = "";
    for (let i = 0; i < txt.length; i++) {
      out += txt[i] === " " || i < (f - 10) / 2 ? txt[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (++f <= total) el._raf = requestAnimationFrame(step); else el.textContent = txt;
  };
  step();
}
$$(".nav a").forEach(a => a.addEventListener("mouseenter", () => scramble(a.querySelector("[data-scramble]"))));

/* ---------- 5. DÉCOR : COURBES DE NIVEAU ANIMÉES ---------- */
const topo = (() => {
  const c = $("topo"), ctx = c.getContext("2d");
  const STEP = 16;
  const SEG = [[], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0], [3, 0], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], []];
  let W = 0, H = 0, t = Math.random() * 50, last = 0, minor = "", major = "";
  const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const sm = x => x * x * (3 - 2 * x);
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
    const a = hash(i, j), b = hash(i + 1, j), cc = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function refreshColors() {
    const night = settings.theme === "night";
    minor = night ? "rgba(235,233,225,.06)" : "rgba(13,13,13,.075)";
    major = night ? "rgba(235,233,225,.13)" : "rgba(13,13,13,.16)";
    if (!fxOn()) ctx.clearRect(0, 0, W, H);
  }
  function draw() {
    const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1, f = new Float32Array(cols * rows);
    mouse.sx += (mouse.x - mouse.sx) * .07; mouse.sy += (mouse.y - mouse.sy) * .07;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * STEP, y = j * STEP, dx = x - mouse.sx, dy = y - mouse.sy;
      f[j * cols + i] = noise(x * .0032 + t * .025, y * .0032) + .5 * noise(x * .008, y * .008 - t * .035)
        + .6 * Math.exp(-(dx * dx + dy * dy) / 40000);
    }
    ctx.clearRect(0, 0, W, H);
    let n = 0;
    for (let L = .25; L < 1.9; L += .11, n++) {
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
        const a = f[j * cols + i], b = f[j * cols + i + 1], cc = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
        if (!idx || idx === 15) continue;
        const x = i * STEP, y = j * STEP, s = SEG[idx];
        const pt = e => e === 0 ? [x + STEP * (L - a) / (b - a), y] : e === 1 ? [x + STEP, y + STEP * (L - b) / (cc - b)]
          : e === 2 ? [x + STEP * (L - d) / (cc - d), y + STEP] : [x, y + STEP * (L - a) / (d - a)];
        for (let k = 0; k < s.length; k += 2) { const p = pt(s[k]), q = pt(s[k + 1]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      }
      ctx.strokeStyle = n % 4 === 0 ? major : minor; ctx.lineWidth = n % 4 === 0 ? 1.2 : 1; ctx.stroke();
    }
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!fxOn() || document.hidden || current === "map" || ts - last < 50) return;
    t += last ? Math.min(ts - last, 100) / 1000 : 0; last = ts;
    draw();
  }
  addEventListener("resize", resize);
  addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  resize();
  return { start: () => requestAnimationFrame(loop), refreshColors };
})();

/* ---------- 6. ACCUEIL : GLOBE, RÉTICULE, FICHES ---------- */
const globe = (() => {
  const c = $("globe"), ctx = c.getContext("2d"), RAD = Math.PI / 180;
  // Contour simplifié de la France métropolitaine et de la Corse (lon, lat)
  const FRANCE = [[2.5, 51.1], [4.2, 50.0], [4.8, 50.1], [5.8, 49.5], [6.4, 49.5], [7.6, 49.0], [8.2, 48.97], [7.6, 47.6], [7.0, 47.4], [6.1, 46.4], [6.8, 46.0], [7.0, 45.3],
    [6.6, 44.6], [7.0, 44.2], [7.5, 43.8], [6.6, 43.1], [5.3, 43.2], [4.6, 43.4], [3.2, 43.0], [3.1, 42.45], [1.7, 42.5], [0.0, 42.7], [-1.8, 43.4], [-1.3, 44.3],
    [-1.1, 45.6], [-1.2, 46.2], [-2.2, 47.1], [-4.4, 47.9], [-4.7, 48.4], [-3.0, 48.8], [-1.6, 48.6], [-1.9, 49.7], [-1.2, 49.4], [0.2, 49.5], [1.5, 50.2], [1.6, 50.9]];
  const CORSE = [[9.4, 43.0], [9.55, 42.1], [9.2, 41.4], [8.6, 41.9], [8.8, 42.6]];
  const CITIES = [["PARIS", 2.35, 48.86], ["MARSEILLE", 5.37, 43.3], ["BORDEAUX", -0.58, 44.84], ["LILLE", 3.06, 50.63], ["STRASBOURG", 7.75, 48.57],
    ["TOULOUSE", 1.44, 43.6], ["NANTES", -1.55, 47.22], ["LYON", 4.8357, 45.764]];
  let size = 0, dpr = 1, lon0 = 2.5, lat0 = 40, vx = 0, vy = 0, drag = null, lastTouch = 0, tt = 0, ink = "#0d0d0d", soft = "rgba(13,13,13,.25)";
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); size = c.clientWidth;
    if (!size) return;
    c.width = c.height = size * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function refreshColors() { ink = cssVar("--ink") || "#0d0d0d"; soft = settings.theme === "night" ? "rgba(235,233,225,.22)" : "rgba(13,13,13,.22)"; draw(); }
  function proj(lon, lat, R, cx, cy) {
    const l = (lon - lon0) * RAD, p = lat * RAD, p0 = lat0 * RAD;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    return [cx + R * Math.cos(p) * Math.sin(l), cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), cosc];
  }
  function line(pts, R, cx, cy) {
    let pen = false;
    for (const [lo, la] of pts) {
      const [x, y, v] = proj(lo, la, R, cx, cy);
      if (v > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
    }
  }
  function draw() {
    if (!size) return;
    const R = size * .4, cx = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);
    // Graduations extérieures
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    for (let a = 0; a < 360; a += 5) {
      const r1 = R + 10, r2 = R + (a % 30 === 0 ? 22 : 15), s = Math.sin(a * RAD), co = Math.cos(a * RAD);
      ctx.beginPath(); ctx.moveTo(cx + r1 * co, cy + r1 * s); ctx.lineTo(cx + r2 * co, cy + r2 * s); ctx.stroke();
    }
    ctx.font = "600 10px JetBrains Mono, monospace"; ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    [["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["O", -1, 0]].forEach(([t, x, y]) => ctx.fillText(t, cx + x * (R + 34), cy + y * (R + 34)));
    // Sphère
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.lineWidth = 1.5; ctx.stroke();
    // Graticule
    ctx.beginPath(); ctx.strokeStyle = soft; ctx.lineWidth = .8;
    for (let lo = -180; lo < 180; lo += 15) { const pts = []; for (let la = -90; la <= 90; la += 3) pts.push([lo, la]); line(pts, R, cx, cy); }
    for (let la = -75; la <= 75; la += 15) { const pts = []; for (let lo = -180; lo <= 180; lo += 3) pts.push([lo, la]); line(pts, R, cx, cy); }
    ctx.stroke();
    // Méridien de balayage
    const scanLon = lon0 - 90 + ((tt * 22) % 180);
    ctx.beginPath(); const sp = []; for (let la = -90; la <= 90; la += 2) sp.push([scanLon, la]); line(sp, R, cx, cy);
    ctx.strokeStyle = ACCENT + "aa"; ctx.lineWidth = 1.5; ctx.stroke();
    // France
    [FRANCE, CORSE].forEach(poly => {
      const pts = poly.map(([lo, la]) => proj(lo, la, R, cx, cy));
      if (pts.some(p => p[2] <= 0)) return;
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
      ctx.fillStyle = ACCENT + "33"; ctx.fill(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.6; ctx.stroke();
    });
    // Villes
    ctx.font = "600 9px JetBrains Mono, monospace"; ctx.textAlign = "left";
    CITIES.forEach(([name, lo, la]) => {
      const [x, y, v] = proj(lo, la, R, cx, cy); if (v <= 0) return;
      const lyon = name === "LYON";
      ctx.fillStyle = lyon ? ACCENT : ink; ctx.fillRect(x - (lyon ? 3 : 2), y - (lyon ? 3 : 2), lyon ? 6 : 4, lyon ? 6 : 4);
      if (lyon) {
        const k = (tt * .8) % 1;
        ctx.beginPath(); ctx.arc(x, y, 5 + k * 22, 0, 7); ctx.strokeStyle = `rgba(255,59,0,${1 - k})`; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 34, y - 30); ctx.lineTo(x + 110, y - 30); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = ink; ctx.font = "800 10px JetBrains Mono, monospace"; ctx.fillText("LYON · 45.76N 4.84E", x + 36, y - 38);
        ctx.font = "600 9px JetBrains Mono, monospace";
      }
    });
    $("globeRead").textContent = `CENTRE ${Math.abs(lat0).toFixed(1)}°${lat0 >= 0 ? "N" : "S"} · ${Math.abs(((lon0 + 540) % 360) - 180).toFixed(1)}°${((lon0 + 540) % 360) - 180 >= 0 ? "E" : "O"}`;
  }
  function loop() {
    requestAnimationFrame(loop);
    if (current !== "home" || document.hidden) return;
    if (!fxOn()) return;
    tt += 1 / 60;
    if (!drag) {
      lon0 += vx; lat0 += vy; vx *= .94; vy *= .94;
      if (performance.now() - lastTouch > 3500) {
        lon0 += (2.5 + 16 * Math.sin(tt * .22) - lon0) * .01;
        lat0 += (40 - lat0) * .01;
      }
      lat0 = Math.max(-80, Math.min(80, lat0));
    }
    draw();
  }
  c.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); vx = vy = 0; });
  c.addEventListener("pointermove", e => {
    if (!drag) return;
    const k = 140 / (size || 400), dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
    lon0 -= dx; lat0 = Math.max(-80, Math.min(80, lat0 + dy)); vx = -dx * .9; vy = dy * .9;
    drag = { x: e.clientX, y: e.clientY }; lastTouch = performance.now();
    if (!fxOn()) draw();
  });
  const end = () => { drag = null; lastTouch = performance.now(); };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
  c.addEventListener("dblclick", () => openOnMap(45.764, 4.8357, 12));
  addEventListener("resize", () => { resize(); draw(); });
  return { start: () => { resize(); refreshColors(); requestAnimationFrame(loop); }, resize, draw, refreshColors };
})();

// Réticule qui suit la souris sur l'accueil
addEventListener("mousemove", e => {
  if (current !== "home" || !fxOn()) return;
  $$("#cross .cx")[0].style.top = e.clientY + "px";
  $$("#cross .cy")[0].style.left = e.clientX + "px";
  const l = $("crossLbl"); l.style.left = e.clientX + 12 + "px"; l.style.top = e.clientY + 12 + "px";
  l.textContent = `X ${pad(e.clientX, 4)} · Y ${pad(e.clientY + Math.round(scrollY), 4)}`;
}, { passive: true });

// Bandeau défilant
const tickerItems = ["GOOGLE LENS", "STREET VIEW", "GÉOPORTAIL IGN", "SUNCALC", "OVERPASS TURBO", "WAYBACK MACHINE", "YANDEX", "TINEYE", "WHATSMYNAME", "CARTORADIO", "MAPILLARY"];
$("ticker").innerHTML = [...tickerItems, ...tickerItems].map(t => `<span><b>●</b> ${t}</span>`).join("");

// Fiches inclinables
$$(".dossier").forEach(d => {
  d.addEventListener("mousemove", e => {
    if (!fxOn()) return;
    const r = d.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    d.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg)`;
  });
  d.addEventListener("mouseleave", () => d.style.transform = "");
});

// Apparitions au défilement
const revealObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  if (e.target.matches("[data-scramble]")) scramble(e.target);
  revealObs.unobserve(e.target);
}), { threshold: .25 });
$$(".reveal, .block-head [data-scramble], .final [data-scramble]").forEach(el => revealObs.observe(el));

// Horloge
setInterval(() => { $("clock").textContent = new Date().toLocaleTimeString("fr-FR") + " — HEURE LOCALE"; }, 1000);

/* ---------- 7. CHRONOMÈTRE ---------- */
let secs = 0, totalSecs = load("totalSecs", 0), timerId = null;
const fmtT = s => new Date(s * 1000).toISOString().substring(11, 19);
function toggleTimer() {
  const box = $("tToggle").parentElement;
  if (timerId) {
    clearInterval(timerId); timerId = null; save("totalSecs", totalSecs);
    $("tToggle").textContent = "▶"; box.classList.remove("running"); document.title = "OSINT Hub — carnet de terrain";
    return toast("Chrono en pause");
  }
  $("tToggle").textContent = "❚❚"; box.classList.add("running");
  timerId = setInterval(() => {
    secs++; totalSecs++;
    $("timer").textContent = fmtT(secs); document.title = `● ${fmtT(secs)} — OSINT Hub`;
    if (secs % 10 === 0) save("totalSecs", totalSecs);
    if (secs % 60 === 0) bump(1);
  }, 1000);
  toast("Chrono lancé");
}
$("tToggle").onclick = toggleTimer;
$("tReset").onclick = () => { if (timerId) toggleTimer(); secs = 0; $("timer").textContent = fmtT(0); };
addEventListener("beforeunload", () => save("totalSecs", totalSecs));

/* ---------- 8. RECHERCHE ---------- */
const detectType = q => {
  if (!q) return null;
  if (/^https?:\/\/\S+\.(jpe?g|png|webp|gif|bmp|avif)(\?\S*)?$/i.test(q)) return "image";
  if (/^https?:\/\//i.test(q)) return "url";
  if (/^\S+$/.test(q)) return "pseudo";
  return "name";
};
const typeLabel = { pseudo: "PSEUDO", name: "NOM / TEXTE", url: "URL DE PAGE", image: "URL D'IMAGE" };
function dorkQuery() {
  const q = $("q").value.trim(); if (!q) return "";
  const term = $("dorkExact").checked ? `"${q}"` : q;
  const sites = $$(".dork:checked").map(c => c.value);
  return sites.length ? `${term} (${sites.join(" OR ")})` : term;
}
const toolGroups = [
  { name: "Moteurs & Dorks", for: ["pseudo", "name"], tools: [
    ["Google", "Avec tes filtres", () => `https://www.google.com/search?q=${enc(dorkQuery())}`],
    ["Bing", "Résultats différents de Google", () => `https://www.bing.com/search?q=${enc(dorkQuery())}`],
    ["DuckDuckGo", "Sans personnalisation", () => `https://duckduckgo.com/?q=${enc(dorkQuery())}`],
    ["Google Images", "Photos associées", () => `https://www.google.com/search?tbm=isch&q=${enc(dorkQuery())}`]] },
  { name: "Pseudos", for: ["pseudo"], tools: [
    ["WhatsMyName", "Présence sur des centaines de sites", q => `https://whatsmyname.app/?q=${enc(q)}`],
    ["Instagram", "Profil direct", q => `https://www.instagram.com/${enc(q)}/`],
    ["TikTok", "Profil direct", q => `https://www.tiktok.com/@${enc(q)}`],
    ["X / Twitter", "Profil direct", q => `https://x.com/${enc(q)}`]] },
  { name: "Image inversée", for: ["image"], tools: [
    ["Google Lens", "Objets, lieux, visages publics", q => `https://lens.google.com/uploadbyurl?url=${enc(q)}`],
    ["Yandex", "Très bon sur les lieux", q => `https://yandex.com/images/search?rpt=imageview&url=${enc(q)}`],
    ["TinEye", "Première apparition d'une image", q => `https://tineye.com/search?url=${enc(q)}`],
    ["Bing Visual", "Alternative", q => `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${enc(q)}`]] },
  { name: "Archives", for: ["url", "image"], tools: [
    ["Wayback Machine", "Historique de la page", q => `https://web.archive.org/web/*/${q}`],
    ["Archiver maintenant", "Créer une preuve horodatée", q => `https://web.archive.org/save/${q}`],
    ["archive.today", "Dernière capture", q => `https://archive.ph/newest/${q}`]] }
];
let searchHist = load("searchHistory", []);
function remember(q) { searchHist = [q, ...searchHist.filter(x => x !== q)].slice(0, 8); save("searchHistory", searchHist); renderHistory(); }
function renderHistory() {
  $("history").innerHTML = searchHist.map(h => `<button data-h="${esc(h)}">↺ ${esc(h)}</button>`).join("") + (searchHist.length ? `<button id="clearHist">✕ effacer</button>` : "");
  $$("#history [data-h]").forEach(b => b.onclick = () => { $("q").value = b.dataset.h; renderTools(); $("q").focus(); });
  $("clearHist")?.addEventListener("click", () => { searchHist = []; save("searchHistory", searchHist); renderHistory(); });
}
function runTool(gi, ti) { const q = $("q").value.trim(); remember(q); bump(1); openUrl(toolGroups[gi].tools[ti][2](q)); }
function renderTools() {
  const q = $("q").value.trim(), type = detectType(q);
  $("qType").textContent = type ? typeLabel[type] : "EN ATTENTE";
  $("qType").classList.toggle("off", !type);
  $("dorkPreview").textContent = dorkQuery() || "—";
  let first = true;
  $("toolGroups").innerHTML = toolGroups.map((g, gi) => {
    const ok = type && g.for.includes(type);
    return `<div class="group"><div class="g-head"><span class="mono">${"ABCD"[gi]}</span><h2>${g.name}</h2>
      <span class="state mono">${ok ? `${g.tools.length} OUTILS` : type ? "NON APPLICABLE" : "—"}</span>
      ${ok ? `<button class="btn ghost sm" data-all="${gi}">Tout ouvrir</button>` : ""}</div>
      <div class="rows">${g.tools.map((t, ti) => {
        const cls = ok ? (first ? (first = false, "first") : "") : "off";
        return `<button class="row-tool ${cls}" data-g="${gi}" data-t="${ti}"><span class="i">${pad(ti + 1)}</span><b>${t[0]}</b><span class="d">${t[1]}</span><span class="go">↗</span></button>`;
      }).join("")}</div></div>`;
  }).join("");
  $$(".row-tool").forEach(b => b.onclick = () => runTool(b.dataset.g, b.dataset.t));
  $$("[data-all]").forEach(b => b.onclick = () => toolGroups[b.dataset.all].tools.forEach((t, ti) => runTool(b.dataset.all, ti)));
}
$("q").oninput = renderTools;
$$(".dork, #dorkExact").forEach(c => c.onchange = renderTools);
$("q").onkeydown = e => { if (e.key === "Enter") document.querySelector(".row-tool.first")?.click(); };
$("copyDork").onclick = () => dorkQuery() ? navigator.clipboard.writeText(dorkQuery()).then(() => toast("Requête copiée")) : toast("Rien à copier");
onEnter.search = () => setTimeout(() => $("q").focus(), 80);

/* ---------- 9. CARTE GEOINT ---------- */
let map = null, marker = null, sunLines, caseMarkers, measureLayer, point = null, pendingPoint = null;
let measuring = false, measurePts = [];
const fmtLL = (a, b) => `${a.toFixed(5)}, ${b.toFixed(5)}`;
const fmtDist = d => d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2).replace(".", ",")} km`;
function parseLatLng(s) {
  const m = String(s ?? "").match(/(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) return null;
  const a = +m[1], b = +m[2];
  return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : null;
}
const pointTools = [
  ["Street View", (a, b) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${a},${b}`],
  ["Google Maps", (a, b) => `https://www.google.com/maps/search/?api=1&query=${a},${b}`],
  ["Google Earth", (a, b) => `https://earth.google.com/web/@${a},${b},300a,800d,35y,0h,45t,0r`],
  ["Géoportail", (a, b) => `https://www.geoportail.gouv.fr/carte?c=${b},${a}&z=17&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`],
  ["Mapillary", (a, b) => `https://www.mapillary.com/app/?lat=${a}&lng=${b}&z=17`],
  ["SunCalc", (a, b) => { const d = sunDate(); return `https://www.suncalc.org/#/${a},${b},17/${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}/${pad(d.getHours())}:${pad(d.getMinutes())}/1/3`; }],
  ["Overpass Turbo", (a, b) => `https://overpass-turbo.eu/?C=${a};${b};16&Q=${enc(`[out:json];\n// Exemple : arrêts de bus à 500 m\nnode(around:500,${a},${b})[highway=bus_stop];\nout;`)}&R`],
  ["Cartoradio", (a, b) => `https://www.cartoradio.fr/index.html#/cartographie/lonlat/${b}/${a}`],
  ["OpenStreetMap", (a, b) => `https://www.openstreetmap.org/?mlat=${a}&mlon=${b}#map=17/${a}/${b}`]
];
function initMap() {
  if (!window.L) { $("mapHint").textContent = "⚠ Carte indisponible : vérifie ta connexion Internet."; return; }
  const ign = (layer, fmt) => L.tileLayer(`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${fmt}`, { maxZoom: 19, attribution: "© IGN" });
  const layers = {
    "Plan IGN": ign("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png"),
    "Photo aérienne IGN": ign("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg"),
    "Satellite (Esri)": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "© Esri" }),
    "OpenStreetMap": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" })
  };
  const v = load("mapView", [45.764, 4.8357, 11]);
  map = L.map("leaflet", { layers: [layers[load("mapLayer", "Plan IGN")] || layers["Plan IGN"]] }).setView([v[0], v[1]], v[2]);
  L.control.layers(layers, null, { position: "topleft" }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  map.on("baselayerchange", e => save("mapLayer", e.name));
  map.on("moveend", () => { const c = map.getCenter(); save("mapView", [c.lat, c.lng, map.getZoom()]); });
  sunLines = L.layerGroup().addTo(map);
  caseMarkers = L.layerGroup().addTo(map);
  measureLayer = L.layerGroup().addTo(map);
  map.on("click", e => measuring ? addMeasurePoint(e.latlng) : selectPoint(e.latlng.lat, e.latlng.lng));
  map.on("zoomend", updateSun);
  refreshCaseMarkers();
}
onEnter.map = () => {
  if (!map) initMap(); else setTimeout(() => map.invalidateSize(), 30);
  if (pendingPoint && map) { selectPoint(...pendingPoint); pendingPoint = null; }
};
function openOnMap(lat, lng, zoom = 17) {
  if (current === "map" && map) selectPoint(lat, lng, zoom);
  else { pendingPoint = [lat, lng, zoom]; go("map"); }
}
const pinIcon = () => L.divIcon({ className: "", html: '<div class="mk"></div>', iconSize: [26, 26], iconAnchor: [13, 13] });
function selectPoint(lat, lng, zoom) {
  if (!map) return;
  point = [lat, lng];
  if (marker) marker.setLatLng(point); else marker = L.marker(point, { icon: pinIcon() }).addTo(map);
  if (zoom) map.setView(point, zoom);
  $("coords").textContent = fmtLL(lat, lng);
  $("mapHint").textContent = "Point placé. Clique ailleurs pour le déplacer.";
  $("pointTools").innerHTML = pointTools.map((t, i) => `<button data-p="${i}">${t[0]} ↗</button>`).join("");
  $$("#pointTools button").forEach(b => b.onclick = () => openUrl(pointTools[b.dataset.p][1](lat, lng)));
  updateSun();
}
const sunDate = () => new Date($("sunDate").value || Date.now());
function setSunNow() { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); $("sunDate").value = n.toISOString().slice(0, 16); updateSun(); }
function updateSun() {
  if (!map || !point) return;
  sunLines.clearLayers();
  if (!window.SunCalc) return ($("sunInfo").textContent = "Calcul solaire indisponible (connexion ?)");
  const d = sunDate(), p = SunCalc.getPosition(d, point[0], point[1]);
  const az = (p.azimuth * 180 / Math.PI + 180) % 360, alt = p.altitude * 180 / Math.PI;
  const t = SunCalc.getTimes(d, point[0], point[1]);
  const h = x => isNaN(x) ? "—" : x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  $("sunInfo").innerHTML = alt > 0
    ? `Azimut <b>${az.toFixed(0)}°</b> · hauteur <b>${alt.toFixed(0)}°</b><br>Ombres vers <b>${((az + 180) % 360).toFixed(0)}°</b> · longueur ≈ <b>${(1 / Math.tan(p.altitude)).toFixed(2)} ×</b> la hauteur de l'objet<br>
       <span class="mono small">LEVER ${h(t.sunrise)} · COUCHER ${h(t.sunset)}</span><br><span class="mono small" style="color:${ACCENT}">━ SOLEIL</span> <span class="mono small muted">┅ OMBRE</span>`
    : `Soleil sous l'horizon à cette heure.<br><span class="mono small">LEVER ${h(t.sunrise)} · COUCHER ${h(t.sunset)}</span>`;
  if (alt <= 0) return;
  const km = 40075 / Math.pow(2, map.getZoom()) / 3;
  const dest = (deg, k) => { const r = deg * Math.PI / 180; return [point[0] + k / 111 * Math.cos(r), point[1] + k / (111 * Math.cos(point[0] * Math.PI / 180)) * Math.sin(r)]; };
  L.polyline([point, dest(az, km)], { color: ACCENT, weight: 4 }).addTo(sunLines);
  L.polyline([point, dest(az + 180, km * .6)], { color: "#0d0d0d", weight: 3, dashArray: "6 6" }).addTo(sunLines);
}
$("sunDate").onchange = updateSun;
$("sunNow").onclick = setSunNow;
$("copyCoords").onclick = () => point ? navigator.clipboard.writeText(fmtLL(...point)).then(() => toast("Coordonnées copiées")) : toast("Clique d'abord sur la carte");
$("pinToCase").onclick = () => {
  if (!point) return toast("Clique d'abord sur la carte");
  const note = prompt("Note pour ce point :", "");
  if (note === null) return;
  addEntry({ clue: note || "Point placé sur la carte", gps: fmtLL(...point) });
};
// Mesure de distance
$("measureBtn").onclick = () => {
  if (!map) return;
  measuring = !measuring;
  $("measureBtn").classList.toggle("on", measuring);
  $("measureBtn").textContent = measuring ? "Terminer la mesure" : "Mesurer une distance";
  document.body.classList.toggle("measuring", measuring);
  if (measuring) { measurePts = []; measureLayer.clearLayers(); $("measureOut").textContent = "Clique les points…"; }
};
function addMeasurePoint(ll) {
  measurePts.push(ll);
  measureLayer.clearLayers();
  L.polyline(measurePts, { color: ACCENT, weight: 3, dashArray: "8 6" }).addTo(measureLayer);
  let total = 0;
  measurePts.forEach((p, i) => {
    if (i) total += map.distance(measurePts[i - 1], p);
    L.circleMarker(p, { radius: 4, color: "#0d0d0d", weight: 2, fillColor: ACCENT, fillOpacity: 1 }).addTo(measureLayer);
  });
  if (measurePts.length > 1) L.tooltip({ permanent: true, direction: "right", className: "measure-lbl", offset: [8, 0] }).setLatLng(ll).setContent(fmtDist(total)).addTo(measureLayer);
  $("measureOut").textContent = measurePts.length > 1 ? `TOTAL ${fmtDist(total)}` : "Ajoute un 2ᵉ point…";
}
function refreshCaseMarkers() {
  if (!map) return;
  caseMarkers.clearLayers();
  currentCase().entries.forEach((e, i) => {
    const p = parseLatLng(e.gps);
    if (p) L.circleMarker(p, { radius: 8, color: "#0d0d0d", weight: 2, fillColor: "#d92d20", fillOpacity: .9 })
      .bindPopup(`<b>Fiche ${pad(i + 1)}</b><br>${esc(trunc(e.clue || e.hyp || e.gps, 140))}`).addTo(caseMarkers);
  });
}
// Recherche d'adresse (Nominatim : 1 requête par seconde maximum)
let geoTimer;
$("geoQ").oninput = () => {
  clearTimeout(geoTimer);
  const q = $("geoQ").value.trim(), ll = parseLatLng(q);
  if (!q) return ($("geoResults").innerHTML = "");
  if (ll && /^[-\d.,;\s]+$/.test(q)) { $("geoResults").innerHTML = `<div data-ll="${ll}">→ Aller à ${fmtLL(...ll)}</div>`; return bindGeo(); }
  geoTimer = setTimeout(async () => {
    try {
      const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=fr&q=${enc(q)}`)).json();
      $("geoResults").innerHTML = r.map(x => `<div data-ll="${x.lat},${x.lon}">${esc(x.display_name)}</div>`).join("") || "<div>Aucun résultat</div>";
      bindGeo();
    } catch { $("geoResults").innerHTML = "<div>Recherche indisponible</div>"; }
  }, 1000);
};
$("geoQ").onkeydown = e => { if (e.key === "Enter") $("geoResults").querySelector("[data-ll]")?.click(); };
function bindGeo() {
  $$("#geoResults [data-ll]").forEach(d => d.onclick = () => {
    const [a, b] = d.dataset.ll.split(",").map(Number);
    selectPoint(a, b, 16); $("geoResults").innerHTML = ""; $("geoQ").value = "";
  });
}

/* ---------- 10. ANALYSE PHOTO ---------- */
let exifPoint = null, currentFile = null;
const img = $("preview"), wrapEl = $("imgWrap");
async function loadImage(file) {
  if (!file || !file.type?.startsWith("image/")) return toast("Ce fichier n'est pas une image");
  currentFile = file; bump(1);
  img.src = URL.createObjectURL(file);
  wrapEl.classList.remove("zoom");
  $("photoView").classList.add("has");
  $("exifToMap").hidden = true; exifPoint = null;
  const rows = [["Fichier", file.name || "Image collée"], ["Taille", (file.size / 1024).toFixed(0) + " Ko"]];
  img.onload = () => { rows.splice(2, 0, ["Dimensions", `${img.naturalWidth} × ${img.naturalHeight} px`]); renderExif(rows); };
  try {
    const x = window.exifr ? (await exifr.parse(file, { gps: true }) || {}) : {};
    if (x.DateTimeOriginal) rows.push(["Date de prise", new Date(x.DateTimeOriginal).toLocaleString("fr-FR")]);
    if (x.Make || x.Model) rows.push(["Appareil", `${x.Make || ""} ${x.Model || ""}`.trim()]);
    if (x.LensModel) rows.push(["Objectif", x.LensModel]);
    if (x.Software) rows.push(["Logiciel", x.Software]);
    if (x.latitude != null) { exifPoint = [x.latitude, x.longitude]; rows.push(["GPS", fmtLL(...exifPoint)]); $("exifToMap").hidden = false; }
    if (rows.length <= 2) rows.push(["Info", "Aucune métadonnée : normal pour une image issue d'un réseau social (supprimées à l'envoi). Place à l'observation."]);
  } catch { rows.push(["Info", "Métadonnées illisibles"]); }
  renderExif(rows);
}
function renderExif(rows) { $("exif").innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join(""); }
$("file").onchange = e => { loadImage(e.target.files[0]); e.target.value = ""; };
// Glisser-déposer n'importe où sur la page Photo
let dragDepth = 0;
addEventListener("dragenter", e => { if (current === "photo" && e.dataTransfer?.types?.includes("Files")) { dragDepth++; document.body.classList.add("dragging"); } });
addEventListener("dragleave", () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove("dragging"); } });
addEventListener("dragover", e => e.preventDefault());
addEventListener("drop", e => {
  e.preventDefault(); dragDepth = 0; document.body.classList.remove("dragging");
  if (current === "photo" && e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
});
document.addEventListener("paste", e => {
  if (isTyping() && current !== "photo") return;
  const f = [...(e.clipboardData?.files || [])][0];
  if (f?.type.startsWith("image/")) { if (current !== "photo") { go("photo"); setTimeout(() => loadImage(f), 700); } else loadImage(f); }
});
// Loupe
img.onclick = e => { wrapEl.classList.toggle("zoom"); moveZoom(e); };
img.onmousemove = moveZoom;
function moveZoom(e) {
  if (!wrapEl.classList.contains("zoom")) return;
  const pv = $("photoView").getBoundingClientRect();
  const px = (e.clientX - pv.left - wrapEl.offsetLeft) / wrapEl.offsetWidth, py = (e.clientY - pv.top - wrapEl.offsetTop) / wrapEl.offsetHeight;
  wrapEl.style.transformOrigin = `${Math.max(0, Math.min(1, px)) * 100}% ${Math.max(0, Math.min(1, py)) * 100}%`;
}
$("photoView").onmouseleave = () => wrapEl.classList.remove("zoom");
// Réglages de lecture
function applyImgFx() {
  const c = $("fxC").value, b = $("fxB").value, s = $("fxS").value;
  $$(".sliders output").forEach((o, i) => o.textContent = [c, b, s][i]);
  img.style.filter = `contrast(${c}%) brightness(${b}%) saturate(${s}%)${$("fxI").checked ? " invert(1)" : ""}${$("fxG").checked ? " grayscale(1)" : ""}`;
  $("gridOv").className = "grid-ov" + ($("gridT").checked ? " thirds" : "") + ($("gridF").checked ? " fine" : "");
}
["fxC", "fxB", "fxS", "fxI", "fxG", "gridT", "gridF"].forEach(id => $(id).addEventListener("input", applyImgFx));
$("fxReset").onclick = () => { $("fxC").value = $("fxB").value = $("fxS").value = 100; ["fxI", "fxG", "gridT", "gridF"].forEach(id => $(id).checked = false); applyImgFx(); };
$("exifToMap").onclick = () => exifPoint && openOnMap(...exifPoint);
$("copyImg").onclick = async () => {
  if (!currentFile) return toast("Charge d'abord une image");
  try {
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast("Image copiée : colle-la dans l'outil (Ctrl+V)");
  } catch { toast("Copie impossible ici : glisse le fichier dans l'outil"); }
};
const clueFields = ["Panneaux / textes", "Langue / écriture", "Plaques", "Mobilier urbain", "Végétation / climat", "Relief / horizon", "Architecture", "Enseignes", "Transports", "Ombres / heure"];
$("clueGrid").innerHTML = clueFields.map((f, i) => `<div class="clue"><label for="c${i}">${f}</label><input id="c${i}" data-c="${i}" placeholder="…"></div>`).join("");
$("cluesToCase").onclick = () => {
  const obs = $$("[data-c]").filter(i => i.value.trim()).map(i => `${clueFields[i.dataset.c]} : ${i.value.trim()}`);
  if (!obs.length) return toast("Aucune observation saisie");
  addEntry({ clue: obs.join(" · "), proof: exifPoint ? "Coordonnées GPS présentes dans les métadonnées" : (currentFile ? `Photo : ${currentFile.name || "image collée"}` : ""), gps: exifPoint ? fmtLL(...exifPoint) : "" });
  $$("[data-c]").forEach(i => i.value = "");
};

/* ---------- 11. ENTRAÎNEMENT ---------- */
let ggMaps = load("ggMaps", [
  { name: "France", url: "https://www.geoguessr.com/maps" },
  { name: "Lyon / AURA", url: "https://www.geoguessr.com/maps" },
  { name: "No Move", url: "https://www.geoguessr.com" }
]);
function renderGgMaps() {
  $("ggLinks").innerHTML = ggMaps.map((m, i) => `<div class="gg-link"><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>
    <button class="del" data-edit="${i}" title="Modifier le lien">✎</button><button class="del" data-rm="${i}" title="Supprimer">✕</button></div>`).join("")
    || `<p class="empty">Aucune carte. Ajoute tes cartes GeoGuessr avec « + Carte ».</p>`;
  $("ggMap").innerHTML = ggMaps.map(m => `<option>${esc(m.name)}</option>`).join("") || "<option>Libre</option>";
  $$("[data-edit]").forEach(b => b.onclick = () => {
    const m = ggMaps[b.dataset.edit];
    const name = prompt("Nom de la carte :", m.name); if (name === null) return;
    const url = prompt("Lien de la carte (copie l'adresse depuis GeoGuessr) :", m.url); if (url === null) return;
    ggMaps[b.dataset.edit] = { name: name || m.name, url: url || m.url }; save("ggMaps", ggMaps); renderGgMaps();
  });
  $$("[data-rm]").forEach(b => b.onclick = () => { if (confirm("Supprimer cette carte ?")) { ggMaps.splice(b.dataset.rm, 1); save("ggMaps", ggMaps); renderGgMaps(); } });
}
$("ggAddMap").onclick = () => {
  const name = prompt("Nom de la carte :"); if (!name) return;
  const url = prompt("Lien de la carte :", "https://www.geoguessr.com/maps/"); if (!url) return;
  ggMaps.push({ name, url }); save("ggMaps", ggMaps); renderGgMaps();
};
let sessions = load("sessions", load("gg", []));
function renderSessions() {
  $("ggList").innerHTML = sessions.length
    ? sessions.slice(0, 10).map((s, i) => `<li><span class="t mono small">${esc(s.date)} — ${esc(s.map)}</span><b class="mono">${s.score}</b><button class="del" data-i="${i}">✕</button></li>`).join("")
    : `<li class="empty">Aucune session enregistrée</li>`;
  $$("#ggList .del").forEach(d => d.onclick = () => { sessions.splice(d.dataset.i, 1); save("sessions", sessions); renderSessions(); });
  drawChart();
}
function drawChart() {
  const c = $("ggChart"), dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  if (!W) return;
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
  const ink = cssVar("--ink"), muted = cssVar("--muted");
  const pts = sessions.slice(0, 20).reverse().map(s => +s.score);
  ctx.font = "11px JetBrains Mono, monospace";
  if (pts.length < 2) { ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.fillText("LA COURBE APPARAÎT À PARTIR DE 2 SESSIONS", W / 2, H / 2); $("ggAvg").textContent = ""; return; }
  const max = Math.max(...pts), min = Math.min(...pts), p = 16;
  const X = i => p + i * (W - p * 2) / (pts.length - 1), Y = v => H - p - (v - min) / ((max - min) || 1) * (H - p * 2);
  ctx.strokeStyle = muted; ctx.globalAlpha = .3; ctx.setLineDash([2, 4]);
  for (let k = 0; k <= 4; k++) { const y = p + k * (H - p * 2) / 4; ctx.beginPath(); ctx.moveTo(p, y); ctx.lineTo(W - p, y); ctx.stroke(); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.lineTo(X(pts.length - 1), H - p); ctx.lineTo(X(0), H - p); ctx.fillStyle = ACCENT + "26"; ctx.fill();
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
  pts.forEach((v, i) => { ctx.fillStyle = v === max ? ACCENT : ink; ctx.fillRect(X(i) - 3.5, Y(v) - 3.5, 7, 7); });
  const avg = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  $("ggAvg").textContent = `MOYENNE ${avg} · MEILLEUR ${max} · ${pts.length} DERNIÈRES SESSIONS`;
}
$("ggAdd").onclick = () => {
  const v = $("ggScore").value; if (v === "") return toast("Saisis un score");
  sessions.unshift({ date: new Date().toLocaleDateString("fr-FR"), map: $("ggMap").value, score: +v });
  save("sessions", sessions); bump(2); $("ggScore").value = ""; renderSessions(); toast("Session enregistrée");
};
$("ggScore").onkeydown = e => e.key === "Enter" && $("ggAdd").click();
addEventListener("resize", () => current === "training" && drawChart());

let tasks = load("tasks", [
  { t: "Gralhix — premier défi de géolocalisation", d: false },
  { t: "Bellingcat — guide de géolocalisation", d: false },
  { t: "Maîtriser la recherche d'image inversée (Lens, Yandex, TinEye)", d: false },
  { t: "Configurer un navigateur dédié (OPSEC)", d: false }
]).map(x => ({ t: x.t, d: !!x.d }));
function renderTasks() {
  $("taskList").innerHTML = tasks.length
    ? tasks.map((x, i) => `<li class="${x.d ? "done" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span class="t">${esc(x.t)}</span><button class="del" data-x="${i}">✕</button></li>`).join("")
    : `<li class="empty">Ajoute ton premier défi</li>`;
  $$("#taskList input").forEach(c => c.onchange = () => { tasks[c.dataset.i].d = c.checked; save("tasks", tasks); if (c.checked) { bump(3); toast("Défi validé"); } renderTasks(); });
  $$("#taskList .del").forEach(d => d.onclick = () => { tasks.splice(d.dataset.x, 1); save("tasks", tasks); renderTasks(); });
  const done = tasks.filter(x => x.d).length, pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $("taskBar").style.width = pct + "%"; $("taskPct").textContent = `${done}/${tasks.length} · ${pct} %`;
}
$("taskAdd").onclick = () => { const v = $("taskInput").value.trim(); if (!v) return; tasks.push({ t: v, d: false }); save("tasks", tasks); $("taskInput").value = ""; renderTasks(); };
$("taskInput").onkeydown = e => e.key === "Enter" && $("taskAdd").click();
onEnter.training = () => setTimeout(drawChart, 40);

/* ---------- 12. ENQUÊTES ---------- */
let cases = load("cases", null);
if (!Array.isArray(cases) || !cases.length) {
  cases = [{ id: Date.now(), name: "Exercice 1", entries: [], links: [] }];
  const old = load("report", []); // reprise des rapports de la toute première version
  if (Array.isArray(old) && old.length) cases[0].entries = old.map(e => ({ date: new Date().toISOString(), conf: 3, ...e }));
}
cases.forEach(c => { c.links = Array.isArray(c.links) ? c.links : []; c.entries.forEach(e => { e.id = e.id || uid(); }); });
let activeCase = load("activeCase", cases[0].id);
let caseMode = load("caseMode", "board");
const currentCase = () => cases.find(c => c.id === activeCase) || cases[0];
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);

function saveCases() {
  activeCase = currentCase().id;
  save("cases", cases); save("activeCase", activeCase);
  renderCaseSelect(); renderTimeline(); renderBoard(); refreshCaseMarkers();
}
function addEntry(e) {
  currentCase().entries.push({ id: uid(), date: new Date().toISOString(), conf: 3, clue: "", hyp: "", proof: "", gps: "", ...e });
  bump(2); saveCases(); toast(`Fiche ajoutée à « ${currentCase().name} »`);
}
function renderCaseSelect() {
  const html = cases.map(c => `<option value="${c.id}" ${c.id === currentCase().id ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  $$(".caseSelect").forEach(s => s.innerHTML = html);
  const n = currentCase().entries.length;
  $("caseMeta").textContent = `${cases.length} DOSSIER${cases.length > 1 ? "S" : ""} · ${n} FICHE${n > 1 ? "S" : ""}`;
}
$$(".caseSelect").forEach(s => s.onchange = e => { activeCase = +e.target.value; saveCases(); toast(`Dossier actif : ${currentCase().name}`); });
$("addCase").onclick = () => {
  const n = $("newCase").value.trim(); if (!n) return toast("Donne un nom au dossier");
  const c = { id: Date.now(), name: n, entries: [], links: [] }; cases.push(c); activeCase = c.id; $("newCase").value = ""; saveCases(); toast("Dossier créé");
};
$("newCase").onkeydown = e => e.key === "Enter" && $("addCase").click();
$("renameCase").onclick = () => { const n = prompt("Nouveau nom :", currentCase().name); if (n?.trim()) { currentCase().name = n.trim(); saveCases(); } };
$("delCase").onclick = () => {
  if (cases.length === 1) return toast("Il faut garder au moins un dossier");
  if (!confirm(`Supprimer « ${currentCase().name} » et ses ${currentCase().entries.length} fiches ?`)) return;
  cases = cases.filter(c => c.id !== currentCase().id); activeCase = cases[0].id; saveCases();
};
$("rConf").oninput = e => $("rConfLbl").textContent = stars(+e.target.value);
$("rAdd").onclick = () => {
  const e = { clue: $("rClue").value.trim(), hyp: $("rHyp").value.trim(), proof: $("rProof").value.trim(), gps: $("rGps").value.trim(), conf: +$("rConf").value };
  if (!e.clue && !e.hyp && !e.proof && !e.gps) return toast("Remplis au moins un champ");
  if (e.gps && !parseLatLng(e.gps)) return toast("Coordonnées non reconnues (ex : 45.7640, 4.8357)");
  addEntry(e); ["rClue", "rHyp", "rProof", "rGps"].forEach(i => $(i).value = "");
};
function deleteEntry(id) {
  const c = currentCase();
  if (!confirm("Supprimer cette fiche ?")) return;
  c.entries = c.entries.filter(e => e.id !== id);
  c.links = c.links.filter(([a, b]) => a !== id && b !== id);
  saveCases();
}

// Chronologie
function renderTimeline() {
  const list = currentCase().entries;
  $("rCount").textContent = `${list.length} FICHE${list.length > 1 ? "S" : ""} · ${currentCase().links.length} FIL${currentCase().links.length > 1 ? "S" : ""}`;
  $("rList").innerHTML = list.length ? list.map((e, i) => `
    <li><div class="meta"><span>FICHE ${pad(i + 1)}</span><span>${new Date(e.date).toLocaleString("fr-FR")}</span><span class="conf">${stars(e.conf || 3)}</span><button class="del" data-id="${e.id}" title="Supprimer">✕</button></div>
      ${e.clue ? `<div><b>Indice</b>${esc(e.clue)}</div>` : ""}${e.hyp ? `<div><b>Hypothèse</b>${esc(e.hyp)}</div>` : ""}
      ${e.proof ? `<div><b>Preuve</b>${esc(e.proof)}</div>` : ""}${e.gps ? `<div><b>GPS</b><a href="#" data-gps="${esc(e.gps)}">${esc(e.gps)} → carte</a></div>` : ""}
    </li>`).join("") : `<li class="empty" style="border:0">Aucune fiche. Ajoute un indice, ou envoie-en depuis la Carte ou la Photo.</li>`;
  $$("#rList .del").forEach(d => d.onclick = () => deleteEntry(d.dataset.id));
  $$("#rList [data-gps]").forEach(a => a.onclick = ev => { ev.preventDefault(); const p = parseLatLng(a.dataset.gps); if (p) openOnMap(...p, 16); });
}

// Tableau d'enquête : fiches déplaçables reliées par des fils
const CARD_W = 230, BOARD_W = 1800, BOARD_H = 1200;
let linking = false, linkFrom = null;
const defaultHint = $("boardHint").textContent;
const gridPos = i => [30 + (i % 5) * 270, 40 + Math.floor(i / 5) * 230];
function renderBoard() {
  const c = currentCase(), board = $("board");
  board.querySelectorAll(".pin-card, .board-empty").forEach(n => n.remove());
  if (!c.entries.length) board.insertAdjacentHTML("beforeend", `<div class="board-empty">AUCUNE FICHE — ajoute un indice à gauche, ou envoie-en depuis la Carte ou la Photo.</div>`);
  c.entries.forEach((e, i) => {
    if (e.x == null || e.y == null) [e.x, e.y] = gridPos(i);
    const el = document.createElement("div");
    el.className = "pin-card"; el.dataset.id = e.id;
    el.style.left = e.x + "px"; el.style.top = e.y + "px";
    el.innerHTML = `<div class="pc-head"><span>FICHE ${pad(i + 1)} · <span class="conf">${stars(e.conf || 3)}</span></span><button class="del" data-del title="Supprimer">✕</button></div>
      ${e.clue ? `<div class="pc-row"><i>IND</i>${esc(trunc(e.clue, 120))}</div>` : ""}
      ${e.hyp ? `<div class="pc-row"><i>HYP</i>${esc(trunc(e.hyp, 100))}</div>` : ""}
      ${e.proof ? `<div class="pc-row"><i>PRV</i>${esc(trunc(e.proof, 80))}</div>` : ""}
      ${e.gps ? `<span class="pc-gps">GPS ${esc(e.gps)}</span>` : ""}`;
    if (linkFrom === e.id) el.classList.add("sel");
    board.appendChild(el);
    bindCard(el, e);
  });
  drawStrings();
}
const anchor = e => [e.x + CARD_W / 2, e.y];
function drawStrings() {
  const c = currentCase(), svg = $("strings");
  const byId = Object.fromEntries(c.entries.map(e => [e.id, e]));
  c.links = c.links.filter(([a, b]) => byId[a] && byId[b]);
  svg.innerHTML = c.links.map(([a, b], k) => {
    const [x1, y1] = anchor(byId[a]), [x2, y2] = anchor(byId[b]);
    const sag = Math.min(140, Math.hypot(x2 - x1, y2 - y1) * .2);
    const d = `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag} ${x2} ${y2}`;
    return `<g data-k="${k}"><path class="hit" d="${d}"/><path class="s" d="${d}"/></g>`;
  }).join("");
  svg.querySelectorAll("g").forEach(g => g.querySelector(".hit").onclick = () => {
    if (confirm("Supprimer ce fil ?")) { c.links.splice(+g.dataset.k, 1); saveCases(); }
  });
}
function bindCard(el, e) {
  el.onpointerdown = ev => {
    if (ev.button !== 0) return;
    if (ev.target.closest("[data-del]")) return deleteEntry(e.id);
    if (linking) return linkClick(e, el);
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId); el.classList.add("dragging");
    const sx = ev.clientX, sy = ev.clientY, ox = e.x, oy = e.y; let moved = false;
    el.onpointermove = m => {
      const dx = m.clientX - sx, dy = m.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      e.x = Math.max(0, Math.min(BOARD_W - CARD_W, ox + dx)); e.y = Math.max(12, Math.min(BOARD_H - 80, oy + dy));
      el.style.left = e.x + "px"; el.style.top = e.y + "px";
      drawStrings();
    };
    el.onpointerup = () => { el.onpointermove = el.onpointerup = null; el.classList.remove("dragging"); if (moved) save("cases", cases); };
  };
  el.ondblclick = () => { const p = parseLatLng(e.gps); if (p) openOnMap(...p, 16); else toast("Cette fiche n'a pas de coordonnées"); };
}
function linkClick(e, el) {
  if (!linkFrom) { linkFrom = e.id; el.classList.add("sel"); return; }
  if (linkFrom === e.id) { linkFrom = null; el.classList.remove("sel"); return; }
  const c = currentCase();
  if (!c.links.some(([a, b]) => (a === linkFrom && b === e.id) || (a === e.id && b === linkFrom))) c.links.push([linkFrom, e.id]);
  linkFrom = null; saveCases(); toast("Fiches reliées");
}
$("linkMode").onclick = () => {
  linking = !linking; linkFrom = null;
  $("board").classList.toggle("linking", linking);
  $("linkMode").classList.toggle("on", linking);
  $("boardHint").textContent = linking ? "MODE LIAISON — clique une fiche, puis une autre. Reclique le bouton pour terminer." : defaultHint;
  $$(".pin-card.sel").forEach(x => x.classList.remove("sel"));
};
$("tidyBoard").onclick = () => { currentCase().entries.forEach((e, i) => [e.x, e.y] = gridPos(i)); saveCases(); };
function setCaseMode(m) {
  caseMode = m; save("caseMode", m);
  $$(".seg [data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === m));
  const board = m === "board";
  $("boardScroll").hidden = !board; $("boardHint").hidden = !board; $("linkMode").hidden = !board; $("tidyBoard").hidden = !board;
  $("rList").hidden = board;
}
$$(".seg [data-mode]").forEach(b => b.onclick = () => setCaseMode(b.dataset.mode));

// Exports
$("exportMd").onclick = () => {
  const c = currentCase(), cell = s => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const num = Object.fromEntries(c.entries.map((e, i) => [e.id, i + 1]));
  let md = `# ${c.name}\n\n_Exporté le ${new Date().toLocaleString("fr-FR")} · ${c.entries.length} fiches_\n\n| # | Date | Indice | Hypothèse | Preuve | GPS | Confiance |\n|---|---|---|---|---|---|---|\n`;
  c.entries.forEach((e, i) => md += `| ${i + 1} | ${new Date(e.date).toLocaleString("fr-FR")} | ${cell(e.clue)} | ${cell(e.hyp)} | ${cell(e.proof)} | ${cell(e.gps)} | ${e.conf || 3}/5 |\n`);
  if (c.links.length) md += `\n## Liens entre fiches\n\n${c.links.map(([a, b]) => `- Fiche ${num[a]} ↔ Fiche ${num[b]}`).join("\n")}\n`;
  download(`${c.name.replace(/[^\w-]+/g, "_")}.export.md`, md, "text/markdown");
};
function exportAll() {
  save("totalSecs", totalSecs);
  download(`osint-hub-sauvegarde-${todayKey()}.json`,
    JSON.stringify({ app: "osint-hub", version: VERSION, cases, activeCase, tasks, sessions, ggMaps, totalSecs, activity, searchHistory: searchHist, settings }, null, 2), "application/json");
  toast("Sauvegarde téléchargée");
}
$("exportJson").onclick = exportAll;
$("importJson").onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(d.cases)) throw 0;
    if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
    ["cases", "activeCase", "tasks", "sessions", "ggMaps", "totalSecs", "activity", "searchHistory", "settings"].forEach(k => d[k] !== undefined && save(k, d[k]));
    location.reload();
  } catch { toast("Fichier de sauvegarde invalide"); }
  e.target.value = "";
};
onEnter.cases = () => { renderBoard(); };
onEnter.home = () => { globe.resize(); globe.draw(); };

/* ---------- 13. TABLEAU DE BORD ---------- */
const tips = [
  "Archive une page avant de la citer : une publication peut disparaître à tout moment.",
  "Sépare toujours ce que tu observes (indice) de ce que tu en déduis (hypothèse).",
  "N'utilise jamais tes comptes personnels pour une recherche : comptes neutres, navigateur dédié.",
  "Les ombres donnent l'orientation : croise-les avec le module Soleil de la carte.",
  "Une plaque, une langue, un poteau électrique : chaque détail réduit la zone de recherche.",
  "Yandex est souvent meilleur que Google pour reconnaître un lieu.",
  "Un pseudo est souvent réutilisé : WhatsMyName te dit où il existe.",
  "Disparition réelle : on appelle le 17 tout de suite, il n'y a aucun délai à attendre.",
  "Deux indices faibles concordants valent mieux qu'un indice fort isolé.",
  "Monte le contraste ou inverse l'image : un panneau illisible peut redevenir lisible."
];
let tipIdx = Math.floor(Math.random() * tips.length);
const showTip = () => $("tip").textContent = tips[tipIdx];
$("nextTip").onclick = () => { tipIdx = (tipIdx + 1) % tips.length; showTip(); };
function countUp(el, to, fmt = v => v) {
  if (!fxOn()) return (el.textContent = fmt(to));
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 900), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = fmt(v); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function renderHeat() {
  const WEEKS = 16, now = new Date(); now.setHours(0, 0, 0, 0);
  const start = new Date(now); start.setDate(start.getDate() - ((now.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  const lvl = n => !n ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4;
  let html = "", activeDays = 0, total = 0;
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = todayKey(d), n = activity[k] || 0, future = d > now;
    if (!future && n) { activeDays++; total += n; }
    html += `<i class="l${future ? 0 : lvl(n)}${k === todayKey(now) ? " today" : ""}${future ? " future" : ""}" title="${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} : ${n} pt${n > 1 ? "s" : ""}"></i>`;
  }
  $("heat").innerHTML = html;
  $("heatInfo").textContent = `${activeDays} jour${activeDays > 1 ? "s" : ""} actif${activeDays > 1 ? "s" : ""} · ${total} points`;
}
onEnter.dashboard = () => {
  const h = new Date().getHours(), g = h < 6 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
  $("greet").dataset.txt = g; $("greet").textContent = g;
  $("dashDate").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
  const mins = Math.floor(totalSecs / 60);
  countUp($("sTime"), mins, v => v < 60 ? `${v} min` : `${Math.floor(v / 60)}h${pad(v % 60)}`);
  countUp($("sStreak"), streak());
  countUp($("sSessions"), sessions.length);
  $("sChallenges").textContent = `${tasks.filter(x => x.d).length}/${tasks.length}`;
  countUp($("sEntries"), cases.reduce((n, c) => n + c.entries.length, 0));
  $("dashTasks").innerHTML = tasks.filter(x => !x.d).slice(0, 4).map(x => `<li><span class="mono muted">□</span><span class="t">${esc(x.t)}</span></li>`).join("") || `<li class="empty">Tout est terminé.</li>`;
  const all = cases.flatMap(c => c.entries.map(e => ({ ...e, c: c.name }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  $("dashEntries").innerHTML = all.map(e => `<li><span class="t">${esc(trunc(e.clue || e.hyp || e.gps, 80))}</span><span class="mono small muted">${esc(e.c)}</span></li>`).join("") || `<li class="empty">Aucune fiche pour l'instant</li>`;
  renderHeat(); showTip();
};

/* ---------- 14. À PROPOS, TEXTES LÉGAUX, PARAMÈTRES ---------- */
// Mini-convertisseur Markdown → HTML (titres, listes, citations, tableaux, gras, liens)
function md(src) {
  const lines = String(src || "").replace(/\r/g, "").split("\n");
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => {
      if (/CONFIDENTIALITE\.md/.test(u)) return `<a href="#about" data-tab-link="privacy">${t}</a>`;
      if (/CONDITIONS_UTILISATION\.md/.test(u)) return `<a href="#about" data-tab-link="terms">${t}</a>`;
      return `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
    });
  const isBlock = l => /^(#{1,4}\s|>|\s*[-*]\s|\||\d+\.\s)/.test(l);
  let html = "", i = 0;
  while (i < lines.length) {
    const l = lines[i]; let m;
    if (!l.trim()) { i++; continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; continue; }
    if (l.startsWith(">")) { const b = []; while (i < lines.length && lines[i].startsWith(">")) b.push(lines[i++].replace(/^>\s?/, "")); html += `<blockquote><p>${b.map(inline).join("<br>")}</p></blockquote>`; continue; }
    if (/^\s*[-*]\s/.test(l)) { html += "<ul>"; while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>`; html += "</ul>"; continue; }
    if (/^\d+\.\s/.test(l)) { html += "<ol>"; while (i < lines.length && /^\d+\.\s/.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\d+\.\s+/, ""))}</li>`; html += "</ol>"; continue; }
    if (l.startsWith("|")) {
      const rows = []; while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(s => s.trim());
      html += `<table><thead><tr>${cells(rows[0]).map(h => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(2).map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      continue;
    }
    const p = []; while (i < lines.length && lines[i].trim() && !isBlock(lines[i])) p.push(lines[i++]);
    html += `<p>${inline(p.join(" "))}</p>`;
  }
  return html;
}
async function loadLegal() {
  let t = window.LEGAL?.terms || "", p = window.LEGAL?.privacy || "";
  if (location.protocol.startsWith("http")) { // en ligne : on lit directement les fichiers .md du dépôt
    try {
      const get = f => fetch(f, { cache: "no-cache" }).then(r => r.ok ? r.text() : Promise.reject());
      [t, p] = await Promise.all([get("CONDITIONS_UTILISATION.md"), get("CONFIDENTIALITE.md")]);
    } catch { /* on garde la copie intégrée */ }
  }
  $("termsDoc").innerHTML = md(t); $("privacyDoc").innerHTML = md(p); $("gateTerms").innerHTML = md(t);
}
let pendingTab = null;
function selectTab(tab) {
  $$("#aboutTabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  $$(".tab-pane").forEach(p => p.hidden = p.dataset.pane !== tab);
}
$$("#aboutTabs button").forEach(b => b.onclick = () => selectTab(b.dataset.tab));
document.addEventListener("click", e => {
  const a = e.target.closest("[data-tab-link]");
  if (!a || a.closest("#gate")) { if (a) e.preventDefault(); return; }
  pendingTab = a.dataset.tabLink;
  if (current === "about") { e.preventDefault(); selectTab(pendingTab); pendingTab = null; window.scrollTo(0, 0); }
});
onEnter.about = () => { if (pendingTab) { selectTab(pendingTab); pendingTab = null; } };
$("setExport").onclick = exportAll;
$("setCharter").onclick = () => { localStorage.removeItem(PREFIX + "terms"); showGate(); };
$("setWipe").onclick = () => {
  if (!confirm("Effacer TOUTES les données d'OSINT Hub sur ce navigateur ?")) return;
  if (!confirm("Dernière confirmation : cette action est irréversible. As-tu fait une sauvegarde ?")) return;
  Object.keys(localStorage).filter(k => k.startsWith(PREFIX) || LEGACY.includes(k)).forEach(k => localStorage.removeItem(k));
  location.hash = ""; location.reload();
};
["repoLink", "footRepo"].forEach(id => $(id).href = REPO_URL);
$("aboutVer").textContent = "VERSION " + VERSION;
$("footVer").textContent = "v" + VERSION;

/* ---------- 15. CHARTE AU PREMIER LANCEMENT ---------- */
const gateOpen = () => !$("gate").hidden;
function showGate() { $("gate").hidden = false; $("gateOk").checked = false; $("gateGo").disabled = true; }
$("gateOk").onchange = e => $("gateGo").disabled = !e.target.checked;
$("gateGo").onclick = () => { save("terms", TERMS_VERSION); $("gate").hidden = true; toast("Bienvenue sur le terrain."); };

/* ---------- 16. PALETTE DE COMMANDES & RACCOURCIS ---------- */
const commands = [
  ...KEYS.map((k, i) => [VIEWS[k], `touche ${i}`, () => go(k)]),
  ["À propos · Conditions · Paramètres", "", () => go("about")],
  ["Démarrer / mettre en pause le chrono", "", toggleTimer],
  ["Changer de thème (papier / nuit)", "", () => $("themeBtn").click()],
  ["Activer / couper les effets animés", "", () => setSetting("fx", !settings.fx)],
  ["Nouveau dossier d'enquête", "", () => { go("cases"); setTimeout(() => $("newCase").focus(), 700); }],
  ["Sauvegarder toutes les données (.json)", "", exportAll],
  ["Exporter le rapport du dossier (.md)", "", () => $("exportMd").click()],
  ["Carte : soleil à l'heure actuelle", "", () => { go("map"); setTimeout(setSunNow, 700); }],
  ["Carte : mesurer une distance", "", () => { go("map"); setTimeout(() => !measuring && $("measureBtn").click(), 700); }],
  ...pointTools.map(t => [`Ouvrir ${t[0]} sur le point sélectionné`, "carte", () => point ? openUrl(t[1](...point)) : toast("Aucun point sélectionné sur la carte")])
];
let sel = 0, filtered = commands;
const norm = s => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const closePalette = () => $("palette").classList.remove("open");
function openPalette() { closeMenu(); $("palette").classList.add("open"); $("paletteQ").value = ""; sel = 0; renderPalette(); setTimeout(() => $("paletteQ").focus(), 30); }
function renderPalette() {
  const q = norm($("paletteQ").value);
  filtered = commands.filter(c => norm(c[0]).includes(q));
  sel = Math.max(0, Math.min(sel, filtered.length - 1));
  $("paletteList").innerHTML = filtered.map((c, i) => `<li class="${i === sel ? "sel" : ""}" data-i="${i}"><span>${c[0]}</span><small>${c[1]}</small></li>`).join("") || `<li class="empty">Aucune commande</li>`;
  $$("#paletteList [data-i]").forEach(li => {
    li.onclick = () => runCmd(+li.dataset.i);
    li.onmousemove = () => { if (sel !== +li.dataset.i) { sel = +li.dataset.i; $$("#paletteList li").forEach((x, j) => x.classList.toggle("sel", j === sel)); } };
  });
  $("paletteList").querySelector(".sel")?.scrollIntoView({ block: "nearest" });
}
function runCmd(i) { const c = filtered[i]; if (!c) return; closePalette(); c[2](); }
$("paletteQ").oninput = () => { sel = 0; renderPalette(); };
$("paletteQ").onkeydown = e => {
  if (e.key === "ArrowDown") { e.preventDefault(); sel++; renderPalette(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); sel--; renderPalette(); }
  else if (e.key === "Enter") runCmd(sel);
};
$("palette").onclick = e => { if (e.target.id === "palette") closePalette(); };
$("kBtn").onclick = openPalette;

document.addEventListener("keydown", e => {
  if (gateOpen()) return;
  if (e.key === "Escape") {
    closePalette(); closeMenu();
    if (linking) $("linkMode").click();
    if (measuring) $("measureBtn").click();
    if (isTyping()) document.activeElement.blur();
    return;
  }
  if (e.ctrlKey && e.key.toLowerCase() === "k") { e.preventDefault(); $("palette").classList.contains("open") ? closePalette() : openPalette(); return; }
  if (isTyping() || e.ctrlKey || e.altKey || e.metaKey || $("palette").classList.contains("open")) return;
  if (/^[0-6]$/.test(e.key)) go(KEYS[+e.key]);
  else if (e.key === "Enter" && current === "home") go("dashboard");
});

/* ---------- 17. DÉMARRAGE ---------- */
applySettings();
renderCaseSelect(); renderTimeline(); renderHistory(); renderTools(); renderGgMaps(); renderSessions(); renderTasks();
setCaseMode(caseMode);
$("rConfLbl").textContent = stars(3);
setSunNow();
loadLegal();
route();
topo.start(); globe.start();
if (load("terms", null) !== TERMS_VERSION) showGate();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
