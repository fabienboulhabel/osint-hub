/* OSINT Hub — 15-visite.js · voir js/README.md pour l'ordre de chargement */
/* OSINT Hub — visite.js
   Visite guidée au premier lancement, barre de navigation mobile, petits réglages d'accessibilité. */

/* ---------- Visite guidée ---------- */
const TOUR = [
  { sel: "#mainNav", alt: "#menuBtn", t: "Les six modules", d: "Tableau de bord, Recherche, Carte, Photo, Entraînement et Enquêtes. Les touches 0 à 6 y mènent directement, et le bouton « retour » de la souris fonctionne." },
  { sel: "#menuBtn", t: "Le menu", d: "Toutes les pages avec leurs infos en direct, des actions rapides et le résumé du jour. « Personnaliser » permet de changer l'ordre des modules et la couleur." },
  { sel: ".timer", t: "Le chronomètre", d: "Lance-le au début de chaque séance : ton temps d'entraînement est cumulé dans le tableau de bord." },
  { sel: ".case-tool", alt: "#menuBtn", t: "Le dossier actif", d: "Les points de la carte, les photos et les observations sont envoyés dans ce dossier d'enquête. Tu en crées autant que d'exercices." },
  { sel: "#kBtn", alt: "#menuBtn", t: "La palette de commandes", d: "Ctrl + K ouvre une recherche de toutes les actions : lancer un quiz, mesurer une distance, sauvegarder…" },
  { sel: ".globe-box", t: "La planète", d: "Clique un point pour le sélectionner, molette pour zoomer, double-clic pour ouvrir la carte. Les points enregistrés servent aussi pour la coupe topographique." },
  { sel: ".hero-cta", t: "C'est parti", d: "Commence par l'onglet Entraînement › Programme : il te guide étape par étape. Pense à activer la sauvegarde automatique dans À propos › Paramètres." }
];
const tour = (() => {
  let i = 0, box = null;
  const visible = el => el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
  function target(s) { const a = document.querySelector(s.sel); return visible(a) ? a : (s.alt && visible(document.querySelector(s.alt)) ? document.querySelector(s.alt) : null); }
  function place() {
    if (!box) return;
    const s = TOUR[i], el = target(s), spot = box.querySelector(".tour-spot"), tip = box.querySelector(".tour-tip");
    if (!el) { spot.style.cssText = "left:50%;top:40%;width:0;height:0"; tip.style.cssText = "left:50%;top:45%;transform:translateX(-50%)"; }
    else {
      el.scrollIntoView({ block: "nearest" });
      const r = el.getBoundingClientRect(), p = 8;
      spot.style.cssText = `left:${r.left - p}px;top:${r.top - p}px;width:${r.width + p * 2}px;height:${r.height + p * 2}px`;
      const below = r.bottom + 220 < innerHeight;
      const left = Math.min(Math.max(16, r.left), innerWidth - 376);
      tip.style.cssText = below ? `left:${left}px;top:${r.bottom + 16}px` : `left:${left}px;top:${Math.max(16, r.top - 16 - tip.offsetHeight)}px`;
    }
    tip.querySelector(".tour-n").textContent = `${i + 1} / ${TOUR.length}`;
    tip.querySelector("h3").textContent = s.t;
    tip.querySelector("p").textContent = s.d;
    tip.querySelector("[data-tp]").disabled = i === 0;
    tip.querySelector("[data-tn]").textContent = i === TOUR.length - 1 ? "Terminer" : "Suivant →";
    tip.querySelector("[data-tn]").focus({ preventScroll: true });
  }
  function onKey(e) {
    if (!box) return;
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); stop(); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); prev(); }
  }
  function next() { if (i < TOUR.length - 1) { i++; place(); } else stop(); }
  function prev() { if (i > 0) { i--; place(); } }
  function stop() { box?.remove(); box = null; save("tourDone", true); removeEventListener("keydown", onKey, true); removeEventListener("resize", place); }
  function start() {
    if (box) return;
    closeMenu(); closePalette();
    const run = () => {
      window.scrollTo(0, 0); i = 0;
      box = document.createElement("div");
      box.className = "tour"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Visite guidée");
      box.innerHTML = `<div class="tour-spot"></div><div class="tour-tip"><span class="mono tour-n"></span><h3></h3><p></p>
        <div class="row"><button class="btn ghost sm" data-ts>Passer la visite</button><span style="flex:1"></span><button class="btn ghost sm" data-tp>← Précédent</button><button class="btn sm" data-tn>Suivant →</button></div></div>`;
      document.body.appendChild(box);
      box.querySelector("[data-ts]").onclick = stop;
      box.querySelector("[data-tp]").onclick = prev;
      box.querySelector("[data-tn]").onclick = next;
      addEventListener("keydown", onKey, true); addEventListener("resize", place);
      place();
    };
    if (current !== "home") { go("home"); setTimeout(run, 900); } else run();
  }
  return { start, stop, active: () => !!box };
})();
// La visite démarre juste après l'acceptation de la charte (premier lancement)
$("gateGo").addEventListener("click", () => { if (!load("tourDone", false)) setTimeout(tour.start, 500); });
$("setTour").onclick = () => tour.start();

/* ---------- Barre de navigation mobile (en bas de l'écran) ---------- */
function renderMobNav() {
  const vis = settings.order.filter(v => v !== "home" && v !== "about" && !settings.hidden.includes(v)).slice(0, 6);
  $("mobNav").innerHTML = vis.map(v => `<a href="#${v}" data-v="${v}" class="${v === current ? "active" : ""}" aria-label="${MODS[v].n}">${ICONS[v]}<span>${MODS[v].s}</span></a>`).join("")
    + `<button id="mobMenu" aria-label="Ouvrir le menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span></button>`;
  $("mobMenu").onclick = () => openMenu(false);
}
addEventListener("hashchange", () => setTimeout(() => $$("#mobNav a").forEach(a => a.classList.toggle("active", a.dataset.v === current)), 450));

/* ---------- Carte : panneau repliable (utile sur petit écran) ---------- */
$("mapPanelToggle").onclick = () => {
  const p = document.querySelector(".map-panel"), c = p.classList.toggle("collapsed");
  $("mapPanelToggle").textContent = c ? "Afficher le panneau ▴" : "Réduire ▾";
  $("mapPanelToggle").setAttribute("aria-expanded", String(!c));
  setTimeout(() => map?.invalidateSize(), 250);
};

/* ---------- Accessibilité ---------- */
// Les boutons qui n'affichent qu'un symbole reçoivent un nom lisible par les lecteurs d'écran
function labelIconButtons(root = document) {
  root.querySelectorAll("button[title]:not([aria-label])").forEach(b => { if (b.textContent.trim().length <= 3) b.setAttribute("aria-label", b.title); });
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && labelIconButtons(n)))).observe(document.body, { childList: true, subtree: true });
$("skipLink").onclick = () => {
  const h = document.querySelector(".view.active h1, .view.active h2");
  if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
};
