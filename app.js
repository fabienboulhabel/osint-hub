/* =========================================================
   OSINT Hub — logique de l'application
   ========================================================= */

// ---------- Utilitaires ----------
const $ = id => document.getElementById(id);
const enc = encodeURIComponent;
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const openUrl = u => window.open(u, "_blank", "noopener");
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 1800); }

// ---------- Navigation ----------
function go(view) {
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === view));
  if (view === "map") setTimeout(() => map.invalidateSize(), 50);
  if (view === "dashboard") renderDashboard();
  location.hash = view;
}
document.querySelectorAll(".nav").forEach(b => b.onclick = () => go(b.dataset.view));
document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));

/* =========================================================
   ENQUÊTES (stockage partagé par tous les modules)
   ========================================================= */
let cases = load("cases", [{ id: Date.now(), name: "Exercice 1", entries: [] }]);
let activeCase = load("activeCase", cases[0].id);
const currentCase = () => cases.find(c => c.id === activeCase) || cases[0];
const saveCases = () => { save("cases", cases); save("activeCase", activeCase); renderCaseSelect(); renderTimeline(); };

function addEntry(e) {
  currentCase().entries.push({ date: new Date().toISOString(), conf: 3, ...e });
  saveCases(); toast(`Ajouté à « ${currentCase().name} »`);
}
function renderCaseSelect() {
  $("caseSelect").innerHTML = cases.map(c => `<option value="${c.id}" ${c.id === activeCase ? "selected" : ""}>${esc(c.name)}</option>`).join("");
}
$("caseSelect").onchange = e => { activeCase = +e.target.value; saveCases(); };
$("addCase").onclick = () => {
  const n = $("newCase").value.trim(); if (!n) return;
  const c = { id: Date.now(), name: n, entries: [] }; cases.push(c); activeCase = c.id; $("newCase").value = ""; saveCases();
};
$("renameCase").onclick = () => { const n = prompt("Nouveau nom :", currentCase().name); if (n) { currentCase().name = n; saveCases(); } };
$("delCase").onclick = () => {
  if (cases.length === 1) return toast("Il faut garder au moins une enquête");
  if (!confirm(`Supprimer « ${currentCase().name} » ?`)) return;
  cases = cases.filter(c => c.id !== activeCase); activeCase = cases[0].id; saveCases();
};
$("rConf").oninput = e => $("rConfLbl").textContent = `Confiance ${e.target.value}/5`;
$("rAdd").onclick = () => {
  const e = { clue: $("rClue").value, hyp: $("rHyp").value, proof: $("rProof").value, gps: $("rGps").value, conf: +$("rConf").value };
  if (!e.clue && !e.hyp && !e.proof) return toast("Remplis au moins un champ");
  addEntry(e); ["rClue", "rHyp", "rProof", "rGps"].forEach(i => $(i).value = "");
};
function renderTimeline() {
  const list = currentCase().entries;
  $("rList").innerHTML = list.length ? list.map((e, i) => `
    <li><div class="meta">${new Date(e.date).toLocaleString("fr-FR")} · <span class="stars">${"★".repeat(e.conf)}${"☆".repeat(5 - e.conf)}</span>
      <span class="del" data-i="${i}" style="float:right;cursor:pointer">✕</span></div>
      ${e.clue ? `<b>Indice :</b> ${esc(e.clue)}<br>` : ""}${e.hyp ? `<b>Hypothèse :</b> ${esc(e.hyp)}<br>` : ""}
      ${e.proof ? `<b>Preuve :</b> ${esc(e.proof)}<br>` : ""}${e.gps ? `<b>GPS :</b> <a href="#" class="gps" data-g="${esc(e.gps)}">${esc(e.gps)}</a>` : ""}
    </li>`).join("") : `<p class="muted">Aucun élément pour l'instant.</p>`;
  $("rList").querySelectorAll(".del").forEach(d => d.onclick = () => { list.splice(d.dataset.i, 1); saveCases(); });
  $("rList").querySelectorAll(".gps").forEach(a => a.onclick = ev => { ev.preventDefault(); const p = parseLatLng(a.dataset.g); if (p) { go("map"); selectPoint(p[0], p[1], 16); } });
  if (typeof refreshCaseMarkers === "function") refreshCaseMarkers();
}
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click();
}
$("exportMd").onclick = () => {
  const c = currentCase();
  let md = `# ${c.name}\n_Exporté le ${new Date().toLocaleString("fr-FR")}_\n\n| # | Date | Indice | Hypothèse | Preuve | GPS | Confiance |\n|---|---|---|---|---|---|---|\n`;
  c.entries.forEach((e, i) => md += `| ${i + 1} | ${new Date(e.date).toLocaleString("fr-FR")} | ${e.clue || ""} | ${e.hyp || ""} | ${e.proof || ""} | ${e.gps || ""} | ${e.conf}/5 |\n`.replace(/\n(?!$)/g, " "));
  download(`${c.name.replace(/\W+/g, "_")}.md`, md, "text/markdown");
};
$("exportJson").onclick = () => download(`osint-hub-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
  JSON.stringify({ cases, tasks, sessions, totalSecs }, null, 2), "application/json");
$("importJson").onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (!confirm("Remplacer toutes les données actuelles par la sauvegarde ?")) return;
    ["cases", "tasks", "sessions", "totalSecs"].forEach(k => d[k] !== undefined && save(k, d[k]));
    location.reload();
  } catch { toast("Fichier invalide"); }
};

/* =========================================================
   RECHERCHE
   ========================================================= */
const detectType = q => {
  if (!q) return null;
  if (/^https?:\/\/\S+\.(jpe?g|png|webp|gif|bmp)(\?.*)?$/i.test(q)) return "image";
  if (/^https?:\/\//i.test(q)) return "url";
  if (/^\S+$/.test(q)) return "pseudo";
  return "name";
};
const typeLabel = { pseudo: "Pseudo", name: "Nom / texte", url: "URL de page", image: "URL d'image" };
function dorkQuery() {
  const q = $("q").value.trim(); if (!q) return "";
  const term = $("dorkExact").checked ? `"${q}"` : q;
  const sites = [...document.querySelectorAll(".dork:checked")].map(c => c.value);
  return sites.length ? `${term} (${sites.join(" OR ")})` : term;
}
const toolGroups = [
  { name: "Moteurs & Dorks", for: ["pseudo", "name"], tools: [
    ["Google", "Avec tes filtres", () => `https://www.google.com/search?q=${enc(dorkQuery())}`],
    ["Bing", "Résultats différents de Google", () => `https://www.bing.com/search?q=${enc(dorkQuery())}`],
    ["DuckDuckGo", "Sans personnalisation", () => `https://duckduckgo.com/?q=${enc(dorkQuery())}`],
    ["Google Images", "Photos associées", () => `https://www.google.com/search?tbm=isch&q=${enc(dorkQuery())}`]]},
  { name: "Pseudos", for: ["pseudo"], tools: [
    ["WhatsMyName", "Présence sur des centaines de sites", q => `https://whatsmyname.app/?q=${enc(q)}`],
    ["Instagram", "Profil direct", q => `https://www.instagram.com/${enc(q)}/`],
    ["TikTok", "Profil direct", q => `https://www.tiktok.com/@${enc(q)}`],
    ["X / Twitter", "Profil direct", q => `https://x.com/${enc(q)}`]]},
  { name: "Image inversée", for: ["image"], tools: [
    ["Google Lens", "Objets, lieux, visages publics", q => `https://lens.google.com/uploadbyurl?url=${enc(q)}`],
    ["Yandex", "Très bon sur les lieux", q => `https://yandex.com/images/search?rpt=imageview&url=${enc(q)}`],
    ["TinEye", "Première apparition d'une image", q => `https://tineye.com/search?url=${enc(q)}`],
    ["Bing Visual", "Alternative", q => `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${enc(q)}`]]},
  { name: "Archives", for: ["url", "image"], tools: [
    ["Wayback Machine", "Historique de la page", q => `https://web.archive.org/web/*/${q}`],
    ["Archiver maintenant", "Créer une preuve horodatée", q => `https://web.archive.org/save/${q}`],
    ["archive.today", "Dernière capture", q => `https://archive.ph/newest/${q}`]]}
];
function renderTools() {
  const q = $("q").value.trim(), type = detectType(q);
  $("qType").textContent = type ? typeLabel[type] : "—";
  $("dorkPreview").textContent = dorkQuery() || "—";
  $("toolGroups").innerHTML = toolGroups.map((g, gi) => {
    const ok = type && g.for.includes(type);
    return `<div class="group"><div class="group-head"><h2>${g.name}</h2>
      ${ok ? `<button class="small ghost" data-all="${gi}">Tout ouvrir</button>` : ""}</div>
      <div class="tools">${g.tools.map((t, ti) => `<button class="tool ${ok ? "" : "disabled"}" data-g="${gi}" data-t="${ti}"><b>${t[0]}</b><small>${t[1]}</small></button>`).join("")}</div></div>`;
  }).join("");
  document.querySelectorAll(".tool[data-g]").forEach(b => b.onclick = () => openUrl(toolGroups[b.dataset.g].tools[b.dataset.t][2](q)));
  document.querySelectorAll("[data-all]").forEach(b => b.onclick = () => toolGroups[b.dataset.all].tools.forEach(t => openUrl(t[2](q))));
}
$("q").oninput = renderTools;
document.querySelectorAll(".dork,#dorkExact").forEach(c => c.onchange = renderTools);
$("q").onkeydown = e => { if (e.key === "Enter") document.querySelector(".tool:not(.disabled)")?.click(); };
renderTools();

