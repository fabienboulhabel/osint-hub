/* =========================================================
   OSINT Hub — logique complète de l'application
   Sommaire :
     1. Utilitaires        5. Recherche        9. Enquêtes
     2. Navigation         6. Carte GEOINT    10. Tableau de bord
     3. Accueil animé      7. Analyse photo   11. Palette & raccourcis
     4. Chronomètre        8. Entraînement    12. Démarrage
   ========================================================= */

/* ---------- 1. UTILITAIRES ---------- */
const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];
const enc = encodeURIComponent;
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const openUrl = u => window.open(u, "_blank", "noopener");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTyping = () => ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
let toastTimer;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2000); }
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const setColor = c => document.documentElement.style.setProperty("--c", c);

/* ---------- 2. NAVIGATION (par #ancre → le bouton retour de la souris fonctionne) ---------- */
const VIEWS = {
  home:      { c: "#38bdf8", name: "Accueil" },
  dashboard: { c: "#22d3ee", name: "Tableau de bord" },
  search:    { c: "#38bdf8", name: "Recherche" },
  map:       { c: "#34d399", name: "Carte" },
  photo:     { c: "#fbbf24", name: "Photo" },
  training:  { c: "#f472b6", name: "Entraînement" },
  cases:     { c: "#a78bfa", name: "Enquêtes" }
};
const KEYS = ["home", "dashboard", "search", "map", "photo", "training", "cases"]; // touches 0 à 6
let current = null, clickX = innerWidth / 2, clickY = innerHeight / 2;
addEventListener("pointerdown", e => { clickX = e.clientX; clickY = e.clientY; }, true);

function go(v) { closeMenu(); closePalette(); if ((location.hash.slice(1) || "home") === v) show(v); else location.hash = v; }
function route() { const v = location.hash.slice(1); show(VIEWS[v] ? v : "home"); }
addEventListener("hashchange", route);

function show(v) {
  closeMenu(); closePalette();
  if (v === current) return;
  const apply = () => {
    $$(".view").forEach(s => s.classList.toggle("active", s.id === "v-" + v));
    $$(".pills a").forEach(a => a.classList.toggle("active", a.dataset.v === v));
    document.body.dataset.view = v;
    setColor(VIEWS[v].c);
    window.scrollTo(0, 0);
    current = v;
    onEnter[v]?.();
    onScroll();
  };
  if (!current || reduced) return apply();
  const w = document.createElement("div");
  w.className = "wipe"; w.style.background = VIEWS[v].c;
  w.style.setProperty("--x", clickX + "px"); w.style.setProperty("--y", clickY + "px");
  w.innerHTML = `<span>${VIEWS[v].name}</span>`;
  document.body.appendChild(w);
  requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add("in")));
  setTimeout(() => { apply(); w.classList.add("out"); setTimeout(() => w.remove(), 450); }, 520);
}
const onEnter = {};

// Menu plein écran
const closeMenu = () => $("menu").classList.remove("open");
$("menuBtn").onclick = () => $("menu").classList.add("open");
$("menuClose").onclick = closeMenu;
$$('a[href^="#"]').forEach(a => a.addEventListener("click", closeMenu));

// Halo qui suit la souris
addEventListener("mousemove", e => { $("halo").style.left = e.clientX + "px"; $("halo").style.top = e.clientY + "px"; }, { passive: true });

/* ---------- 3. ACCUEIL ANIMÉ ---------- */
const hTitle = $("hTitle");
hTitle.innerHTML = [...hTitle.textContent].map((c, i) => `<span style="animation-delay:${.15 + i * .09}s">${c}</span>`).join("");

const marqueeItems = ["Google Lens", "Street View", "Géoportail IGN", "SunCalc", "Overpass Turbo", "Wayback Machine", "Yandex", "TinEye", "WhatsMyName", "Cartoradio", "Mapillary"];
$("marquee").innerHTML = [...marqueeItems, ...marqueeItems].map(t => `<span>${t}</span><b>✦</b>`).join("");

const revealObs = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in")), { threshold: .2 });
$$(".reveal").forEach(el => revealObs.observe(el));

