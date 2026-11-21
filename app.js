/* =========================================================
   OSINT Hub — carnet de terrain · logique de l'application
   ---------------------------------------------------------
   Sommaire
     1. Configuration & utilitaires     10. Analyse photo
     2. Réglages & personnalisation     11. Entraînement (programme, exercices, GeoGuessr, mémo)
     3. Activité (calendrier)           12. Enquêtes (données, tableau, chronologie)
     4. Navigation, barre & menu        13. Tableau de bord
     5. Décor : courbes de niveau       14. À propos, textes légaux, paramètres
     6. Accueil : globe & animations    15. Charte au premier lancement
     7. Chronomètre                     16. Palette de commandes & raccourcis
     8. Recherche                       17. Démarrage
     9. Carte GEOINT
   Le contenu pédagogique (questions, programme…) est dans data.js
   ========================================================= */

/* ---------- 1. CONFIGURATION & UTILITAIRES ---------- */
const VERSION = "5.4.2";
const TERMS_VERSION = "1.0";                 // ← augmente-le si tu modifies les conditions : 
const REPO_URL = "https://github.com/";      // ← remplace par l'adresse de ton dépôt GitHub
const PREFIX = "osh.";                       // préfixe des données (évite les conflits avec tes autres sites *.github.io)
const LEGACY = ["cases", "activeCase", "tasks", "sessions", "gg", "ggMaps", "totalSecs", "searchHistory", "mapView", "mapLayer", "report"];
let ACCENT = "#ff3b00";                      // couleur d'accent (personnalisable dans le menu)

const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];
const enc = encodeURIComponent;
const pad = (n, l = 2) => String(n).padStart(l, "0");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const trunc = (s, n) => (s = String(s || "")).length > n ? s.slice(0, n - 1) + "…" : s;
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const uid = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const isTyping = () => ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const fmtNum = n => Math.round(n).toLocaleString("fr-FR");
const fmtMins = s => { const m = Math.floor(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${pad(m % 60)}`; };

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
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayIndex = () => { const d = new Date(); return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(2020, 0, 1)) / 864e5); };
function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }

/* ---------- 2. RÉGLAGES & PERSONNALISATION ---------- */
const DEFAULT_ORDER = ["home", "dashboard", "search", "map", "photo", "training", "cases", "about"];
const DEFAULT_QUICK = ["chrono", "quiz", "ggDaily", "newCase", "backup", "theme"];
const ACCENTS = ["#ff3b00", "#e11d48", "#2563eb", "#059669", "#7c3aed", "#d97706", "#0d9488"];
const SETTINGS_DEFAULT = { theme: "paper", fx: !reducedMotion, accent: "#ff3b00", order: DEFAULT_ORDER, hidden: [], quick: DEFAULT_QUICK, tileStats: true, viewer: true };
let settings = { ...SETTINGS_DEFAULT, ...load("settings", {}) };
if (!["paper", "night"].includes(settings.theme)) settings.theme = "paper";
if (!/^#[0-9a-f]{6}$/i.test(settings.accent)) settings.accent = "#ff3b00";
settings.order = [...settings.order.filter(v => DEFAULT_ORDER.includes(v)), ...DEFAULT_ORDER.filter(v => !settings.order.includes(v))];
settings.hidden = (settings.hidden || []).filter(v => DEFAULT_ORDER.includes(v));
if (!Array.isArray(settings.quick)) settings.quick = DEFAULT_QUICK;

const fxOn = () => settings.fx && !reducedMotion;
function applySettings() {
  ACCENT = settings.accent;
  document.documentElement.style.setProperty("--accent", ACCENT);
  document.documentElement.dataset.theme = settings.theme;
  document.body.classList.toggle("fx", fxOn());
  $("fxToggle").checked = settings.fx; $("mcFx").checked = settings.fx; $("mcStats").checked = settings.tileStats;
  $("viewerToggle").checked = settings.viewer !== false; $("mcViewer").checked = settings.viewer !== false;
  $$("button[data-theme]").forEach(b => b.classList.toggle("on", b.dataset.theme === settings.theme));
  document.querySelector('meta[name="theme-color"]').content = settings.theme === "night" ? "#0f100e" : "#0d0d0d";
  topo.refreshColors(); globe.refreshColors(); profile.draw();
  renderNav();
  if ($("menu").classList.contains("open") && $("menuCustom").hidden) renderMenu();
  if (current === "training") drawChart();
  if (map) { updateSun(); refreshCaseMarkers(); }
}
function setSetting(k, v) { settings[k] = v; save("settings", settings); applySettings(); }
$("themeBtn").onclick = () => setSetting("theme", settings.theme === "night" ? "paper" : "night");
$$("button[data-theme]").forEach(b => b.onclick = () => setSetting("theme", b.dataset.theme));
$("fxToggle").onchange = e => setSetting("fx", e.target.checked);
$("mcFx").onchange = e => setSetting("fx", e.target.checked);
$("mcStats").onchange = e => setSetting("tileStats", e.target.checked);
$("viewerToggle").onchange = $("mcViewer").onchange = e => { setSetting("viewer", e.target.checked); if (point) selectPoint(...point); };

/* ---------- 3. ACTIVITÉ ---------- */
let activity = load("activity", {});
function bump(n = 1) { const k = todayKey(); activity[k] = (activity[k] || 0) + n; save("activity", activity); }
function streak() {
  const d = new Date(); let n = 0;
  if (!activity[todayKey(d)]) d.setDate(d.getDate() - 1);
  while (activity[todayKey(d)] > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- 4. NAVIGATION, BARRE & MENU ---------- */
// Navigation par ancres (#search, #map…) : le bouton « retour » de la souris fonctionne
const MODS = {
  home:      { n: "Accueil",         s: "Accueil",      k: "0", d: "Globe, présentation des modules, méthode et règles de terrain." },
  dashboard: { n: "Tableau de bord", s: "Bord",         k: "1", d: "Activité, série de jours, rang et prochaines étapes." },
  search:    { n: "Recherche",       s: "Recherche",    k: "2", d: "Pseudo, nom, URL ou image : les bons outils, déjà remplis." },
  map:       { n: "Carte GEOINT",    s: "Carte",        k: "3", d: "IGN, satellite, soleil et ombres, mesure de distance." },
  photo:     { n: "Analyse photo",   s: "Photo",        k: "4", d: "Métadonnées, loupe, réglages d'image, grille d'observation." },
  training:  { n: "Entraînement",    s: "Entraînement", k: "5", d: "Programme en 5 niveaux, quiz, GeoGuessr, mémo d'indices." },
  cases:     { n: "Enquêtes",        s: "Enquêtes",     k: "6", d: "Tableau à fils rouges, chronologie et rapports." },
  about:     { n: "À propos",        s: "À propos",     k: "—", d: "Conditions, confidentialité et paramètres." }
};
const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true">${p}</svg>`;
const ICONS = {
  home: SVG('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M4.5 7.5h15M4.5 16.5h15"/>'),
  dashboard: SVG('<rect x="3" y="3" width="18" height="18"/><path d="M7 17v-4M12 17V8M17 17v-6"/>'),
  search: SVG('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>'),
  map: SVG('<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'),
  photo: SVG('<rect x="3" y="7" width="18" height="13"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>'),
  training: SVG('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  cases: SVG('<path d="M3 6h7l2 2h9v12H3z"/><path d="M7 13h10M7 16.5h6"/>'),
  about: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 10.5v6.5M12 7v.6"/>')
};
const VIEWS = Object.fromEntries(Object.entries(MODS).map(([k, v]) => [k, v.n]));
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

// Barre du haut (suit l'ordre et les masquages choisis dans le menu)
function renderNav() {
  const vis = settings.order.filter(v => v !== "home" && v !== "about" && !settings.hidden.includes(v));
  $("mainNav").innerHTML = vis.map(v => `<a href="#${v}" data-v="${v}" class="${v === current ? "active" : ""}"><i>0${MODS[v].k}</i><span data-scramble>${MODS[v].s}</span></a>`).join("");
  $$("#mainNav a").forEach(a => a.addEventListener("mouseenter", () => scramble(a.querySelector("[data-scramble]"))));
}

// Actions rapides du menu
const QUICK = {
  chrono:  { n: "Chronomètre",           i: "◷", keep: true, l: () => timerId ? `Chrono ${fmtT(secs)}` : "Lancer le chrono", f: () => toggleTimer() },
  quiz:    { n: "Quiz du jour",          i: "?", l: () => `Quiz du jour : ${dailyQuizDef().name}`, f: () => startDailyQuiz() },
  ggDaily: { n: "Défi GeoGuessr du jour", i: "◉", l: () => "Défi GeoGuessr du jour", f: () => { go("training"); setTrainTab("gg"); } },
  memo:    { n: "Ajouter au mémo",       i: "✎", l: () => "Ajouter un indice au mémo", f: () => { go("training"); setTrainTab("memo"); setTimeout(() => $("memoText").focus(), 700); } },
  newCase: { n: "Nouveau dossier",       i: "+", l: () => "Nouveau dossier d'enquête", f: () => { go("cases"); setTimeout(() => $("newCase").focus(), 700); } },
  backup:  { n: "Sauvegarde",            i: "⤓", keep: true, l: () => "Sauvegarder (.json)", f: () => exportAll() },
  theme:   { n: "Thème",                 i: "◐", keep: true, l: () => settings.theme === "night" ? "Passer en thème papier" : "Passer en thème nuit", f: () => $("themeBtn").click() },
  fx:      { n: "Effets animés",         i: "✦", keep: true, l: () => settings.fx ? "Couper les effets" : "Activer les effets", f: () => setSetting("fx", !settings.fx) },
  palette: { n: "Palette de commandes",  i: "⌘", l: () => "Palette de commandes", f: () => openPalette() },
  measure: { n: "Mesure sur la carte",   i: "⟷", l: () => "Mesurer une distance", f: () => { go("map"); setTimeout(() => !measuring && $("measureBtn").click(), 700); } },
  sun:     { n: "Soleil maintenant",     i: "☀", l: () => "Soleil à l'heure actuelle", f: () => { go("map"); setTimeout(setSunNow, 700); } }
};
function modStat(v) {
  const st = computeTraining();
  switch (v) {
    case "home": return "Globe · méthode · règles";
    case "dashboard": return `Série ${streak()} j · ${fmtMins(totalSecs)}`;
    case "search": return searchHist[0] ? `Dernière : ${searchHist[0]}` : "Aucune recherche récente";
    case "map": return point ? `Point ${fmtLL(...point)}` : "Aucun point placé";
    case "photo": return currentFile ? `Image : ${currentFile.name || "collée"}` : "Aucune image chargée";
    case "training": return `${st.rank.name} · ${st.xp} XP · ${st.doneItems.length}/${st.items.length} étapes`;
    case "cases": return `${currentCase().name} · ${currentCase().entries.length} fiche(s)`;
    case "about": return "Version " + VERSION;
  }
  return "";
}
function renderMenu() {
  const vis = settings.order.filter(v => !settings.hidden.includes(v));
  $("menuTiles").innerHTML = vis.map((v, i) => `<a class="m-tile ${v === current ? "here" : ""}" href="#${v}" style="--i:${i}">
      <div class="mt-top">${ICONS[v]}<span class="mt-r">${v === current ? '<span class="mt-here">ICI</span>' : ""}<span class="mt-key">${MODS[v].k}</span></span></div>
      <h3>${MODS[v].n}</h3><p>${MODS[v].d}</p>
      ${settings.tileStats ? `<span class="mt-stat">${esc(modStat(v))}</span>` : ""}</a>`).join("")
    || `<p class="mono">Tous les modules sont masqués : clique sur « Personnaliser ».</p>`;
  const qk = settings.quick.filter(id => QUICK[id]);
  $("menuQuick").innerHTML = qk.map(id => `<button class="q-act ${id === "chrono" && timerId ? "on" : ""}" data-qa="${id}"><i>${QUICK[id].i}</i><span>${esc(QUICK[id].l())}</span></button>`).join("")
    || `<p class="small" style="opacity:.6">Aucune action : ajoute-en via « Personnaliser ».</p>`;
  $$("#menuQuick [data-qa]").forEach(b => b.onclick = () => {
    const q = QUICK[b.dataset.qa];
    if (!q.keep) closeMenu();
    q.f();
    if (q.keep && $("menu").classList.contains("open")) renderMenu();
  });
  renderToday();
}
function renderToday() {
  const st = computeTraining(), k = todayKey(), dq = dailyQuizDef(), gd = ggDaily();
  const dqDone = load("quizDaily", "") === k, ggDone = load("ggDailyDone", "") === k;
  $("menuToday").innerHTML = `
    <div class="t-row"><span>Date</span><b>${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</b></div>
    <div class="t-row"><span>Série</span><b>${streak()} jour${streak() > 1 ? "s" : ""}</b></div>
    <div class="t-row"><span>Activité du jour</span><b>${activity[k] || 0} pt</b></div>
    <div class="t-row"><span>Rang</span><b>${st.rank.name} · ${st.xp} XP</b></div>
    <div class="t-row"><span>Quiz du jour</span><b class="${dqDone ? "ok" : ""}">${dqDone ? "✓ Fait" : esc(dq.name)}</b></div>
    <div class="t-row"><span>Défi GeoGuessr</span><b class="${ggDone ? "ok" : ""}">${ggDone ? "✓ Relevé" : `${gd.mode} · ${fmtNum(gd.target)} pts`}</b></div>`;
}
function renderCustom() {
  const n = settings.order.length;
  $("mcModules").innerHTML = settings.order.map((v, i) => {
    const off = settings.hidden.includes(v);
    return `<li class="${off ? "off" : ""}">${ICONS[v]}<b>${MODS[v].n}</b>
      <button class="mc-ico" data-up="${i}" ${i === 0 ? "disabled" : ""} title="Monter">↑</button>
      <button class="mc-ico" data-down="${i}" ${i === n - 1 ? "disabled" : ""} title="Descendre">↓</button>
      <button class="mc-ico eye" data-vis="${v}">${off ? "MASQUÉ" : "VISIBLE"}</button></li>`;
  }).join("");
  const move = (i, d) => { const o = [...settings.order]; [o[i], o[i + d]] = [o[i + d], o[i]]; setSetting("order", o); renderCustom(); };
  $$("[data-up]").forEach(b => b.onclick = () => move(+b.dataset.up, -1));
  $$("[data-down]").forEach(b => b.onclick = () => move(+b.dataset.down, 1));
  $$("[data-vis]").forEach(b => b.onclick = () => {
    const v = b.dataset.vis, h = settings.hidden.includes(v) ? settings.hidden.filter(x => x !== v) : [...settings.hidden, v];
    setSetting("hidden", h); renderCustom();
  });
  $("mcQuick").innerHTML = Object.entries(QUICK).map(([id, q]) => `<label><input type="checkbox" data-qk="${id}" ${settings.quick.includes(id) ? "checked" : ""}><i>${q.i}</i>${q.n}</label>`).join("");
  $$("[data-qk]").forEach(c => c.onchange = () => setSetting("quick", Object.keys(QUICK).filter(id => $$(`[data-qk="${id}"]`)[0].checked)));
  $("mcAccent").innerHTML = ACCENTS.map(a => `<button class="sw ${a === settings.accent ? "on" : ""}" style="background:${a}" data-acc="${a}" title="${a}"></button>`).join("")
    + `<label class="sw sw-custom ${ACCENTS.includes(settings.accent) ? "" : "on"}" title="Couleur personnalisée" ${ACCENTS.includes(settings.accent) ? "" : `style="background:${settings.accent}"`}>+<input type="color" id="mcColor" value="${settings.accent}"></label>`;
  $$("[data-acc]").forEach(b => b.onclick = () => { setSetting("accent", b.dataset.acc); renderCustom(); });
  $("mcColor").oninput = e => setSetting("accent", e.target.value);
  $("mcColor").onchange = () => renderCustom();
}
function setMenuEdit(on) {
  $("menuMain").hidden = on; $("menuCustom").hidden = !on;
  $("menuEdit").classList.toggle("on", on);
  $("menuEdit").textContent = on ? "← Retour au menu" : "✎ Personnaliser";
  on ? renderCustom() : renderMenu();
}
function openMenu(edit = false) { closePalette(); renderMenu(); setMenuEdit(edit); $("menu").classList.add("open"); }
const closeMenu = () => $("menu").classList.remove("open");
$("menuBtn").onclick = () => openMenu(false);
$("menuClose").onclick = closeMenu;
$("menuEdit").onclick = () => setMenuEdit($("menuCustom").hidden);
$("mcReset").onclick = () => {
  if (!confirm("Remettre l'ordre des modules, les actions rapides et la couleur par défaut ?")) return;
  settings = { ...SETTINGS_DEFAULT, theme: settings.theme, fx: settings.fx, viewer: settings.viewer };
  save("settings", settings); applySettings(); renderCustom(); toast("Personnalisation réinitialisée");
};
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
    for (let i = 0; i < txt.length; i++) out += txt[i] === " " || i < (f - 10) / 2 ? txt[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (++f <= total) el._raf = requestAnimationFrame(step); else el.textContent = txt;
  };
  step();
}

/* ---------- VISIONNEUSE INTÉGRÉE ----------
   Les sites qui l'autorisent s'ouvrent dans un panneau à onglets, à l'intérieur du hub.
   Les autres (Google Search, Yandex, GeoGuessr…) interdisent techniquement l'affichage
   dans un autre site : ils s'ouvrent dans un onglet du navigateur. */
function gmapsEmbed(lat, lng, z = 17, t = "k") { return `https://maps.google.com/maps?q=${lat},${lng}&t=${t}&z=${z}&ie=UTF8&output=embed`; }
function osmEmbed(lat, lng) { const d = .006; return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d * 1.6},${lat - d},${lng + d * 1.6},${lat + d}&layer=mapnik&marker=${lat},${lng}`; }
function svEmbed(lat, lng) { return `https://maps.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`; }
// Adresses connues pour s'afficher dans une autre page
const EMBEDDABLE = [/^https:\/\/maps\.google\.com\/maps\?.*output=(embed|svembed)/, /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html/];
const isEmbeddable = u => EMBEDDABLE.some(r => r.test(u));
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

const viewer = (() => {
  let tabs = [], active = null, full = false;
  const root = $("viewer");
  function render() {
    root.hidden = !tabs.length;
    document.body.classList.toggle("vw-open", !!tabs.length);
    root.classList.toggle("full", full);
    if (map) setTimeout(() => map.invalidateSize(), 60);
    $("vwTabs").innerHTML = tabs.map(t => `<button class="vw-tab ${t.id === active ? "on" : ""}" data-vt="${t.id}" title="${esc(t.url)}"><span>${esc(t.title)}</span><i data-vx="${t.id}" title="Fermer l'onglet">✕</i></button>`).join("");
    $$("[data-vt]").forEach(b => b.onclick = e => { if (e.target.dataset.vx) return close(e.target.dataset.vx); active = b.dataset.vt; render(); });
    $$("#vwBody iframe").forEach(f => f.hidden = f.dataset.id !== active);
    const t = tabs.find(x => x.id === active);
    $("vwNote").textContent = t?.note || "";
  }
  function open(title, embedUrl, extUrl, note) {
    const existing = tabs.find(t => t.src === embedUrl);
    if (existing) { active = existing.id; return render(); }
    if (tabs.length >= 6) close(tabs[0].id, true);
    const id = uid();
    tabs.push({ id, title, src: embedUrl, url: extUrl || embedUrl, note: note || "" });
    const f = document.createElement("iframe");
    f.src = embedUrl; f.dataset.id = id; f.loading = "lazy";
    f.referrerPolicy = "no-referrer-when-downgrade"; f.allowFullscreen = true;
    $("vwBody").appendChild(f);
    active = id; render();
  }
  function close(id, silent) {
    tabs = tabs.filter(t => t.id !== id);
    $$(`#vwBody iframe[data-id="${id}"]`).forEach(f => f.remove());
    if (active === id) active = tabs.at(-1)?.id || null;
    if (!silent) render();
  }
  $("vwClose").onclick = () => { [...tabs].forEach(t => close(t.id, true)); render(); };
  $("vwExt").onclick = () => { const t = tabs.find(x => x.id === active); if (t) window.open(t.url, "_blank", "noopener"); };
  $("vwFull").onclick = () => { full = !full; render(); };
  // Redimensionnement du panneau (poignée à gauche)
  $("vwResize").onpointerdown = e => {
    e.preventDefault(); root.classList.add("resizing");
    const move = m => { const w = Math.max(320, Math.min(innerWidth - 240, innerWidth - m.clientX)); document.documentElement.style.setProperty("--vw", w + "px"); save("viewerW", w); };
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); root.classList.remove("resizing"); };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
  };
  const w = load("viewerW", 0); if (w) document.documentElement.style.setProperty("--vw", Math.min(w, innerWidth - 240) + "px");
  return { open, isOpen: () => tabs.length > 0, closeAll: () => $("vwClose").click() };
})();

