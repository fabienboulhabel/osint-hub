/* OSINT Hub — 01-config.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 1. CONFIGURATION & UTILITAIRES ---------- */
const VERSION = "6.6.0";
const TERMS_VERSION = "6.2.0";                 // ← augmente-le si tu modifies les conditions : 
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

// Ton réglage prime ; le réglage Windows « Effets d'animation » ne sert que de valeur par défaut au premier lancement
const fxOn = () => settings.fx;
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