const orbIcon = $("orbIcon");
const panelObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting || current !== "home") return;
  const p = e.target;
  $$(".h-panel").forEach(x => x.classList.toggle("on", x === p));
  setColor(p.dataset.color); $("hNum").textContent = p.dataset.num;
  orbIcon.classList.add("pop");
  setTimeout(() => { orbIcon.textContent = p.dataset.icon; orbIcon.classList.remove("pop"); }, 230);
}), { rootMargin: "-45% 0px -45% 0px" });
$$(".h-panel").forEach(p => panelObs.observe(p));

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  $("progress").style.width = max > 0 ? (scrollY / max * 100) + "%" : "0";
  document.body.classList.toggle("at-top", scrollY < 40);
  if (current !== "home") return;
  const r = $("hMethod").getBoundingClientRect();
  $("lineFill").style.width = Math.min(100, Math.max(0, (innerHeight * .8 - r.top) / r.height * 160)) + "%";
  if (scrollY < innerHeight * .6) setColor(VIEWS.home.c);
}
addEventListener("scroll", onScroll, { passive: true });

/* ---------- 4. CHRONOMÈTRE (le total est cumulé pour les statistiques) ---------- */
let secs = 0, totalSecs = load("totalSecs", 0), timerId = null;
const fmtT = s => new Date(s * 1000).toISOString().substring(11, 19);
function toggleTimer() {
  if (timerId) {
    clearInterval(timerId); timerId = null; save("totalSecs", totalSecs);
    $("tToggle").textContent = "▶"; $("tToggle").parentElement.classList.remove("running");
    return toast("Chrono en pause");
  }
  $("tToggle").textContent = "⏸"; $("tToggle").parentElement.classList.add("running");
  timerId = setInterval(() => {
    secs++; totalSecs++; $("timer").textContent = fmtT(secs);
    document.title = `⏱ ${fmtT(secs)} · OSINT Hub`;
    if (secs % 10 === 0) save("totalSecs", totalSecs);
  }, 1000);
  toast("Chrono lancé");
}
$("tToggle").onclick = toggleTimer;
$("tReset").onclick = () => { if (timerId) toggleTimer(); secs = 0; $("timer").textContent = fmtT(0); document.title = "OSINT Hub"; };
addEventListener("beforeunload", () => save("totalSecs", totalSecs));