/* =========================================================
   CARTE GEOINT (Leaflet + IGN + soleil)
   ========================================================= */
const ign = (layer, fmt) => L.tileLayer(`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${fmt}`, { maxZoom: 19, attribution: "© IGN" });
const layers = {
  "Plan IGN": ign("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png"),
  "Photo aérienne IGN": ign("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg"),
  "OpenStreetMap": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }),
  "Satellite (Esri)": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "© Esri" })
};
const map = L.map("leaflet", { layers: [layers["Plan IGN"]] }).setView([45.764, 4.8357], 11);
L.control.layers(layers).addTo(map);
L.control.scale({ imperial: false }).addTo(map);

let point = null, marker = null, sunLines = L.layerGroup().addTo(map), caseMarkers = L.layerGroup().addTo(map);
const fmtLL = (a, b) => `${a.toFixed(5)}, ${b.toFixed(5)}`;
function parseLatLng(s) {
  const m = String(s).match(/(-?\d+(?:\.\d+)?)[,;\s]+(-?\d+(?:\.\d+)?)/);
  return m ? [+m[1], +m[2]] : null;
}
const pad = n => String(n).padStart(2, "0");
const pointTools = [
  ["Street View", (a, b) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${a},${b}`],
  ["Google Maps", (a, b) => `https://www.google.com/maps/search/?api=1&query=${a},${b}`],
  ["Google Earth", (a, b) => `https://earth.google.com/web/@${a},${b},300a,800d,35y,0h,45t,0r`],
  ["Géoportail", (a, b) => `https://www.geoportail.gouv.fr/carte?c=${b},${a}&z=17&l0=ORTHOIMAGERY.ORTHOPHOTOS::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`],
  ["Mapillary", (a, b) => `https://www.mapillary.com/app/?lat=${a}&lng=${b}&z=17`],
  ["SunCalc", (a, b) => { const d = new Date($("sunDate").value || Date.now()); return `https://www.suncalc.org/#/${a},${b},17/${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}/${pad(d.getHours())}:${pad(d.getMinutes())}/1/3`; }],
  ["Overpass Turbo", (a, b) => `https://overpass-turbo.eu/?C=${a};${b};16&Q=${enc(`[out:json];\n// Exemple : arrêts de bus à 500 m\nnode(around:500,${a},${b})[highway=bus_stop];\nout;`)}&R`],
  ["Cartoradio", (a, b) => `https://www.cartoradio.fr/index.html#/cartographie/lonlat/${b}/${a}`],
  ["OpenStreetMap", (a, b) => `https://www.openstreetmap.org/?mlat=${a}&mlon=${b}#map=17/${a}/${b}`]
];
function selectPoint(lat, lng, zoom) {
  point = [lat, lng];
  if (marker) marker.setLatLng(point); else marker = L.marker(point).addTo(map);
  if (zoom) map.setView(point, zoom);
  $("coords").textContent = fmtLL(lat, lng);
  $("pointTools").innerHTML = pointTools.map((t, i) => `<button data-p="${i}">${t[0]}</button>`).join("");
  $("pointTools").querySelectorAll("button").forEach(b => b.onclick = () => openUrl(pointTools[b.dataset.p][1](lat, lng)));
  updateSun();
}
function updateSun() {
  sunLines.clearLayers();
  if (!point || !window.SunCalc) return;
  const d = new Date($("sunDate").value || Date.now());
  const p = SunCalc.getPosition(d, point[0], point[1]);
  const az = (p.azimuth * 180 / Math.PI + 180) % 360, alt = p.altitude * 180 / Math.PI;
  const t = SunCalc.getTimes(d, point[0], point[1]), h = x => x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const shadow = alt > 0 ? (1 / Math.tan(p.altitude)).toFixed(2) : "—";
  $("sunInfo").innerHTML = `Azimut soleil : <b>${az.toFixed(0)}°</b> · Hauteur : <b>${alt.toFixed(0)}°</b><br>
    Ombre vers <b>${((az + 180) % 360).toFixed(0)}°</b>, longueur ≈ <b>${shadow}×</b> la hauteur de l'objet<br>
    Lever ${h(t.sunrise)} · Coucher ${h(t.sunset)}<br><span style="color:#fbbf24">━ soleil</span> &nbsp; <span style="color:#94a3b8">━ ombre</span>`;
  const dest = (deg, km) => { const r = deg * Math.PI / 180; return [point[0] + km / 111 * Math.cos(r), point[1] + km / (111 * Math.cos(point[0] * Math.PI / 180)) * Math.sin(r)]; };
  const km = 40075 / Math.pow(2, map.getZoom()) / 4;
  if (alt > 0) {
    L.polyline([point, dest(az, km)], { color: "#fbbf24", weight: 3 }).addTo(sunLines);
    L.polyline([point, dest(az + 180, km * .6)], { color: "#94a3b8", weight: 3, dashArray: "6 6" }).addTo(sunLines);
  }
}
map.on("click", e => selectPoint(e.latlng.lat, e.latlng.lng));
map.on("zoomend", updateSun);
const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
$("sunDate").value = now.toISOString().slice(0, 16);
$("sunDate").onchange = updateSun;
$("copyCoords").onclick = () => point && navigator.clipboard.writeText(fmtLL(...point)).then(() => toast("Coordonnées copiées"));
$("pinToCase").onclick = () => {
  if (!point) return toast("Clique d'abord sur la carte");
  const note = prompt("Note pour ce point :", "") ?? ""; addEntry({ clue: note || "Point placé sur la carte", gps: fmtLL(...point) });
};
function refreshCaseMarkers() {
  caseMarkers.clearLayers();
  currentCase().entries.forEach(e => { const p = parseLatLng(e.gps); if (p) L.circleMarker(p, { radius: 7, color: "#a78bfa", fillOpacity: .8 }).bindPopup(esc(e.clue || e.hyp || e.gps)).addTo(caseMarkers); });
}
// Recherche d'adresse (Nominatim / OpenStreetMap)
let geoTimer;
$("geoQ").oninput = () => {
  clearTimeout(geoTimer);
  const q = $("geoQ").value.trim(), ll = parseLatLng(q);
  if (!q) return $("geoResults").innerHTML = "";
  if (ll && /^[-\d.,;\s]+$/.test(q)) return $("geoResults").innerHTML = `<div data-ll="${ll}">📍 Aller à ${fmtLL(...ll)}</div>`, bindGeo();
  geoTimer = setTimeout(async () => {
    try {
      const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=fr&q=${enc(q)}`)).json();
      $("geoResults").innerHTML = r.map(x => `<div data-ll="${x.lat},${x.lon}">${esc(x.display_name)}</div>`).join("") || `<div>Aucun résultat</div>`;
      bindGeo();
    } catch { $("geoResults").innerHTML = "<div>Recherche indisponible</div>"; }
  }, 500);
};
function bindGeo() {
  $("geoResults").querySelectorAll("[data-ll]").forEach(d => d.onclick = () => {
    const [a, b] = d.dataset.ll.split(",").map(Number); selectPoint(a, b, 16); $("geoResults").innerHTML = "";
  });
}

/* =========================================================
   ANALYSE PHOTO
   ========================================================= */
let exifPoint = null;
async function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  $("preview").src = URL.createObjectURL(file);
  $("exifToMap").hidden = true; exifPoint = null;
  let rows = [["Fichier", file.name], ["Taille", (file.size / 1024).toFixed(0) + " Ko"]];
  try {
    const x = await exifr.parse(file, { gps: true }) || {};
    if (x.DateTimeOriginal) rows.push(["Date de prise", new Date(x.DateTimeOriginal).toLocaleString("fr-FR")]);
    if (x.Make || x.Model) rows.push(["Appareil", `${x.Make || ""} ${x.Model || ""}`]);
    if (x.Software) rows.push(["Logiciel", x.Software]);
    if (x.latitude) { exifPoint = [x.latitude, x.longitude]; rows.push(["GPS", fmtLL(...exifPoint)]); $("exifToMap").hidden = false; }
    if (rows.length === 2) rows.push(["Info", "Aucune métadonnée : normal pour une image issue d'un réseau social (supprimées à l'envoi)."]);
  } catch { rows.push(["Info", "Métadonnées illisibles"]); }
  $("exif").innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join("");
}
$("file").onchange = e => loadImage(e.target.files[0]);
const drop = $("drop");
["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => loadImage(e.dataTransfer.files[0]));
document.addEventListener("paste", e => { const f = [...e.clipboardData.files][0]; if (f) { go("photo"); loadImage(f); } });
$("preview").onclick = () => $("preview").classList.toggle("zoom");
$("exifToMap").onclick = () => { go("map"); selectPoint(...exifPoint, 17); };
const clueFields = ["Panneaux / textes", "Langue / écriture", "Plaques d'immatriculation", "Mobilier urbain", "Végétation / climat", "Relief / horizon", "Architecture", "Enseignes / commerces", "Transports", "Ombres / heure"];
$("clueGrid").innerHTML = clueFields.map((f, i) => `<div class="clue"><label>${f}</label><input data-c="${i}" placeholder="…"></div>`).join("");
$("cluesToCase").onclick = () => {
  const obs = [...document.querySelectorAll("[data-c]")].filter(i => i.value).map(i => `${clueFields[i.dataset.c]} : ${i.value}`);
  if (!obs.length) return toast("Aucune observation saisie");
  addEntry({ clue: obs.join(" · "), proof: $("exif").innerText.includes("GPS") && exifPoint ? "EXIF GPS présent" : "", gps: exifPoint ? fmtLL(...exifPoint) : "" });
  document.querySelectorAll("[data-c]").forEach(i => i.value = "");
};

/* =========================================================
   ENTRAÎNEMENT
   ========================================================= */
// 👉 Remplace ces URL par celles de TES cartes GeoGuessr
const ggMaps = [["Carte France", "https://www.geoguessr.com/maps"], ["Carte Lyon / AURA", "https://www.geoguessr.com/maps"], ["Partie No Move", "https://www.geoguessr.com"]];
$("ggLinks").innerHTML = ggMaps.map(m => `<a href="${m[1]}" target="_blank" rel="noopener">${m[0]}</a>`).join("");
let sessions = load("sessions", load("gg", []));
function renderSessions() {
  $("ggList").innerHTML = sessions.slice(0, 8).map((s, i) => `<li>${s.date} — ${esc(s.map)} : <b>${s.score}</b><span class="del" data-i="${i}">✕</span></li>`).join("");
  $("ggList").querySelectorAll(".del").forEach(d => d.onclick = () => { sessions.splice(d.dataset.i, 1); save("sessions", sessions); renderSessions(); });
  drawChart();
}
function drawChart() {
  const c = $("ggChart"), ctx = c.getContext("2d"); c.width = c.clientWidth || 400;
  ctx.clearRect(0, 0, c.width, c.height);
  const pts = sessions.slice(0, 20).reverse().map(s => +s.score); if (pts.length < 2) return;
  const max = Math.max(...pts), min = Math.min(...pts), W = c.width, H = c.height;
  ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.beginPath();
  pts.forEach((v, i) => { const x = i * (W - 10) / (pts.length - 1) + 5, y = H - 10 - (v - min) / ((max - min) || 1) * (H - 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
}
$("ggAdd").onclick = () => {
  if (!$("ggScore").value) return;
  sessions.unshift({ date: new Date().toLocaleDateString("fr-FR"), map: $("ggMap").value, score: +$("ggScore").value });
  save("sessions", sessions); $("ggScore").value = ""; renderSessions();
};
let tasks = load("tasks", [
  { t: "Gralhix — premier défi de géolocalisation", d: false },
  { t: "Bellingcat — guide de géolocalisation", d: false },
  { t: "Maîtriser la recherche d'image inversée (Lens, Yandex, TinEye)", d: false },
  { t: "Configurer un navigateur dédié (OPSEC)", d: false }
]).map(x => ({ t: x.t, d: x.d }));
function renderTasks() {
  $("taskList").innerHTML = tasks.map((x, i) => `<li class="${x.d ? "done" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span>${esc(x.t)}</span><span class="del" data-x="${i}">✕</span></li>`).join("");
  $("taskList").querySelectorAll("input").forEach(c => c.onchange = () => { tasks[c.dataset.i].d = c.checked; save("tasks", tasks); renderTasks(); });
  $("taskList").querySelectorAll(".del").forEach(d => d.onclick = () => { tasks.splice(d.dataset.x, 1); save("tasks", tasks); renderTasks(); });
  $("taskBar").style.width = (tasks.length ? tasks.filter(x => x.d).length / tasks.length * 100 : 0) + "%";
}
$("taskAdd").onclick = () => { const v = $("taskInput").value.trim(); if (v) { tasks.push({ t: v, d: false }); save("tasks", tasks); $("taskInput").value = ""; renderTasks(); } };
$("taskInput").onkeydown = e => e.key === "Enter" && $("taskAdd").click();

// Chronomètre (le temps total est cumulé pour les statistiques)
let secs = 0, totalSecs = load("totalSecs", 0), timerId = null;
const fmtT = s => new Date(s * 1000).toISOString().substring(11, 19);
$("tToggle").onclick = () => {
  if (timerId) { clearInterval(timerId); timerId = null; $("tToggle").textContent = "▶"; return; }
  $("tToggle").textContent = "⏸";
  timerId = setInterval(() => { secs++; totalSecs++; $("timer").textContent = fmtT(secs); if (secs % 10 === 0) save("totalSecs", totalSecs); }, 1000);
};
$("tReset").onclick = () => { if (timerId) $("tToggle").click(); save("totalSecs", totalSecs); secs = 0; $("timer").textContent = fmtT(0); };

/* =========================================================
   TABLEAU DE BORD
   ========================================================= */
function renderDashboard() {
  $("sTime").textContent = totalSecs < 3600 ? Math.floor(totalSecs / 60) + " min" : (totalSecs / 3600).toFixed(1) + " h";
  $("sSessions").textContent = sessions.length;
  $("sChallenges").textContent = `${tasks.filter(x => x.d).length} / ${tasks.length}`;
  $("sEntries").textContent = cases.reduce((n, c) => n + c.entries.length, 0);
  $("dashTasks").innerHTML = tasks.filter(x => !x.d).slice(0, 4).map(x => `<li>⬜ ${esc(x.t)}</li>`).join("") || `<li class="muted">Tout est terminé 🎉</li>`;
  const all = cases.flatMap(c => c.entries.map(e => ({ ...e, c: c.name }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  $("dashEntries").innerHTML = all.map(e => `<li><span class="muted small">${esc(e.c)}</span> ${esc(e.clue || e.hyp || e.gps)}</li>`).join("") || `<li class="muted">Aucune entrée</li>`;
}

/* =========================================================
   PALETTE DE COMMANDES (Ctrl+K) + raccourcis clavier
   ========================================================= */
const commands = [
  ["🏠 Tableau de bord", () => go("dashboard")], ["🔎 Recherche", () => { go("search"); $("q").focus(); }],
  ["🗺️ Carte GEOINT", () => go("map")], ["📷 Analyse photo", () => go("photo")],
  ["🎯 Entraînement", () => go("training")], ["📁 Enquêtes", () => go("cases")],
  ["⏱️ Démarrer / pause chrono", () => $("tToggle").click()],
  ["💾 Sauvegarder toutes les données", () => $("exportJson").click()],
  ...pointTools.map(t => [`🌍 Ouvrir ${t[0]} (point sélectionné)`, () => point ? openUrl(t[1](...point)) : toast("Aucun point sélectionné")])
];
let sel = 0;
function openPalette() { $("palette").hidden = false; $("paletteQ").value = ""; renderPalette(); $("paletteQ").focus(); }
function renderPalette() {
  const q = $("paletteQ").value.toLowerCase();
  const list = commands.filter(c => c[0].toLowerCase().includes(q)); sel = Math.min(sel, list.length - 1);
  $("paletteList").innerHTML = list.map((c, i) => `<li class="${i === sel ? "sel" : ""}" data-i="${commands.indexOf(c)}">${c[0]}</li>`).join("");
  $("paletteList").querySelectorAll("li").forEach(li => li.onclick = () => runCmd(li.dataset.i));
}
const runCmd = i => { $("palette").hidden = true; commands[i][1](); };
$("paletteQ").oninput = () => { sel = 0; renderPalette(); };
$("paletteQ").onkeydown = e => {
  const items = $("paletteList").querySelectorAll("li");
  if (e.key === "ArrowDown") { sel = Math.min(sel + 1, items.length - 1); renderPalette(); }
  if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); renderPalette(); }
  if (e.key === "Enter" && items[sel]) runCmd(items[sel].dataset.i);
};
$("palette").onclick = e => { if (e.target.id === "palette") $("palette").hidden = true; };
$("openPalette").onclick = openPalette;
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
  if (e.key === "Escape") $("palette").hidden = true;
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
  if (!typing && !e.ctrlKey && /^[1-6]$/.test(e.key)) go(["dashboard", "search", "map", "photo", "training", "cases"][e.key - 1]);
});

// ---------- Démarrage ----------
renderCaseSelect(); renderTimeline(); renderSessions(); renderTasks(); renderDashboard();
if (location.hash) go(location.hash.slice(1));
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