// Ouverture d'un lien : visionneuse si le site l'autorise, sinon onglet du navigateur
function openUrl(u, title, note) {
  if (settings.viewer !== false && isEmbeddable(u)) return viewer.open(title || hostOf(u), u, u, note);
  window.open(u, "_blank", "noopener");
  if (settings.viewer !== false && !load("extHint", false)) {
    save("extHint", true);
    toast(`${hostOf(u)} interdit l'affichage dans un autre site : ouvert dans un onglet. Astuce : écran partagé d'Edge.`);
  }
}

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
      f[j * cols + i] = noise(x * .0032 + t * .025, y * .0032) + .5 * noise(x * .008, y * .008 - t * .035) + .6 * Math.exp(-(dx * dx + dy * dy) / 40000);
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
/* --- Lieux et parcours prédéfinis (monde entier) pour la coupe topographique --- */
const PLACES = {
  lyon: ["Lyon", 45.764, 4.8357], montblanc: ["Mont Blanc", 45.8326, 6.8652], marseille: ["Marseille", 43.2965, 5.3698],
  ventoux: ["Mont Ventoux", 44.1741, 5.2789], toulouse: ["Toulouse", 43.6047, 1.4442], aneto: ["Pic d'Aneto", 42.6311, 0.6567],
  ktm: ["Katmandou", 27.7172, 85.324], everest: ["Everest", 27.9881, 86.925], santiago: ["Santiago du Chili", -33.4489, -70.6693],
  aconcagua: ["Aconcagua", -32.6532, -70.0109], moshi: ["Moshi", -3.3349, 37.3404], kili: ["Kilimandjaro", -3.0674, 37.3556],
  tokyo: ["Tokyo", 35.6762, 139.6503], fuji: ["Mont Fuji", 35.3606, 138.7274], gcs: ["Grand Canyon (rive sud)", 36.0544, -112.1401],
  gcn: ["Grand Canyon (rive nord)", 36.1979, -112.0526], hilo: ["Hilo", 19.7071, -155.0885], maunakea: ["Mauna Kea", 19.8207, -155.4681]
};
const ROUTES = [["lyon", "montblanc"], ["marseille", "ventoux"], ["toulouse", "aneto"], ["ktm", "everest"], ["santiago", "aconcagua"],
  ["moshi", "kili"], ["tokyo", "fuji"], ["gcs", "gcn"], ["hilo", "maunakea"]];
// Profil de secours (hors ligne) pour Lyon → Mont Blanc : [km, m]
const LYON_MB_FALLBACK = [[0, 170], [12, 210], [25, 240], [38, 260], [52, 300], [62, 420], [70, 380], [82, 520], [90, 300], [97, 890], [104, 600], [110, 270],
  [122, 300], [134, 340], [148, 900], [158, 1550], [166, 1100], [176, 1000], [184, 1600], [192, 1035], [198, 2600], [203, 3800], [206, 4806], [210, 3600]];

// Géodésie : distance et points intermédiaires sur le grand cercle
const RADK = Math.PI / 180;
function gcDist(a, b) {
  const [p1, l1, p2, l2] = [a[0] * RADK, a[1] * RADK, b[0] * RADK, b[1] * RADK];
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function gcPoints(a, b, n) {
  const toV = ([la, lo]) => [Math.cos(la * RADK) * Math.cos(lo * RADK), Math.cos(la * RADK) * Math.sin(lo * RADK), Math.sin(la * RADK)];
  const A = toV(a), B = toV(b), d = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s1 = d ? Math.sin((1 - t) * d) / Math.sin(d) : 1 - t, s2 = d ? Math.sin(t * d) / Math.sin(d) : t;
    const v = [s1 * A[0] + s2 * B[0], s1 * A[1] + s2 * B[1], s1 * A[2] + s2 * B[2]];
    out.push([Math.atan2(v[2], Math.hypot(v[0], v[1])) / RADK, Math.atan2(v[1], v[0]) / RADK]);
  }
  return out;
}
const regionName = (() => { let dn = null; try { dn = new Intl.DisplayNames(["fr"], { type: "region" }); } catch { } return (a2, en) => { try { return (a2 && dn?.of(a2)) || en; } catch { return en; } }; })();
const fmtLat = (la, lo) => `${Math.abs(la).toFixed(4)}°${la >= 0 ? "N" : "S"} · ${Math.abs(lo).toFixed(4)}°${lo >= 0 ? "E" : "O"}`;

/* --- Points enregistrés (partagés entre le globe et la coupe) --- */
let gPoints = load("globePoints", [{ id: "p-lyon", name: "Lyon", lat: 45.764, lng: 4.8357 }]);
const saveGPoints = () => { save("globePoints", gPoints); renderGPoints(); profile.fillSelects(); globe.draw(); };