/* ---------- 5. RECHERCHE ---------- */
const detectType = q => {
  if (!q) return null;
  if (/^https?:\/\/\S+\.(jpe?g|png|webp|gif|bmp|avif)(\?\S*)?$/i.test(q)) return "image";
  if (/^https?:\/\//i.test(q)) return "url";
  if (/^\S+$/.test(q)) return "pseudo";
  return "name";
};
const typeLabel = { pseudo: "Pseudo", name: "Nom / texte", url: "URL de page", image: "URL d'image" };
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
function remember(q) {
  searchHist = [q, ...searchHist.filter(x => x !== q)].slice(0, 8); save("searchHistory", searchHist); renderHistory();
}
function renderHistory() {
  $("history").innerHTML = searchHist.map(h => `<button data-h="${esc(h)}">↺ ${esc(h)}</button>`).join("") +
    (searchHist.length ? `<button id="clearHist">✕ effacer</button>` : "");
  $$("#history [data-h]").forEach(b => b.onclick = () => { $("q").value = b.dataset.h; renderTools(); $("q").focus(); });
  $("clearHist")?.addEventListener("click", () => { searchHist = []; save("searchHistory", searchHist); renderHistory(); });
}
function runTool(gi, ti) { const q = $("q").value.trim(); remember(q); openUrl(toolGroups[gi].tools[ti][2](q)); }
function renderTools() {
  const q = $("q").value.trim(), type = detectType(q);
  $("qType").textContent = type ? typeLabel[type] : "—";
  $("qType").classList.toggle("off", !type);
  $("dorkPreview").textContent = dorkQuery() || "—";
  let first = true;
  $("toolGroups").innerHTML = toolGroups.map((g, gi) => {
    const ok = type && g.for.includes(type);
    return `<div class="group"><div class="group-head"><h2>${g.name}</h2>
      ${ok ? `<button class="btn ghost sm" data-all="${gi}">Tout ouvrir (${g.tools.length})</button>` : ""}</div>
      <div class="tools">${g.tools.map((t, ti) => {
        const cls = ok ? (first ? (first = false, "first") : "") : "off";
        return `<button class="tool ${cls}" data-g="${gi}" data-t="${ti}"><b>${t[0]}</b><small>${t[1]}</small></button>`;
      }).join("")}</div></div>`;
  }).join("");
  $$(".tool[data-g]").forEach(b => b.onclick = () => runTool(b.dataset.g, b.dataset.t));
  $$("[data-all]").forEach(b => b.onclick = () => toolGroups[b.dataset.all].tools.forEach((t, ti) => runTool(b.dataset.all, ti)));
}
$("q").oninput = renderTools;
$$(".dork, #dorkExact").forEach(c => c.onchange = renderTools);
$("q").onkeydown = e => { if (e.key === "Enter") document.querySelector(".tool.first")?.click(); };
$("copyDork").onclick = () => dorkQuery() && navigator.clipboard.writeText(dorkQuery()).then(() => toast("Requête copiée"));
onEnter.search = () => setTimeout(() => $("q").focus(), 100);

/* ---------- 6. CARTE GEOINT ---------- */
let map = null, marker = null, sunLines, caseMarkers, point = null, pendingPoint = null;
const fmtLL = (a, b) => `${a.toFixed(5)}, ${b.toFixed(5)}`;
const pad = n => String(n).padStart(2, "0");
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
  if (!window.L) { $("mapHint").textContent = "⚠️ Carte indisponible : vérifie ta connexion Internet."; return; }
  const ign = (layer, fmt) => L.tileLayer(`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${fmt}`, { maxZoom: 19, attribution: "© IGN" });
  const layers = {
    "Plan IGN": ign("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png"),
    "Photo aérienne IGN": ign("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg"),
    "Satellite (Esri)": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "© Esri" }),
    "OpenStreetMap": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" })
  };
  const saved = load("mapLayer", "Plan IGN");
  const v = load("mapView", [45.764, 4.8357, 11]);
  map = L.map("leaflet", { layers: [layers[saved] || layers["Plan IGN"]] }).setView([v[0], v[1]], v[2]);
  L.control.layers(layers, null, { position: "topleft" }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  map.on("baselayerchange", e => save("mapLayer", e.name));
  map.on("moveend", () => { const c = map.getCenter(); save("mapView", [c.lat, c.lng, map.getZoom()]); });
  sunLines = L.layerGroup().addTo(map);
  caseMarkers = L.layerGroup().addTo(map);
  map.on("click", e => selectPoint(e.latlng.lat, e.latlng.lng));
  map.on("zoomend", updateSun);
  refreshCaseMarkers();
}
onEnter.map = () => {
  if (!map) initMap(); else map.invalidateSize();
  if (pendingPoint && map) { selectPoint(...pendingPoint); pendingPoint = null; }
};
function openOnMap(lat, lng, zoom = 17) {
  if (current === "map" && map) selectPoint(lat, lng, zoom);
  else { pendingPoint = [lat, lng, zoom]; go("map"); }
}
function selectPoint(lat, lng, zoom) {
  if (!map) return;
  point = [lat, lng];
  if (marker) marker.setLatLng(point); else marker = L.marker(point).addTo(map);
  if (zoom) map.setView(point, zoom);
  $("coords").textContent = fmtLL(lat, lng);
  $("mapHint").textContent = "Point sélectionné. Clique ailleurs pour le déplacer.";
  $("pointTools").innerHTML = pointTools.map((t, i) => `<button data-p="${i}">${t[0]}</button>`).join("");
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
    ? `Soleil : azimut <b>${az.toFixed(0)}°</b>, hauteur <b>${alt.toFixed(0)}°</b><br>
       Ombres vers <b>${((az + 180) % 360).toFixed(0)}°</b>, longueur ≈ <b>${(1 / Math.tan(p.altitude)).toFixed(2)} ×</b> la hauteur de l'objet<br>
       Lever ${h(t.sunrise)} · Coucher ${h(t.sunset)}<br><span style="color:#fbbf24">━ direction du soleil</span> · <span style="color:#cbd5e1">┅ ombre</span>`
    : `🌙 Soleil sous l'horizon à cette heure.<br>Lever ${h(t.sunrise)} · Coucher ${h(t.sunset)}`;
  if (alt <= 0) return;
  const km = 40075 / Math.pow(2, map.getZoom()) / 3;
  const dest = (deg, k) => { const r = deg * Math.PI / 180; return [point[0] + k / 111 * Math.cos(r), point[1] + k / (111 * Math.cos(point[0] * Math.PI / 180)) * Math.sin(r)]; };
  L.polyline([point, dest(az, km)], { color: "#fbbf24", weight: 4 }).addTo(sunLines);
  L.polyline([point, dest(az + 180, km * .6)], { color: "#cbd5e1", weight: 3, dashArray: "6 6" }).addTo(sunLines);
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
function refreshCaseMarkers() {
  if (!map) return;
  caseMarkers.clearLayers();
  currentCase().entries.forEach(e => {
    const p = parseLatLng(e.gps);
    if (p) L.circleMarker(p, { radius: 8, color: "#a78bfa", weight: 2, fillOpacity: .7 }).bindPopup(esc(e.clue || e.hyp || e.gps)).addTo(caseMarkers);
  });
}
// Recherche d'adresse (OpenStreetMap / Nominatim) ou coordonnées
let geoTimer;
$("geoQ").oninput = () => {
  clearTimeout(geoTimer);
  const q = $("geoQ").value.trim(), ll = parseLatLng(q);
  if (!q) return ($("geoResults").innerHTML = "");
  if (ll && /^[-\d.,;\s]+$/.test(q)) { $("geoResults").innerHTML = `<div data-ll="${ll}">📍 Aller à ${fmtLL(...ll)}</div>`; return bindGeo(); }
  geoTimer = setTimeout(async () => {
    try {
      const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=fr&q=${enc(q)}`)).json();
      $("geoResults").innerHTML = r.map(x => `<div data-ll="${x.lat},${x.lon}">${esc(x.display_name)}</div>`).join("") || "<div>Aucun résultat</div>";
      bindGeo();
    } catch { $("geoResults").innerHTML = "<div>Recherche indisponible</div>"; }
  }, 500);
};
$("geoQ").onkeydown = e => { if (e.key === "Enter") $("geoResults").querySelector("[data-ll]")?.click(); };
function bindGeo() {
  $$("#geoResults [data-ll]").forEach(d => d.onclick = () => {
    const [a, b] = d.dataset.ll.split(",").map(Number);
    selectPoint(a, b, 16); $("geoResults").innerHTML = ""; $("geoQ").value = "";
  });
}

/* ---------- 7. ANALYSE PHOTO ---------- */
let exifPoint = null, currentFile = null;
async function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) return toast("Ce fichier n'est pas une image");
  currentFile = file;
  $("preview").src = URL.createObjectURL(file);
  $("preview").classList.remove("zoom");
  $("photoView").classList.add("has");
  $("exifToMap").hidden = true; exifPoint = null;
  const rows = [["Fichier", file.name || "Image collée"], ["Taille", (file.size / 1024).toFixed(0) + " Ko"]];
  $("preview").onload = () => { rows.splice(2, 0, ["Dimensions", `${$("preview").naturalWidth} × ${$("preview").naturalHeight} px`]); renderExif(rows); };
  try {
    const x = window.exifr ? (await exifr.parse(file, { gps: true }) || {}) : {};
    if (x.DateTimeOriginal) rows.push(["Date de prise", new Date(x.DateTimeOriginal).toLocaleString("fr-FR")]);
    if (x.Make || x.Model) rows.push(["Appareil", `${x.Make || ""} ${x.Model || ""}`.trim()]);
    if (x.LensModel) rows.push(["Objectif", x.LensModel]);
    if (x.Software) rows.push(["Logiciel", x.Software]);
    if (x.latitude != null) { exifPoint = [x.latitude, x.longitude]; rows.push(["GPS", fmtLL(...exifPoint)]); $("exifToMap").hidden = false; }
    if (rows.length <= 2) rows.push(["Info", "Aucune métadonnée : normal pour une image issue d'un réseau social (supprimées à l'envoi). Place à l'observation !"]);
  } catch { rows.push(["Info", "Métadonnées illisibles"]); }
  renderExif(rows);
}
function renderExif(rows) { $("exif").innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join(""); }
$("file").onchange = e => loadImage(e.target.files[0]);
const drop = $("drop");
["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => loadImage(e.dataTransfer.files[0]));
// Glisser une image n'importe où dans la vue Photo
addEventListener("dragover", e => e.preventDefault());
addEventListener("drop", e => { e.preventDefault(); if (current === "photo" && e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]); });
document.addEventListener("paste", e => {
  if (isTyping() && current !== "photo") return;
  const f = [...(e.clipboardData?.files || [])][0];
  if (f && f.type.startsWith("image/")) { if (current !== "photo") go("photo"); setTimeout(() => loadImage(f), current === "photo" ? 0 : 600); }
});
// Loupe qui suit la souris
const img = $("preview");
img.onclick = e => { img.classList.toggle("zoom"); moveZoom(e); };
img.onmousemove = moveZoom;
function moveZoom(e) {
  if (!img.classList.contains("zoom")) return;
  const r = img.getBoundingClientRect();
  img.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`;
}
img.onmouseleave = () => img.classList.remove("zoom");
$("exifToMap").onclick = () => exifPoint && openOnMap(...exifPoint);
// Copier l'image (pour la coller dans Lens / Yandex / TinEye)
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
const clueFields = ["Panneaux / textes", "Langue / écriture", "Plaques", "Mobilier urbain", "Végétation / climat", "Relief / horizon", "Architecture", "Enseignes / commerces", "Transports", "Ombres / heure"];
$("clueGrid").innerHTML = clueFields.map((f, i) => `<div class="clue"><label for="c${i}">${f}</label><input id="c${i}" data-c="${i}" placeholder="…"></div>`).join("");
$("cluesToCase").onclick = () => {
  const obs = $$("[data-c]").filter(i => i.value.trim()).map(i => `${clueFields[i.dataset.c]} : ${i.value.trim()}`);
  if (!obs.length) return toast("Aucune observation saisie");
  addEntry({ clue: obs.join(" · "), proof: exifPoint ? "Coordonnées GPS présentes dans les métadonnées" : (currentFile ? `Photo : ${currentFile.name || "image collée"}` : ""), gps: exifPoint ? fmtLL(...exifPoint) : "" });
  $$("[data-c]").forEach(i => i.value = "");
};

/* ---------- 8. ENTRAÎNEMENT ---------- */
// Cartes GeoGuessr : modifiables directement dans l'interface (bouton ✎)
let ggMaps = load("ggMaps", [
  { name: "France", url: "https://www.geoguessr.com/maps" },
  { name: "Lyon / AURA", url: "https://www.geoguessr.com/maps" },
  { name: "No Move", url: "https://www.geoguessr.com" }
]);
function renderGgMaps() {
  $("ggLinks").innerHTML = ggMaps.map((m, i) => `<div class="gg-link"><a href="${esc(m.url)}" target="_blank" rel="noopener">🌍 ${esc(m.name)}</a>
    <button class="del" data-edit="${i}" title="Modifier le lien">✎</button><button class="del" data-rm="${i}" title="Supprimer">✕</button></div>`).join("");
  $("ggMap").innerHTML = ggMaps.map(m => `<option>${esc(m.name)}</option>`).join("");
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
    ? sessions.slice(0, 10).map((s, i) => `<li><span class="t">${esc(s.date)} — ${esc(s.map)} : <b>${s.score}</b></span><button class="del" data-i="${i}">✕</button></li>`).join("")
    : `<li class="empty">Aucune session enregistrée</li>`;
  $$("#ggList .del").forEach(d => d.onclick = () => { sessions.splice(d.dataset.i, 1); save("sessions", sessions); renderSessions(); });
  drawChart();
}
function drawChart() {
  const c = $("ggChart"), dpr = devicePixelRatio || 1;
  const W = c.clientWidth, H = c.clientHeight; if (!W) return;
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
  const pts = sessions.slice(0, 20).reverse().map(s => +s.score);
  const color = VIEWS.training.c;
  if (pts.length < 2) {
    ctx.fillStyle = "#8b98ad"; ctx.font = "14px Segoe UI"; ctx.textAlign = "center";
    ctx.fillText("La courbe apparaît à partir de 2 sessions", W / 2, H / 2); $("ggAvg").textContent = ""; return;
  }
  const max = Math.max(...pts), min = Math.min(...pts), pad = 14;
  const X = i => pad + i * (W - pad * 2) / (pts.length - 1);
  const Y = v => H - pad - (v - min) / ((max - min) || 1) * (H - pad * 2);
  const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, color + "66"); grad.addColorStop(1, color + "00");
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.lineTo(X(pts.length - 1), H); ctx.lineTo(X(0), H); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();
  ctx.fillStyle = color; pts.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(i), Y(v), 3.5, 0, 7); ctx.fill(); });
  const avg = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  $("ggAvg").textContent = `Moyenne : ${avg} · Meilleur : ${max} · ${pts.length} dernières sessions`;
}
$("ggAdd").onclick = () => {
  const v = $("ggScore").value; if (v === "") return toast("Saisis un score");
  sessions.unshift({ date: new Date().toLocaleDateString("fr-FR"), map: $("ggMap").value, score: +v });
  save("sessions", sessions); $("ggScore").value = ""; renderSessions(); toast("Session enregistrée");
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
  $("taskList").innerHTML = tasks.length ? tasks.map((x, i) => `<li class="${x.d ? "done" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span class="t">${esc(x.t)}</span><button class="del" data-x="${i}">✕</button></li>`).join("")
    : `<li class="empty">Ajoute ton premier défi</li>`;
  $$("#taskList input").forEach(c => c.onchange = () => { tasks[c.dataset.i].d = c.checked; save("tasks", tasks); renderTasks(); if (c.checked) toast("Bravo 🎉"); });
  $$("#taskList .del").forEach(d => d.onclick = () => { tasks.splice(d.dataset.x, 1); save("tasks", tasks); renderTasks(); });
  const done = tasks.filter(x => x.d).length, pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $("taskBar").style.width = pct + "%"; $("taskPct").textContent = `${done}/${tasks.length} · ${pct} %`;
}
$("taskAdd").onclick = () => { const v = $("taskInput").value.trim(); if (!v) return; tasks.push({ t: v, d: false }); save("tasks", tasks); $("taskInput").value = ""; renderTasks(); };
$("taskInput").onkeydown = e => e.key === "Enter" && $("taskAdd").click();
onEnter.training = () => setTimeout(drawChart, 50);

