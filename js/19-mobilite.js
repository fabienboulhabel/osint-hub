/* OSINT Hub — 19-mobilite.js · module « Mobilité » (dans la page Recherche)
   Reconstituer les déplacements POSSIBLES à partir d'un dernier lieu et d'une dernière heure connus :
     1. Test de plausibilité d'un signalement      4. Points utiles autour du dernier lieu
     2. Zone atteignable par mode de transport      5. Météo à l'heure et au lieu
     3. Gares, arrêts, aéroports, ports proches     6. Liens pré-remplis (train, bus, covoiturage, avion, ferry)
   Aucune donnée personnelle : on raisonne sur des trajets possibles, jamais sur l'identité de voyageurs.
   Les durées sont des ESTIMATIONS (vitesses moyennes), à confirmer par les horaires réels. */
/* ---------- Overpass : plusieurs serveurs, une seule recherche à la fois, diagnostic précis ----------
   Fonctions globales : utilisées par le module Mobilité et par les calques de la page Carte.
   Chaque adresse IP n'a droit qu'à 2 « créneaux » simultanés sur un serveur Overpass public. Une recherche lancée trop souvent
   (ou laissée en route) occupe ces créneaux et les suivantes attendent en file jusqu'au délai. Ici :
     - une nouvelle recherche interrompt la précédente (une seule en cours à la fois) ;
     - un seul serveur est interrogé d'abord (le dernier qui a répondu) ; le suivant démarre après 4 s sans réponse ou en cas d'échec ;
     - overpassStatus() teste la connexion et indique si les créneaux sont libres. */
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",           // serveur principal, souvent saturé
  "https://overpass.private.coffee/api/interpreter",   // anciennement overpass.kumi.systems (même service)
  "https://overpass.openstreetmap.fr/api/interpreter"  // OSM France ; peut refuser les appels depuis un site tiers
];
const overpassTurboUrl = q => "https://overpass-turbo.eu/?Q=" + encodeURIComponent(q) + "&R";
let ovCurrent = null;
function overpassFetch(q, onProgress) {
  if (ovCurrent) ovCurrent.cancel();                                   // une seule recherche à la fois
  let order = [...OVERPASS_SERVERS];
  const best = load("ovBest", ""); if (best && order.includes(best)) order = [best, ...order.filter(u => u !== best)];
  const tmo = +((/\[timeout:(\d+)\]/.exec(q) || [])[1]) || 25, clientMs = (tmo + 5) * 1000;   // délai TOTAL : le client attend un peu plus que le serveur
  const report = [], ctls = order.map(() => new AbortController()), host = u => new URL(u).hostname, t0 = Date.now();
  return new Promise((resolve, reject) => {
    let done = false, started = 0, failed = 0, stagger = null, tick = null;
    const handle = { cancel: () => finish(() => { const e = new Error("recherche interrompue par une autre recherche"); e.cancelled = true; reject(e); }) };
    ovCurrent = handle;
    function finish(fn) {
      if (done) return; done = true; clearTimeout(stagger); clearInterval(tick);
      ctls.forEach(c => c.abort()); if (ovCurrent === handle) ovCurrent = null; fn();
    }
    const fail = (i, kind) => {
      if (done || report[i]) return;
      report[i] = { host: host(order[i]), kind }; failed++;
      if (failed === order.length) finish(() => { const e = new Error("aucun serveur Overpass n'a répondu"); e.report = report.filter(Boolean); reject(e); });
      else startNext();
    };
    const run = async i => {
      const left = Math.max(4000, clientMs - (Date.now() - t0));       // les départs décalés ne rallongent pas l'attente totale
      const tm = setTimeout(() => { ctls[i].timedOut = true; ctls[i].abort(); }, left);
      try {
        let r;
        try { r = await fetch(order[i], { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctls[i].signal }); }
        catch (err) {                                                  // aucune réponse HTTP : certains réseaux bloquent POST, on tente GET une fois
          if (ctls[i].timedOut || done) throw err;
          r = await fetch(order[i] + "?data=" + encodeURIComponent(q), { signal: ctls[i].signal });
        }
        clearTimeout(tm);
        if (!r.ok) return fail(i, `HTTP ${r.status}` + ({ 429: " (saturé : plus aucun créneau libre)", 502: " (serveur débordé)", 504: " (serveur débordé)", 406: " (requête refusée)", 403: " (accès refusé)" }[r.status] || ""));
        let j; try { j = await r.json(); } catch { return fail(i, "réponse invalide (page d'erreur ?)"); }
        if (/runtime error|timed out|out of memory/i.test(j.remark || "") && !(j.elements || []).length) return fail(i, "requête trop lourde pour ce serveur");
        if (done) return;
        save("ovBest", order[i]);
        finish(() => resolve(j.elements || []));
      } catch (err) {
        clearTimeout(tm);
        if (!done) fail(i, ctls[i].timedOut ? `aucune réponse en ${Math.round((Date.now() - t0) / 1000)} s (serveur en file d'attente ou injoignable)` : "aucune réponse (réseau, blocage ou CORS)");
      }
    };
    const startNext = () => {
      clearTimeout(stagger);
      if (done || started >= order.length) return;
      const i = started++; run(i);
      stagger = setTimeout(startNext, 4000);
    };
    tick = setInterval(() => onProgress && onProgress(host(order[Math.max(0, started - 1)]), Math.max(0, started - 1), order.length, Math.round((Date.now() - t0) / 1000)), 1000);
    onProgress && onProgress(host(order[0]), 0, order.length, 0);
    startNext();
  });
}
// Test de connexion : la page « statut » d'Overpass répond tout de suite et indique les créneaux libres de ton adresse IP
async function overpassStatus() {
  return Promise.all(OVERPASS_SERVERS.map(async u => {
    const url = u.replace(/interpreter$/, "status"), host = new URL(u).hostname, t0 = performance.now();
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: "no-store" }); clearTimeout(tm);
      const txt = await r.text(), ms = Math.round(performance.now() - t0);
      if (!r.ok) return { host, ok: false, label: `répond HTTP ${r.status} en ${ms} ms` };
      const free = /(\d+)\s+slots?\s+available\s+now/i.exec(txt), limit = /Rate limit:\s*(\d+)/i.exec(txt), wait = /\bin\s+(\d+)\s+seconds/i.exec(txt);
      let label = `joignable (${ms} ms)`;
      if (limit) label += ` · ${free ? free[1] : 0} créneau(x) libre(s) sur ${limit[1]}`;
      if (!free && wait) label += ` · prochain créneau dans ${wait[1]} s`;
      return { host, ok: true, label, busy: !!limit && !free };
    } catch (err) {
      clearTimeout(tm);
      return { host, ok: false, label: err.name === "AbortError" ? "ne répond pas, même à un simple test (8 s)" : "injoignable (réseau, blocage ou CORS)" };
    }
  }));
}
// Texte d'interprétation du test de connexion
function overpassStatusHtml(list) {
  const ok = list.filter(x => x.ok);
  const advice = !ok.length ? "Aucun serveur n'est joignable depuis ce navigateur : pare-feu ou proxy du réseau, extension du navigateur, ou connexion coupée."
    : ok.some(x => x.busy) ? "Un serveur est joignable mais tous ses créneaux sont occupés : attends environ 30 s sans relancer (une recherche précédente peut encore tourner côté serveur)."
    : "Les serveurs sont joignables avec des créneaux libres : la requête elle-même est trop lente. Zoome pour réduire la zone, ou réessaie plus tard.";
  return `<ul class="small">${list.map(x => `<li>${x.ok ? "✓" : "✗"} <b>${esc(x.host)}</b> : ${esc(x.label)}</li>`).join("")}</ul><p class="small"><b>${esc(advice)}</b></p>`;
}
// Solution de secours indépendante d'Overpass : recherche de lieux par type avec Nominatim (1 requête par seconde)
function nominatimHit(x) {
  return { type: x.osm_type || "node", id: x.osm_id, lat: +x.lat, lon: +x.lon, tags: { ...(x.extratags || {}), [x.category]: x.type, name: x.name || "" } };
}
async function nominatimBox(bounds, phrase) {                          // dans une zone de carte (calques)
  const vb = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=40&bounded=1&extratags=1&accept-language=fr&viewbox=${vb}&q=${encodeURIComponent(phrase)}`);
  if (!r.ok) throw new Error("Nominatim HTTP " + r.status);
  return (await r.json()).map(nominatimHit);
}
async function nominatimNear(lat, lng, list) {                         // autour d'un point (module Mobilité)
  const out = [];
  for (const [i, [phrase, radiusKm]] of list.entries()) {
    if (i) await new Promise(r => setTimeout(r, 1100));
    const dLat = radiusKm / 111, dLng = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    const vb = `${lng - dLng},${lat + dLat},${lng + dLng},${lat - dLat}`;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=15&bounded=1&extratags=1&accept-language=fr&viewbox=${vb}&q=${encodeURIComponent(phrase)}`);
      if (!r.ok) continue;
      (await r.json()).forEach(x => out.push(nominatimHit(x)));
    } catch { /* on continue avec les autres expressions */ }
  }
  return out;
}