/* --- GLOBE INTERACTIF --- */
const globe = (() => {
  const c = $("globe"), ctx = c.getContext("2d"), RAD = Math.PI / 180;
  // Pré-calcul : boîtes englobantes des pays (pour le survol)
  const COUNTRIES = (window.WORLD || []).map(([en, a2, rings]) => {
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    rings.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
    return { en, a2, rings, bb: [x0, y0, x1, y1], fr: regionName(a2, en) };
  });
  // Terres détaillées (îles comprises) et petits pays / territoires
  const LANDP = (window.LAND || []).map(ring => {
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    ring.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    return { ring, bb: [x0, y0, x1, y1] };
  });
  const SMALLP = (window.SMALL || []).map(([a2, name, lat, lng]) => ({ fr: name || regionName(a2, a2), a2, lat, lng, small: true }));
  let off = document.createElement("canvas"), octx = off.getContext("2d"), staticKey = "";
  let ptr = null; // dernière position de la souris sur le globe (en pixels)
  let size = 0, lon0 = 4.8, lat0 = 30, zoom = 1, spin = load("globeSpin", true), dragging = null, moved = false;
  let hover = null, hoverCountry = null, sel = null, mark = null, route = null, tween = null, lastInteract = 0, tt = 0, dirty = true;
  let ink = "#0d0d0d", soft = "", land = "", sea = "";

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2); size = c.clientWidth;
    if (!size) return;
    c.width = c.height = size * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true;
  }
  function refreshColors() {
    const night = settings.theme === "night";
    ink = cssVar("--ink") || "#0d0d0d";
    soft = night ? "rgba(235,233,225,.16)" : "rgba(13,13,13,.14)";
    land = night ? "rgba(235,233,225,.10)" : "rgba(13,13,13,.07)";
    sea = night ? "rgba(235,233,225,.02)" : "rgba(255,255,255,.35)";
    dirty = true; draw();
  }
  const R = () => size * .4 * zoom;
  function proj(lon, lat) {
    const r = R(), cx = size / 2, cy = size / 2;
    const l = (lon - lon0) * RAD, p = lat * RAD, p0 = lat0 * RAD;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    let x = r * Math.cos(p) * Math.sin(l), y = -r * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
    if (cosc < 0) { const k = r / (Math.hypot(x, y) || 1); x *= k; y *= k; } // point caché : ramené sur le bord
    return [cx + x, cy + y, cosc];
  }
  function unproj(px, py) {
    const r = R(), x = (px - size / 2) / r, y = -(py - size / 2) / r, rho = Math.hypot(x, y);
    if (rho > 1) return null;
    const cc = Math.asin(rho), p0 = lat0 * RAD;
    const lat = rho ? Math.asin(Math.cos(cc) * Math.sin(p0) + y * Math.sin(cc) * Math.cos(p0) / rho) : p0;
    const lon = lon0 * RAD + Math.atan2(x * Math.sin(cc), rho * Math.cos(cc) * Math.cos(p0) - y * Math.sin(cc) * Math.sin(p0));
    return [lat / RAD, ((lon / RAD + 540) % 360) - 180];
  }
  function inRing(ring, x, y) {
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  const inBB = (bb, lat, lng) => lng >= bb[0] && lng <= bb[2] && lat >= bb[1] && lat <= bb[3];
  function countryAt(lat, lng) {
    const big = COUNTRIES.find(k => inBB(k.bb, lat, lng) && k.rings.some(r => inRing(r, lng, lat)));
    // Petits pays / îles : le plus proche dans un rayon qui dépend du zoom
    const lim = 2.2 / zoom; let best = null, bd = lim;
    SMALLP.forEach(p => { const d = Math.hypot(p.lat - lat, (p.lng - lng) * Math.cos(lat * RAD)); if (d < bd) { bd = d; best = p; } });
    if (best && (!big || bd < .6 / zoom)) return best;
    if (big) return big;
    if (LANDP.some(l => inBB(l.bb, lat, lng) && inRing(l.ring, lng, lat))) return { fr: "Île / terre", island: true };
    return null;
  }
  function path(pts) {
    let pen = false;
    for (const [lo, la] of pts) {
      const [x, y, v] = proj(lo, la);
      if (v > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
    }
  }
  function renderStatic(r, cx, cy) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (off.width !== size * dpr) { off.width = off.height = size * dpr; }
    const g = octx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
    const pathTo = pts => { let pen = false; for (const [lo, la] of pts) { const [x, y, v] = proj(lo, la); if (v > 0) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false; } };
    const poly = ring => { const pts = ring.map(([lo, la]) => proj(lo, la)); if (!pts.some(p => p[2] > 0)) return false; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); return true; };
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = sea; g.fill(); g.clip();
    g.beginPath(); g.strokeStyle = soft; g.lineWidth = .7;
    for (let lo = -180; lo < 180; lo += 15) { const pts = []; for (let la = -90; la <= 90; la += 3) pts.push([lo, la]); pathTo(pts); }
    for (let la = -75; la <= 75; la += 15) { const pts = []; for (let lo = -180; lo <= 180; lo += 3) pts.push([lo, la]); pathTo(pts); }
    g.stroke();
    // Terres émergées détaillées (îles comprises)
    g.fillStyle = land; g.strokeStyle = soft; g.lineWidth = .7;
    LANDP.forEach(l => { if (poly(l.ring)) { g.fill(); g.stroke(); } });
    // Frontières des pays
    COUNTRIES.forEach(k => {
      const isSel = sel && k === sel.country;
      k.rings.forEach(ring => { if (poly(ring)) { if (isSel) { g.fillStyle = ACCENT + "40"; g.fill(); } g.strokeStyle = isSel ? ACCENT : soft; g.lineWidth = isSel ? 1.4 : .6; g.stroke(); } });
    });
    // Petits pays et territoires : un repère (taille selon le zoom)
    const rad = Math.min(3.2, 1.2 + zoom * .4);
    g.fillStyle = ink; g.font = "600 9px JetBrains Mono, monospace"; g.textBaseline = "middle"; g.textAlign = "left";
    SMALLP.forEach(p => {
      const [x, y, v] = proj(p.lng, p.lat); if (v <= .05) return;
      g.globalAlpha = .55; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); g.globalAlpha = 1;
      if (zoom >= 3.2) { g.globalAlpha = .7; g.fillText(p.fr, x + rad + 3, y); g.globalAlpha = 1; }
    });
    g.restore();
  }
  function draw() {
    if (!size) return;
    const r = R(), cx = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);
    // Graduations de la lunette (uniquement sans zoom)
    if (zoom <= 1.05) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      for (let a = 0; a < 360; a += 5) {
        const r1 = r + 10, r2 = r + (a % 30 === 0 ? 22 : 15), s = Math.sin(a * RAD), co = Math.cos(a * RAD);
        ctx.beginPath(); ctx.moveTo(cx + r1 * co, cy + r1 * s); ctx.lineTo(cx + r2 * co, cy + r2 * s); ctx.stroke();
      }
      ctx.font = "600 10px JetBrains Mono, monospace"; ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      [["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["O", -1, 0]].forEach(([t, x, y]) => ctx.fillText(t, cx + x * (r + 34), cy + y * (r + 34)));
    }
    // Couche fixe (mer, graticule, terres, frontières) : recalculée seulement quand la vue change
    const key = [size, lon0.toFixed(3), lat0.toFixed(3), zoom.toFixed(3), ink, land, sel?.country?.fr || ""].join("|");
    if (key !== staticKey) { renderStatic(r, cx, cy); staticKey = key; }
    ctx.drawImage(off, 0, 0, size, size);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    // Pays survolé (dessiné à part pour suivre la souris sans tout recalculer)
    if (hoverCountry && !hoverCountry.island) {
      if (hoverCountry.small) {
        const [x, y, v] = proj(hoverCountry.lng, hoverCountry.lat);
        if (v > 0) { ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = ACCENT + "33"; ctx.fill(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.6; ctx.stroke(); }
      } else hoverCountry.rings.forEach(ring => {
        const pts = ring.map(([lo, la]) => proj(lo, la));
        if (!pts.some(p => p[2] > 0)) return;
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        ctx.fillStyle = ACCENT + "26"; ctx.fill(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.4; ctx.stroke();
      });
    }
    // Méridien de balayage
    if (fxOn()) {
      const scanLon = lon0 - 90 + ((tt * 20) % 180);
      ctx.beginPath(); const sp = []; for (let la = -90; la <= 90; la += 2) sp.push([scanLon, la]); path(sp);
      ctx.strokeStyle = ACCENT + "77"; ctx.lineWidth = 1.2; ctx.stroke();
    }
    // Trajet de la coupe topographique
    if (route) {
      ctx.beginPath(); path(gcPoints(route[0], route[1], 80).map(([la, lo]) => [lo, la]));
      ctx.setLineDash([6, 4]); ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.2; ctx.stroke(); ctx.setLineDash([]);
      [["A", route[0]], ["B", route[1]]].forEach(([t, p]) => {
        const [x, y, v] = proj(p[1], p[0]); if (v <= 0) return;
        ctx.fillStyle = ACCENT; ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.fillStyle = "#fff"; ctx.font = "800 9px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y + .5);
      });
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
    // Points enregistrés
    ctx.font = "700 10px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    gPoints.forEach(p => {
      const [x, y, v] = proj(p.lng, p.lat); if (v <= 0) return;
      ctx.fillStyle = ink; ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = ink; ctx.fillText(p.name.toUpperCase(), x + 7, y);
    });
    // Point sélectionné (réticule pulsé)
    const drawReticle = (p, col, pulse) => {
      const [x, y, v] = proj(p[1], p[0]); if (v <= 0) return;
      const k = pulse ? (tt * .8) % 1 : 0;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 4, y); ctx.moveTo(x + 4, y); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 4); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 14); ctx.stroke();
      if (pulse) { ctx.beginPath(); ctx.arc(x, y, 8 + k * 20, 0, 7); ctx.globalAlpha = 1 - k; ctx.stroke(); ctx.globalAlpha = 1; }
    };
    if (sel) drawReticle([sel.lat, sel.lng], ACCENT, fxOn());
    if (mark) { const [x, y, v] = proj(mark[1], mark[0]); if (v > 0) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = ACCENT; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); } }
    const lonN = ((lon0 + 540) % 360) - 180;
    $("globeRead").textContent = `CENTRE ${fmtLat(lat0, lonN)} · ZOOM ×${zoom.toFixed(1)}`;
    dirty = false;
  }
  function loop() {
    requestAnimationFrame(loop);
    if (current !== "home" || document.hidden) return;
    tt += 1 / 60;
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / 900), e = 1 - Math.pow(1 - k, 3);
      let dl = ((tween.lon - tween.l0 + 540) % 360) - 180;
      lon0 = tween.l0 + dl * e; lat0 = tween.p0 + (tween.lat - tween.p0) * e; zoom = tween.z0 + (tween.z - tween.z0) * e;
      if (k >= 1) tween = null; dirty = true;
    } else if (!dragging && !ptr && spin && fxOn() && !sel && performance.now() - lastInteract > 2500) { lon0 += .06; dirty = true; }
    if (ptr && !dragging && (dirty || tween)) updateHover();
    if (fxOn() && (sel || route)) dirty = true;
    if (dirty || fxOn()) draw();
  }
  // Pays sous la souris : recalculé à chaque mouvement ET à chaque fois que le globe bouge
  function updateHover() {
    const tip = $("globeTip"), [px, py] = ptr, ll = unproj(px, py);
    if (!ll) { if (hoverCountry) { hoverCountry = null; dirty = true; if (!fxOn()) draw(); } tip.hidden = true; return; }
    const k = countryAt(...ll);
    if (k !== hoverCountry) { hoverCountry = k; dirty = true; if (!fxOn()) draw(); }
    tip.hidden = false;
    tip.style.left = Math.min(px + 16, size - 170) + "px"; tip.style.top = (py > size - 60 ? py - 44 : py + 18) + "px";
    tip.innerHTML = `<b>${esc(k ? k.fr : "Océan")}</b><br>${fmtLat(...ll)}`;
  }
  function flyTo(lat, lng, z) { tween = { t0: performance.now(), l0: lon0, p0: lat0, z0: zoom, lon: lng, lat: Math.max(-70, Math.min(70, lat)), z: z ?? Math.max(zoom, 1.8) }; }
  function select(lat, lng, label) {
    sel = { lat, lng, country: countryAt(lat, lng), label: label || "" };
    renderSel(); dirty = true;
    if (!label) reverseName(lat, lng);
  }
  let revTimer;
  function reverseName(lat, lng) {
    clearTimeout(revTimer);
    revTimer = setTimeout(async () => {
      try {
        const r = await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=fr&lat=${lat}&lon=${lng}`)).json();
        if (sel && sel.lat === lat && sel.lng === lng && r?.address) {
          const a = r.address; sel.label = a.city || a.town || a.village || a.municipality || a.county || a.state || ""; renderSel();
        }
      } catch { /* hors ligne : on garde le pays */ }
    }, 400);
  }
  // Interactions souris
  c.addEventListener("pointerdown", e => { dragging = { x: e.clientX, y: e.clientY }; moved = false; c.setPointerCapture(e.pointerId); tween = null; lastInteract = performance.now(); });
  c.addEventListener("pointermove", e => {
    const rect = c.getBoundingClientRect(), px = (e.clientX - rect.left) * size / rect.width, py = (e.clientY - rect.top) * size / rect.height;
    if (dragging) {
      const k = 140 / (size || 400) / zoom, dx = (e.clientX - dragging.x) * k, dy = (e.clientY - dragging.y) * k;
      if (Math.abs(e.clientX - dragging.x) + Math.abs(e.clientY - dragging.y) > 2) moved = true;
      lon0 -= dx; lat0 = Math.max(-80, Math.min(80, lat0 + dy));
      dragging = { x: e.clientX, y: e.clientY }; lastInteract = performance.now(); dirty = true;
      $("globeTip").hidden = true; if (!fxOn()) draw(); return;
    }
    ptr = [px, py]; updateHover();
  });
  c.addEventListener("pointerup", e => {
    const was = dragging; dragging = null; lastInteract = performance.now();
    if (was && !moved) { const rect = c.getBoundingClientRect(), ll = unproj((e.clientX - rect.left) * size / rect.width, (e.clientY - rect.top) * size / rect.height); if (ll) select(...ll); }
  });
  c.addEventListener("pointercancel", () => dragging = null);
  c.addEventListener("pointerleave", () => { ptr = null; $("globeTip").hidden = true; if (hoverCountry) { hoverCountry = null; dirty = true; if (!fxOn()) draw(); } });
  c.addEventListener("wheel", e => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
  c.addEventListener("dblclick", e => { const rect = c.getBoundingClientRect(), ll = unproj((e.clientX - rect.left) * size / rect.width, (e.clientY - rect.top) * size / rect.height); if (ll) openOnMap(ll[0], ll[1], 12); });
  function setZoom(z) { zoom = Math.max(1, Math.min(8, z)); lastInteract = performance.now(); dirty = true; draw(); }
  $("gZoomIn").onclick = () => setZoom(zoom * 1.4);
  $("gZoomOut").onclick = () => setZoom(zoom / 1.4);
  $("gHome").onclick = () => { sel = null; renderSel(); flyTo(30, 4.8, 1); };
  $("gSpin").onclick = () => { spin = !spin; save("globeSpin", spin); $("gSpin").classList.toggle("on", spin); toast(spin ? "Rotation automatique activée" : "Rotation automatique coupée"); };
  $("gSpin").classList.toggle("on", spin);
  addEventListener("resize", () => { resize(); draw(); });
  return {
    start: () => { resize(); refreshColors(); requestAnimationFrame(loop); }, resize, draw: () => { dirty = true; draw(); }, refreshColors,
    flyTo, select, getSel: () => sel, clearSel: () => { sel = null; renderSel(); dirty = true; },
    setMark: m => { mark = m; dirty = true; if (!fxOn()) draw(); }, setRoute: r => { route = r; dirty = true; draw(); }
  };
})();

// Panneau du point sélectionné
function renderSel() {
  const s = globe.getSel();
  if (!s) { $("gSel").innerHTML = `<p class="muted small">Clique sur le globe pour sélectionner un point, ou cherche un lieu.</p>`; return; }
  const country = s.country ? s.country.fr : "Océan";
  $("gSel").innerHTML = `<div class="gs-head"><b>${esc(s.label || country)}</b><span class="mono small">${fmtLat(s.lat, s.lng)}${s.label ? " · " + esc(country) : ""}</span></div>
    <div class="gs-act">
      <button data-ga="save">+ Mes points</button><button data-ga="map">Carte</button><button data-ga="sat">Vue satellite</button>
      <button data-ga="A">Départ A</button><button data-ga="B">Arrivée B</button><button data-ga="copy">Copier</button><button data-ga="x" title="Désélectionner">✕</button>
    </div>`;
  $$("#gSel [data-ga]").forEach(b => b.onclick = () => {
    const a = b.dataset.ga, name = s.label || (s.country ? s.country.fr : "Point");
    if (a === "save") {
      const n = prompt("Nom du point :", name); if (n === null) return;
      gPoints.push({ id: uid(), name: n.trim() || name, lat: +s.lat.toFixed(5), lng: +s.lng.toFixed(5) }); saveGPoints(); toast("Point ajouté");
    }
    if (a === "map") openOnMap(s.lat, s.lng, 13);
    if (a === "sat") openUrl(gmapsEmbed(s.lat, s.lng, 16, "k"), `Satellite · ${name}`);
    if (a === "A" || a === "B") profile.setEnd(a, { name, lat: s.lat, lng: s.lng });
    if (a === "copy") navigator.clipboard.writeText(`${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`).then(() => toast("Coordonnées copiées"));
    if (a === "x") globe.clearSel();
  });
}
function renderGPoints() {
  $("gPoints").innerHTML = gPoints.map(p => `<li><button class="gp-go" data-gp="${p.id}">${esc(p.name)}</button><button class="del" data-gpe="${p.id}" title="Renommer">✎</button><button class="del" data-gpd="${p.id}" title="Supprimer">✕</button></li>`).join("")
    || `<li class="muted small">Aucun point enregistré.</li>`;
  $$("[data-gp]").forEach(b => b.onclick = () => { const p = gPoints.find(x => x.id === b.dataset.gp); globe.flyTo(p.lat, p.lng); globe.select(p.lat, p.lng, p.name); });
  $$("[data-gpe]").forEach(b => b.onclick = () => { const p = gPoints.find(x => x.id === b.dataset.gpe); const n = prompt("Nouveau nom :", p.name); if (n?.trim()) { p.name = n.trim(); saveGPoints(); } });
  $$("[data-gpd]").forEach(b => b.onclick = () => { if (confirm("Supprimer ce point ?")) { gPoints = gPoints.filter(x => x.id !== b.dataset.gpd); saveGPoints(); } });
}
// Recherche d'un lieu dans le monde
let gTimer;
$("gSearch").oninput = () => {
  clearTimeout(gTimer);
  const q = $("gSearch").value.trim(), ll = parseLatLng(q);
  if (!q) return ($("gResults").innerHTML = "");
  if (ll && /^[-\d.,;\s]+$/.test(q)) { $("gResults").innerHTML = `<div data-gll="${ll}" data-gn="">→ Aller à ${fmtLat(...ll)}</div>`; return bindGRes(); }
  gTimer = setTimeout(async () => {
    try {
      const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=fr&q=${enc(q)}`)).json();
      $("gResults").innerHTML = r.map(x => `<div data-gll="${x.lat},${x.lon}" data-gn="${esc(x.display_name.split(",")[0])}">${esc(x.display_name)}</div>`).join("") || "<div>Aucun résultat</div>";
      bindGRes();
    } catch { $("gResults").innerHTML = "<div>Recherche indisponible (connexion ?)</div>"; }
  }, 900);
};
$("gSearch").onkeydown = e => { if (e.key === "Enter") $("gResults").querySelector("[data-gll]")?.click(); };
function bindGRes() {
  $$("#gResults [data-gll]").forEach(d => d.onclick = () => {
    const [a, b] = d.dataset.gll.split(",").map(Number);
    globe.flyTo(a, b, 2.4); globe.select(a, b, d.dataset.gn || ""); $("gResults").innerHTML = ""; $("gSearch").value = "";
  });
}

onEnter.home = () => { globe.resize(); globe.draw(); setTimeout(() => profile.resize(), 30); };

// Réticule qui suit la souris sur l'accueil (masqué au-dessus du globe pour ne pas gêner le pointage)
addEventListener("mousemove", e => {
  if (current !== "home" || !fxOn()) return;
  $("cross").style.visibility = e.target.closest?.(".globe-wrap, .profile-band") ? "hidden" : "";
  document.querySelector("#cross .cx").style.top = e.clientY + "px";
  document.querySelector("#cross .cy").style.left = e.clientX + "px";
  const l = $("crossLbl"); l.style.left = e.clientX + 12 + "px"; l.style.top = e.clientY + 12 + "px";
  l.textContent = `X ${pad(e.clientX, 4)} · Y ${pad(e.clientY + Math.round(scrollY), 4)}`;
}, { passive: true });