/* ---------- 9. ENQUÊTES (partagées par tous les modules) ---------- */
let cases = load("cases", null);
if (!Array.isArray(cases) || !cases.length) {
  cases = [{ id: Date.now(), name: "Exercice 1", entries: [] }];
  const old = load("report", []); // reprise des rapports de la toute première version
  if (Array.isArray(old) && old.length) cases[0].entries = old.map(e => ({ date: new Date().toISOString(), conf: 3, ...e }));
}
let activeCase = load("activeCase", cases[0].id);
const currentCase = () => cases.find(c => c.id === activeCase) || cases[0];
function saveCases() { activeCase = currentCase().id; save("cases", cases); save("activeCase", activeCase); renderCaseSelect(); renderTimeline(); refreshCaseMarkers(); }
function addEntry(e) {
  currentCase().entries.push({ date: new Date().toISOString(), conf: 3, clue: "", hyp: "", proof: "", gps: "", ...e });
  saveCases(); toast(`Ajouté à « ${currentCase().name} »`);
}
function renderCaseSelect() {
  const html = cases.map(c => `<option value="${c.id}" ${c.id === currentCase().id ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  $$(".caseSelect").forEach(s => s.innerHTML = html);
}
$$(".caseSelect").forEach(s => s.onchange = e => { activeCase = +e.target.value; saveCases(); toast(`Enquête active : ${currentCase().name}`); });
$("addCase").onclick = () => {
  const n = $("newCase").value.trim(); if (!n) return toast("Donne un nom à l'enquête");
  const c = { id: Date.now(), name: n, entries: [] }; cases.push(c); activeCase = c.id; $("newCase").value = ""; saveCases(); toast("Enquête créée");
};
$("newCase").onkeydown = e => e.key === "Enter" && $("addCase").click();
$("renameCase").onclick = () => { const n = prompt("Nouveau nom :", currentCase().name); if (n?.trim()) { currentCase().name = n.trim(); saveCases(); } };
$("delCase").onclick = () => {
  if (cases.length === 1) return toast("Il faut garder au moins une enquête");
  if (!confirm(`Supprimer « ${currentCase().name} » et ses ${currentCase().entries.length} éléments ?`)) return;
  cases = cases.filter(c => c.id !== currentCase().id); activeCase = cases[0].id; saveCases();
};
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
$("rConf").oninput = e => $("rConfLbl").textContent = stars(+e.target.value);
$("rAdd").onclick = () => {
  const e = { clue: $("rClue").value.trim(), hyp: $("rHyp").value.trim(), proof: $("rProof").value.trim(), gps: $("rGps").value.trim(), conf: +$("rConf").value };
  if (!e.clue && !e.hyp && !e.proof && !e.gps) return toast("Remplis au moins un champ");
  if (e.gps && !parseLatLng(e.gps)) return toast("Coordonnées GPS non reconnues (ex : 45.7640, 4.8357)");
  addEntry(e); ["rClue", "rHyp", "rProof", "rGps"].forEach(i => $(i).value = "");
};
function renderTimeline() {
  const list = currentCase().entries;
  $("rCount").textContent = `${list.length} élément${list.length > 1 ? "s" : ""}`;
  $("rList").innerHTML = list.length ? list.map((e, i) => `
    <li><div class="meta">${new Date(e.date).toLocaleString("fr-FR")} <span class="stars">${stars(e.conf || 3)}</span><button class="del" data-i="${i}" title="Supprimer">✕</button></div>
      ${e.clue ? `<div><b>Indice</b> ${esc(e.clue)}</div>` : ""}${e.hyp ? `<div><b>Hypothèse</b> ${esc(e.hyp)}</div>` : ""}
      ${e.proof ? `<div><b>Preuve</b> ${esc(e.proof)}</div>` : ""}${e.gps ? `<div><b>GPS</b> <a href="#" data-gps="${esc(e.gps)}">${esc(e.gps)} → carte</a></div>` : ""}
    </li>`).join("") : `<li class="empty" style="border:0">Aucun élément. Ajoute un indice, ou envoie-en depuis la Carte ou la Photo.</li>`;
  $$("#rList .del").forEach(d => d.onclick = () => { if (confirm("Supprimer cet élément ?")) { list.splice(d.dataset.i, 1); saveCases(); } });
  $$("#rList [data-gps]").forEach(a => a.onclick = ev => { ev.preventDefault(); const p = parseLatLng(a.dataset.gps); if (p) openOnMap(...p, 16); });
}
$("exportMd").onclick = () => {
  const c = currentCase(), cell = s => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  let md = `# ${c.name}\n\n_Exporté le ${new Date().toLocaleString("fr-FR")} · ${c.entries.length} éléments_\n\n| # | Date | Indice | Hypothèse | Preuve | GPS | Confiance |\n|---|---|---|---|---|---|---|\n`;
  c.entries.forEach((e, i) => md += `| ${i + 1} | ${new Date(e.date).toLocaleString("fr-FR")} | ${cell(e.clue)} | ${cell(e.hyp)} | ${cell(e.proof)} | ${cell(e.gps)} | ${e.conf || 3}/5 |\n`);
  download(`${c.name.replace(/[^\w-]+/g, "_")}.md`, md, "text/markdown");
};
$("exportJson").onclick = () => {
  save("totalSecs", totalSecs);
  download(`osint-hub-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ version: 4, cases, activeCase, tasks, sessions, ggMaps, totalSecs, searchHistory: searchHist }, null, 2), "application/json");
  toast("Sauvegarde téléchargée");
};
$("importJson").onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
    ["cases", "activeCase", "tasks", "sessions", "ggMaps", "totalSecs", "searchHistory"].forEach(k => d[k] !== undefined && save(k, d[k]));
    location.reload();
  } catch { toast("Fichier de sauvegarde invalide"); }
  e.target.value = "";
};

/* ---------- 10. TABLEAU DE BORD ---------- */
const tips = [
  "Archive une page AVANT de la citer : une publication peut disparaître à tout moment.",
  "Sépare toujours ce que tu observes (indice) de ce que tu en déduis (hypothèse).",
  "N'utilise jamais tes comptes personnels pour une recherche : comptes neutres et navigateur dédié.",
  "Les ombres donnent l'orientation : croise-les avec le module Soleil de la carte.",
  "Une plaque, une langue, un poteau électrique : chaque détail réduit la zone de recherche.",
  "Yandex est souvent meilleur que Google pour reconnaître un lieu.",
  "Un pseudo est souvent réutilisé : WhatsMyName te dit où il existe.",
  "Disparition réelle : on appelle le 17 tout de suite, il n'y a aucun délai à attendre.",
  "Note ton niveau de confiance : 2 indices faibles concordants valent mieux qu'1 indice fort isolé."
];
let tipIdx = Math.floor(Math.random() * tips.length);
const showTip = () => $("tip").textContent = tips[tipIdx];
$("nextTip").onclick = () => { tipIdx = (tipIdx + 1) % tips.length; showTip(); };
function countUp(el, to, fmt = v => v) {
  if (reduced) return (el.textContent = fmt(to));
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 900), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = fmt(v); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
onEnter.dashboard = () => {
  const h = new Date().getHours();
  $("greet").textContent = h < 6 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
  const mins = Math.floor(totalSecs / 60);
  countUp($("sTime"), mins, v => v < 60 ? `${v} min` : `${Math.floor(v / 60)} h ${pad(v % 60)}`);
  countUp($("sSessions"), sessions.length);
  $("sChallenges").textContent = `${tasks.filter(x => x.d).length} / ${tasks.length}`;
  countUp($("sEntries"), cases.reduce((n, c) => n + c.entries.length, 0));
  $("dashTasks").innerHTML = tasks.filter(x => !x.d).slice(0, 4).map(x => `<li>⬜ <span class="t">${esc(x.t)}</span></li>`).join("") || `<li class="empty">Tout est terminé 🎉</li>`;
  const all = cases.flatMap(c => c.entries.map(e => ({ ...e, c: c.name }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  $("dashEntries").innerHTML = all.map(e => `<li><span class="t">${esc(e.clue || e.hyp || e.gps)}</span><span class="muted small">${esc(e.c)}</span></li>`).join("") || `<li class="empty">Aucune entrée pour l'instant</li>`;
  showTip();
};

/* ---------- 11. PALETTE DE COMMANDES & RACCOURCIS ---------- */
const commands = [
  ...KEYS.map((k, i) => [`${["🏠", "📊", "🔎", "🗺️", "📷", "🎯", "📁"][i]} ${VIEWS[k].name}`, `touche ${i}`, () => go(k)]),
  ["⏱️ Démarrer / pause du chrono", "", toggleTimer],
  ["➕ Nouvelle enquête", "", () => { go("cases"); setTimeout(() => $("newCase").focus(), 700); }],
  ["💾 Sauvegarder toutes les données (.json)", "", () => $("exportJson").click()],
  ["⬇ Exporter le rapport de l'enquête (.md)", "", () => $("exportMd").click()],
  ["☀️ Soleil : maintenant", "", () => { go("map"); setTimeout(setSunNow, 700); }],
  ...pointTools.map(t => [`🌍 Ouvrir ${t[0]} sur le point sélectionné`, "", () => point ? openUrl(t[1](...point)) : toast("Aucun point sélectionné sur la carte")])
];
let sel = 0, filtered = commands;
const closePalette = () => $("palette").classList.remove("open");
function openPalette() { closeMenu(); $("palette").classList.add("open"); $("paletteQ").value = ""; sel = 0; renderPalette(); setTimeout(() => $("paletteQ").focus(), 30); }
function renderPalette() {
  const q = $("paletteQ").value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  filtered = commands.filter(c => c[0].toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(q));
  sel = Math.max(0, Math.min(sel, filtered.length - 1));
  $("paletteList").innerHTML = filtered.map((c, i) => `<li class="${i === sel ? "sel" : ""}" data-i="${i}">${c[0]} <span class="small" style="float:right;opacity:.6">${c[1]}</span></li>`).join("") || `<li class="empty">Aucune commande</li>`;
  $$("#paletteList [data-i]").forEach(li => { li.onclick = () => runCmd(+li.dataset.i); li.onmouseenter = () => { sel = +li.dataset.i; $$("#paletteList li").forEach((x, j) => x.classList.toggle("sel", j === sel)); }; });
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
  if (e.key === "Escape") { closePalette(); closeMenu(); if (isTyping()) document.activeElement.blur(); return; }
  if (e.ctrlKey && e.key.toLowerCase() === "k") { e.preventDefault(); $("palette").classList.contains("open") ? closePalette() : openPalette(); return; }
  if (isTyping() || e.ctrlKey || e.altKey || e.metaKey || $("palette").classList.contains("open")) return;
  if (/^[0-6]$/.test(e.key)) go(KEYS[+e.key]);
  else if (e.key === "Enter" && current === "home") go("dashboard");
});

/* ---------- 12. DÉMARRAGE ---------- */
renderCaseSelect(); renderTimeline(); renderHistory(); renderTools(); renderGgMaps(); renderSessions(); renderTasks();
$("rConfLbl").textContent = stars(3);
setSunNow();
route();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
