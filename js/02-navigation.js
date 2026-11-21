/* OSINT Hub — 02-navigation.js · voir js/README.md pour l'ordre de chargement */
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
  if (typeof renderMobNav === "function") renderMobNav();
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
