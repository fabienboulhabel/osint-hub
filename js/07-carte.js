/* OSINT Hub — 07-carte.js · voir js/README.md pour l'ordre de chargement */
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
  extraLayer = L.layerGroup().addTo(map);
  ovLayer = L.layerGroup().addTo(map);
  map.createPane("cmp").style.zIndex = 250;
  map.on("move zoom resize", clipCompare);
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

/* ---------- Rayon autour du point ---------- */
let extraLayer, ovLayer;
$("radAdd").onclick = () => {
  if (!map) return;
  if (!point) return toast("Place d'abord un point sur la carte");
  const km = parseFloat(String($("radKm").value).replace(",", "."));
  if (!(km > 0)) return toast("Indique un rayon en kilomètres");
  const c = L.circle(point, { radius: km * 1000, color: ACCENT, weight: 2, dashArray: "6 5", fillOpacity: .06 }).addTo(extraLayer);
  c.bindTooltip(`${String(km).replace(".", ",")} km`, { permanent: true, direction: "top", className: "measure-lbl" });
  map.fitBounds(c.getBounds(), { padding: [30, 30] });
  $("radOut").textContent = `Cercle de ${String(km).replace(".", ",")} km autour de ${fmtLL(...point)}.`;
};
$("radClear").onclick = () => { extraLayer?.clearLayers(); $("radOut").textContent = "Cercles effacés."; };

