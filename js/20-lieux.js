/* OSINT Hub — 20-lieux.js · recherche de lieux fiable (calques de la carte + module Mobilité)
   Pourquoi : les serveurs Overpass publics sont gratuits et souvent saturés ou bloqués par les réseaux d'entreprise.
   La recherche ne dépend donc plus d'eux :
     1. Nominatim répond tout de suite : aperçu rapide (jusqu'à 160 résultats, la zone est découpée en 4 si besoin) ;
     2. Overpass est interrogé en parallèle, un serveur à la fois, sans insister : s'il répond, les résultats complets
        remplacent l'aperçu ;
     3. si Overpass échoue, il est mis en pause 1 minute (pour ne pas aggraver la saturation) et l'aperçu reste affiché.
   Ce fichier se charge APRÈS 07-carte.js et 19-mobilite.js : au chargement, il remplace le bouton « Afficher dans la vue »
   (page Carte) et les boutons « Transports proches » / « Points utiles » / « Lancer la recherche » (module Mobilité),
   et il remplace la liste des calques par un catalogue de catégories en français, classées par thème.
   Les anciens gestionnaires restent dans ces fichiers mais ne sont plus appelés. */
const lieux = (() => {
  const CFG = { timeoutMs: 20000, nomiGapMs: 1100 };           // modifiables (les tests les réduisent)
  const SERVERS = [
    "https://overpass-api.de/api/interpreter",                 // serveur principal
    "https://overpass.private.coffee/api/interpreter",         // ancien overpass.kumi.systems
    "https://overpass.openstreetmap.fr/api/interpreter"        // OSM France
  ];
  const HINT = { 429: " (trop de requêtes)", 502: " (serveur surchargé)", 503: " (serveur surchargé)", 504: " (serveur surchargé)", 406: " (requête refusée)", 403: " (accès refusé)" };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const host = u => new URL(u).hostname;
  const nowS = () => Date.now() / 1000;
  const cancelled = () => Object.assign(new Error("recherche annulée"), { cancelled: true });
  const turbo = q => "https://overpass-turbo.eu/?Q=" + encodeURIComponent(q) + "&R";

  /* =====================================================================
     CATALOGUE DES CALQUES : [nom affiché, filtre Overpass, mot de recherche Nominatim (ou null)]
     - Le filtre n'a qu'UNE condition : ["clé"="valeur"] ou ["clé"~"^(a|b)$"].
     - Le mot Nominatim sert à l'aperçu rapide ; mets null si la catégorie n'a pas d'équivalent (Overpass seul).
     Pour ajouter une catégorie : ajoute une ligne dans le bon groupe (ou crée un groupe).
     ===================================================================== */
  const CATALOGUE = [
    ["Transports", [
      ["Arrêts de bus", '["highway"="bus_stop"]', "bus stop"],
      ["Gares et haltes", '["railway"~"^(station|halt)$"]', "train station"],
      ["Gares routières", '["amenity"="bus_station"]', "bus station"],
      ["Arrêts de tram", '["railway"="tram_stop"]', "tram stop"],
      ["Stations de métro", '["station"="subway"]', null],
      ["Aéroports et aérodromes", '["aeroway"="aerodrome"]', "airport"],
      ["Héliports", '["aeroway"="helipad"]', "helipad"],
      ["Ports de plaisance", '["leisure"="marina"]', "marina"],
      ["Terminaux de ferry", '["amenity"="ferry_terminal"]', "ferry terminal"],
      ["Parkings", '["amenity"="parking"]', "parking"],
      ["Bornes de recharge électrique", '["amenity"="charging_station"]', "charging station"],
      ["Stations-service", '["amenity"="fuel"]', "petrol station"],
      ["Stations de vélos en libre-service", '["amenity"="bicycle_rental"]', "bicycle rental"],
      ["Aires d'autoroute", '["highway"="services"]', null],
      ["Péages", '["barrier"="toll_booth"]', "toll booth"],
      ["Passages à niveau", '["railway"="level_crossing"]', "level crossing"],
      ["Ronds-points", '["junction"="roundabout"]', null],
      ["Ponts", '["bridge"="yes"]', null]
    ]],
    ["Urgences, santé et administration", [
      ["Hôpitaux", '["amenity"="hospital"]', "hospital"],
      ["Cliniques", '["amenity"="clinic"]', "clinic"],
      ["Médecins", '["amenity"="doctors"]', "doctors"],
      ["Dentistes", '["amenity"="dentist"]', "dentist"],
      ["Pharmacies", '["amenity"="pharmacy"]', "pharmacy"],
      ["Gendarmeries et commissariats", '["amenity"="police"]', "police"],
      ["Casernes de pompiers", '["amenity"="fire_station"]', "fire station"],
      ["Mairies", '["amenity"="townhall"]', "town hall"],
      ["Bureaux de poste", '["amenity"="post_office"]', "post office"],
      ["Hébergements d'urgence", '["social_facility"="shelter"]', null],
      ["Défibrillateurs", '["emergency"="defibrillator"]', null]
    ]],
    ["Hébergement et restauration", [
      ["Hôtels", '["tourism"="hotel"]', "hotel"],
      ["Auberges de jeunesse", '["tourism"="hostel"]', "hostel"],
      ["Chambres d'hôtes", '["tourism"="guest_house"]', "guest house"],
      ["Campings", '["tourism"="camp_site"]', "camp site"],
      ["Refuges de montagne", '["tourism"="alpine_hut"]', null],
      ["Restaurants", '["amenity"="restaurant"]', "restaurant"],
      ["Cafés", '["amenity"="cafe"]', "cafe"],
      ["Bars", '["amenity"="bar"]', "bar"],
      ["Restauration rapide", '["amenity"="fast_food"]', "fast food"]
    ]],
    ["Commerces et banques", [
      ["Supermarchés", '["shop"="supermarket"]', "supermarket"],
      ["Supérettes", '["shop"="convenience"]', "convenience store"],
      ["Boulangeries", '["shop"="bakery"]', "bakery"],
      ["Boucheries", '["shop"="butcher"]', "butcher"],
      ["Coiffeurs", '["shop"="hairdresser"]', "hairdresser"],
      ["Laveries", '["shop"="laundry"]', "laundry"],
      ["Bureaux de tabac", '["shop"="tobacco"]', null],
      ["Magasins de bricolage", '["shop"="doityourself"]', null],
      ["Marchés", '["amenity"="marketplace"]', "marketplace"],
      ["Banques", '["amenity"="bank"]', "bank"],
      ["Distributeurs de billets", '["amenity"="atm"]', "atm"]
    ]],
    ["Lieux publics et repères", [
      ["Écoles", '["amenity"="school"]', "school"],
      ["Universités", '["amenity"="university"]', "university"],
      ["Bibliothèques", '["amenity"="library"]', "library"],
      ["Lieux de culte", '["amenity"="place_of_worship"]', "place of worship"],
      ["Cimetières", '["landuse"="cemetery"]', "cemetery"],
      ["Musées", '["tourism"="museum"]', "museum"],
      ["Châteaux", '["historic"="castle"]', "castle"],
      ["Monuments", '["historic"="monument"]', "monument"],
      ["Points de vue", '["tourism"="viewpoint"]', "viewpoint"],
      ["Phares", '["man_made"="lighthouse"]', "lighthouse"],
      ["Châteaux d'eau", '["man_made"="water_tower"]', "water tower"],
      ["Antennes et pylônes télécom", '["man_made"~"^(mast|tower|communications_tower)$"]', null],
      ["Éoliennes", '["generator:source"="wind"]', null],
      ["Stades", '["leisure"="stadium"]', "stadium"],
      ["Piscines", '["leisure"="swimming_pool"]', "swimming pool"],
      ["Parcs", '["leisure"="park"]', "park"],
      ["Aires de jeux", '["leisure"="playground"]', "playground"],
      ["Cabines téléphoniques", '["amenity"="telephone"]', "telephone"],
      ["Cinémas", '["amenity"="cinema"]', "cinema"]
    ]]
  ];
  // Traductions ajoutées aux fiches (types et rubriques) sans écraser ce que 07-carte.js contient déjà
  const TR_VALS = { tram_stop: "Arrêt de tram", subway: "Métro", helipad: "Héliport", marina: "Port de plaisance", bicycle_rental: "Vélos en libre-service",
    charging_station: "Borne de recharge", toll_booth: "Péage", level_crossing: "Passage à niveau", services: "Aire d'autoroute", clinic: "Clinique",
    dentist: "Dentiste", shelter: "Hébergement d'urgence", defibrillator: "Défibrillateur", hotel: "Hôtel", hostel: "Auberge de jeunesse",
    guest_house: "Chambre d'hôtes", camp_site: "Camping", alpine_hut: "Refuge de montagne", marketplace: "Marché", atm: "Distributeur de billets",
    laundry: "Laverie", tobacco: "Bureau de tabac", doityourself: "Magasin de bricolage", university: "Université", cemetery: "Cimetière", museum: "Musée",
    castle: "Château", monument: "Monument", viewpoint: "Point de vue", lighthouse: "Phare", stadium: "Stade", swimming_pool: "Piscine", park: "Parc",
    playground: "Aire de jeux", telephone: "Cabine téléphonique", cinema: "Cinéma", bus_station: "Gare routière", ferry_terminal: "Terminal de ferry" };
  const TR_KEYS = { tourism: "Tourisme", historic: "Patrimoine historique", leisure: "Loisirs", landuse: "Usage du sol", barrier: "Barrière", capacity: "Capacité",
    fee: "Payant", stars: "Étoiles", cuisine: "Cuisine", emergency: "Urgence", social_facility: "Structure sociale" };
  function installCatalogue() {
    const sel = $("ovPreset"); if (!sel || typeof OV_PRESETS === "undefined") return;
    if (typeof OSM_VALS !== "undefined") for (const [k, v] of Object.entries(TR_VALS)) if (!(k in OSM_VALS)) OSM_VALS[k] = v;
    if (typeof OSM_KEYS !== "undefined") for (const [k, v] of Object.entries(TR_KEYS)) if (!(k in OSM_KEYS)) OSM_KEYS[k] = v;
    // OV_PRESETS est lu par 07-carte.js (filtre, champ « Personnalisé… ») : on remplit le même tableau, dans l'ordre du catalogue
    OV_PRESETS.length = 0;
    let html = "";
    CATALOGUE.forEach(([group, items]) => {
      html += `<optgroup label="${esc(group)}">`;
      items.forEach(it => { html += `<option value="${OV_PRESETS.length}">${esc(it[0])}</option>`; OV_PRESETS.push(it); });
      html += "</optgroup>";
    });
    html += `<optgroup label="Autre"><option value="${OV_PRESETS.length}">Personnalisé… (clé=valeur)</option></optgroup>`;
    OV_PRESETS.push(["Personnalisé…", null, null]);
    sel.innerHTML = html; sel.value = "0";
    if ($("ovCustomRow")) $("ovCustomRow").hidden = true;
  }

  /* ---------- Jeton : une nouvelle recherche annule la précédente ---------- */
  function token() {
    const t = { cancelled: false, ctls: new Set(), cancel() { t.cancelled = true; t.ctls.forEach(c => c.abort()); } };
    return t;
  }

  /* ---------- Pause après un échec, et mémoire des serveurs bloqués par le réseau ---------- */
  const coolLeft = () => Math.max(0, Math.ceil((+load("lieuxCool", 0)) - nowS()));
  const setCool = s => save("lieuxCool", nowS() + s);
  const dead = () => load("lieuxDead", {});
  const isDead = h => (dead()[h] || 0) > nowS();
  const markDead = (h, s = 1800) => { const d = dead(); d[h] = nowS() + s; save("lieuxDead", d); };

  /* ---------- Overpass : un serveur à la fois, jamais en parallèle ---------- */
  async function overpass(q, tk) {
    const left = coolLeft();
    if (left) throw Object.assign(new Error("Overpass en pause"), { cooldown: left, report: [] });
    const report = []; let rate = false;
    for (const u of SERVERS) {
      const h = host(u);
      if (isDead(h)) { report.push({ host: h, kind: "ignoré : ce réseau bloque ce serveur (nouvel essai dans 30 min)" }); continue; }
      if (tk.cancelled) throw cancelled();
      const ac = new AbortController(); tk.ctls.add(ac);
      const t0 = Date.now(), tm = setTimeout(() => { ac.timedOut = true; ac.abort(); }, CFG.timeoutMs);
      try {
        const r = await fetch(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ac.signal });
        clearTimeout(tm);
        if (!r.ok) { report.push({ host: h, kind: `HTTP ${r.status}${HINT[r.status] || ""}` }); if (r.status === 429) rate = true; continue; }
        let j = null; try { j = await r.json(); } catch { /* page d'erreur */ }
        if (!j) { report.push({ host: h, kind: "réponse illisible" }); continue; }
        if (/runtime error|timed out|out of memory/i.test(j.remark || "") && !(j.elements || []).length) { report.push({ host: h, kind: "requête trop lourde pour ce serveur" }); continue; }
        save("lieuxCool", 0);
        return j.elements || [];
      } catch (err) {
        clearTimeout(tm);
        if (tk.cancelled) throw cancelled();
        const fast = Date.now() - t0 < 1500 && !ac.timedOut;            // échec immédiat : le réseau bloque ce serveur
        if (fast) markDead(h);
        report.push({ host: h, kind: ac.timedOut ? `aucune réponse en ${Math.round(CFG.timeoutMs / 1000)} s` : fast ? "bloqué ou injoignable (échec immédiat)" : "connexion interrompue" });
      } finally { tk.ctls.delete(ac); }
    }
    setCool(rate ? 120 : 60);
    throw Object.assign(new Error("Overpass ne répond pas"), { report });
  }

  /* ---------- Nominatim : aperçu rapide ---------- */
  const cache = new Map();                                              // évite de reposer la même question (10 min)
  function hit(x) {
    const a = x.address || {}, t = { ...(x.extratags || {}), [x.category]: x.type, name: x.name || "" };
    if (a.house_number) t["addr:housenumber"] = a.house_number;
    if (a.road || a.pedestrian) t["addr:street"] = a.road || a.pedestrian;
    if (a.postcode) t["addr:postcode"] = a.postcode;
    const city = a.city || a.town || a.village || a.municipality; if (city) t["addr:city"] = city;
    return { type: x.osm_type || "node", id: x.osm_id, lat: +x.lat, lon: +x.lon, tags: t };
  }
  const vbOf = (w, s, e, n) => `${w},${n},${e},${s}`;
  async function nomi(vb, phrase, limit, tk) {
    const key = `${vb}|${phrase}|${limit}`, c = cache.get(key);
    if (c && Date.now() - c.t < 600000) return c.v;
    const ac = new AbortController(); tk.ctls.add(ac);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&bounded=1&extratags=1&addressdetails=1&accept-language=fr&viewbox=${vb}&q=${encodeURIComponent(phrase)}`, { signal: ac.signal });
      if (!r.ok) throw new Error("Nominatim HTTP " + r.status);
      const v = (await r.json()).map(hit);
      cache.set(key, { t: Date.now(), v });
      return v;
    } catch (err) { if (tk.cancelled) throw cancelled(); throw err; }
    finally { tk.ctls.delete(ac); }
  }
  // Une zone de carte : Nominatim ne renvoie que 40 résultats par requête. Quand une zone est pleine, elle est découpée en 4,
  // et ainsi de suite (2 niveaux : jusqu'à 16 zones, 640 résultats). Budget : 21 requêtes (1 par seconde, règle de Nominatim).
  // Les résultats s'affichent au fil de l'eau ; `partial` vaut vrai si certaines zones restent pleines (résultats incomplets).
  async function nomiArea(b, phrase, tk, onPart, stop) {
    const seen = new Map(), budget = { n: 0, max: 21 }, st = { partial: false };
    const emit = () => onPart([...seen.values()], st.partial);
    async function cell(w, s, e, n, depth) {
      if (tk.cancelled || stop() || budget.n >= budget.max) { if (budget.n >= budget.max) st.partial = true; return; }
      if (budget.n++) await sleep(CFG.nomiGapMs);
      if (tk.cancelled || stop()) return;
      let list;
      try { list = await nomi(vbOf(w, s, e, n), phrase, 40, tk); }
      catch (err) { if (tk.cancelled) throw cancelled(); if (budget.n === 1) throw err; st.partial = true; return; }
      list.forEach(x => seen.set(x.type + x.id, x)); emit();
      if (list.length >= 40) {
        if (depth >= 2) { st.partial = true; return; }
        const mx = (w + e) / 2, my = (s + n) / 2;
        for (const q of [[w, my, mx, n], [mx, my, e, n], [w, s, mx, my], [mx, s, e, my]]) await cell(...q, depth + 1);
      }
    }
    await cell(b.getWest(), b.getSouth(), b.getEast(), b.getNorth(), 0);
    return Object.assign([...seen.values()], { partial: st.partial });
  }

  const diagHtml = (err, q) => `<details class="mob-diag"><summary class="mono small">POURQUOI ?</summary>
    <ul class="small">${(err.report || []).map(r => `<li><b>${esc(r.host)}</b> : ${esc(r.kind)}</li>`).join("") || "<li>Overpass est en pause suite à un échec récent.</li>"}</ul>
    <p class="small muted">Les serveurs Overpass publics sont gratuits et souvent saturés ou filtrés par les réseaux d'entreprise. <a class="link" href="${turbo(q)}" target="_blank" rel="noopener">Ouvrir cette requête dans Overpass Turbo ↗</a></p></details>`;
  const failText = err => err.cooldown
    ? `Résultats complets en pause : Overpass a échoué il y a peu, nouvel essai possible dans ${err.cooldown} s.`
    : "Résultats complets indisponibles : Overpass ne répond pas pour le moment. Réessaie dans une minute.";

  /* =====================================================================
     1. PAGE CARTE : calques (bouton « Afficher dans la vue »)
     ===================================================================== */
  let calque = null;
  function installCalques() {
    if (!$("ovRun")) return;
    $("ovRun").onclick = async () => {
      if (!map) return;
      map.invalidateSize();                                              // taille réelle de la carte
      if (map.getZoom() < 13) return toast("Zoome davantage (niveau 13 minimum) pour limiter la zone");
      const f = ovFilter(); if (!f) return toast("Filtre personnalisé : écris clé=valeur (ex. shop=bakery)");
      const preset = OV_PRESETS[+$("ovPreset").value], name = preset[0], ok = ovMatcher(f);
      const key = (f.match(/^\["([^"]+)"/) || [])[1];
      const b = map.getBounds(), bb = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map(v => v.toFixed(5)).join(",");
      const q = `[out:json][timeout:20];nwr${f}(${bb});out tags center 300;`;
      // Mot Nominatim : celui du catalogue ; pour « Personnalisé… », la valeur saisie (ex. bakery)
      const phrase = preset[1] === null ? (f.match(/="([^"]+)"/) || [])[1] : preset[2];
      if (calque) calque.cancel();
      const tk = calque = token();
      const st = { nomi: null, nomiErr: null, nomiDone: !phrase, full: null, fullErr: null, ovDone: false };
      const paint = () => {
        if (tk.cancelled) return;
        ovLayer.clearLayers();
        L.rectangle(b, { color: ACCENT, weight: 1.5, dashArray: "5 5", fill: false, interactive: false }).addTo(ovLayer);
        const r = ovDrawResults(st.full || st.nomi || [], ok, key, b);
        const plural = r.kept > 1 ? "s" : "";
        let html;
        if (st.full) {
          html = r.kept
            ? `${r.kept} résultat${plural} « ${esc(name)} » dans la zone en pointillés${r.kept >= 300 ? " (limité à 300)" : ""}${r.dropped ? ` · ${r.dropped} écarté${r.dropped > 1 ? "s" : ""}` : ""}. Survole un point pour son nom, clique pour sa fiche.`
            : `Aucun résultat « ${esc(name)} » dans la zone en pointillés.`;
        } else {
          const head = !phrase ? `Cette catégorie nécessite Overpass.`
            : r.kept ? `<b>${r.kept} résultat${plural} « ${esc(name)} »</b> (aperçu rapide Nominatim${st.partial ? " : zone très dense, des résultats manquent, zoome ou importe un résultat Overpass Turbo ci-dessous" : ", peut être incomplet"}${st.nomiDone ? "" : ", recherche en cours…"}). Survole un point pour son nom, clique pour sa fiche.`
            : st.nomiDone ? `Aucun résultat dans l'aperçu rapide (qui ne couvre pas toutes les catégories).` : `Recherche en cours…`;
          const tail = !st.ovDone ? ` Résultats complets en cours (Overpass, jusqu'à 1 min)…` : ` ${esc(failText(st.fullErr || {}))}`;
          html = head + tail + (st.ovDone && st.fullErr ? diagHtml(st.fullErr, q) : "");
          if (st.nomiErr && !r.kept) html += ` <span class="muted">(Nominatim : ${esc(st.nomiErr.message)})</span>`;
        }
        $("ovOut").innerHTML = html;
      };
      $("ovOut").textContent = "Recherche en cours…";
      ovLayer.clearLayers();
      L.rectangle(b, { color: ACCENT, weight: 1.5, dashArray: "5 5", fill: false, interactive: false }).addTo(ovLayer);
      overpass(q, tk).then(els => { st.full = els; }).catch(err => { if (!tk.cancelled) st.fullErr = err; }).finally(() => { st.ovDone = true; paint(); });
      if (phrase) {
        nomiArea(b, phrase, tk, (list, partial) => { st.nomi = list; st.partial = partial; paint(); }, () => !!st.full)
          .then(list => { st.nomi = list; st.partial = list.partial; }).catch(err => { if (!tk.cancelled) st.nomiErr = err; }).finally(() => { st.nomiDone = true; paint(); });
      } else paint();
    };
    $("ovClear").onclick = () => { if (calque) calque.cancel(); ovLayer?.clearLayers(); $("ovOut").textContent = "Calque effacé."; };
  }

  /* ---------- Import d'un résultat Overpass Turbo ----------
     Quand ton réseau empêche l'application d'interroger Overpass mais qu'Overpass Turbo fonctionne :
     1. clique « Ouvrir cette requête dans Overpass Turbo », puis Exécuter ;  2. Exporter › « données brutes OSM » (.json) ou GeoJSON ;
     3. importe le fichier (ou colle son contenu) ici : tous les résultats s'affichent sur la carte. */
  function parseOverpassExport(text) {
    let j; try { j = JSON.parse(text); } catch { throw new Error("ce n'est pas du JSON (exporte « données brutes OSM » ou « GeoJSON » depuis Overpass Turbo)"); }
    if (Array.isArray(j.elements)) return j.elements;                                // données brutes OSM
    if (j.type === "FeatureCollection" && Array.isArray(j.features)) {               // GeoJSON
      const mid = c => { const pts = []; (function walk(a) { typeof a[0] === "number" ? pts.push(a) : a.forEach(walk); })(c);
        return pts.length ? [pts.reduce((s, q) => s + q[1], 0) / pts.length, pts.reduce((s, q) => s + q[0], 0) / pts.length] : null; };
      return j.features.map(f => {
        if (!f.geometry || !f.geometry.coordinates) return null;
        const ll = mid(f.geometry.coordinates), pr = f.properties || {}, id = String(pr["@id"] || f.id || "");
        const tags = {}; Object.keys(pr).forEach(k => { if (k[0] !== "@") tags[k] = pr[k]; });
        const m = id.match(/^(node|way|relation)\/(\d+)/);
        return ll ? { type: m ? m[1] : "node", id: m ? +m[2] : 0, lat: ll[0], lon: ll[1], center: { lat: ll[0], lon: ll[1] }, tags } : null;
      }).filter(Boolean);
    }
    throw new Error("format non reconnu");
  }
  function showImported(els) {
    if (calque) calque.cancel();
    ovLayer.clearLayers();
    const all = { contains: () => true };
    const r = ovDrawResults(els, () => true, undefined, all);
    const pts = els.map(e => e.type === "node" || e.lat != null ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null).filter(Boolean);
    if (pts.length && typeof map.fitBounds === "function") { try { map.fitBounds(pts, { padding: [30, 30], maxZoom: 17 }); } catch { /* vue inchangée */ } }
    $("ovOut").innerHTML = r.kept ? `<b>${r.kept} résultat${r.kept > 1 ? "s" : ""} importé${r.kept > 1 ? "s" : ""} depuis Overpass Turbo.</b> Survole un point pour son nom, clique pour sa fiche.`
      : "Le fichier ne contient aucun objet avec une position.";
  }
  function installImport() {
    if (!$("ovOut") || $("ovImport")) return;
    $("ovOut").insertAdjacentHTML("afterend", `<details class="ov-import" id="ovImport"><summary class="mono small">IMPORTER UN RÉSULTAT OVERPASS TURBO</summary>
      <p class="small muted">Si la recherche ne trouve pas tout : lance la requête dans Overpass Turbo (lien sous la carte), puis <b>Exporter › données brutes OSM (.json)</b> ou <b>GeoJSON</b>, et importe le fichier ici.</p>
      <div class="row wrap-row"><button class="btn ghost sm" id="ovImpBtn">Choisir un fichier…</button><input type="file" id="ovImpFile" accept=".json,.geojson,application/json" hidden></div>
      <textarea id="ovImpText" placeholder="… ou colle ici le contenu exporté" rows="3"></textarea>
      <button class="btn ghost sm" id="ovImpGo">Afficher sur la carte</button></details>`);
    const run = text => { try { showImported(parseOverpassExport(text)); } catch (err) { $("ovOut").textContent = "Import impossible : " + err.message; } };
    $("ovImpBtn").onclick = () => $("ovImpFile").click();
    $("ovImpFile").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (f) run(await f.text()); };
    $("ovImpGo").onclick = () => { const t = $("ovImpText").value.trim(); t ? run(t) : toast("Colle d'abord le contenu exporté"); };
  }

  /* =====================================================================
     2. MODULE MOBILITÉ : onglets « Transports proches » et « Points utiles »
     ===================================================================== */
  const KINDS = {
    hubs: [
      { n: "Gare", c: "#805ad5", test: t => t.railway === "station" || t.railway === "halt" },
      { n: "Gare routière", c: "#d69e2e", test: t => t.amenity === "bus_station" },
      { n: "Aéroport", c: "#e53e3e", test: t => t.aeroway === "aerodrome" && (t.iata || t.icao) },
      { n: "Port / ferry", c: "#3182ce", test: t => t.amenity === "ferry_terminal" }
    ],
    pois: [
      { n: "Hôpital / urgences", c: "#e53e3e", test: t => t.amenity === "hospital" },
      { n: "Gendarmerie / police", c: "#2b6cb0", test: t => t.amenity === "police" },
      { n: "Hébergement d'urgence", c: "#2f855a", test: t => t.social_facility === "shelter" },
      { n: "Pharmacie", c: "#38a169", test: t => t.amenity === "pharmacy" },
      { n: "Aire de service", c: "#d69e2e", test: t => t.highway === "services" || t.highway === "rest_area" }
    ]
  };
  const MOB = {
    hubs: { phrases: [["train station", 15], ["bus station", 15], ["ferry terminal", 20], ["airport", 60]],
      intro: "Départs possibles depuis le dernier lieu (aéroports jusqu'à 60 km). Vérifie les horaires réels avec l'onglet <b>Liens</b>.",
      empty: "Aucune gare, gare routière, aéroport ou port trouvé à proximité.",
      q: A => `[out:json][timeout:15];(node["railway"~"^(station|halt)$"](around:15000,${A.lat},${A.lng});nwr["amenity"~"^(bus_station|ferry_terminal)$"](around:15000,${A.lat},${A.lng});nwr["aeroway"="aerodrome"]["iata"](around:60000,${A.lat},${A.lng}););out tags center 150;` },
    pois: { phrases: [["hospital", 8], ["police", 8], ["pharmacy", 8]],
      intro: "Hôpitaux, forces de l'ordre, accueil et pharmacies (8 km), aires d'autoroute (20 km). Dans une recherche réelle, ces appels sont faits par la famille ou les enquêteurs.",
      empty: "Aucun point utile trouvé à proximité.",
      q: A => `[out:json][timeout:15];(nwr["amenity"~"^(hospital|police|pharmacy)$"](around:8000,${A.lat},${A.lng});nwr["social_facility"="shelter"](around:8000,${A.lat},${A.lng});nwr["highway"~"^(services|rest_area)$"](around:20000,${A.lat},${A.lng}););out tags center 150;` }
  };
  const mobCtx = () => (typeof mobilite !== "undefined" && mobilite.ctx) || null;
  function mobPlace() {                                                  // si l'accès direct n'est pas disponible : lecture du texte affiché
    const c = mobCtx(); if (c && c.A) return c.A;
    const m = ($("mbAinfo") ? $("mbAinfo").textContent : "").match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    return m ? { lat: +m[1], lng: +m[2], name: ($("mbA") && $("mbA").value) || `${m[1]}, ${m[2]}` } : null;
  }
  function placesList(els, kinds, A, empty, ctx) {
    const rows = els.map(e => {
      const t = e.tags || {}, ll = e.type === "node" ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : (e.lat != null ? [e.lat, e.lon] : null);
      if (!ll) return null;
      const k = kinds.find(k => k.test(t)); if (!k) return null;
      return { ll, k, name: t["name:fr"] || t.name || k.n, d: gcDist([A.lat, A.lng], ll), tel: t.phone || t["contact:phone"] || "" };
    }).filter(Boolean).sort((a, b) => a.d - b.d);
    const seen = new Set(), out = rows.filter(r => { const key = r.k.n + r.name; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 18);
    const poi = ctx && ctx.layers && ctx.layers.poi;
    if (poi) { poi.clearLayers(); out.forEach(r => window.L && L.circleMarker(r.ll, { radius: 6, color: "#0d0d0d", weight: 1.5, fillColor: r.k.c, fillOpacity: .9 }).bindTooltip(`${r.k.n} · ${esc(r.name)}`).addTo(poi)); }
    const dist = d => d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1).replace(".", ",") + " km";
    return { out, html: out.length
      ? `<ul class="list small mob-list">${out.map((r, i) => `<li><i class="mob-dot" style="background:${r.k.c}"></i><span class="t"><b>${esc(r.name)}</b><small class="mono muted"> ${r.k.n} · ${dist(r.d)}${r.tel ? ` · ${esc(r.tel)}` : ""}</small></span><button class="task-link" data-lxgo="${i}">Voir</button></li>`).join("")}</ul>`
      : `<p class="small muted">${empty}</p>` };
  }
  let mobTk = null;
  async function mobRun(t) {
    const pane = $("mbPane"), A = mobPlace();
    if (!A) { pane.innerHTML = `<p class="small muted">Indique d'abord le dernier lieu connu.</p>`; return; }
    const ctx = mobCtx(), spec = MOB[t], q = spec.q(A);
    if (mobTk) mobTk.cancel();
    const tk = mobTk = token(), root = document.createElement("div");
    pane.innerHTML = ""; pane.appendChild(root);
    const st = { nomi: [], step: 0, nomiDone: false, nomiErr: null, full: null, fullErr: null, ovDone: false };
    const paint = () => {
      if (tk.cancelled || !pane.contains(root)) return;
      const list = placesList(st.full || st.nomi, KINDS[t], A, spec.empty, ctx);
      let note;
      if (st.full) note = `<p class="mono small muted">RÉSULTATS COMPLETS (OVERPASS)</p>`;
      else if (!st.nomiDone) note = `<p class="small muted">Recherche rapide… (${st.step}/${spec.phrases.length})</p>`;
      else if (!st.ovDone) note = `<p class="small muted">Aperçu rapide (Nominatim), peut être incomplet. Résultats complets en cours (Overpass, jusqu'à 1 min)…</p>`;
      else note = `<p class="small muted">Aperçu rapide (Nominatim), peut être incomplet${t === "pois" ? " : pas d'aires de service ni d'hébergements d'urgence" : ""}. ${esc(failText(st.fullErr || {}))}</p>
        <div class="row wrap-row"><button class="btn ghost sm" data-lxretry="1">Réessayer</button></div>${st.fullErr ? diagHtml(st.fullErr, q) : ""}`;
      root.innerHTML = `<p class="small">${spec.intro}</p>${list.html}${note}${st.nomiErr && !list.out.length ? `<p class="small muted">Nominatim : ${esc(st.nomiErr.message)}</p>` : ""}`;
      root.querySelectorAll("[data-lxgo]").forEach(b => b.onclick = () => { const r = list.out[+b.dataset.lxgo]; if (r && ctx && ctx.mmap) ctx.mmap.setView(r.ll, 15); });
      root.querySelector("[data-lxretry]")?.addEventListener("click", () => mobRun(t));
    };
    paint();
    overpass(q, tk).then(els => { st.full = els; }).catch(err => { if (!tk.cancelled) st.fullErr = err; }).finally(() => { st.ovDone = true; paint(); });
    try {
      for (const [i, [phrase, km]] of spec.phrases.entries()) {
        if (tk.cancelled || st.full) break;
        if (i) await sleep(CFG.nomiGapMs);
        if (tk.cancelled || st.full) break;
        const dLat = km / 111, dLng = km / (111 * Math.cos(A.lat * Math.PI / 180));
        st.nomi.push(...await nomi(vbOf(A.lng - dLng, A.lat - dLat, A.lng + dLng, A.lat + dLat), phrase, 20, tk));
        st.step = i + 1; paint();
      }
    } catch (err) { if (!tk.cancelled) st.nomiErr = err; }
    st.nomiDone = true; paint();
  }
  // Les clics sont interceptés avant les anciens gestionnaires (qui interrogeaient Overpass seul)
  function installMobilite() {
    document.addEventListener("click", ev => {
      const tg = ev.target && ev.target.closest ? ev.target : null; if (!tg) return;
      const act = () => document.querySelector("#mbTabs .on")?.dataset.mt;
      const go = tg.closest("#mbGo"), tab = tg.closest("#mbTabs button[data-mt]");
      if (go) { const t = act(); if (t === "hubs" || t === "pois") { ev.stopPropagation(); ev.preventDefault(); mobRun(t); } }
      else if (tab && (tab.dataset.mt === "hubs" || tab.dataset.mt === "pois")) {
        ev.stopPropagation(); ev.preventDefault();
        document.querySelectorAll("#mbTabs button").forEach(b => b.classList.toggle("on", b === tab));
        mobRun(tab.dataset.mt);
      }
    }, true);
  }

  installCatalogue();
  installCalques();
  installImport();
  installMobilite();
  return { cfg: CFG, overpass, nomiArea, token, coolLeft, catalogue: CATALOGUE, parseOverpassExport };
})();
