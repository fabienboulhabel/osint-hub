/* OSINT Hub — 12-tableau-de-bord.js · voir js/README.md pour l'ordre de chargement */
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
