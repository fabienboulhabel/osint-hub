/* OSINT Hub — 14-palette.js · voir js/README.md pour l'ordre de chargement */
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
  ["Lancer la visite guidée", "", () => tour.start()],
  ["Exercice photo (Wikimedia Commons)", "entraînement", () => { go("training"); setTimeout(() => { setTrainTab("drills"); $("peStart").click(); }, current === "training" ? 0 : 600); }],
  ["Réviser le mémo (répétition espacée)", "entraînement", () => { go("training"); setTimeout(() => { setTrainTab("memo"); $("memoReview").click(); }, current === "training" ? 0 : 600); }],
  ["Rapport PDF du dossier actif", "enquêtes", () => $("exportPdf").click()],
  ["Rechercher dans toutes les fiches", "enquêtes", () => { go("cases"); setTimeout(() => $("caseSearch").focus(), 700); }],
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
  if (typeof tour !== "undefined" && tour.active()) return;
  if (document.querySelector(".lightbox")) return;
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