/* ---------- Calques Overpass : objets OpenStreetMap affichés sur la carte ---------- */
const OV_PRESETS = [
  ["Arrêts de bus", '["highway"="bus_stop"]'], ["Gares et haltes", '["railway"~"^(station|halt)$"]'],
  ["Lieux de culte", '["amenity"="place_of_worship"]'], ["Pharmacies", '["amenity"="pharmacy"]'],
  ["Stations-service", '["amenity"="fuel"]'], ["Écoles", '["amenity"="school"]'],
  ["Châteaux d'eau", '["man_made"="water_tower"]'], ["Antennes et pylônes télécom", '["man_made"~"^(mast|tower|communications_tower)$"]'],
  ["Éoliennes", '["generator:source"="wind"]'], ["Ronds-points", '["junction"="roundabout"]'],
  ["Ponts", '["bridge"="yes"]'], ["Supermarchés", '["shop"="supermarket"]'], ["Personnalisé…", null]
];
$("ovPreset").innerHTML = OV_PRESETS.map((p, i) => `<option value="${i}">${p[0]}</option>`).join("");
$("ovPreset").onchange = () => { $("ovCustomRow").hidden = OV_PRESETS[+$("ovPreset").value][1] !== null; };
function ovFilter() {
  const p = OV_PRESETS[+$("ovPreset").value];
  if (p[1]) return p[1];
  const m = $("ovCustom").value.trim().match(/^([\w:.-]+)\s*=\s*(.+)$/);
  return m ? `["${m[1]}"="${m[2].replace(/"/g, "")}"]` : null;
}
/* ---------- Traduction des données OpenStreetMap en français ---------- */
const OSM_KEYS = {
    amenity: "Équipement", shop: "Commerce", highway: "Voirie", railway: "Ferroviaire", man_made: "Ouvrage", "generator:source": "Source d'énergie",
    junction: "Carrefour", bridge: "Pont", building: "Bâtiment", brand: "Enseigne", operator: "Exploitant", opening_hours: "Horaires",
    phone: "Téléphone", "contact:phone": "Téléphone", website: "Site web", "contact:website": "Site web", religion: "Religion", denomination: "Confession",
    network: "Réseau", route_ref: "Lignes", ref: "Référence", wheelchair: "Accès fauteuil roulant", shelter: "Abri", bench: "Banc",
    height: "Hauteur", "tower:type": "Type de tour", fuel: "Carburant", "fuel:diesel": "Gazole", "fuel:e10": "SP95-E10", "fuel:octane_98": "SP98",
    "fuel:lpg": "GPL", "school:FR": "Type d'école", isced: "Niveau", level: "Étage", start_date: "Date de construction", heritage: "Patrimoine",
    "generator:output:electricity": "Puissance", "drive_through": "Service au volant", "payment:cards": "Carte bancaire", self_service: "Libre-service",
    "service:vehicle:car_wash": "Lavage", "bridge:name": "Nom du pont", maxweight: "Poids maximal", layer: "Niveau"
};
const OSM_VALS = {
    supermarket: "Supermarché", convenience: "Supérette", bakery: "Boulangerie", butcher: "Boucherie", hairdresser: "Coiffeur", clothes: "Vêtements",
    pharmacy: "Pharmacie", fuel: "Station-service", school: "École", place_of_worship: "Lieu de culte", bus_stop: "Arrêt de bus",
    station: "Gare", halt: "Halte ferroviaire", water_tower: "Château d'eau", mast: "Mât", tower: "Tour", communications_tower: "Tour de télécommunications",
    wind: "Éolien", roundabout: "Rond-point", restaurant: "Restaurant", cafe: "Café", bar: "Bar", fast_food: "Restauration rapide", bank: "Banque",
    post_office: "Bureau de poste", townhall: "Mairie", police: "Police", fire_station: "Caserne de pompiers", hospital: "Hôpital", doctors: "Cabinet médical",
    parking: "Parking", toilets: "Toilettes", library: "Bibliothèque", kindergarten: "École maternelle", college: "Établissement supérieur",
    church: "Église", chapel: "Chapelle", mosque: "Mosquée", synagogue: "Synagogue", temple: "Temple", communication: "Télécommunications",
    yes: "Oui", no: "Non", limited: "Partiel", designated: "Prévu", christian: "Chrétienne", catholic: "Catholique", roman_catholic: "Catholique",
    protestant: "Protestante", reformed: "Réformée", orthodox: "Orthodoxe", muslim: "Musulmane", jewish: "Juive", buddhist: "Bouddhiste",
    primaire: "Primaire", maternelle: "Maternelle", élémentaire: "Élémentaire", collège: "Collège", lycée: "Lycée", lattice: "Treillis", monopole: "Monopole"
};
const OSM_DAYS = { Mo: "lun.", Tu: "mar.", We: "mer.", Th: "jeu.", Fr: "ven.", Sa: "sam.", Su: "dim.", PH: "jours fériés", SH: "vacances scolaires" };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const trVal = v => String(v).split(";").map(x => OSM_VALS[x.trim()] || x.trim().replace(/_/g, " ")).map(cap).join(", ");
const trHours = h => h === "24/7" ? "24 h/24, 7 j/7" : String(h)
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|SH)\b/g, d => OSM_DAYS[d]).replace(/\boff\b/g, "fermé").replace(/-/g, " – ").replace(/;\s*/g, " · ").replace(/,/g, ", ");
function osmType(t, key) { return trVal(t[key] || t.amenity || t.shop || t.highway || t.railway || t.man_made || "objet"); }
function osmAddress(t) {
    const rue = [t["addr:housenumber"], t["addr:street"] || t["addr:place"]].filter(Boolean).join(" ");
    const ville = [t["addr:postcode"], t["addr:city"]].filter(Boolean).join(" ");
    return [rue, ville].filter(Boolean).join(", ");
}
function osmPopup(el, t, key, ll) {
    const type = osmType(t, key), name = t["name:fr"] || t.name || t.brand || `${type} sans nom`;
    const rows = [], add = (l, v) => v && rows.push(`<tr><th>${l}</th><td>${v}</td></tr>`);
    if (t.brand && t.brand !== name) add("Enseigne", esc(t.brand));
    if (t.operator && t.operator !== t.brand) add("Exploitant", esc(t.operator));
    add("Adresse", esc(osmAddress(t)));
    if (t.opening_hours) add("Horaires", esc(trHours(t.opening_hours)));
    const tel = t.phone || t["contact:phone"]; if (tel) add("Téléphone", `<a href="tel:${esc(tel.replace(/\s/g, ""))}">${esc(tel)}</a>`);
    const web = t.website || t["contact:website"]; if (web) add("Site web", `<a href="${esc(web)}" target="_blank" rel="noopener">${esc(web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))} ↗</a>`);
    const shown = new Set(["name", "name:fr", "brand", "operator", "opening_hours", "phone", "contact:phone", "website", "contact:website", key]);
    Object.keys(t).filter(k => OSM_KEYS[k] && !shown.has(k)).slice(0, 6).forEach(k => add(OSM_KEYS[k], esc(trVal(t[k]))));
    const raw = Object.entries(t).map(([k, v]) => `<div><span>${esc(k)}</span> = ${esc(v)}</div>`).join("");
    return `<div class="ovp">
    <span class="ovp-type mono">${esc(type)}</span>
    <b class="ovp-name">${esc(name)}</b>
    ${rows.length ? `<table class="ovp-tbl">${rows.join("")}</table>` : `<p class="ovp-none">Aucune information complémentaire renseignée.</p>`}
    <details class="ovp-raw"><summary>Données OpenStreetMap brutes (${Object.keys(t).length})</summary><div class="mono">${raw}</div></details>
    <div class="ovp-act">
      <button class="btn sm" onclick="selectPoint(${ll[0]},${ll[1]})">Sélectionner ce point</button>
      <a class="btn ghost sm" href="https://www.openstreetmap.org/${el.type}/${el.id}" target="_blank" rel="noopener">Voir sur OSM ↗</a>
    </div></div>`;
}