const mobilite = (() => {
  /* ---------- Modèles de déplacement : modifiables ici ----------
     legs   : tronçons [distance routière jusqu'où la vitesse s'applique (km), vitesse (km/h)] ; le dernier va jusqu'à l'infini.
              Le temps est cumulé tronçon par tronçon : il augmente toujours avec la distance (aucun saut).
     detour : rapport entre la distance réelle (routes, voies) et la distance à vol d'oiseau.
     fixed  : temps incompressible (h) : accès à la gare, à l'aéroport, contrôles, embarquement.
     min    : distance minimale (km à vol d'oiseau) en dessous de laquelle le mode n'est pas utilisé. */
  const MODES = [
    { id: "walk", n: "À pied",  c: "#2f855a", legs: () => [[Infinity, +$("mbWalk").value]], detour: 1.25, fixed: 0 },
    { id: "bike", n: "À vélo",  c: "#3182ce", legs: () => [[Infinity, 15]], detour: 1.25, fixed: 0 },
    { id: "car",  n: "Voiture", c: "#d69e2e", legs: () => [[30, 40], [Infinity, 95]], detour: 1.15, fixed: .2 },     // routes locales, puis autoroute
    { id: "train",n: "Train",   c: "#805ad5", legs: () => [[40, 70], [Infinity, 240]], detour: 1.15, fixed: .5 },   // TER, puis grande vitesse
    { id: "plane",n: "Avion",   c: "#e53e3e", legs: () => [[Infinity, 750]], detour: 1.05, fixed: 3, min: 300 }    // 3 h d'aéroport, vol d'au moins 300 km
  ];
  const roadTime = (road, legs) => { let t = 0, prev = 0; for (const [upto, v] of legs) { const d = Math.min(road, upto) - prev; if (d <= 0) break; t += d / v; prev = upto; if (road <= upto) break; } return t; };
  const hours = (km, m) => (m.min && km < m.min) ? Infinity : m.fixed + roadTime(km * m.detour, m.legs());
  // Distance maximale atteignable en h heures : inverse exact de roadTime
  const reach = (h, m) => {
    let rem = h - m.fixed; if (rem <= 0) return 0;
    let road = 0, prev = 0;
    for (const [upto, v] of m.legs()) { const len = upto - prev, t = len / v; if (rem <= t) { road += rem * v; break; } road += len; rem -= t; prev = upto; }
    const km = road / m.detour;
    return m.min && km < m.min ? 0 : km;
  };
  const unlockAfter = m => m.min ? hours(m.min, m) : m.fixed;          // temps minimal avant que le mode soit utilisable
  const fmtH = h => !isFinite(h) ? "—" : h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)} h ${String(Math.round(h % 1 * 60)).padStart(2, "0")}`;
  const nowLocal = () => { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); return n.toISOString().slice(0, 16); };
  let A = null, B = null, mmap = null, layers = {}, mkA = null, mkB = null;

  /* ---------- Interface (insérée dans la page Recherche) ---------- */
  function mount() {
    const host = document.querySelector("#v-search .wrap"); if (!host || $("mobCard")) return;
    // Page Recherche en 2 colonnes : recherche à gauche, Mobilité en haut à droite
    const main = document.createElement("div"); main.className = "search-main";
    while (host.firstChild) main.appendChild(host.firstChild);
    const side = document.createElement("aside"); side.className = "search-side";
    host.classList.add("search-split"); host.append(main, side);
    side.insertAdjacentHTML("beforeend", `
    <section class="card mob" id="mobCard">
      <div class="card-head"><h3>Mobilité : reconstituer les déplacements possibles</h3><span class="mono small muted">ESTIMATIONS · SOURCES OUVERTES</span></div>
      <p class="mob-warn small"><b class="mono">CADRE</b> Aucun outil légal ne dit qui était dans un train, un bus ou un avion : billets et listes de passagers ne sont accessibles qu'aux enquêteurs. Ce module raisonne uniquement sur les trajets <i>possibles</i>. Disparition réelle : <b>17</b>.</p>
      <div class="mob-grid">
        <div class="mob-form">
          <h4 class="mono">1 · DERNIER LIEU ET HEURE CONNUS</h4>
          <div class="mob-place"><input id="mbA" placeholder="Adresse, lieu ou « 45.76, 4.83 »" autocomplete="off"><div class="mob-res" id="mbAres"></div></div>
          <div class="row wrap-row"><input type="datetime-local" id="mbAt"><button class="btn ghost sm" id="mbFromMap" title="Reprendre le point sélectionné dans le module Carte">Point de la carte</button></div>
          <p class="mono small muted" id="mbAinfo">Ou clique directement sur la carte ci-contre.</p>

          <h4 class="mono">2 · ZONE ATTEIGNABLE</h4>
          <div class="row wrap-row"><label class="mono small">Jusqu'au</label><input type="datetime-local" id="mbUntil"><button class="btn ghost sm" id="mbNow">Maintenant</button></div>
          <div class="row wrap-row"><label class="mono small">Marche</label>
            <select id="mbWalk" class="sm-sel"><option value="3">lente · 3 km/h</option><option value="4.5" selected>normale · 4,5 km/h</option><option value="6">rapide · 6 km/h</option></select></div>
          <div class="mob-modes" id="mbModes"></div>
          <button class="btn wide" id="mbZone">Tracer la zone atteignable</button>

          <h4 class="mono">3 · TESTER UN SIGNALEMENT</h4>
          <div class="mob-place"><input id="mbB" placeholder="Lieu du signalement" autocomplete="off"><div class="mob-res" id="mbBres"></div></div>
          <div class="row"><input type="datetime-local" id="mbBt"></div>
          <button class="btn wide" id="mbTest">Est-ce matériellement possible ?</button>
          <div id="mbVerdict"></div>
        </div>
        <div class="mob-side">
          <div id="mbMap" class="mob-map"></div>
          <div class="mob-tabs seg mono" id="mbTabs">
            <button class="on" data-mt="hubs">TRANSPORTS PROCHES</button><button data-mt="pois">POINTS UTILES</button><button data-mt="meteo">MÉTÉO</button><button data-mt="links">LIENS</button>
          </div>
          <div class="mob-pane" id="mbPane"><p class="small muted">Indique d'abord le dernier lieu connu.</p></div>
        </div>
      </div>
    </section>`);
    $("mbAt").value = nowLocal(); $("mbUntil").value = nowLocal(); $("mbBt").value = nowLocal();
    $("mbModes").innerHTML = MODES.map(m => `<label class="toggle"><input type="checkbox" data-mm="${m.id}" checked><span style="--mc:${m.c}">${m.n}</span></label>`).join("");
    geocoder("mbA", "mbAres", p => setA(p));
    geocoder("mbB", "mbBres", p => setB(p));
    $("mbFromMap").onclick = () => typeof point !== "undefined" && point ? setA({ lat: point[0], lng: point[1], name: fmtLL(...point) }) : toast("Aucun point sélectionné dans le module Carte");
    $("mbNow").onclick = () => { $("mbUntil").value = nowLocal(); zone(); };
    $("mbZone").onclick = zone;
    $("mbTest").onclick = test;
    $$("#mbTabs button").forEach(b => b.onclick = () => tab(b.dataset.mt, true));
  }

  /* ---------- Saisie d'un lieu : coordonnées ou recherche d'adresse ---------- */
  function geocoder(inp, res, done) {
    let tm;
    $(inp).oninput = () => {
      clearTimeout(tm);
      const q = $(inp).value.trim(), ll = parseLatLng(q);
      if (!q) return ($(res).innerHTML = "");
      if (ll && /^[-\d.,;\s]+$/.test(q)) { $(res).innerHTML = `<div data-ll="${ll}" data-n="${esc(fmtLL(...ll))}">→ ${fmtLL(...ll)}</div>`; return bind(); }
      tm = setTimeout(async () => {
        try {
          const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr&q=${enc(q)}`)).json();
          $(res).innerHTML = r.map(x => `<div data-ll="${x.lat},${x.lon}" data-n="${esc(x.display_name.split(",").slice(0, 2).join(","))}">${esc(x.display_name)}</div>`).join("") || "<div>Aucun résultat</div>";
          bind();
        } catch { $(res).innerHTML = "<div>Recherche indisponible (connexion ?)</div>"; }
      }, 900);
    };
    $(inp).onkeydown = e => { if (e.key === "Enter") $(res).querySelector("[data-ll]")?.click(); };
    function bind() {
      $$(`#${res} [data-ll]`).forEach(d => d.onclick = () => {
        const [lat, lng] = d.dataset.ll.split(",").map(Number); $(res).innerHTML = ""; $(inp).value = d.dataset.n; done({ lat, lng, name: d.dataset.n });
      });
    }
  }

  /* ---------- Carte du module ---------- */
  function ensureMap() {
    if (mmap || !window.L) return !!mmap;
    mmap = L.map("mbMap", { attributionControl: true, zoomControl: true }).setView([46.6, 2.4], 5);
    L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png", { maxZoom: 19, maxNativeZoom: 18, attribution: "© IGN" }).addTo(mmap);
    ["zone", "poi", "test"].forEach(k => layers[k] = L.layerGroup().addTo(mmap));
    mmap.on("click", e => setA({ lat: e.latlng.lat, lng: e.latlng.lng, name: fmtLL(e.latlng.lat, e.latlng.lng) }));
    return true;
  }
  onEnter.search = (orig => () => { orig && orig(); setTimeout(() => { if (ensureMap()) mmap.invalidateSize(); }, 120); })(onEnter.search);

  function setA(p) {
    A = p; $("mbA").value = p.name;
    $("mbAinfo").textContent = `Dernier lieu : ${fmtLL(p.lat, p.lng)}`;
    if (ensureMap()) {
      if (mkA) mkA.setLatLng([p.lat, p.lng]); else mkA = L.marker([p.lat, p.lng], { icon: pinIcon() }).addTo(mmap);
      mmap.setView([p.lat, p.lng], 12);
    }
    layers.zone?.clearLayers(); layers.poi?.clearLayers();
    tab(document.querySelector("#mbTabs .on")?.dataset.mt || "hubs", false);   // false : pas de requête Overpass sans clic de ta part
  }
  function setB(p) { B = p; }

  /* ---------- 2. Zone atteignable ---------- */
  function zone() {
    if (!A) return toast("Indique d'abord le dernier lieu connu");
    const h = (new Date($("mbUntil").value) - new Date($("mbAt").value)) / 36e5;
    if (!(h > 0)) return toast("L'heure de fin doit être après la dernière observation");
    if (!ensureMap()) return toast("Carte indisponible (connexion ?)");
    layers.zone.clearLayers();
    const on = MODES.filter(m => $$(`[data-mm="${m.id}"]`)[0].checked), rows = [];
    on.slice().reverse().forEach(m => {                                   // le plus grand cercle en dessous
      const raw = reach(h, m), km = Math.min(raw, 5000), cap = raw > 5000;
      const lock = `pas avant ${fmtH(unlockAfter(m))}${m.min ? ` (vol d'au moins ${m.min} km)` : ""}`;
      rows.unshift(`<tr><td><i class="mob-dot" style="background:${m.c}"></i>${m.n}</td><td>${km ? (cap ? "plus de " : "") + fmtNum(km) + " km" : `<span class="muted">${lock}</span>`}</td></tr>`);
      if (km > 0) {
        L.circle([A.lat, A.lng], { radius: km * 1000, color: m.c, weight: 2, fillOpacity: .05, dashArray: m.id === "train" || m.id === "plane" ? "6 6" : null }).bindTooltip(`${m.n} · ${cap ? "plus de " : ""}${fmtNum(km)} km`).addTo(layers.zone);
        if (m.min && km > m.min) L.circle([A.lat, A.lng], { radius: m.min * 1000, color: m.c, weight: 1, fill: false, dashArray: "2 6" }).bindTooltip(`${m.n} : distance minimale d'un trajet (${m.min} km)`).addTo(layers.zone);
      }
    });
    const all = layers.zone.getLayers(); if (all.length) mmap.fitBounds(all[0].getBounds(), { padding: [20, 20] });
    $("mbPane").innerHTML = `<p class="small"><b>${fmtH(h)}</b> depuis la dernière observation. Rayon maximal par mode :</p><table class="kv">${rows.join("")}</table>
      <p class="small muted">Rayons à vol d'oiseau, calculés avec des vitesses moyennes et un détour. Train et avion supposent une gare ou un aéroport proche : vérifie les horaires réels (onglet Liens).</p>
      <button class="btn ghost sm" id="mbSaveZone">Ajouter à l'enquête</button>`;
    $("mbSaveZone").onclick = () => addEntry({ clue: `Zone atteignable en ${fmtH(h)} depuis ${A.name} : ` + on.map(m => { const r = reach(h, m); return `${m.n} ${r ? fmtNum(r) + " km" : "pas encore possible"}`; }).join(", "), hyp: "Estimation (vitesses moyennes), à confirmer.", gps: fmtLL(A.lat, A.lng) });
  }

  /* ---------- 1. Test de plausibilité ---------- */
  function test() {
    if (!A) return toast("Indique d'abord le dernier lieu connu");
    if (!B) return toast("Indique le lieu du signalement");
    const h = (new Date($("mbBt").value) - new Date($("mbAt").value)) / 36e5;
    if (!isFinite(h)) return toast("Indique l'heure du signalement");
    const km = gcDist([A.lat, A.lng], [B.lat, B.lng]);
    const res = MODES.map(m => {
      const need = hours(km, m);
      const v = !isFinite(need) ? "na" : h >= need * 1.15 ? "ok" : h >= need * .85 ? "tight" : "no";
      return { m, need, v };
    });
    const best = res.find(r => r.v === "ok") || res.find(r => r.v === "tight");
    const verdict = h < 0 ? ["no", "Le signalement est antérieur à la dernière observation."]
      : best ? (best.v === "ok" ? ["ok", `Possible, au plus simple ${best.m.n.toLowerCase()}.`] : ["tight", `Serré : uniquement ${best.m.n.toLowerCase()}, sans marge.`])
      : ["no", "Matériellement impossible avec les moyens de transport courants."];
    const lab = { ok: "POSSIBLE", tight: "SERRÉ", no: "IMPOSSIBLE", na: "TROP PROCHE" };
    $("mbVerdict").innerHTML = `<div class="mob-v ${verdict[0]}"><b class="mono">${lab[verdict[0]]}</b><span>${verdict[1]}</span>
        <small class="mono">${fmtNum(km)} km à vol d'oiseau · ${h >= 0 ? fmtH(h) : "écart négatif"} disponibles</small></div>
      <table class="kv mob-t">${res.map(r => `<tr><td><i class="mob-dot" style="background:${r.m.c}"></i>${r.m.n}</td><td>${fmtH(r.need)}</td><td class="mono ${r.v}">${lab[r.v]}</td></tr>`).join("")}</table>
      <button class="btn ghost sm" id="mbSaveTest">Ajouter à l'enquête</button>`;
    $("mbSaveTest").onclick = () => addEntry({ clue: `Signalement à ${B.name} (${new Date($("mbBt").value).toLocaleString("fr-FR")})`,
      hyp: `${lab[verdict[0]]} : ${verdict[1]} (${fmtNum(km)} km, ${fmtH(h)} disponibles depuis ${A.name})`, gps: fmtLL(B.lat, B.lng), conf: verdict[0] === "ok" ? 3 : verdict[0] === "tight" ? 2 : 1 });
    if (ensureMap()) {
      layers.test.clearLayers();
      if (mkB) mkB.setLatLng([B.lat, B.lng]); else mkB = L.circleMarker([B.lat, B.lng], { radius: 8, color: "#0d0d0d", weight: 2, fillColor: verdict[0] === "ok" ? "#2f855a" : verdict[0] === "tight" ? "#d69e2e" : "#e53e3e", fillOpacity: .9 }).addTo(mmap);
      if (mkB.setStyle) mkB.setStyle({ fillColor: verdict[0] === "ok" ? "#2f855a" : verdict[0] === "tight" ? "#d69e2e" : "#e53e3e" });
      L.polyline([[A.lat, A.lng], [B.lat, B.lng]], { color: "#0d0d0d", weight: 1.5, dashArray: "4 6" }).addTo(layers.test);
      mmap.fitBounds([[A.lat, A.lng], [B.lat, B.lng]], { padding: [30, 30], maxZoom: 12 });
    }
  }

  /* ---------- Onglets : transports proches, points utiles, météo, liens ---------- */
  // go = true : l'utilisateur a cliqué sur l'onglet, on lance la recherche. go = false : on affiche seulement un bouton.
  function tab(t, go = true) {
    $$("#mbTabs button").forEach(b => b.classList.toggle("on", b.dataset.mt === t));
    if (!A) return ($("mbPane").innerHTML = `<p class="small muted">Indique d'abord le dernier lieu connu.</p>`);
    if ((t === "hubs" || t === "pois") && !go && !cacheGet(t)) {
      $("mbPane").innerHTML = `<p class="small">${t === "hubs" ? "Gares, gares routières, aéroports et ports proches" : "Hôpitaux, forces de l'ordre, pharmacies et lieux d'accueil proches"} de <b>${esc(A.name)}</b>.</p>
        <button class="btn sm" id="mbGo">Lancer la recherche</button>
        <p class="small muted">Chaque recherche interroge un serveur public gratuit (Overpass) : elle ne se lance que sur ta demande.</p>`;
      $("mbGo").onclick = () => tab(t, true); return;
    }
    ({ hubs, pois, meteo, links })[t]();
  }
  // Résultats déjà obtenus pour ce lieu : pas de nouvelle requête
  const ovCache = {};
  const cacheKey = t => A ? `${t}|${A.lat.toFixed(3)}|${A.lng.toFixed(3)}` : "";
  const cacheGet = t => ovCache[cacheKey(t)];
  const progress = (host, i, n, sec) => { $("mbPane").innerHTML = `<p class="small muted">Interrogation d'Overpass : ${esc(host)}${i ? ` (serveur ${i + 1}/${n})` : ""}… ${sec || 0} s</p>
    <p class="small muted">Un serveur public gratuit peut mettre jusqu'à une trentaine de secondes. Ne relance pas : une nouvelle recherche interrompt celle-ci.</p>`; };
  // Remplit le bloc de test de connexion du diagnostic
  async function fillStatus() {
    const box = $("mbPane").querySelector(".mob-status"); if (!box) return;
    const list = await overpassStatus();
    if ($("mbPane").querySelector(".mob-status") === box) box.innerHTML = overpassStatusHtml(list);
  }
  // Bloc de diagnostic : quel serveur a répondu quoi, et quoi faire
  function diagHtml(report, secours) {
    return `<details class="mob-diag" ${secours ? "" : "open"}><summary class="mono small">${secours ? "RÉSULTATS DE SECOURS · " : ""}DIAGNOSTIC OVERPASS</summary>
      <ul class="small">${report.map(r => `<li><b>${esc(r.host)}</b> : ${esc(r.kind)}</li>`).join("")}</ul>
      <p class="mono small muted">TEST DE CONNEXION</p><div class="mob-status small muted">Test en cours…</div>
      <p class="small muted">« HTTP 429 / 502 / 504 » : serveur saturé (très fréquent). « Aucune réponse » : blocage par le réseau, extension du navigateur ou serveur arrêté. ${secours ? "Les résultats ci-dessus viennent de Nominatim : pas d'aires de service ni d'hébergements d'urgence." : ""}</p>
      <div class="row wrap-row"><button class="btn ghost sm" data-ov="retry">Réessayer</button><button class="btn ghost sm" data-ov="turbo">Ouvrir dans Overpass Turbo ↗</button><button class="btn ghost sm" data-ov="copy">Copier le diagnostic</button></div></details>`;
  }
  function bindDiag(q, report, retry) {
    const box = $("mbPane");
    box.querySelector('[data-ov="retry"]')?.addEventListener("click", retry);
    box.querySelector('[data-ov="turbo"]')?.addEventListener("click", () => window.open(overpassTurboUrl(q), "_blank", "noopener"));
    box.querySelector('[data-ov="copy"]')?.addEventListener("click", () => navigator.clipboard.writeText(`OSINT Hub · Overpass\n` + report.map(r => `${r.host} : ${r.kind}`).join("\n") + `\nOrigine : ${location.origin}`).then(() => toast("Diagnostic copié")));
  }
  function listPlaces(els, kinds, emptyMsg) {
    const rows = els.map(e => {
      const t = e.tags || {}, ll = e.type === "node" ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null; if (!ll) return null;
      const k = kinds.find(k => k.test(t)); if (!k) return null;
      return { ll, k, name: t["name:fr"] || t.name || k.n, d: gcDist([A.lat, A.lng], ll), tel: t.phone || t["contact:phone"] || "" };
    }).filter(Boolean).sort((a, b) => a.d - b.d);
    const seen = new Set(), out = rows.filter(r => { const key = r.k.n + r.name; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 18);
    layers.poi?.clearLayers();
    out.forEach(r => window.L && L.circleMarker(r.ll, { radius: 6, color: "#0d0d0d", weight: 1.5, fillColor: r.k.c, fillOpacity: .9 }).bindTooltip(`${r.k.n} · ${esc(r.name)}`).addTo(layers.poi));
    return out.length ? `<ul class="list small mob-list">${out.map((r, i) => `<li><i class="mob-dot" style="background:${r.k.c}"></i><span class="t"><b>${esc(r.name)}</b><small class="mono muted"> ${r.k.n} · ${r.d < 1 ? Math.round(r.d * 1000) + " m" : r.d.toFixed(1).replace(".", ",") + " km"}${r.tel ? ` · ${esc(r.tel)}` : ""}</small></span>
        <button class="task-link" data-go="${i}">Voir</button></li>`).join("")}</ul>` : `<p class="small muted">${emptyMsg}</p>`;
  }
  async function loadOverpass(t, q, secours) {
    const key = cacheKey(t);
    if (ovCache[key]) return ovCache[key];
    let els, report = null;
    try { els = await overpassFetch(q, progress); }
    catch (err) { if (err.cancelled) return null; report = err.report || [{ host: "Overpass", kind: err.message }]; }
    if (!els) { $("mbPane").innerHTML = `<p class="small muted">Overpass ne répond pas : recherche de secours (Nominatim)…</p>`; els = await nominatimNear(A.lat, A.lng, secours); }
    const res = { els, report };
    if (!report) ovCache[key] = res;                                  // on ne garde en mémoire que les vraies réponses d'Overpass
    return res;
  }
  async function hubs() {
    $("mbPane").innerHTML = `<p class="small muted">Recherche des gares, arrêts, aéroports et ports à proximité…</p>`;
    const KINDS = [
      { n: "Gare", c: "#805ad5", test: t => t.railway === "station" || t.railway === "halt" },
      { n: "Gare routière", c: "#d69e2e", test: t => t.amenity === "bus_station" },
      { n: "Aéroport", c: "#e53e3e", test: t => t.aeroway === "aerodrome" && (t.iata || t.icao) },
      { n: "Port / ferry", c: "#3182ce", test: t => t.amenity === "ferry_terminal" }
    ];
    // Requête allégée (délai serveur 15 s) : gares en points simples, aéroports avec code IATA uniquement
    const q = `[out:json][timeout:15];(node["railway"~"^(station|halt)$"](around:15000,${A.lat},${A.lng});nwr["amenity"~"^(bus_station|ferry_terminal)$"](around:15000,${A.lat},${A.lng});nwr["aeroway"="aerodrome"]["iata"](around:60000,${A.lat},${A.lng}););out tags center 150;`;
    const intro = `<p class="small">Départs possibles depuis le dernier lieu (aéroports jusqu'à 60 km). Vérifie les horaires réels avec l'onglet <b>Liens</b>.</p>`;
    const res = await loadOverpass("hubs", q, [["train station", 15], ["bus station", 15], ["ferry terminal", 20], ["airport", 60]]);
    if (!res) return;
    const { els, report } = res;
    $("mbPane").innerHTML = intro + listPlaces(els, KINDS, "Aucune gare, gare routière, aéroport ou port trouvé à proximité.") + (report ? diagHtml(report, true) : "");
    if (report) { bindDiag(q, report, () => { delete ovCache[cacheKey("hubs")]; hubs(); }); fillStatus(); }
    $$("#mbPane [data-go]").forEach((b, i) => b.onclick = () => { const L0 = layers.poi.getLayers()[i]; if (L0 && mmap) mmap.setView(L0.getLatLng(), 15); });
  }
  async function pois() {
    $("mbPane").innerHTML = `<p class="small muted">Recherche des hôpitaux, forces de l'ordre et lieux d'accueil à proximité…</p>`;
    const KINDS = [
      { n: "Hôpital / urgences", c: "#e53e3e", test: t => t.amenity === "hospital" },
      { n: "Gendarmerie / police", c: "#2b6cb0", test: t => t.amenity === "police" },
      { n: "Hébergement d'urgence", c: "#2f855a", test: t => t.social_facility === "shelter" },
      { n: "Pharmacie", c: "#38a169", test: t => t.amenity === "pharmacy" },
      { n: "Aire de service", c: "#d69e2e", test: t => t.highway === "services" || t.highway === "rest_area" }
    ];
    const q = `[out:json][timeout:15];(nwr["amenity"~"^(hospital|police|pharmacy)$"](around:8000,${A.lat},${A.lng});nwr["social_facility"="shelter"](around:8000,${A.lat},${A.lng});nwr["highway"~"^(services|rest_area)$"](around:20000,${A.lat},${A.lng}););out tags center 150;`;
    const intro = `<p class="small">Hôpitaux, forces de l'ordre, accueil et pharmacies (8 km), aires d'autoroute (20 km). Dans une recherche réelle, ces appels sont faits par la famille ou les enquêteurs.</p>`;
    const res = await loadOverpass("pois", q, [["hospital", 8], ["police", 8], ["pharmacy", 8]]);
    if (!res) return;
    const { els, report } = res;
    $("mbPane").innerHTML = intro + listPlaces(els, KINDS, "Aucun point utile trouvé à proximité.") + (report ? diagHtml(report, true) : "");
    if (report) { bindDiag(q, report, () => { delete ovCache[cacheKey("pois")]; pois(); }); fillStatus(); }
    $$("#mbPane [data-go]").forEach((b, i) => b.onclick = () => { const L0 = layers.poi.getLayers()[i]; if (L0 && mmap) mmap.setView(L0.getLatLng(), 15); });
  }
  /* ---------- 5. Météo historique (Open-Meteo) ---------- */
  const WMO = { 0: "ciel clair", 1: "peu nuageux", 2: "partiellement nuageux", 3: "couvert", 45: "brouillard", 48: "brouillard givrant", 51: "bruine légère", 53: "bruine", 55: "bruine forte",
    61: "pluie faible", 63: "pluie", 65: "pluie forte", 66: "pluie verglaçante", 67: "pluie verglaçante forte", 71: "neige faible", 73: "neige", 75: "neige forte", 77: "grains de neige",
    80: "averses faibles", 81: "averses", 82: "averses violentes", 85: "averses de neige", 86: "averses de neige fortes", 95: "orage", 96: "orage avec grêle", 99: "orage avec forte grêle" };
  async function meteo() {
    const t = new Date($("mbAt").value); if (isNaN(t)) return ($("mbPane").innerHTML = `<p class="small">Indique la date de la dernière observation.</p>`);
    $("mbPane").innerHTML = `<p class="small muted">Chargement de la météo…</p>`;
    const day = $("mbAt").value.slice(0, 10), vars = "temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day";
    const recent = (Date.now() - t) / 864e5 < 80;
    const url = recent
      ? `https://api.open-meteo.com/v1/forecast?latitude=${A.lat}&longitude=${A.lng}&hourly=${vars}&timezone=auto&start_date=${day}&end_date=${day}`
      : `https://archive-api.open-meteo.com/v1/archive?latitude=${A.lat}&longitude=${A.lng}&hourly=${vars}&timezone=auto&start_date=${day}&end_date=${day}`;
    try {
      const r = await (await fetch(url)).json(); const hh = r.hourly; if (!hh || !hh.time) throw 0;
      const H = t.getHours();
      const rows = hh.time.map((tm, i) => ({ h: +tm.slice(11, 13), T: hh.temperature_2m[i], P: hh.precipitation[i], W: hh.weather_code[i], C: hh.cloud_cover[i], V: hh.wind_speed_10m[i], D: hh.is_day[i] }))
        .filter(x => Math.abs(x.h - H) <= 3);
      const cur = rows.find(x => x.h === H) || rows[0];
      $("mbPane").innerHTML = `<p class="small">Le <b>${t.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</b> à ${String(H).padStart(2, "0")} h, au dernier lieu :</p>
        <div class="kpis"><div class="kpi"><small>CIEL</small><b>${WMO[cur.W] ?? "—"}</b></div><div class="kpi"><small>TEMPÉRATURE</small><b>${cur.T ?? "—"} °C</b></div>
        <div class="kpi"><small>PRÉCIPITATIONS</small><b>${cur.P ?? "—"} mm</b></div><div class="kpi"><small>VENT</small><b>${cur.V ?? "—"} km/h</b></div></div>
        <table class="kv">${rows.map(x => `<tr${x.h === H ? ' class="hl"' : ""}><td>${String(x.h).padStart(2, "0")} h ${x.D ? "☀" : "☾"}</td><td>${WMO[x.W] ?? "—"} · ${x.T} °C · ${x.P} mm · nuages ${x.C} %</td></tr>`).join("")}</table>
        <p class="small muted">Utile pour vérifier une photo ou un témoignage (sol mouillé, ombres, neige). Données Open-Meteo, résolution d'environ 10 km.</p>
        <button class="btn ghost sm" id="mbSaveMeteo">Ajouter à l'enquête</button>`;
      $("mbSaveMeteo").onclick = () => addEntry({ clue: `Météo le ${t.toLocaleString("fr-FR")} à ${A.name} : ${WMO[cur.W] ?? "?"}, ${cur.T} °C, ${cur.P} mm, vent ${cur.V} km/h`, proof: "Open-Meteo (archives météo)", gps: fmtLL(A.lat, A.lng) });
    } catch { $("mbPane").innerHTML = `<p class="small">Météo indisponible pour cette date (connexion, ou date trop récente pour les archives : réessaie demain).</p>`; }
  }
  /* ---------- 6. Liens pré-remplis ---------- */
  function links() {
    const ll = `${A.lat},${A.lng}`, dest = B ? `${B.lat},${B.lng}` : "", nm = enc((A.name || "").split(",")[0]), nb = B ? enc((B.name || "").split(",")[0]) : "";
    // [nom, lien, version intégrable dans la visionneuse (si le site l'autorise)]
    const gm = mode => `https://maps.google.com/maps?saddr=${ll}${dest ? `&daddr=${dest}` : ""}&dirflg=${mode}&ie=UTF8&output=embed`;
    const L1 = [
      ["Itinéraire en transports (Google Maps)", `https://www.google.com/maps/dir/?api=1&origin=${ll}${dest ? `&destination=${dest}` : ""}&travelmode=transit`, dest ? gm("r") : ""],
      ["Itinéraire en voiture (Google Maps)", `https://www.google.com/maps/dir/?api=1&origin=${ll}${dest ? `&destination=${dest}` : ""}&travelmode=driving`, dest ? gm("d") : ""],
      ["Carte autour du lieu (OpenStreetMap)", `https://www.openstreetmap.org/?mlat=${A.lat}&mlon=${A.lng}#map=14/${A.lat}/${A.lng}`, osmEmbed(A.lat, A.lng)],
      ["Tous les modes (Rome2rio)", `https://www.rome2rio.com/map/${nm}${nb ? "/" + nb : ""}`],
      ["Horaires SNCF (SNCF Connect)", "https://www.sncf-connect.com/"],
      ["Trains et bus en Europe (Trainline)", "https://www.thetrainline.com/fr"],
      ["Bus longue distance (FlixBus)", "https://www.flixbus.fr/"],
      ["Trajets de covoiturage (BlaBlaCar)", `https://www.blablacar.fr/search?fn=${nm}${nb ? `&tn=${nb}` : ""}`],
      ["Avions autour du lieu (ADS-B Exchange)", `https://globe.adsbexchange.com/?lat=${A.lat.toFixed(3)}&lon=${A.lng.toFixed(3)}&zoom=9`],
      ["Navires et ferries (MarineTraffic)", `https://www.marinetraffic.com/fr/ais/home/centerx:${A.lng.toFixed(3)}/centery:${A.lat.toFixed(3)}/zoom:10`],
      ["Données horaires SNCF ouvertes", "https://transport.data.gouv.fr/datasets/horaires-sncf"]
    ];
    const inHub = settings.viewer !== false;
    $("mbPane").innerHTML = `<p class="small">Depuis <b>${esc(A.name)}</b>${B ? ` vers <b>${esc(B.name)}</b>` : ""}. Ces sites montrent les trajets et horaires publics, jamais les voyageurs.</p>
      <div class="links">${L1.map(([n, u, e], i) => `<button data-lk="${i}" title="${e && inHub ? "S'ouvre dans la visionneuse du hub" : "Ce site interdit l'affichage intégré : s'ouvre dans un onglet"}">${n} ${e && inHub ? "▣" : "↗"}</button>`).join("")}</div>
      <p class="small muted">▣ s'ouvre dans le hub · ↗ s'ouvre dans un onglet (SNCF, Trainline, FlixBus, BlaBlaCar, Rome2rio, ADS-B Exchange et MarineTraffic interdisent l'affichage dans un autre site).${dest ? "" : " Indique un lieu de signalement pour obtenir les itinéraires Google Maps dans le hub."}</p>`;
    $$("#mbPane [data-lk]").forEach(b => b.onclick = () => {
      const [n, u, e] = L1[+b.dataset.lk];
      if (e && inHub) viewer.open(n.replace(/ \(.*\)$/, ""), e, u); else openUrl(u, n);
    });
  }

  mount();
  return { setA, setB, model: { MODES, hours, reach }, get ctx() { return { A, B, layers, mmap }; } };
})();
