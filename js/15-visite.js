/* OSINT Hub — 15-visite.js · voir js/README.md pour l'ordre de chargement
   Visite guidée au premier lancement, barre de navigation mobile, petits réglages d'accessibilité. */

/* ---------- Visite guidée ---------- */
const TOUR = [
  { sel: "#mainNav", mob: "#mobNav", t: "Les six modules", d: "Tableau de bord, Recherche, Carte, Photo, Entraînement et Enquêtes. Les touches 0 à 6 y mènent directement, et le bouton « retour » de la souris fonctionne." },
  { sel: "#menuBtn", mob: "#mobMenu", t: "Le menu", d: "Toutes les pages avec leurs infos en direct, des actions rapides et le résumé du jour. « Personnaliser » permet de changer l'ordre des modules et la couleur." },
  { sel: ".timer", t: "Le chronomètre", d: "Lance-le au début de chaque séance : ton temps d'entraînement est cumulé dans le tableau de bord." },
  { sel: ".case-tool", t: "Le dossier actif", d: "Les points de la carte, les photos et les observations sont envoyés dans ce dossier d'enquête. Tu en crées autant que d'exercices." },
  { sel: "#kBtn", t: "La palette de commandes", d: "Ctrl + K ouvre une recherche de toutes les actions : lancer un quiz, mesurer une distance, sauvegarder…" },
  { sel: ".globe-wrap", alt: ".globe-box", t: "La planète", d: "Clique un point pour le sélectionner, molette pour zoomer, double-clic pour ouvrir la carte. Les points enregistrés servent aussi pour la coupe topographique." },
  { sel: ".hero-cta", t: "C'est parti", d: "Commence par l'onglet Entraînement › Programme : il te guide étape par étape. Pense à activer la sauvegarde automatique dans À propos › Paramètres." }
];
const tour = (() => {
  const PAD = 8, GAP = 14, EDGE = 12;                                  // marge du cadre, écart cadre-bulle, marge d'écran
  let i = 0, box = null, steps = TOUR;
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().width > 0;   // (offsetParent est nul pour les éléments fixes)
  const small = () => innerWidth <= 760;
  // Sur petit écran, la barre du haut est réduite : on vise la barre du bas (mob) ; une étape sans élément visible est sautée
  function target(s) {
    const q = [small() && s.mob, s.sel, s.alt].filter(Boolean);
    for (const sel of q) { const a = document.querySelector(sel); if (visible(a)) return a; }
    return null;
  }

  function place() {
    if (!box) return;
    const s = steps[i], el = target(s), spot = box.querySelector(".tour-spot"), tip = box.querySelector(".tour-tip");
    // 1. Contenu d'abord : la hauteur de la bulle doit être connue avant de la positionner
    tip.querySelector(".tour-n").textContent = `${i + 1} / ${steps.length}`;
    tip.querySelector("h3").textContent = s.t;
    tip.querySelector("p").textContent = s.d;
    tip.querySelector("[data-tp]").disabled = i === 0;
    tip.querySelector("[data-tn]").textContent = i === steps.length - 1 ? "Terminer" : "Suivant →";
    tip.classList.remove("above", "docked", "side");
    tip.style.removeProperty("--ax");

    if (!el) {                                                          // élément absent (écran étroit) : bulle centrée, sans cadre
      spot.style.cssText = "left:50%;top:40%;width:0;height:0;opacity:0";
      tip.style.cssText = "left:50%;top:50%;transform:translate(-50%,-50%)";
    } else {
      const fixedBar = !!el.closest(".top, .mob-nav");                  // éléments de la barre fixe : pas de défilement
      if (!fixedBar) {
        if (small()) window.scrollTo({ top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - 78), behavior: "instant" });
        else el.scrollIntoView({ block: "center", inline: "nearest" });
      }
      const r = el.getBoundingClientRect();
      // 2. Cadre : mêmes bords que l'élément + marge ; il ne dépasse jamais de l'écran
      const sl = Math.max(4, r.left - PAD), st = Math.max(4, r.top - PAD);
      const sr = Math.min(innerWidth - 4, r.right + PAD);
      let sb = Math.min(innerHeight - 4, r.bottom + PAD);
      const w = tip.offsetWidth, h = tip.offsetHeight;

      if (small()) {                                                    // mobile : bulle ancrée en bas, au-dessus de la barre de navigation
        tip.classList.add("docked"); tip.style.cssText = "";
        sb = Math.max(st + 40, Math.min(sb, tip.getBoundingClientRect().top - 8));   // le cadre s'arrête au-dessus de la bulle
      } else {
        // 3. Bulle : sous le cadre, sinon au-dessus, sinon à côté (grands éléments comme le globe), sinon en bas de l'écran
        const roomBelow = innerHeight - EDGE - (sb + GAP), roomAbove = st - GAP - EDGE;
        const clampX = x => Math.min(Math.max(EDGE, x), innerWidth - EDGE - w);
        const clampY = y => Math.min(Math.max(EDGE, y), innerHeight - EDGE - h);
        let left, top, ax = null;
        if (h <= roomBelow || h <= roomAbove) {
          left = clampX(sl + w > innerWidth - EDGE ? sr - w : sl);
          const below = h <= roomBelow;
          top = below ? sb + GAP : st - GAP - h;
          tip.classList.toggle("above", !below);
          ax = Math.min(Math.max(16, (sl + sr) / 2 - left), w - 16);                                       // pointe centrée sur l'élément
        } else if (sl - GAP - w >= EDGE) { left = sl - GAP - w; top = clampY(st); tip.classList.add("side"); }
        else if (innerWidth - sr - GAP - w >= EDGE) { left = sr + GAP; top = clampY(st); tip.classList.add("side"); }
        else { left = clampX(sl); top = innerHeight - EDGE - h; tip.classList.add("side"); sb = Math.max(st + 40, Math.min(sb, top - GAP)); }
        // La pointe est écrite DANS la même instruction que la position : sinon cssText l'effacerait
        tip.style.cssText = `left:${left}px;top:${top}px${ax != null ? `;--ax:${ax.toFixed(1)}px` : ""}`;
      }
      spot.style.cssText = `left:${sl}px;top:${st}px;width:${sr - sl}px;height:${sb - st}px;opacity:1`;
    }
    tip.querySelector("[data-tn]").focus({ preventScroll: true });
  }
  function onKey(e) {
    if (!box) return;
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); stop(); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); prev(); }
  }
  function next() { if (i < steps.length - 1) { i++; place(); } else stop(); }
  function prev() { if (i > 0) { i--; place(); } }
  function stop() { box?.remove(); box = null; save("tourDone", true); removeEventListener("keydown", onKey, true); removeEventListener("resize", place); removeEventListener("scroll", place, true); }
  function start() {
    if (box) return;
    closeMenu(); closePalette();
    const run = () => {
      window.scrollTo(0, 0); i = 0;
      steps = TOUR.filter(s => target(s));
      box = document.createElement("div");
      box.className = "tour"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Visite guidée");
      box.innerHTML = `<div class="tour-spot"></div><div class="tour-tip"><span class="mono tour-n"></span><h3></h3><p></p>
        <div class="row"><button class="btn ghost sm" data-ts title="Quitter la visite (Échap)">Passer</button><span style="flex:1"></span><button class="btn ghost sm" data-tp>← Retour</button><button class="btn sm" data-tn>Suivant →</button></div></div>`;
      document.body.appendChild(box);
      box.querySelector("[data-ts]").onclick = stop;
      box.querySelector("[data-tp]").onclick = prev;
      box.querySelector("[data-tn]").onclick = next;
      addEventListener("keydown", onKey, true); addEventListener("resize", place); addEventListener("scroll", place, true);
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