/* --- COUPE TOPOGRAPHIQUE (monde entier, altitudes réelles) --- */
const profile = (() => {
  const c = $("profile"), ctx = c.getContext("2d"), N = 100;
  let W = 0, H = 0, mx = -1, t0 = 0, data = null, loading = false;
  let ends = load("profileEnds", { A: { name: "Lyon", lat: 45.764, lng: 4.8357 }, B: { name: "Mont Blanc", lat: 45.8326, lng: 6.8652 } });
  const cache = load("profileCache", {});

  function fillSelects() {
    const presetOpts = ROUTES.map(([a, b], i) => `<option value="${i}">${PLACES[a][0]} → ${PLACES[b][0]}</option>`).join("");
    $("pbPreset").innerHTML = `<option value="">Parcours prédéfinis…</option>${presetOpts}`;
    const opts = `<optgroup label="Mes points">${gPoints.map(p => `<option value="p:${p.id}">${esc(p.name)}</option>`).join("") || "<option disabled>— aucun —</option>"}</optgroup>
      <optgroup label="Lieux">${Object.entries(PLACES).map(([k, p]) => `<option value="k:${k}">${p[0]}</option>`).join("")}</optgroup>`;
    ["A", "B"].forEach(s => { const el = $("pb" + s); el.innerHTML = `<option value="">${esc(ends[s].name)} (actuel)</option>` + opts; });
  }
  const resolve = v => {
    if (v.startsWith("p:")) { const p = gPoints.find(x => x.id === v.slice(2)); return p && { name: p.name, lat: p.lat, lng: p.lng }; }
    if (v.startsWith("k:")) { const p = PLACES[v.slice(2)]; return p && { name: p[0], lat: p[1], lng: p[2] }; }
    return null;
  };
  function setEnd(side, p) { ends[side] = p; save("profileEnds", ends); fillSelects(); load_(); toast(`Point ${side} : ${p.name}`); }
  async function load_() {
    const A = [ends.A.lat, ends.A.lng], B = [ends.B.lat, ends.B.lng], dist = gcDist(A, B);
    globe.setRoute([A, B]);
    $("pbTitle").textContent = `${ends.A.name} → ${ends.B.name}`.toUpperCase();
    if (dist < .2) { data = null; $("pbState").textContent = "A et B sont trop proches."; draw(); return; }
    const pts = gcPoints(A, B, N), key = pts[0].concat(pts[N - 1]).map(v => v.toFixed(3)).join(",");
    if (cache[key]) { data = { pts, dist, elev: cache[key], src: "cache" }; t0 = performance.now(); $("pbState").textContent = ""; draw(); return; }
    loading = true; $("pbState").textContent = "Chargement des altitudes…"; draw();
    try {
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${pts.map(p => p[0].toFixed(5)).join(",")}&longitude=${pts.map(p => p[1].toFixed(5)).join(",")}`;
      const r = await (await fetch(url)).json();
      if (!Array.isArray(r.elevation)) throw 0;
      const elev = r.elevation.map(v => Math.max(v, -500));
      cache[key] = elev;
      const keys = Object.keys(cache); if (keys.length > 25) delete cache[keys[0]];
      save("profileCache", cache);
      data = { pts, dist, elev, src: "live" }; $("pbState").textContent = "";
    } catch {
      const isDefault = Math.abs(A[0] - 45.764) < .01 && Math.abs(B[0] - 45.8326) < .01;
      if (isDefault) {
        const f = d => { for (let i = 1; i < LYON_MB_FALLBACK.length; i++) if (d <= LYON_MB_FALLBACK[i][0]) { const [d0, a0] = LYON_MB_FALLBACK[i - 1], [d1, a1] = LYON_MB_FALLBACK[i]; return a0 + (a1 - a0) * (d - d0) / (d1 - d0); } return 3600; };
        data = { pts, dist, elev: pts.map((_, i) => f(i / (N - 1) * 210)), src: "schéma" };
        $("pbState").textContent = "Hors ligne : profil schématique.";
      } else { data = null; $("pbState").textContent = "Altitudes indisponibles (connexion ?)."; }
    }
    loading = false; t0 = performance.now(); draw();
  }
  function resize() { const dpr = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; if (!W) return; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
  function geom() {
    const padL = 54, padR = 18, top = 30, bot = 26;
    const mn = Math.min(0, ...data.elev), mxA = Math.max(...data.elev);
    const step = [100, 200, 500, 1000, 2000][[100, 200, 500, 1000, 2000].findIndex(s => (mxA - mn) / s <= 6)] || 2000;
    const lo = Math.floor(mn / step) * step, hi = Math.ceil((mxA * 1.12) / step) * step || step;
    return { padL, padR, top, bot, lo, hi, step, X: i => padL + i / (N - 1) * (W - padL - padR), Y: a => top + (1 - (a - lo) / (hi - lo)) * (H - top - bot) };
  }
  function draw() {
    if (!W) return;
    const ink = cssVar("--ink"), muted = cssVar("--muted");
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono, monospace"; ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (!data) { ctx.fillText(loading ? "CHARGEMENT DES ALTITUDES…" : "CHOISIS UN DÉPART A ET UNE ARRIVÉE B", W / 2, H / 2); $("pbStats").textContent = ""; return; }
    const g = geom(), e = data.elev;
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.textAlign = "right";
    for (let a = g.lo; a <= g.hi; a += g.step) { ctx.globalAlpha = .25; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(g.padL, g.Y(a)); ctx.lineTo(W - g.padR, g.Y(a)); ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.fillText(fmtNum(a) + " m", g.padL - 6, g.Y(a)); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const kmStep = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(s => data.dist / s <= 8) || 5000;
    for (let d = 0; d <= data.dist + .01; d += kmStep) ctx.fillText(d + " km", g.X(d / data.dist * (N - 1)), H - g.bot + 8);
    // Mer sous 0 m
    if (g.lo < 0) { ctx.fillStyle = "rgba(37,99,235,.12)"; ctx.fillRect(g.padL, g.Y(0), W - g.padL - g.padR, g.Y(g.lo) - g.Y(0)); }
    const k = fxOn() ? Math.min(1, (performance.now() - t0) / 1400) : 1, last = Math.round((N - 1) * k);
    ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(g.lo));
    for (let i = 0; i <= last; i++) ctx.lineTo(g.X(i), g.Y(e[i]));
    ctx.lineTo(g.X(last), g.Y(g.lo)); ctx.closePath();
    ctx.save(); ctx.clip(); ctx.strokeStyle = ink; ctx.globalAlpha = .18; ctx.beginPath();
    for (let x = -H; x < W; x += 7) { ctx.moveTo(x, H); ctx.lineTo(x + H, 0); }
    ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
    ctx.beginPath(); for (let i = 0; i <= last; i++) i ? ctx.lineTo(g.X(i), g.Y(e[i])) : ctx.moveTo(g.X(i), g.Y(e[i]));
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    // Repères : A, B, point culminant
    const top = e.indexOf(Math.max(...e));
    ctx.font = "700 10px JetBrains Mono, monospace"; ctx.textBaseline = "bottom";
    const label = (i, t, col) => { if (i > last) return; const x = g.X(i), y = g.Y(e[i]); ctx.fillStyle = col; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.textAlign = i < 8 ? "left" : i > N - 9 ? "right" : "center"; ctx.fillText(t, x, y - 8); };
    label(0, "A · " + ends.A.name.toUpperCase(), ACCENT);
    label(N - 1, "B · " + ends.B.name.toUpperCase(), ACCENT);
    if (top > 3 && top < N - 4) label(top, `▲ ${fmtNum(e[top])} M`, ink);
    // Curseur
    if (mx >= g.padL && mx <= W - g.padR) {
      const i = Math.round((mx - g.padL) / (W - g.padL - g.padR) * (N - 1)), x = g.X(i), y = g.Y(e[i]);
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, g.top - 8); ctx.lineTo(x, H - g.bot); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = ACCENT; ctx.fill();
      const lbl = `${(i / (N - 1) * data.dist).toFixed(1)} KM · ${fmtNum(e[i])} M · ${fmtLat(...data.pts[i])}`;
      ctx.font = "800 11px JetBrains Mono, monospace"; const w = ctx.measureText(lbl).width + 14, bx = Math.min(Math.max(x - w / 2, g.padL), W - g.padR - w);
      ctx.fillStyle = ink; ctx.fillRect(bx, 2, w, 20); ctx.fillStyle = cssVar("--paper"); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(lbl, bx + 7, 12);
    }
    let up = 0, down = 0; for (let i = 1; i < N; i++) { const d = e[i] - e[i - 1]; d > 0 ? up += d : down -= d; }
    $("pbStats").textContent = `${data.dist.toFixed(1).replace(".", ",")} KM · MIN ${fmtNum(Math.min(...e))} M · MAX ${fmtNum(Math.max(...e))} M · D+ ${fmtNum(up)} M${data.src === "schéma" ? " · SCHÉMA" : ""}`;
    if (k < 1) requestAnimationFrame(draw);
  }
  const idxAt = e => { if (!data) return -1; const g = geom(), x = e.clientX - c.getBoundingClientRect().left; return Math.round((x - g.padL) / (W - g.padL - g.padR) * (N - 1)); };
  c.addEventListener("pointermove", e => {
    mx = e.clientX - c.getBoundingClientRect().left; draw();
    const i = idxAt(e); globe.setMark(data && i >= 0 && i < N ? data.pts[i] : null);
  });
  c.addEventListener("pointerleave", () => { mx = -1; draw(); globe.setMark(null); });
  c.addEventListener("dblclick", e => { const i = idxAt(e); if (data && i >= 0 && i < N) openOnMap(data.pts[i][0], data.pts[i][1], 14); });
  $("pbPreset").onchange = e => {
    if (e.target.value === "") return;
    const [a, b] = ROUTES[+e.target.value]; ends = { A: { name: PLACES[a][0], lat: PLACES[a][1], lng: PLACES[a][2] }, B: { name: PLACES[b][0], lat: PLACES[b][1], lng: PLACES[b][2] } };
    save("profileEnds", ends); fillSelects(); load_();
  };
  ["A", "B"].forEach(s => $("pb" + s).onchange = e => { const p = resolve(e.target.value); if (p) setEnd(s, p); });
  $("pbSwap").onclick = () => { ends = { A: ends.B, B: ends.A }; save("profileEnds", ends); fillSelects(); load_(); };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { resize(); if (!data && !loading) load_(); io.disconnect(); } }), { threshold: .2 });
  io.observe(c);
  addEventListener("resize", resize);
  return { resize, draw, fillSelects, setEnd };
})();

$$(".dossier").forEach(d => {
  d.addEventListener("mousemove", e => {
    if (!fxOn()) return;
    const r = d.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    d.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg)`;
  });
  d.addEventListener("mouseleave", () => d.style.transform = "");
});

const revealObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  if (e.target.matches("[data-scramble]")) scramble(e.target);
  revealObs.unobserve(e.target);
}), { threshold: .25 });
$$(".reveal, .block-head [data-scramble], .final [data-scramble]").forEach(el => revealObs.observe(el));

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
    const qa = document.querySelector('[data-qa="chrono"] span'); if (qa) qa.textContent = `Chrono ${fmtT(secs)}`;
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
  ["Street View", (a, b) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${a},${b}`, svEmbed, "Street View intégré (expérimental) : si l'image reste noire, il n'y a pas de panorama ici ou Google le bloque. Utilise ↗."],
  ["Google Maps", (a, b) => `https://www.google.com/maps/search/?api=1&query=${a},${b}`, (a, b) => gmapsEmbed(a, b, 18, "k")],
  ["Google Earth", (a, b) => `https://earth.google.com/web/@${a},${b},300a,800d,35y,0h,45t,0r`],
  ["Géoportail", (a, b) => `https://www.geoportail.gouv.fr/carte?c=${b},${a}&z=17&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`],
  ["Mapillary", (a, b) => `https://www.mapillary.com/app/?lat=${a}&lng=${b}&z=17`],
  ["SunCalc", (a, b) => { const d = sunDate(); return `https://www.suncalc.org/#/${a},${b},17/${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}/${pad(d.getHours())}:${pad(d.getMinutes())}/1/3`; }],
  ["Overpass Turbo", (a, b) => `https://overpass-turbo.eu/?C=${a};${b};16&Q=${enc(`[out:json];\n// Exemple : arrêts de bus à 500 m\nnode(around:500,${a},${b})[highway=bus_stop];\nout;`)}&R`],
  ["Cartoradio", (a, b) => `https://www.cartoradio.fr/index.html#/cartographie/lonlat/${b}/${a}`],
  ["OpenStreetMap", (a, b) => `https://www.openstreetmap.org/?mlat=${a}&mlon=${b}#map=17/${a}/${b}`, osmEmbed]
];
function openPointTool(i, lat, lng) {
  const t = pointTools[i], label = `${t[0]} · ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  if (t[2] && settings.viewer !== false) viewer.open(label, t[2](lat, lng), t[1](lat, lng), t[3]);
  else openUrl(t[1](lat, lng), label);
}
function initMap() {
  if (!window.L) { $("mapHint").textContent = "⚠ Carte indisponible : vérifie ta connexion Internet."; return; }
  // maxNativeZoom : niveau le plus détaillé réellement publié par le serveur.
  // Au-delà, Leaflet agrandit les dernières tuiles au lieu de demander des tuiles inexistantes (= écran noir).
  const ign = (layer, fmt, native) => L.tileLayer(`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${fmt}`, { maxZoom: 20, maxNativeZoom: native, attribution: "© IGN" });
  const layers = {
    "Plan IGN": ign("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png", 18),
    "Photo aérienne IGN": ign("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg", 19),
    "Satellite (Esri)": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 18, attribution: "© Esri" })
    // OpenStreetMap retiré comme fond de carte : ses serveurs bénévoles bloquent ce type d'usage (erreur 403).
    // Il reste disponible dans « Ouvrir ce point dans » (visionneuse et lien direct).
  };
  const v = load("mapView", [45.764, 4.8357, 11]);
  map = L.map("leaflet", { maxZoom: 20, layers: [layers[load("mapLayer", "Plan IGN")] || layers["Plan IGN"]] }).setView([v[0], v[1]], v[2]);
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
  $("pointTools").innerHTML = pointTools.map((t, i) => `<button data-p="${i}" title="${t[2] && settings.viewer !== false ? "S'ouvre dans la visionneuse" : "S'ouvre dans un onglet"}">${t[0]} ${t[2] && settings.viewer !== false ? "▣" : "↗"}</button>`).join("");
  $$("#pointTools button").forEach(b => b.onclick = () => openPointTool(+b.dataset.p, lat, lng));
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
let geoTimer;
$("geoQ").oninput = () => {
  clearTimeout(geoTimer);
  const q = $("geoQ").value.trim(), ll = parseLatLng(q);
  if (!q) return ($("geoResults").innerHTML = "");
  if (ll && /^[-\d.,;\s]+$/.test(q)) { $("geoResults").innerHTML = `<div data-ll="${ll}">→ Aller à ${fmtLL(...ll)}</div>`; return bindGeo(); }
  geoTimer = setTimeout(async () => { // Nominatim : 1 requête par seconde maximum
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
img.onclick = e => { wrapEl.classList.toggle("zoom"); moveZoom(e); };
img.onmousemove = moveZoom;
function moveZoom(e) {
  if (!wrapEl.classList.contains("zoom")) return;
  const pv = $("photoView").getBoundingClientRect();
  const px = (e.clientX - pv.left - wrapEl.offsetLeft) / wrapEl.offsetWidth, py = (e.clientY - pv.top - wrapEl.offsetTop) / wrapEl.offsetHeight;
  wrapEl.style.transformOrigin = `${Math.max(0, Math.min(1, px)) * 100}% ${Math.max(0, Math.min(1, py)) * 100}%`;
}
$("photoView").onmouseleave = () => wrapEl.classList.remove("zoom");
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
const PROGRAM = window.PROGRAM, RANKS = window.RANKS;
let progress = load("progress", []);       // étapes cochées à la main
let quizStats = load("quizStats", {});     // { id: { best, plays, last, date } }
let flags = load("flags", {});             // { exported: true… }

// --- GeoGuessr : cartes et sessions
const GG_FRANCE = "https://www.geoguessr.com/maps/france"; // carte officielle « France »
const GG_AURA = "https://www.geoguessr.com/maps/655254048164cfc43ee03bab"; // carte Lyon / Auvergne-Rhône-Alpes
let ggMaps = load("ggMaps", [{ name: "France", url: GG_FRANCE }, { name: "Lyon / AURA", url: GG_AURA }]);
ggMaps = ggMaps
  .filter(m => !(m.name === "No Move" && /geoguessr\.com\/?$/.test(m.url)))          // « No Move » est un mode, pas une carte
  .map(m => /geoguessr\.com\/maps\/?$/.test(m.url) || (!m.url && /lyon|aura/i.test(m.name))
    ? { ...m, url: m.name === "France" ? GG_FRANCE : /lyon|aura/i.test(m.name) ? GG_AURA : "" } : m);
save("ggMaps", ggMaps);
let sessions = load("sessions", load("gg", []));
let ggGoal = load("ggGoal", 20000);
const GG_MODES = ["Move", "No Move", "NMPZ"];

// --- Badges : [id, nom, description, icône, condition]
const BADGES = [
  ["first", "Premier pas", "Valider une étape du programme", "◆", s => s.doneCount >= 1],
  ["streak3", "Régulier", "3 jours d'activité d'affilée", "3", s => s.streak >= 3],
  ["streak7", "Discipliné", "7 jours d'affilée", "7", s => s.streak >= 7],
  ["perfect", "Sans faute", "10/10 à un exercice", "★", s => s.perfect],
  ["nomove", "Œil de lynx", "5 parties en No Move", "◎", s => s.nm >= 5],
  ["lyon", "Gone", "5 parties sur la carte Lyon", "L", s => s.lyon >= 5],
  ["record", "Record", "20 000 points sur une partie", "▲", s => s.maxScore >= 20000],
  ["memo", "Mémoire de terrain", "10 indices perso dans le mémo", "✎", s => s.userMemo >= 10],
  ["string", "Tisseur de fils", "5 fils sur un tableau d'enquête", "⌇", s => s.links >= 5],
  ["archiv", "Archiviste", "Exporter un rapport", "⤓", s => s.exported],
  ["hours", "Endurant", "5 h d'entraînement chronométré", "◷", s => s.totalSecs >= 18000],
  ["all", "Enquêteur accompli", "Terminer tout le programme", "V", s => s.allDone]
];

function computeTraining() {
  const lyon = sessions.filter(s => /lyon|aura/i.test(s.map || "")).length;
  const nm = sessions.filter(s => s.mode === "No Move").length;
  const mv = sessions.filter(s => !s.mode || s.mode === "Move").length;
  const maxScore = sessions.reduce((m, s) => Math.max(m, +s.score || 0), 0);
  const qb = id => quizStats[id]?.best || 0;
  const userMemo = memo.filter(m => !m.builtin).length;
  const links = Math.max(0, ...cases.map(c => c.links.length));
  const auto = new Set();
  if (mv >= 5) auto.add("gg1");
  if (qb("france") >= 8) auto.add("fr1");
  if (qb("dep") >= 8) auto.add("dep1");
  if (userMemo >= 10) auto.add("fr2");
  if (nm >= 5) auto.add("nm1");
  if (lyon >= 5) auto.add("nm2");
  if (qb("shadow") >= 7) auto.add("sh1");
  if (maxScore >= 20000) auto.add("nm3");
  if (cases.some(c => c.entries.length >= 5 && c.links.length >= 4)) auto.add("rep1");
  if (flags.exported) auto.add("rep2");
  const done = id => auto.has(id) || progress.includes(id);
  const items = PROGRAM.flatMap((l, li) => l.items.map(it => ({ ...it, lvl: li + 1 })));
  const doneItems = items.filter(it => done(it.id));
  const s = { lyon, nm, maxScore, userMemo, links, streak: streak(), totalSecs, exported: !!flags.exported,
    perfect: Object.values(quizStats).some(q => q.best === 10), doneCount: doneItems.length, allDone: doneItems.length === items.length };
  const unlocked = BADGES.filter(b => b[4](s)).map(b => b[0]);
  const xp = doneItems.reduce((a, it) => a + it.xp, 0)
    + Object.values(quizStats).reduce((a, q) => a + (q.best || 0) * 3, 0)
    + Math.min(sessions.length * 3, 150) + unlocked.length * 10;
  let ri = 0; RANKS.forEach((r, i) => { if (xp >= r[0]) ri = i; });
  const rank = { name: RANKS[ri][1], roman: RANKS[ri][2], min: RANKS[ri][0], next: RANKS[ri + 1] };
  return { done, items, doneItems, xp, rank, unlocked, s };
}

let trainReady = false;
const openGuides = new Set();
function refreshTraining() {
  const st = computeTraining();
  // Rang
  $("rankNum").textContent = st.rank.roman;
  $("rankName").textContent = st.rank.name;
  const nx = st.rank.next;
  $("xpFill").style.width = (nx ? (st.xp - st.rank.min) / (nx[0] - st.rank.min) * 100 : 100) + "%";
  $("xpText").textContent = nx ? `${st.xp} XP · encore ${nx[0] - st.xp} XP pour « ${nx[1]} »` : `${st.xp} XP · rang maximal atteint`;
  // Défis du jour
  const k = todayKey(), dq = dailyQuizDef(), gd = ggDaily();
  $("dailyQuizName").textContent = dq.name;
  $("dailyQuizState").innerHTML = load("quizDaily", "") === k ? '<span class="done">✓ FAIT AUJOURD\'HUI</span>' : "10 QUESTIONS · CLIQUE POUR LANCER";
  $("dailyGgName").textContent = `${gd.mode} · ${fmtNum(gd.target)} pts`;
  $("dailyGgState").innerHTML = load("ggDailyDone", "") === k ? '<span class="done">✓ RELEVÉ</span>' : (gd.map ? esc(gd.map.name.toUpperCase()) : "AJOUTE LE LIEN D'UNE CARTE");
  // Programme
  const nextIt = st.items.find(it => !st.done(it.id));
  const actBtn = it => it.quiz ? `<button class="btn sm" data-quiz="${it.quiz}">Lancer l'exercice →</button>`
    : it.url ? `<a class="btn sm" href="${it.url}" target="_blank" rel="noopener">Ouvrir l'outil ↗</a>`
    : it.gg ? `<button class="btn sm" data-ttab-go="gg">Enregistrer une session →</button>`
    : it.memo ? `<button class="btn sm" data-ttab-go="memo">Ouvrir le mémo →</button>`
    : it.go ? `<a class="btn sm" href="#${it.go}">Ouvrir le module →</a>` : "";
  const guide = it => `<div class="guide">
      <div class="g-col"><h5 class="mono">POURQUOI</h5><p>${esc(it.why)}</p>
        <h5 class="mono">C'EST FAIT QUAND…</h5><p>${esc(it.done)}</p>
        ${it.tip ? `<p class="g-tip"><b class="mono">ASTUCE</b> ${esc(it.tip)}</p>` : ""}</div>
      <div class="g-col"><h5 class="mono">COMMENT FAIRE</h5><ol>${it.how.map(h => `<li>${esc(h)}</li>`).join("")}</ol>
        <div class="row wrap-row">${actBtn(it)}${it.auto ? `<span class="mono small muted">Validation automatique</span>` : `<span class="mono small muted">Coche la case quand c'est fait</span>`}</div></div></div>`;
  $("program").innerHTML = `
    <div class="how-it-works">
      <div><span class="mono hw-n">1</span><b>Suis l'ordre</b><p>Les niveaux vont du plus simple au plus avancé. Commence par l'étape mise en avant ci-dessous.</p></div>
      <div><span class="mono hw-n">2</span><b>Ouvre le guide</b><p>Chaque étape explique pourquoi, comment, et à quoi on reconnaît qu'elle est terminée.</p></div>
      <div><span class="mono hw-n">3</span><b>Valide</b><p>Les étapes <em class="mono tag">AUTO</em> se cochent seules. Les autres, coche-les toi-même quand le critère est rempli.</p></div>
      <div><span class="mono hw-n">4</span><b>Un peu chaque jour</b><p>20 à 30 minutes par jour valent mieux que 3 heures le dimanche : ta série de jours le montre.</p></div>
    </div>
    ${nextIt ? `<section class="next-step">
      <div class="ns-head"><span class="mono">▶ TON PROCHAIN PAS · NIV. ${nextIt.lvl} · ${esc(PROGRAM[nextIt.lvl - 1].name.toUpperCase())}</span><span class="mono">${nextIt.time ? "≈ " + esc(nextIt.time) + " · " : ""}+${nextIt.xp} XP</span></div>
      <h3>${esc(nextIt.t)}</h3>${guide(nextIt)}</section>`
    : `<section class="next-step"><h3>Programme terminé. Bravo.</h3><p>Continue avec les défis du jour, Gralhix et tes propres objectifs.</p></section>`}
    ${PROGRAM.map((L, li) => {
    const d = L.items.filter(it => st.done(it.id)).length, pct = Math.round(d / L.items.length * 100);
    const isOpenLvl = nextIt && nextIt.lvl === li + 1;
    return `<article class="level ${d === L.items.length ? "complete" : ""} ${isOpenLvl ? "current" : ""}">
      <header><span class="lv-n mono">NIV. ${li + 1}</span><div><h3>${L.name}</h3><p class="small muted">${L.desc}</p></div><span class="lv-p mono">${d}/${L.items.length}</span></header>
      <div class="lv-bar"><i style="width:${pct}%"></i></div>
      <p class="lv-goal"><b class="mono">OBJECTIF</b> ${esc(L.goal)}</p>
      <ul>${L.items.map(it => {
        const ok = st.done(it.id), open = openGuides.has(it.id);
        return `<li class="${ok ? "done" : ""} ${open ? "open" : ""} ${nextIt && it.id === nextIt.id ? "is-next" : ""}">
          <div class="it-row"><label class="pchk" title="${it.auto ? "Validée automatiquement" : "Cocher quand c'est fait"}"><input type="checkbox" data-pid="${it.id}" ${ok ? "checked" : ""} ${it.auto ? "disabled" : ""}><span></span></label>
          <button class="it-t" data-guide="${it.id}"><span class="t">${esc(it.t)}</span>${it.auto ? '<em class="mono tag">AUTO</em>' : ""}${it.time ? `<span class="mono small muted it-time">${esc(it.time)}</span>` : ""}<span class="xp mono">+${it.xp}</span><span class="mono chev">${open ? "−" : "+"}</span></button></div>
          ${open ? guide(it) : ""}</li>`;
      }).join("")}</ul></article>`;
  }).join("")}`;
  $$("[data-guide]").forEach(b => b.onclick = () => { const id = b.dataset.guide; openGuides.has(id) ? openGuides.delete(id) : openGuides.add(id); refreshTraining(); });
  $$("[data-pid]").forEach(c => c.onchange = () => {
    progress = c.checked ? [...new Set([...progress, c.dataset.pid])] : progress.filter(x => x !== c.dataset.pid);
    save("progress", progress); if (c.checked) { bump(3); toast("Étape validée"); } refreshTraining();
  });
  $$("#program [data-quiz]").forEach(b => b.onclick = () => startQuiz(b.dataset.quiz));
  $$("#program [data-ttab-go]").forEach(b => b.onclick = () => { setTrainTab(b.dataset.ttabGo); window.scrollTo({ top: $("trainTabs").offsetTop - 80, behavior: "smooth" }); });
  // Badges
  $("badges").innerHTML = BADGES.map(b => `<div class="badge-st ${st.unlocked.includes(b[0]) ? "on" : ""}" title="${b[2]}"><span class="b-ico">${b[3]}</span><b>${b[1]}</b><small>${b[2]}</small></div>`).join("");
  $("badgeCount").textContent = `${st.unlocked.length}/${BADGES.length}`;
  const prev = load("badges", []), fresh = st.unlocked.filter(b => !prev.includes(b));
  if (fresh.length || prev.length !== st.unlocked.length) save("badges", st.unlocked);
  if (fresh.length && trainReady) { const b = BADGES.find(x => x[0] === fresh[0]); setTimeout(() => toast(`Badge débloqué : ${b[1]}`), 500); }
  trainReady = true;
  return st;
}

function setTrainTab(t) {
  $$("#trainTabs button").forEach(b => b.classList.toggle("on", b.dataset.ttab === t));
  $$(".tpane").forEach(p => p.hidden = p.dataset.tpane !== t);
  save("trainTab", t);
  if (t === "gg") setTimeout(drawChart, 30);
}
$$("#trainTabs button").forEach(b => b.onclick = () => setTrainTab(b.dataset.ttab));

// --- Défis perso (liste libre)
let tasks = load("tasks", []).map(x => ({ t: x.t, d: !!x.d }));
function renderTasks() {
  $("taskList").innerHTML = tasks.length
    ? tasks.map((x, i) => `<li class="${x.d ? "done" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span class="t">${esc(x.t)}</span><button class="del" data-x="${i}">✕</button></li>`).join("")
    : `<li class="empty">Ajoute tes propres objectifs (ex. « résoudre le défi Gralhix n° 12 »).</li>`;
  $$("#taskList input").forEach(c => c.onchange = () => { tasks[c.dataset.i].d = c.checked; save("tasks", tasks); if (c.checked) { bump(2); toast("Défi validé"); } renderTasks(); });
  $$("#taskList .del").forEach(d => d.onclick = () => { tasks.splice(d.dataset.x, 1); save("tasks", tasks); renderTasks(); });
  const done = tasks.filter(x => x.d).length, pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $("taskBar").style.width = pct + "%"; $("taskPct").textContent = tasks.length ? `${done}/${tasks.length} · ${pct} %` : "";
}
$("taskAdd").onclick = () => { const v = $("taskInput").value.trim(); if (!v) return; tasks.push({ t: v, d: false }); save("tasks", tasks); $("taskInput").value = ""; renderTasks(); };
$("taskInput").onkeydown = e => e.key === "Enter" && $("taskAdd").click();

// --- Exercices (quiz)
const mcq = (q, correct, wrong, explain) => { const opts = shuffle([correct, ...wrong.slice(0, 3)]); return { q, opts, a: opts.indexOf(correct), explain }; };
function genDep(scope) {
  const pool = scope === "aura" ? window.DEPTS.filter(d => window.AURA.includes(d[0])) : window.DEPTS;
  return pick(pool, 10).map(d => {
    const o = pick(pool.filter(x => x !== d), 3), t = (Math.random() * 4) | 0, ex = `${d[0]} = ${d[1]}, préfecture : ${d[2]}.`;
    if (t === 0) return mcq(`Quel département porte le numéro ${d[0]} ?`, d[1], o.map(x => x[1]), ex);
    if (t === 1) return mcq(`Quel est le numéro du département « ${d[1]} » ?`, d[0], o.map(x => x[0]), ex);
    if (t === 2) return mcq(`Quelle est la préfecture du département « ${d[1]} » (${d[0]}) ?`, d[2], o.map(x => x[2]), ex);
    return mcq(`${d[2]} est la préfecture de quel département ?`, `${d[1]} (${d[0]})`, o.map(x => `${x[1]} (${x[0]})`), ex);
  });
}
const CARDINAL = d => ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"][Math.round(d / 45) % 8];
function genShadow() {
  if (!window.SunCalc) return null;
  const qs = [], fmt = d => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  for (let guard = 0; qs.length < 10 && guard < 300; guard++) {
    const [city, lat, lng] = window.SHADOW_CITIES[(Math.random() * window.SHADOW_CITIES.length) | 0];
    const y = new Date().getFullYear(), day = new Date(y, 0, 1 + ((Math.random() * 365) | 0), 12);
    const t = SunCalc.getTimes(day, lat, lng);
    const start = t.sunrise.getTime() + 90 * 6e4, end = t.sunset.getTime() - 90 * 6e4;
    if (!(end > start)) continue;
    const when = new Date(start + Math.random() * (end - start));
    when.setMinutes(when.getMinutes() < 30 ? 0 : 30, 0, 0);
    const p = SunCalc.getPosition(when, lat, lng);
    if (p.altitude < .08) continue;
    const az = (p.azimuth * 180 / Math.PI + 180) % 360, sh = (az + 180) % 360, ratio = 1 / Math.tan(p.altitude);
    const cands = [-4.5, -3.5, -2.5, -1.5, 1.5, 2.5, 3.5, 4.5].map(k => new Date(when.getTime() + k * 36e5)).filter(d => d >= t.sunrise && d <= t.sunset);
    if (cands.length < 3) continue;
    qs.push(mcq(`${city}, le ${when.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. L'ombre d'un poteau vertical pointe vers ${sh.toFixed(0)}° (${CARDINAL(sh)}) et mesure environ ${ratio.toFixed(1).replace(".", ",")} fois sa hauteur. Quelle heure est-il ?`,
      fmt(when), pick(cands, 3).map(fmt),
      `Soleil à ${az.toFixed(0)}° d'azimut et ${(p.altitude * 180 / Math.PI).toFixed(0)}° de hauteur. L'ombre part à l'opposé du soleil : vers l'ouest le matin, vers le nord autour du midi solaire (entre 12 h 30 et 14 h 30 en France selon la saison et la longitude), vers l'est le soir. Plus elle est longue, plus le soleil est bas.`));
  }
  return qs;
}
const QUIZZES = [
  { id: "dep", name: "Départements", desc: "Numéros, noms et préfectures. Indispensable pour lire les plaques et les panneaux.", opts: [["fr", "France entière"], ["aura", "Auvergne-Rhône-Alpes"]], gen: o => genDep(o) },
  { id: "france", name: "Indices France & Lyon", desc: "Signalisation, plaques, bornes, architecture et repères lyonnais.", gen: () => pick(window.BANK_FRANCE, 10).map(b => mcq(...b)) },
  { id: "osint", name: "Outils & méthode", desc: "Le bon outil pour la bonne question, et les règles du terrain.", gen: () => pick(window.BANK_OSINT, 10).map(b => mcq(...b)) },
  { id: "shadow", name: "Ombres & heure", desc: "Chronolocalisation : retrouver l'heure à partir de la direction et de la longueur d'une ombre.", gen: genShadow, needs: "SunCalc" }
];
const dailyQuizDef = () => QUIZZES[dayIndex() % QUIZZES.length];
let quiz = null, quizTimer = null;

function renderQuizList() {
  const dq = dailyQuizDef();
  $("quizList").innerHTML = QUIZZES.map(q => {
    const st = quizStats[q.id] || {};
    return `<article class="qcard ${q.id === dq.id ? "daily" : ""}">
      <header><span class="mono">${q.id === dq.id ? "★ QUIZ DU JOUR" : "EXERCICE"}</span><span class="mono">${st.best != null ? `RECORD ${st.best}/10` : "JAMAIS JOUÉ"}</span></header>
      <h3>${q.name}</h3><p>${q.desc}</p>
      <div class="q-best">${Array.from({ length: 10 }, (_, i) => `<i class="${i < (st.best || 0) ? "on" : ""}"></i>`).join("")}</div>
      ${q.opts ? `<select class="sm-sel" data-qopt="${q.id}">${q.opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select>` : ""}
      <div class="q-foot"><span class="mono small muted">${st.plays || 0} partie(s)${st.last != null ? ` · dernière ${st.last}/10` : ""}</span><button class="btn" data-start="${q.id}">Lancer →</button></div>
    </article>`;
  }).join("");
  $$("[data-start]").forEach(b => b.onclick = () => startQuiz(b.dataset.start, document.querySelector(`[data-qopt="${b.dataset.start}"]`)?.value));
}
function startQuiz(id, opt) {
  const def = QUIZZES.find(q => q.id === id); if (!def) return;
  if (def.needs && !window[def.needs]) return toast("Exercice indisponible : le calcul solaire nécessite une connexion");
  const qs = def.gen(opt || def.opts?.[0][0]);
  if (!qs || qs.length < 5) return toast("Impossible de générer l'exercice, réessaie");
  setTrainTab("drills");
  quiz = { def, qs, i: 0, score: 0, answered: false, start: Date.now(), res: [], errors: [], done: false };
  $("quizList").hidden = true; $("quizBox").hidden = false;
  clearInterval(quizTimer);
  quizTimer = setInterval(() => { const t = $("qzTime"); if (t && quiz && !quiz.done) t.textContent = fmtT(Math.round((Date.now() - quiz.start) / 1000)).slice(3); }, 1000);
  renderQ();
  $("quizBox").scrollIntoView({ behavior: "smooth", block: "start" });
}
const startDailyQuiz = () => { go("training"); setTimeout(() => startQuiz(dailyQuizDef().id), current === "training" ? 0 : 500); };
function renderQ() {
  const q = quiz.qs[quiz.i], n = quiz.qs.length;
  quiz.answered = false;
  $("quizBox").innerHTML = `
    <div class="qz-head mono"><span>${quiz.def.name.toUpperCase()}</span><span>QUESTION ${quiz.i + 1}/${n}</span><span>SCORE ${quiz.score}</span><span id="qzTime">${fmtT(Math.round((Date.now() - quiz.start) / 1000)).slice(3)}</span><button class="btn ghost sm" id="qzQuit">Quitter</button></div>
    <div class="qz-bar" style="grid-template-columns:repeat(${n},1fr)">${quiz.qs.map((_, k) => `<i class="${k < quiz.i ? (quiz.res[k] ? "ok" : "ko") : k === quiz.i ? "cur" : ""}"></i>`).join("")}</div>
    <h3 class="qz-q">${esc(q.q)}</h3>
    <div class="qz-opts">${q.opts.map((o, k) => `<button class="qz-opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`).join("")}</div>
    <div class="qz-fb" id="qzFb"></div>`;
  $$(".qz-opt").forEach(b => b.onclick = () => answer(+b.dataset.k));
  $("qzQuit").onclick = quitQuiz;
}
function answer(k) {
  if (!quiz || quiz.answered || quiz.done) return;
  const q = quiz.qs[quiz.i], ok = k === q.a;
  quiz.answered = true; quiz.res[quiz.i] = ok;
  if (ok) quiz.score++; else quiz.errors.push({ q: q.q, a: q.opts[q.a], you: q.opts[k] });
  $$(".qz-opt").forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add("right"); if (j === k && !ok) b.classList.add("wrong"); });
  $$(".qz-bar i")[quiz.i].className = ok ? "ok" : "ko";
  const last = quiz.i === quiz.qs.length - 1;
  $("qzFb").innerHTML = `<p class="${ok ? "" : "ko"}"><b>${ok ? "Exact." : `Raté — la réponse était : ${esc(q.opts[q.a])}.`}</b> ${esc(q.explain || "")}</p>
    <div class="row"><button class="btn" id="qzNext">${last ? "Voir le résultat" : "Question suivante"} <span>→</span></button><span class="mono small muted">ou touche Entrée</span></div>`;
  $("qzNext").onclick = nextQ;
  $("qzNext").focus({ preventScroll: true });
}
function nextQ() { if (!quiz?.answered) return; quiz.i++; quiz.i >= quiz.qs.length ? finishQuiz() : renderQ(); }
function finishQuiz() {
  quiz.done = true; clearInterval(quizTimer);
  const n = quiz.qs.length, sc = Math.round(quiz.score / n * 10), time = Math.round((Date.now() - quiz.start) / 1000), id = quiz.def.id;
  const prev = quizStats[id] || {}, record = prev.best == null || sc > prev.best;
  quizStats[id] = { best: Math.max(prev.best ?? 0, sc), plays: (prev.plays || 0) + 1, last: sc, date: todayKey() };
  save("quizStats", quizStats);
  bump(sc >= 8 ? 4 : 2);
  let dailyMsg = "";
  if (id === dailyQuizDef().id && load("quizDaily", "") !== todayKey()) { save("quizDaily", todayKey()); bump(3); dailyMsg = " Quiz du jour validé."; }
  const msg = sc === 10 ? "Sans faute." : sc >= 8 ? "Très solide." : sc >= 5 ? "Bonne base, encore un effort." : "À retravailler : relis les explications ci-dessous.";
  $("quizBox").innerHTML = `
    <div class="qz-head mono"><span>${quiz.def.name.toUpperCase()} — RÉSULTAT</span><span>${fmtT(time).slice(3)}</span></div>
    <div class="qz-res">
      <div class="qz-score">${sc}<small>/10</small></div>
      <p class="lead" style="margin:10px auto 0">${msg}${record && prev.best != null ? " Nouveau record !" : ""}${dailyMsg}</p>
      <div class="row"><button class="btn" id="qzAgain">Rejouer <span>↻</span></button><button class="btn ghost" id="qzBack">Tous les exercices</button></div>
      ${quiz.errors.length ? `<ul class="qz-err">${quiz.errors.map(e => `<li>${esc(e.q)}<br><s>${esc(e.you)}</s> → <b>${esc(e.a)}</b></li>`).join("")}</ul>` : ""}
    </div>`;
  $("qzAgain").onclick = () => startQuiz(id, quiz.def.opts ? document.querySelector(`[data-qopt="${id}"]`)?.value : undefined);
  $("qzBack").onclick = quitQuiz;
  renderQuizList(); refreshTraining();
}
function quitQuiz() { clearInterval(quizTimer); quiz = null; $("quizBox").hidden = true; $("quizBox").innerHTML = ""; $("quizList").hidden = false; renderQuizList(); }
$("dailyQuizBtn").onclick = () => startQuiz(dailyQuizDef().id);
$("dailyGgBtn").onclick = () => setTrainTab("gg");

// --- GeoGuessr
function ggDaily() {
  const r = seeded(dayIndex() * 7919 + 13);
  const maps = ggMaps.filter(m => m.url);
  const mapPick = maps.length ? maps[(r() * maps.length) | 0] : null;
  return { map: mapPick, mode: GG_MODES[(r() * 3) | 0], c: window.GG_CONSTRAINTS[(r() * window.GG_CONSTRAINTS.length) | 0], target: [12000, 15000, 17500, 20000][(r() * 4) | 0] };
}
function renderGgDaily() {
  const d = ggDaily(), done = load("ggDailyDone", "") === todayKey();
  $("ggDailyDate").textContent = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).toUpperCase();
  $("ggDaily").innerHTML = `<div class="dly ${done ? "done" : ""}">
    <div class="dly-grid"><div><small>CARTE</small><b>${d.map ? esc(d.map.name) : "—"}</b></div><div><small>MODE</small><b>${d.mode}</b></div><div><small>OBJECTIF</small><b>${fmtNum(d.target)}</b></div></div>
    <p class="dly-c">${esc(d.c)}</p>
    <div class="row">${d.map ? `<a class="btn" href="${esc(d.map.url)}" target="_blank" rel="noopener">Jouer <span>↗</span></a>` : `<span class="small muted">Ajoute le lien d'une carte ci-dessous pour activer le défi.</span>`}
      <span class="mono small ${done ? "ok-txt" : "muted"}">${done ? "✓ DÉFI RELEVÉ AUJOURD'HUI" : "Validé en enregistrant une session sur cette carte, dans ce mode, au-dessus de l'objectif."}</span></div></div>`;
}
function renderGgMaps() {
  $("ggLinks").innerHTML = ggMaps.map((m, i) => `<div class="gg-link">${m.url
      ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>`
      : `<button class="cfg" data-edit="${i}">${esc(m.name)} — ajouter le lien ✎</button>`}
    <button class="del" data-edit="${i}" title="Modifier">✎</button><button class="del" data-rm="${i}" title="Supprimer">✕</button></div>`).join("")
    || `<p class="empty">Aucune carte. Ajoute tes cartes GeoGuessr avec « + Carte ».</p>`;
  const cur = $("ggMap").value;
  $("ggMap").innerHTML = ggMaps.map(m => `<option>${esc(m.name)}</option>`).join("") + "<option>Autre</option>";
  if (cur) $("ggMap").value = cur;
  const names = [...new Set([...ggMaps.map(m => m.name), ...sessions.map(s => s.map).filter(Boolean)])];
  const fcur = $("ggFMap").value;
  $("ggFMap").innerHTML = `<option value="">Toutes cartes</option>` + names.map(n => `<option>${esc(n)}</option>`).join("");
  $("ggFMap").value = names.includes(fcur) ? fcur : "";
  $$("#ggLinks [data-edit]").forEach(b => b.onclick = () => {
    const m = ggMaps[b.dataset.edit];
    const name = prompt("Nom de la carte :", m.name); if (name === null) return;
    const url = prompt("Lien de la carte (copie l'adresse de la page de la carte sur GeoGuessr) :", m.url || "https://www.geoguessr.com/maps/"); if (url === null) return;
    ggMaps[b.dataset.edit] = { name: name.trim() || m.name, url: /^https?:\/\/\S+\/maps\/\S+/.test(url.trim()) ? url.trim() : "" };
    if (url.trim() && !ggMaps[b.dataset.edit].url) toast("Lien non reconnu : il doit ressembler à https://www.geoguessr.com/maps/…");
    save("ggMaps", ggMaps); renderGgMaps(); renderGgDaily(); refreshTraining();
  });
  $$("#ggLinks [data-rm]").forEach(b => b.onclick = () => { if (confirm("Supprimer cette carte ?")) { ggMaps.splice(b.dataset.rm, 1); save("ggMaps", ggMaps); renderGgMaps(); renderGgDaily(); } });
}
$("ggAddMap").onclick = () => {
  const name = prompt("Nom de la carte :"); if (!name) return;
  const url = prompt("Lien de la carte :", "https://www.geoguessr.com/maps/"); if (url === null) return;
  ggMaps.push({ name: name.trim(), url: /^https?:\/\/\S+\/maps\/\S+/.test(url.trim()) ? url.trim() : "" });
  save("ggMaps", ggMaps); renderGgMaps(); renderGgDaily();
};
const ggFiltered = () => { const fm = $("ggFMap").value, fo = $("ggFMode").value; return sessions.filter(s => (!fm || s.map === fm) && (!fo || (s.mode || "Move") === fo)); };
function renderSessions() {
  const fs = ggFiltered(), sc = fs.map(s => +s.score);
  const l5 = sc.slice(0, 5), p5 = sc.slice(5, 10);
  let trend = "—", cls = "";
  if (l5.length >= 3 && p5.length >= 3) { const d = Math.round(mean(l5) - mean(p5)); trend = (d >= 0 ? "+" : "") + fmtNum(d); cls = d >= 0 ? "up" : "down"; }
  const kpi = (l, v, c = "") => `<div class="kpi"><small>${l}</small><b class="${c}">${v}</b></div>`;
  $("ggKpis").innerHTML = kpi("PARTIES", fs.length) + kpi("MOYENNE", sc.length ? fmtNum(mean(sc)) : "—") + kpi("RECORD", sc.length ? fmtNum(Math.max(...sc)) : "—") + kpi("TENDANCE", trend, cls);
  $("ggCount").textContent = `${fs.length} SESSION${fs.length > 1 ? "S" : ""}`;
  $("ggList").innerHTML = fs.length ? fs.slice(0, 15).map(s => `<li>
      <div class="sess-top"><span class="t mono small">${esc(s.date)} — ${esc(s.map)}</span><span class="mode-tag">${esc(s.mode || "Move")}</span>${s.time ? `<span class="mono small muted">${s.time} min</span>` : ""}<b class="mono">${fmtNum(+s.score)}</b><button class="del" data-si="${sessions.indexOf(s)}">✕</button></div>
      ${s.note ? `<p class="sess-note">${esc(s.note)}</p>` : ""}</li>`).join("")
    : `<li class="empty">Aucune session${$("ggFMap").value || $("ggFMode").value ? " pour ce filtre" : ""}.</li>`;
  $$("#ggList [data-si]").forEach(d => d.onclick = () => { if (confirm("Supprimer cette session ?")) { sessions.splice(+d.dataset.si, 1); save("sessions", sessions); renderSessions(); refreshTraining(); } });
  drawChart();
}
function drawChart() {
  const c = $("ggChart"), dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  if (!W) return;
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
  const ink = cssVar("--ink"), muted = cssVar("--muted");
  const pts = ggFiltered().slice(0, 20).reverse().map(s => +s.score);
  ctx.font = "11px JetBrains Mono, monospace";
  if (pts.length < 2) { ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.fillText("LA COURBE APPARAÎT À PARTIR DE 2 SESSIONS", W / 2, H / 2); $("ggAvg").textContent = ""; return; }
  let max = Math.max(...pts), min = Math.min(...pts);
  if (ggGoal) { max = Math.max(max, ggGoal); min = Math.min(min, ggGoal); }
  const p = 16, X = i => p + i * (W - p * 2) / (pts.length - 1), Y = v => H - p - (v - min) / ((max - min) || 1) * (H - p * 2);
  ctx.strokeStyle = muted; ctx.globalAlpha = .3; ctx.setLineDash([2, 4]);
  for (let k = 0; k <= 4; k++) { const y = p + k * (H - p * 2) / 4; ctx.beginPath(); ctx.moveTo(p, y); ctx.lineTo(W - p, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (ggGoal) {
    ctx.setLineDash([8, 5]); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p, Y(ggGoal)); ctx.lineTo(W - p, Y(ggGoal)); ctx.stroke();
    ctx.fillStyle = ACCENT; ctx.textAlign = "right"; ctx.fillText(`OBJECTIF ${fmtNum(ggGoal)}`, W - p, Y(ggGoal) - 6);
  }
  ctx.setLineDash([]);
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.lineTo(X(pts.length - 1), H - p); ctx.lineTo(X(0), H - p); ctx.fillStyle = ACCENT + "26"; ctx.fill();
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
  const best = Math.max(...pts);
  pts.forEach((v, i) => { ctx.fillStyle = v === best ? ACCENT : ink; ctx.fillRect(X(i) - 3.5, Y(v) - 3.5, 7, 7); });
  $("ggAvg").textContent = `MOYENNE ${fmtNum(mean(pts))} · MEILLEUR ${fmtNum(best)} · ${pts.length} DERNIÈRES SESSIONS`;
}
$("ggAdd").onclick = () => {
  const v = $("ggScore").value;
  if (v === "") return toast("Saisis un score");
  const score = +v; if (score < 0 || score > 25000) return toast("Le score doit être entre 0 et 25 000");
  const s = { date: new Date().toLocaleDateString("fr-FR"), ts: new Date().toISOString(), map: $("ggMap").value, mode: $("ggMode").value, score,
    time: $("ggTime").value ? +$("ggTime").value : null, note: $("ggNote").value.trim() };
  const prevBest = Math.max(0, ...sessions.filter(x => x.map === s.map && (x.mode || "Move") === s.mode).map(x => +x.score));
  sessions.unshift(s); save("sessions", sessions); bump(2);
  const d = ggDaily();
  if (load("ggDailyDone", "") !== todayKey() && d.map && s.map === d.map.name && s.mode === d.mode && score >= d.target) { save("ggDailyDone", todayKey()); bump(5); toast("Défi du jour relevé !"); }
  else if (prevBest && score > prevBest) toast("Nouveau record sur cette carte et ce mode !");
  else toast("Session enregistrée");
  ["ggScore", "ggTime", "ggNote"].forEach(id => $(id).value = "");
  renderGgMaps(); renderSessions(); renderGgDaily(); refreshTraining();
};
$("ggScore").onkeydown = e => e.key === "Enter" && $("ggAdd").click();

// --- Partie intégrée (Street View dans le hub)
const play = (() => {
  let st = null, gmap = null, guessMk = null, layer = null;
  const SCALE = { fr: 1250, aura: 400 }; // distance (km) qui fait chuter le score
  const pts = (d, z) => Math.round(5000 * Math.exp(-10 * d / SCALE[z]));
  function ensureMap() {
    if (!window.L) { $("pgResult").textContent = "Carte indisponible (connexion ?)."; return false; }
    if (!gmap) {
      gmap = L.map("pgMap", { zoomControl: true, attributionControl: false });
      L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png", { maxZoom: 18, attribution: "© IGN" }).addTo(gmap);
      layer = L.layerGroup().addTo(gmap);
      gmap.on("click", e => {
        if (!st || st.answered) return;
        if (guessMk) guessMk.setLatLng(e.latlng); else guessMk = L.marker(e.latlng, { icon: pinIcon() }).addTo(layer);
        st.guess = [e.latlng.lat, e.latlng.lng]; $("pgGuess").disabled = false;
      });
    }
    setTimeout(() => gmap.invalidateSize(), 60);
    return true;
  }
  function view() { st.zone === "aura" ? gmap.setView([45.6, 4.9], 7) : gmap.setView([46.6, 2.4], 5); }
  function start() {
    const zone = $("playZone").value, pool = zone === "aura" ? window.PLAY_AURA : window.PLAY_FR;
    st = { zone, mode: $("playMode").value, list: pick(pool, 5), i: 0, total: 0, res: [] };
    $("playSetup").hidden = true; $("playGame").hidden = false;
    if (!ensureMap()) return;
    round();
  }
  function round() {
    const [, lat, lng] = st.list[st.i];
    st.answered = false; st.guess = null;
    layer.clearLayers(); guessMk = null; view();
    $("pgFrame").src = svEmbed(lat, lng);
    $("pgStill").hidden = st.mode !== "still";
    $("pgRound").textContent = `MANCHE ${st.i + 1}/${st.list.length}`;
    $("pgScore").textContent = `${fmtNum(st.total)} PTS`;
    $("pgResult").textContent = "Clique sur la carte pour placer ta réponse.";
    $("pgGuess").disabled = true; $("pgGuess").textContent = "Valider ma réponse";
  }
  function guess() {
    if (!st) return;
    if (st.answered) return next();
    if (!st.guess) return;
    const [name, lat, lng] = st.list[st.i], d = gcDist(st.guess, [lat, lng]), p = pts(d, st.zone);
    st.answered = true; st.total += p; st.res.push({ name, d, p });
    L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="pg-true"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(layer);
    L.polyline([st.guess, [lat, lng]], { color: ACCENT, weight: 2.5, dashArray: "6 5" }).addTo(layer);
    gmap.fitBounds([st.guess, [lat, lng]], { padding: [30, 30], maxZoom: 12 });
    $("pgResult").innerHTML = `<b>${esc(name)}</b><br>Écart : ${d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1).replace(".", ",") + " km"} · <b class="pg-pts">+${fmtNum(p)} pts</b>`;
    $("pgScore").textContent = `${fmtNum(st.total)} PTS`;
    $("pgGuess").textContent = st.i + 1 < st.list.length ? "Manche suivante →" : "Voir le résultat →";
    bump(1);
  }
  function next() {
    st.i++;
    if (st.i < st.list.length) return round();
    const z = st.zone === "aura" ? "Partie intégrée — Lyon / AURA" : "Partie intégrée — France";
    $("pgFrame").src = "about:blank";
    $("playGame").hidden = true; $("playSetup").hidden = false;
    $("playSetup").insertAdjacentHTML("afterbegin", `<div class="play-end" id="playEnd"><div class="qz-score">${fmtNum(st.total)}<small>/25 000</small></div>
      <ul class="qz-err">${st.res.map(r => `<li>${esc(r.name)} — ${r.d.toFixed(1).replace(".", ",")} km · <b>${fmtNum(r.p)} pts</b></li>`).join("")}</ul>
      <div class="row"><button class="btn" id="playSave">Enregistrer dans mes sessions</button><button class="btn ghost" id="playClose">Fermer</button></div></div>`);
    const total = st.total, mode = st.mode === "still" ? "No Move" : "Move";
    $("playSave").onclick = () => {
      sessions.unshift({ date: new Date().toLocaleDateString("fr-FR"), ts: new Date().toISOString(), map: z, mode, score: total, time: null, note: "Partie intégrée au hub" });
      save("sessions", sessions); bump(2); $("playEnd").remove(); renderGgMaps(); renderSessions(); refreshTraining(); toast("Partie enregistrée");
    };
    $("playClose").onclick = () => $("playEnd").remove();
    st = null;
  }
  function quit() { st = null; $("pgFrame").src = "about:blank"; $("playGame").hidden = true; $("playSetup").hidden = false; }
  $("playStart").onclick = () => { $("playEnd")?.remove(); start(); };
  $("pgGuess").onclick = guess;
  $("pgSkip").onclick = () => {
    if (!st) return;
    const pool = (st.zone === "aura" ? window.PLAY_AURA : window.PLAY_FR).filter(x => !st.list.includes(x));
    st.list[st.i] = pool[(Math.random() * pool.length) | 0]; round(); toast("Nouveau lieu");
  };
  $("pgQuit").onclick = quit;
  $("ggTryEmbed").onclick = () => {
    const m = ggMaps.find(x => x.url) || { name: "GeoGuessr", url: "https://www.geoguessr.com/maps/france" };
    viewer.open(`Test · ${m.name}`, m.url, m.url, "Test : si Edge affiche « refusé de se connecter » ou une page vide, c'est GeoGuessr qui bloque l'affichage dans un autre site.");
  };
  return { quit };
})();

$("ggFMap").onchange = $("ggFMode").onchange = renderSessions;
$("ggGoal").onchange = e => { ggGoal = Math.max(0, +e.target.value || 0); save("ggGoal", ggGoal); drawChart(); };
addEventListener("resize", () => current === "training" && drawChart());

// --- Mémo d'indices
let memo = load("memo", null);
if (!Array.isArray(memo)) memo = window.MEMO_BUILTIN.map(m => ({ ...m, id: uid(), builtin: true, date: new Date().toISOString() }));
let memoFilter = "";
$("memoCat").innerHTML = window.MEMO_CATS.map(c => `<option>${c}</option>`).join("");
function memoVisible() { const q = norm($("memoQ").value); return memo.filter(m => (!memoFilter || m.cat === memoFilter) && (!q || norm(`${m.cat} ${m.zone} ${m.text}`).includes(q))); }
function renderMemo() {
  const counts = c => memo.filter(m => !c || m.cat === c).length;
  $("memoChips").innerHTML = ["", ...window.MEMO_CATS].filter(c => !c || counts(c)).map(c => `<button class="chip ${c === memoFilter ? "on" : ""}" data-cat="${esc(c)}">${c || "Tout"}<small>${counts(c)}</small></button>`).join("");
  $$("#memoChips .chip").forEach(b => b.onclick = () => { memoFilter = b.dataset.cat; renderMemo(); });
  const list = memoVisible();
  $("memoGrid").innerHTML = list.length ? list.map(m => `<article class="memo-card">
      <div class="mm-head"><span class="mm-cat">${esc(m.cat)}</span><button class="del" data-mdel="${m.id}" title="Supprimer">✕</button></div>
      <span class="mm-zone">${esc(m.zone || "—")}</span><p>${esc(m.text)}</p>
      <div class="mm-foot"><span>${m.builtin ? "INDICE DE BASE" : new Date(m.date).toLocaleDateString("fr-FR")}</span>${m.src ? `<a href="${esc(m.src)}" target="_blank" rel="noopener">source ↗</a>` : ""}</div></article>`).join("")
    : `<p class="empty">Aucun indice ne correspond.</p>`;
  $$("[data-mdel]").forEach(b => b.onclick = () => { if (confirm("Supprimer cet indice ?")) { memo = memo.filter(m => m.id !== b.dataset.mdel); save("memo", memo); renderMemo(); refreshTraining(); } });
}
$("memoQ").oninput = renderMemo;
$("memoAdd").onclick = () => {
  const text = $("memoText").value.trim(); if (!text) return toast("Décris l'indice");
  const src = $("memoSrc").value.trim();
  memo.unshift({ id: uid(), cat: $("memoCat").value, zone: $("memoZone").value.trim(), text, src: /^https?:\/\//.test(src) ? src : "", date: new Date().toISOString() });
  save("memo", memo); bump(1);
  ["memoZone", "memoText", "memoSrc"].forEach(id => $(id).value = "");
  renderMemo(); refreshTraining(); toast("Indice ajouté au mémo");
};
$("memoReview").onclick = () => {
  const list = memoVisible().filter(m => m.zone);
  if (!list.length) return toast("Aucun indice avec une zone à réviser");
  const m = list[(Math.random() * list.length) | 0];
  $("memoReviewBox").innerHTML = `<div class="flash-card"><span class="mm-cat">${esc(m.cat)}</span><p style="margin-top:10px">${esc(m.text)}</p>
    <div id="flashAns"><button class="btn sm" id="flashFlip">Retourner : quelle zone ?</button></div></div>`;
  $("flashFlip").onclick = () => { $("flashAns").innerHTML = `<p class="flash-ans">${esc(m.zone)}</p><button class="btn ghost sm" id="flashNext">Carte suivante ↻</button>`; $("flashNext").onclick = () => $("memoReview").click(); };
};
onEnter.training = () => { refreshTraining(); renderGgDaily(); if (!quiz) renderQuizList(); if ($("trainTabs").querySelector(".on")?.dataset.ttab === "gg") setTimeout(drawChart, 40); };

/* ---------- 12. ENQUÊTES ---------- */
let cases = load("cases", null);
if (!Array.isArray(cases) || !cases.length) {
  cases = [{ id: Date.now(), name: "Exercice 1", entries: [], links: [] }];
  const old = load("report", []); // reprise des rapports de la toute première version
  if (Array.isArray(old) && old.length) cases[0].entries = old.map(e => ({ date: new Date().toISOString(), conf: 3, ...e }));
}
cases.forEach(c => { c.id = String(c.id); c.links = Array.isArray(c.links) ? c.links : []; c.entries = Array.isArray(c.entries) ? c.entries : []; c.entries.forEach(e => { e.id = e.id || uid(); }); });
let activeCase = String(load("activeCase", cases[0].id));
let caseMode = load("caseMode", "board");
let editingId = null; // fiche en cours de modification
// Les identifiants sont comparés en texte : évite les dossiers « introuvables » après une mise à jour
const currentCase = () => cases.find(c => c.id === String(activeCase)) || cases[0];
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);

function saveCases() {
  activeCase = currentCase().id;
  save("cases", cases); save("activeCase", activeCase);
  renderCaseSelect(); renderTimeline(); renderBoard();
  try { refreshCaseMarkers(); refreshTraining(); } catch (err) { console.warn(err); }
}
function addEntry(e) {
  currentCase().entries.push({ id: uid(), date: new Date().toISOString(), conf: 3, clue: "", hyp: "", proof: "", gps: "", ...e });
  bump(2); saveCases(); toast(`Fiche ajoutée à « ${currentCase().name} »`);
}
function renderCaseSelect() {
  const cur = currentCase();
  const html = cases.map(c => `<option value="${c.id}" ${c.id === cur.id ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  $$(".caseSelect").forEach(s => s.innerHTML = html);
  $("caseChips").innerHTML = cases.map(c => `<button class="case-chip ${c.id === cur.id ? "on" : ""}" data-cid="${c.id}">${esc(c.name)}<small>${c.entries.length}</small></button>`).join("")
    ;
  $$("[data-cid]").forEach(b => b.onclick = () => switchCase(b.dataset.cid));
  const n = cur.entries.length;
  $("caseMeta").textContent = `${cases.length} DOSSIER${cases.length > 1 ? "S" : ""} · ${n} FICHE${n > 1 ? "S" : ""}`;
  $("caseTitle").textContent = cur.name;
}
function switchCase(id) { cancelEdit(); activeCase = String(id); saveCases(); toast(`Dossier actif : ${currentCase().name}`); }
function createCase(name) {
  let n = (name ?? $("newCase").value).trim();
  if (!n) { $("newCase").focus(); return toast("Écris d'abord le nom du dossier dans le champ"); }
  if (cases.some(c => c.name.toLowerCase() === n.toLowerCase())) return toast("Un dossier porte déjà ce nom");
  const c = { id: "c" + Date.now().toString(36), name: n, entries: [], links: [] };
  cases.push(c); activeCase = c.id; $("newCase").value = ""; cancelEdit(); saveCases();
  toast(`Dossier « ${n} » créé et activé`);
}
$$(".caseSelect").forEach(s => s.onchange = e => switchCase(e.target.value));
$("addCase").onclick = () => createCase();
$("newCase").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); createCase(); } };
$("renameCase").onclick = () => { const n = prompt("Nouveau nom :", currentCase().name); if (n?.trim()) { currentCase().name = n.trim(); saveCases(); } };
$("delCase").onclick = () => {
  if (cases.length === 1) return toast("Il faut garder au moins un dossier");
  if (!confirm(`Supprimer « ${currentCase().name} » et ses ${currentCase().entries.length} fiches ?`)) return;
  cancelEdit(); cases = cases.filter(c => c.id !== currentCase().id); activeCase = cases[0].id; saveCases();
};
$("rConf").oninput = e => $("rConfLbl").textContent = stars(+e.target.value);
const formIds = ["rClue", "rHyp", "rProof", "rGps"];
function readForm() { return { clue: $("rClue").value.trim(), hyp: $("rHyp").value.trim(), proof: $("rProof").value.trim(), gps: $("rGps").value.trim(), conf: +$("rConf").value }; }
function clearForm() { formIds.forEach(i => $(i).value = ""); $("rConf").value = 3; $("rConfLbl").textContent = stars(3); }
$("rAdd").onclick = () => {
  const e = readForm();
  if (!e.clue && !e.hyp && !e.proof && !e.gps) return toast("Remplis au moins un champ");
  if (e.gps && !parseLatLng(e.gps)) return toast("Coordonnées non reconnues (ex : 45.7640, 4.8357)");
  if (editingId) {
    const it = currentCase().entries.find(x => x.id === editingId);
    if (it) { Object.assign(it, e, { edited: new Date().toISOString() }); toast("Fiche modifiée"); }
    cancelEdit(); saveCases(); return;
  }
  addEntry(e); clearForm();
};
function editEntry(id) {
  const c = currentCase(), i = c.entries.findIndex(x => x.id === id); if (i < 0) return;
  const e = c.entries[i];
  editingId = id;
  $("rClue").value = e.clue || ""; $("rHyp").value = e.hyp || ""; $("rProof").value = e.proof || ""; $("rGps").value = e.gps || "";
  $("rConf").value = e.conf || 3; $("rConfLbl").textContent = stars(e.conf || 3);
  $("formTitle").textContent = `Modifier la fiche ${pad(i + 1)}`;
  $("rAdd").textContent = "Enregistrer les modifications";
  $("rCancel").hidden = false; $("formCard").classList.add("editing");
  $$(".pin-card").forEach(p => p.classList.toggle("editing", p.dataset.id === id));
  $("formCard").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("rClue").focus({ preventScroll: true }), 300);
}
function cancelEdit() {
  if (!editingId) return;
  editingId = null; clearForm();
  $("formTitle").textContent = "Nouvelle fiche"; $("rAdd").textContent = "Ajouter la fiche";
  $("rCancel").hidden = true; $("formCard").classList.remove("editing");
  $$(".pin-card.editing").forEach(p => p.classList.remove("editing"));
}
$("rCancel").onclick = cancelEdit;
function deleteEntry(id) {
  const c = currentCase();
  if (!confirm("Supprimer cette fiche ?")) return;
  if (editingId === id) cancelEdit();
  c.entries = c.entries.filter(e => e.id !== id);
  c.links = c.links.filter(([a, b]) => a !== id && b !== id);
  saveCases();
}
function renderTimeline() {
  const list = currentCase().entries, nl = currentCase().links.length;
  $("rCount").textContent = `${list.length} FICHE${list.length > 1 ? "S" : ""} · ${nl} FIL${nl > 1 ? "S" : ""}`;
  $("rList").innerHTML = list.length ? list.map((e, i) => `
    <li><div class="meta"><span>FICHE ${pad(i + 1)}</span><span>${new Date(e.date).toLocaleString("fr-FR")}</span><span class="conf">${stars(e.conf || 3)}</span>${e.edited ? '<span>MODIFIÉE</span>' : ""}<button class="edit-b" data-eid="${e.id}" title="Modifier">✎ Modifier</button><button class="del" data-id="${e.id}" title="Supprimer">✕</button></div>
      ${e.clue ? `<div><b>Indice</b>${esc(e.clue)}</div>` : ""}${e.hyp ? `<div><b>Hypothèse</b>${esc(e.hyp)}</div>` : ""}
      ${e.proof ? `<div><b>Preuve</b>${esc(e.proof)}</div>` : ""}${e.gps ? `<div><b>GPS</b><a href="#" data-gps="${esc(e.gps)}">${esc(e.gps)} → carte</a></div>` : ""}
    </li>`).join("") : `<li class="empty" style="border:0">Aucune fiche. Ajoute un indice, ou envoie-en depuis la Carte ou la Photo.</li>`;
  $$("#rList .del").forEach(d => d.onclick = () => deleteEntry(d.dataset.id));
  $$("#rList [data-eid]").forEach(d => d.onclick = () => editEntry(d.dataset.eid));
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
    el.innerHTML = `<div class="pc-head"><span>FICHE ${pad(i + 1)} · <span class="conf">${stars(e.conf || 3)}</span></span><span class="pc-btns"><button class="edit-b" data-edit-card title="Modifier">✎</button><button class="del" data-del title="Supprimer">✕</button></span></div>
      ${e.clue ? `<div class="pc-row"><i>IND</i>${esc(trunc(e.clue, 120))}</div>` : ""}
      ${e.hyp ? `<div class="pc-row"><i>HYP</i>${esc(trunc(e.hyp, 100))}</div>` : ""}
      ${e.proof ? `<div class="pc-row"><i>PRV</i>${esc(trunc(e.proof, 80))}</div>` : ""}
      ${e.gps ? `<span class="pc-gps" data-gpsgo title="Voir sur la carte">GPS ${esc(e.gps)} →</span>` : ""}`;
    if (linkFrom === e.id) el.classList.add("sel");
    if (editingId === e.id) el.classList.add("editing");
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
    if (ev.target.closest("[data-edit-card]")) return editEntry(e.id);
    if (ev.target.closest("[data-gpsgo]") && !linking) { const p = parseLatLng(e.gps); if (p) openOnMap(...p, 16); return; }
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
  el.ondblclick = () => { if (!linking) editEntry(e.id); };
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
  $("boardHint").textContent = linking ? "MODE LIAISON — clique une fiche, puis une autre. Reclique le bouton (ou Échap) pour terminer." : defaultHint;
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

$("exportMd").onclick = () => {
  const c = currentCase(), cell = s => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const num = Object.fromEntries(c.entries.map((e, i) => [e.id, i + 1]));
  let md = `# ${c.name}\n\n_Exporté le ${new Date().toLocaleString("fr-FR")} · ${c.entries.length} fiches_\n\n| # | Date | Indice | Hypothèse | Preuve | GPS | Confiance |\n|---|---|---|---|---|---|---|\n`;
  c.entries.forEach((e, i) => md += `| ${i + 1} | ${new Date(e.date).toLocaleString("fr-FR")} | ${cell(e.clue)} | ${cell(e.hyp)} | ${cell(e.proof)} | ${cell(e.gps)} | ${e.conf || 3}/5 |\n`);
  if (c.links.length) md += `\n## Liens entre fiches\n\n${c.links.map(([a, b]) => `- Fiche ${num[a]} ↔ Fiche ${num[b]}`).join("\n")}\n`;
  download(`${c.name.replace(/[^\w-]+/g, "_")}.export.md`, md, "text/markdown");
  if (!flags.exported) { flags.exported = true; save("flags", flags); refreshTraining(); }
};
const BACKUP_KEYS = ["cases", "activeCase", "tasks", "sessions", "ggMaps", "ggGoal", "totalSecs", "activity", "searchHistory", "settings",
  "progress", "quizStats", "memo", "flags", "badges", "quizDaily", "ggDailyDone", "trainTab", "caseMode", "globePoints", "profileEnds"];
function exportAll() {
  save("totalSecs", totalSecs);
  const data = { app: "osint-hub", version: VERSION };
  BACKUP_KEYS.forEach(k => { const v = load(k, undefined); if (v !== undefined) data[k] = v; });
  download(`osint-hub-sauvegarde-${todayKey()}.json`, JSON.stringify(data, null, 2), "application/json");
  toast("Sauvegarde téléchargée");
}
$("exportJson").onclick = exportAll;
$("importJson").onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(d.cases)) throw 0;
    if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
    BACKUP_KEYS.forEach(k => d[k] !== undefined && save(k, d[k]));
    location.reload();
  } catch { toast("Fichier de sauvegarde invalide"); }
  e.target.value = "";
};
onEnter.cases = () => renderBoard();

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
  "Monte le contraste ou inverse l'image : un panneau illisible peut redevenir lisible.",
  "Après chaque partie GeoGuessr, note dans le mémo l'indice qui t'a manqué."
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
  const st = computeTraining();
  countUp($("sTime"), Math.floor(totalSecs / 60), v => fmtMins(v * 60));
  countUp($("sStreak"), streak());
  countUp($("sXp"), st.xp);
  $("sRank").textContent = `XP · rang ${st.rank.name}`;
  countUp($("sSessions"), sessions.length);
  countUp($("sEntries"), cases.reduce((n, c) => n + c.entries.length, 0));
  const next = st.items.filter(it => !st.done(it.id)).slice(0, 4);
  $("dashTasks").innerHTML = next.map(it => `<li><span class="lv-tag">NIV. ${it.lvl}</span><span class="t">${esc(it.t)}</span><span class="xp mono">+${it.xp}</span></li>`).join("") || `<li class="empty">Programme terminé. Bravo.</li>`;
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
$("setCustom").onclick = () => openMenu(true);
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
  ["Ouvrir le menu", "", () => openMenu(false)],
  ["Personnaliser le menu et la couleur", "", () => openMenu(true)],
  ["Démarrer / mettre en pause le chrono", "", toggleTimer],
  ["Changer de thème (papier / nuit)", "", () => $("themeBtn").click()],
  ["Activer / couper les effets animés", "", () => setSetting("fx", !settings.fx)],
  ["Quiz du jour", "entraînement", () => startDailyQuiz()],
  ...QUIZZES.map(q => [`Exercice : ${q.name}`, "entraînement", () => { go("training"); setTimeout(() => startQuiz(q.id), current === "training" ? 0 : 500); }]),
  ["Défi GeoGuessr du jour", "entraînement", () => { go("training"); setTrainTab("gg"); }],
  ["Enregistrer une session GeoGuessr", "entraînement", () => { go("training"); setTrainTab("gg"); setTimeout(() => $("ggScore").focus(), 700); }],
  ["Ajouter un indice au mémo", "entraînement", () => { go("training"); setTrainTab("memo"); setTimeout(() => $("memoText").focus(), 700); }],
  ["Nouveau dossier d'enquête", "", () => { go("cases"); setTimeout(() => $("newCase").focus(), 700); }],
  ["Sauvegarder toutes les données (.json)", "", exportAll],
  ["Exporter le rapport du dossier (.md)", "", () => $("exportMd").click()],
  ["Carte : soleil à l'heure actuelle", "carte", () => { go("map"); setTimeout(setSunNow, 700); }],
  ["Carte : mesurer une distance", "carte", () => { go("map"); setTimeout(() => !measuring && $("measureBtn").click(), 700); }],
  ...pointTools.map((t, i) => [`Ouvrir ${t[0]} sur le point sélectionné`, "carte", () => point ? openPointTool(i, ...point) : toast("Aucun point sélectionné sur la carte")])
];
let sel = 0, filtered = commands;
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
  if (e.ctrlKey || e.altKey || e.metaKey || $("palette").classList.contains("open")) return;
  // Quiz en cours : 1-4 pour répondre, Entrée pour continuer
  if (quiz && !quiz.done && current === "training" && !$("quizBox").hidden && !$("menu").classList.contains("open")) {
    if (/^[0-9]$/.test(e.key) && !isTyping()) { e.preventDefault(); if (/^[1-4]$/.test(e.key) && !quiz.answered) answer(+e.key - 1); return; }
    if (e.key === "Enter" && quiz.answered) { e.preventDefault(); nextQ(); return; }
  }
  if (isTyping()) return;
  if (/^[0-6]$/.test(e.key)) go(KEYS[+e.key]);
  else if (e.key === "Enter" && current === "home") go("dashboard");
});

/* ---------- 17. DÉMARRAGE ---------- */
applySettings();
renderCaseSelect(); renderTimeline(); renderHistory(); renderTools();
renderGgMaps(); renderSessions(); renderGgDaily(); renderTasks(); renderMemo(); renderQuizList();
$("ggGoal").value = ggGoal;
setCaseMode(caseMode);
setTrainTab(load("trainTab", "program"));
refreshTraining();
$("rConfLbl").textContent = stars(3);
setSunNow();
loadLegal();
route();
renderGPoints(); renderSel(); profile.fillSelects();
topo.start(); globe.start();
if (load("terms", null) !== TERMS_VERSION) showGate();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