/* ---------- Calques Overpass ---------- */
let ovBusy = false;
// Contrôle côté application : l'objet doit porter exactement le tag demandé (le serveur peut renvoyer des objets voisins)
function ovMatcher(f) {
  const m = f.match(/^\["([^"]+)"(=|~)"([^"]*)"\]$/);
  if (!m) return () => true;
  const [, k, op, v] = m, re = op === "~" ? new RegExp(v) : null;
  return t => !!t && k in t && (re ? re.test(t[k]) : t[k] === v);
}
// Interroge Overpass : plusieurs serveurs si le module Mobilité est chargé (overpassFetch), sinon le serveur principal seul
async function ovQuery(q, onProgress) {
  if (typeof overpassFetch === "function") return overpassFetch(q, onProgress);
  const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + enc(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (r.status === 429) throw new Error("serveur Overpass saturé, réessaie dans une minute");
  if (!r.ok) throw new Error("serveur Overpass indisponible (" + r.status + ")");
  return (await r.json()).elements || [];
}
// Expressions Nominatim équivalentes, pour le secours quand Overpass ne répond pas (résultats partiels : 40 au plus)
const OV_NOMI = { "Arrêts de bus": "bus stop", "Gares et haltes": "train station", "Lieux de culte": "place of worship", "Pharmacies": "pharmacy",
  "Stations-service": "petrol station", "Écoles": "school", "Châteaux d'eau": "water tower", "Ponts": "bridge", "Supermarchés": "supermarket" };
function ovDrawResults(els, ok, key, b) {
  let kept = 0, dropped = 0;
  els.forEach(el => {
    const ll = el.type === "node" ? [el.lat, el.lon] : el.center ? [el.center.lat, el.center.lon] : null;
    const t = el.tags || {};
    if (!ll || !ok(t) || !b.contains(ll)) { dropped++; return; }
    kept++;
    const label = t["name:fr"] || t.name || t.brand || osmType(t, key);
    L.circleMarker(ll, { radius: 7, color: "#0d0d0d", weight: 1.5, fillColor: ACCENT, fillOpacity: .9 })
      .bindTooltip(esc(label), { direction: "top", offset: [0, -6], className: "ov-tip" })
      .bindPopup(osmPopup(el, t, key, ll), { maxWidth: 320, minWidth: 240 })
      .addTo(ovLayer);
  });
  return { kept, dropped };
}
$("ovRun").onclick = async () => {
  if (!map || ovBusy) return;
  map.invalidateSize(); // taille réelle de la carte (visionneuse, redimensionnement…)
  if (map.getZoom() < 13) return toast("Zoome davantage (niveau 13 minimum) pour limiter la zone");
  const f = ovFilter(); if (!f) return toast("Filtre personnalisé : écris clé=valeur (ex. shop=bakery)");
  const name = OV_PRESETS[+$("ovPreset").value][0], ok = ovMatcher(f);
  const key = (f.match(/^\["([^"]+)"/) || [])[1];
  const b = map.getBounds(), bb = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map(v => v.toFixed(5)).join(",");
  const q = `[out:json][timeout:25];nwr${f}(${bb});out tags center 400;`;
  ovBusy = true; ovLayer.clearLayers(); $("ovOut").textContent = "Requête en cours…";
  L.rectangle(b, { color: ACCENT, weight: 1.5, dashArray: "5 5", fill: false, interactive: false }).addTo(ovLayer);
  const summary = (r, tag) => r.kept
    ? `${r.kept} résultat${r.kept > 1 ? "s" : ""} « ${name} » dans la zone en pointillés${r.kept >= 400 ? " (limité à 400)" : ""}${r.dropped ? ` · ${r.dropped} écarté${r.dropped > 1 ? "s" : ""}` : ""}${tag || ""}. Survole un point pour son nom, clique pour sa fiche.`
    : `Aucun résultat « ${name} » dans la zone en pointillés${tag || ""}.`;
  try {
    const els = await ovQuery(q, (host, i, n, sec) => { $("ovOut").textContent = `Interrogation de ${host}… ${sec || 0} s (un serveur public peut mettre une trentaine de secondes)`; });
    $("ovOut").textContent = summary(ovDrawResults(els, ok, key, b));
  } catch (err) {
    if (err.cancelled) { ovBusy = false; return; }
    // 1. Secours : Nominatim, qui répond même quand Overpass est saturé
    const phrase = OV_NOMI[name] || (OV_PRESETS[+$("ovPreset").value][1] === null ? (f.match(/="([^"]+)"/) || [])[1] : null);
    let rescue = null;
    if (phrase && typeof nominatimBox === "function") {
      $("ovOut").textContent = "Overpass ne répond pas : recherche de secours (Nominatim)…";
      try { rescue = ovDrawResults(await nominatimBox(b, phrase), ok, key, b); } catch { rescue = null; }
    }
    // 2. Message : résultat de secours, raison de l'échec, lien Overpass Turbo, puis test de connexion
    const detail = err.report ? err.report.map(r => `${r.host} : ${r.kind}`).join(" ; ") : (err.message || "connexion impossible");
    const turbo = typeof overpassTurboUrl === "function" ? ` <a class="link" href="${overpassTurboUrl(q)}" target="_blank" rel="noopener">Ouvrir cette requête dans Overpass Turbo ↗</a>` : "";
    $("ovOut").innerHTML = (rescue ? `<b>${esc(summary(rescue, " (secours Nominatim : résultats partiels, 40 au plus)"))}</b><br>` : "")
      + `Overpass : ${esc(detail)}.${turbo}<span id="ovStatus" class="muted"> Test de connexion…</span>`;
    if (typeof overpassStatus === "function") overpassStatus().then(list => { const el = $("ovStatus"); if (el) el.innerHTML = "<br>" + list.map(x => `${x.ok ? "✓" : "✗"} ${esc(x.host)} : ${esc(x.label)}`).join("<br>"); });
  }
  ovBusy = false;
};
$("ovClear").onclick = () => { ovLayer?.clearLayers(); $("ovOut").textContent = "Calque effacé."; };

/* ---------- Comparaison avant / après (photo aérienne ancienne IGN) ---------- */
let cmpLayer = null, cmpX = .5;
function clipCompare() {
  if (!cmpLayer || !map) return;
  const size = map.getSize(), nw = map.containerPointToLayerPoint([0, 0]), se = map.containerPointToLayerPoint(size);
  const x = nw.x + size.x * cmpX;
  map.getPane("cmp").style.clip = `rect(${nw.y}px, ${x}px, ${se.y}px, ${nw.x}px)`;
  $("cmpHandle").style.left = (size.x * cmpX) + "px";
}
$("cmpBtn").onclick = () => {
  if (!map) return;
  if (cmpLayer) {
    map.removeLayer(cmpLayer); cmpLayer = null; $("cmpHandle").hidden = true; map.getPane("cmp").style.clip = "";
    $("cmpBtn").textContent = "Comparer avec aujourd'hui"; $("cmpBtn").classList.remove("on"); return;
  }
  const layer = $("cmpLayer").value;
  cmpLayer = L.tileLayer(`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`,
    { pane: "cmp", maxZoom: 20, maxNativeZoom: 18, attribution: "© IGN — photographies anciennes" }).addTo(map);
  $("cmpHandle").hidden = false; $("cmpBtn").textContent = "Arrêter la comparaison"; $("cmpBtn").classList.add("on");
  clipCompare();
  if (map.getZoom() < 12) toast("Zoome sur une commune : les photos anciennes sont plus parlantes de près");
};
$("cmpHandle").onpointerdown = ev => {
  ev.preventDefault(); ev.stopPropagation();
  const rect = $("leaflet").getBoundingClientRect();
  const move = m => { cmpX = Math.min(.98, Math.max(.02, (m.clientX - rect.left) / rect.width)); clipCompare(); };
  const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  addEventListener("pointermove", move); addEventListener("pointerup", up);
};
