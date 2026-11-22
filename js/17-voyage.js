/* OSINT Hub — 17-voyage.js · transition « voyage » entre les pages
   Version 3D (globe.gl / WebGL) avec un avion qui suit la trajectoire.
   Optimisée pour les PC modestes :
     - le fond de carte est une image légère ; côtes et frontières sont des lignes vectorielles nettes,
       regroupées en 2 objets 3D seulement (au lieu de 177 pays) ;
     - le rendu 3D ne tourne que pendant la transition, et les shaders sont préparés à l'avance ;
     - un profil « économie » est choisi automatiquement (processeur / mémoire modestes, ou transition mesurée lente) ;
     - si la machine reste trop lente, ou sans WebGL, une transition légère sans globe prend le relais.
   Chaque page est associée à une ville (nom, code aéroport, latitude, longitude) : modifie VOYAGE pour changer les destinations. */
const VOYAGE = {
  home:      ["Lyon", "LYS", 45.764, 4.836],
  dashboard: ["Paris", "CDG", 48.857, 2.352],
  search:    ["New York", "JFK", 40.713, -74.006],
  map:       ["Tokyo", "HND", 35.676, 139.650],
  photo:     ["Rio de Janeiro", "GIG", -22.907, -43.173],
  training:  ["Le Cap", "CPT", -33.925, 18.424],
  cases:     ["Sydney", "SYD", -33.869, 151.209],
  about:     ["Reykjavik", "KEF", 64.147, -21.942]
};

/* ---------- Outils géographiques ---------- */
const vgeo = (() => {
  const R = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const toV = (la, lo) => [Math.cos(la * R) * Math.cos(lo * R), Math.cos(la * R) * Math.sin(lo * R), Math.sin(la * R)];
  const toLL = v => [Math.atan2(v[2], Math.hypot(v[0], v[1])) / R, Math.atan2(v[1], v[0]) / R];
  const angle = (a, b) => Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
  function slerp(a, b, t) {
    const d = angle(a, b); if (d < 1e-6) return a;
    const s1 = Math.sin((1 - t) * d) / Math.sin(d), s2 = Math.sin(t * d) / Math.sin(d);
    return [s1 * a[0] + s2 * b[0], s1 * a[1] + s2 * b[1], s1 * a[2] + s2 * b[2]];
  }
  const unwrap = (prev, lng) => { while (lng - prev > 180) lng -= 360; while (lng - prev < -180) lng += 360; return lng; };
  const coord = (la, lo) => `${Math.abs(la).toFixed(2)}°${la >= 0 ? "N" : "S"} ${Math.abs(lo).toFixed(2)}°${lo >= 0 ? "E" : "O"}`;
  return { clamp, toV, toLL, angle, slerp, unwrap, coord };
})();

// Dernier clic : la transition s'ouvre depuis cet endroit
let voyagePtr = null;
addEventListener("pointerdown", e => { voyagePtr = [e.clientX, e.clientY, performance.now()]; }, true);
const voyageOrigin = () => voyagePtr && performance.now() - voyagePtr[2] < 1500 ? voyagePtr : [innerWidth / 2, innerHeight / 2];

// Avion vu de dessus, nez vers la droite (le JavaScript le fait pivoter selon le cap)
const PLANE_SVG = `<svg viewBox="-24 -24 48 48" aria-hidden="true"><path d="M22 0 C22 -1.6 20 -2.4 17 -2.4 L5 -2.4 L-6 -17 L-10.5 -17 L-4 -2.4 L-13 -2.4 L-17 -8 L-20 -8 L-17.5 0 L-20 8 L-17 8 L-13 2.4 L-4 2.4 L-10.5 17 L-6 17 L5 2.4 L17 2.4 C20 2.4 22 1.6 22 0 Z"/></svg>`;

/* ---------- Transition 3D (globe.gl) ---------- */
const voyage3d = (() => {
  const SRC = "https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js";
  const LOW = !!load("voyLow", false) || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  let state = load("voyOff3d", false) ? "failed" : "idle";
  let G = null, root = null, plane = null, look = "", runId = 0, timers = [], vec = null, trail = null, tctx = null;

  function webgl() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }
  function load3d() {
    if (state !== "idle") return;
    if (!webgl()) { state = "failed"; return; }
    state = "loading";
    const s = document.createElement("script");
    s.src = SRC; s.async = true; s.crossOrigin = "anonymous";
    s.onload = () => { try { build(); state = "ready"; warmup(); } catch (err) { console.warn("Transition 3D indisponible :", err); state = "failed"; } };
    s.onerror = () => { state = "failed"; };
    document.head.appendChild(s);
  }
  // Taille réelle de la zone d'affichage (sans la barre de défilement) : la même pour le globe, la traînée et l'avion
  const VW = () => root ? root.clientWidth || document.documentElement.clientWidth : document.documentElement.clientWidth;
  const VH = () => root ? root.clientHeight || innerHeight : innerHeight;
  let off = { x: 0, y: 0 };                                        // décalage du canvas 3D dans la zone (s'il y en a un)
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.max(0, a).toFixed(3)})`; };

  // Carte du monde dessinée une seule fois dans une image (projection équirectangulaire)
  function texture(lines) {
    const night = settings.theme === "night", W = LOW ? 1024 : 2048, H = W / 2;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    const P = (lo, la) => [(lo + 180) / 360 * W, (90 - la) / 180 * H];
    x.fillStyle = night ? "#17181a" : "#e4e2da"; x.fillRect(0, 0, W, H);
    x.strokeStyle = night ? "rgba(235,233,225,.07)" : "rgba(13,13,13,.07)"; x.lineWidth = 1;
    x.beginPath();
    for (let lo = -180; lo <= 180; lo += 15) { const [a] = P(lo, 0); x.moveTo(a, 0); x.lineTo(a, H); }
    for (let la = -75; la <= 75; la += 15) { const [, b] = P(0, la); x.moveTo(0, b); x.lineTo(W, b); }
    x.stroke();
    const ring = r => {                                         // gère les contours qui traversent l'antiméridien
      let prev = r[0][0]; const pts = r.map(([lo, la]) => { lo = vgeo.unwrap(prev, lo); prev = lo; return [lo, la]; });
      const minLo = Math.min(...pts.map(p => p[0])), maxLo = Math.max(...pts.map(p => p[0]));
      for (const off of [0, maxLo > 180 ? -360 : 0, minLo < -180 ? 360 : 0].filter((v, i, a) => a.indexOf(v) === i)) {
        pts.forEach(([lo, la], i) => { const [a, b] = P(lo + off, la); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath();
      }
    };
    const land = window.LAND && window.LAND.length ? window.LAND : (window.WORLD || []).flatMap(c => c[2]);
    x.beginPath(); land.forEach(ring);
    x.fillStyle = night ? "#3a3b36" : "#f7f6f1"; x.fill();
    if (lines) {                                                // secours si les lignes vectorielles sont indisponibles
      x.strokeStyle = night ? "rgba(235,233,225,.5)" : "rgba(13,13,13,.45)"; x.lineWidth = W / 2048; x.stroke();
      x.beginPath(); (window.WORLD || []).forEach(c => c[2].forEach(ring));
      x.strokeStyle = night ? "rgba(235,233,225,.22)" : "rgba(13,13,13,.18)"; x.lineWidth = W / 2048 * .8; x.stroke();
    }
    return c.toDataURL("image/jpeg", .9);
  }

  function build() {
    root = document.createElement("div");
    root.id = "voyage3d"; root.setAttribute("aria-hidden", "true");
    root.innerHTML = `<div class="v3-globe"></div><canvas class="v3-trail"></canvas>
      <div class="v3-hud mono"><b class="v3-route"></b><span class="v3-km"></span><span class="v3-pos"></span></div>
      <div class="v3-title"><span></span><i></i></div>`;
    document.body.appendChild(root);
    trail = root.querySelector(".v3-trail"); tctx = trail.getContext("2d");
    const el = root.querySelector(".v3-globe");
    const cfg = { animateIn: false, waitForGlobeReady: false, rendererConfig: { antialias: !LOW, alpha: true, powerPreference: LOW ? "low-power" : "high-performance" } };
    try { G = new window.Globe(el, cfg); } catch { G = null; }               // syntaxe des versions récentes
    if (!G || typeof G.pointOfView !== "function") G = window.Globe(cfg)(el); // syntaxe des anciennes versions
    G.width(VW()).height(VH()).backgroundColor("rgba(0,0,0,0)")
      .showGraticules(true).showAtmosphere(!LOW).atmosphereAltitude(.1)
      .pathPoints("pts").pathPointLat(p => p[0]).pathPointLng(p => p[1]).pathPointAlt(p => p[2])
      .pathColor("c").pathStroke(LOW ? null : "w")
      .pathDashLength("dl").pathDashGap("dg").pathDashInitialGap("ig").pathDashAnimateTime("t")
      // Impulsions : couleur, taille et rythme propres à chaque point (signaux ambiants + arrivée)
      .ringColor(d => t => d.white ? `rgba(255,255,255,${(.55 * (1 - t)).toFixed(3)})` : hexA(ACCENT, (d.a || 1) * (1 - t)))
      .ringMaxRadius("r").ringPropagationSpeed("v").ringRepeatPeriod("per").ringAltitude(.002)
      // Trafic aérien ambiant : arcs dont des tirets lumineux circulent en continu (animés par la carte graphique)
      .arcColor("c").arcStroke(LOW ? null : .35).arcAltitudeAutoScale(.35)
      .arcDashLength(.22).arcDashGap(1.4).arcDashInitialGap("g").arcDashAnimateTime("t")
      // Villes et avion sont placés par globe.gl lui-même (même repère que le globe : plus de décalage possible).
      // Chaque élément est un point d'ancrage de taille nulle ; le contenu est positionné autour de ce point.
      .htmlElement(d => {
        const e = document.createElement("div");
        e.className = "v3-pin";
        e.innerHTML = d.plane ? `<div class="v3-plane">${PLANE_SVG}</div>`
          : `<div class="v3-city${d.end ? " end" : ""}"><i></i><span><b>${d.code}</b><small>${esc(d.name.toUpperCase())} · ${vgeo.coord(d.lat, d.lng)}</small></span></div>`;
        d.el = e; if (d.plane) plane = e.firstChild;
        return e;
      }).htmlAltitude(d => d.plane ? d.alt : .004);
    ["pathTransitionDuration", "htmlTransitionDuration", "arcsTransitionDuration"].forEach(k => typeof G[k] === "function" && G[k](0));
    try { G.renderer().setPixelRatio(Math.min(devicePixelRatio || 1, LOW ? 1.5 : 2)); } catch { /* ancienne version */ }
    const ctl = G.controls(); ctl.enabled = false; ctl.autoRotate = false;
    theme();
    G.pauseAnimation();
  }
  // Fond du globe : vraie imagerie de la Terre (NASA Blue Marble le jour, lumières des villes la nuit) + relief.
  // Images préchargées : si elles ne se chargent pas, la carte dessinée localement prend le relais.
  const IMG = "https://cdn.jsdelivr.net/npm/three-globe@2.41.12/example/img/";
  const MAPS = { paper: IMG + "earth-blue-marble.jpg", night: IMG + "earth-night.jpg", bump: IMG + "earth-topology.png" };
  const imgOk = {}, imgs = {};
  const preload = url => imgOk[url] !== undefined ? Promise.resolve(imgOk[url]) : new Promise(res => {
    const i = new Image(); i.crossOrigin = "anonymous"; imgs[url] = i;
    i.onload = () => res(imgOk[url] = true); i.onerror = () => res(imgOk[url] = false); i.src = url;
  });

  /* ---------- Planète vivante : cycle jour / nuit ----------
     Le globe mélange l'imagerie de jour et les lumières des villes selon la position RÉELLE du soleil.
     Pendant le vol, le temps s'accélère : la ligne d'ombre (avec une lueur de crépuscule) balaie la planète.
     Tout est calculé par la carte graphique. */
  const dn = { sun: new Float32Array([1, 0, 0]), on: false, busy: false };
  function subsolar(ms) {                                          // point de la Terre où le soleil est au zénith
    const d = ms / 864e5 - 10957.5, R = Math.PI / 180;
    const g = (357.529 + .98560028 * d) * R, q = 280.459 + .98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * R, e = (23.439 - 3.6e-7 * d) * R;
    const dec = Math.asin(Math.sin(e) * Math.sin(L)) / R, ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / R;
    const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    return [dec, ((ra - gmst * 15) % 360 + 540) % 360 - 180];
  }
  function setSun(ms) {
    if (!dn.on || typeof G.getCoords !== "function") return;
    const [la, lo] = subsolar(ms), c = G.getCoords(la, lo, 0), n = Math.hypot(c.x, c.y, c.z) || 1;
    dn.sun[0] = c.x / n; dn.sun[1] = c.y / n; dn.sun[2] = c.z / n;
  }
  function installDayNight(tries = 0) {
    if (dn.on || dn.busy) return;
    const m = G.globeMaterial();
    if (!m || !m.map || !m.map.image || !imgs[MAPS.night]) { if (tries < 60) setTimeout(() => installDayNight(tries + 1), 150); return; }
    dn.busy = true;
    try {
      const Tex = m.map.constructor;
      const mk = img => { const t = new Tex(img); t.needsUpdate = true; if ("colorSpace" in m.map) t.colorSpace = m.map.colorSpace; t.anisotropy = 4; return t; };
      const nightTex = mk(imgs[MAPS.night]);
      const uv = "channel" in m.map ? "vMapUv" : "vUv";            // nom de la variable selon la version de three.js
      m.onBeforeCompile = sh => {
        sh.uniforms.uNight = { value: nightTex }; sh.uniforms.uSun = { value: dn.sun };
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vWN;\nvarying vec3 vWP;")
          .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform sampler2D uNight;\nuniform vec3 uSun;\nvarying vec3 vWN;\nvarying vec3 vWP;")
          .replace("#include <map_fragment>", `
            vec3 nGlow = vec3(0.0);
            #ifdef USE_MAP
              vec4 dayC = texture2D(map, ${uv});
              vec3 nightC = texture2D(uNight, ${uv}).rgb;
              float sd = dot(normalize(vWN), normalize(uSun));
              float lit = smoothstep(-0.10, 0.20, sd);
              diffuseColor.rgb *= dayC.rgb * (0.06 + 0.94 * lit);
              nGlow = nightC * (1.0 - lit) * 1.35;                    // lumières des villes côté nuit uniquement
            #endif`)
          .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += nGlow;");
      };
      // Aucun reflet sur les océans (rendu mat)
      m.specularMap = null;
      if (m.specular) m.specular.set("#000000");
      if ("shininess" in m) m.shininess = 1;
      m.needsUpdate = true; dn.on = true;
      setSun(Date.now());
      // Garde-fou : si la carte graphique refuse le shader, retour à l'image simple
      setTimeout(() => {
        try {
          const bad = (G.renderer().info.programs || []).some(pr => pr.diagnostics && pr.diagnostics.runnable === false);
          if (bad) { console.warn("Cycle jour/nuit indisponible sur cette carte graphique."); m.onBeforeCompile = () => {}; m.needsUpdate = true; dn.on = false; }
        } catch { /* rien */ }
      }, 1200);
    } catch (err) { console.warn("Cycle jour/nuit indisponible :", err); dn.on = false; }
    dn.busy = false;
  }
  function theme() {
    const key = settings.theme + ACCENT;
    if (key === look) return;
    look = key;
    const night = settings.theme === "night", url = MAPS.paper;       // jour + nuit mélangés selon le soleil, dans les deux thèmes
    G.atmosphereColor(night ? ACCENT : "#9fb8d6").atmosphereAltitude(.14);
    const m = G.globeMaterial(); if (m && "shininess" in m && !dn.on) m.shininess = 10;
    if (dn.on) return;
    const local = () => { G.globeImageUrl(texture(!vec)); if (vec) { vec.coast.visible = true; colorLines(); } };
    if (imgOk[url] === false) return local();
    local();                                                          // affichage immédiat, remplacé dès que l'image est prête
    preload(url).then(ok => {
      if (!ok || look !== key) return;
      G.globeImageUrl(url);
      preload(MAPS.night).then(n => { if (n) installDayNight(); });
      if (!LOW) preload(MAPS.bump).then(b => { if (b) { G.bumpImageUrl(MAPS.bump); if (m && m.bumpScale !== undefined) m.bumpScale = 8; } });
      if (vec) { vec.coast.visible = false; colorLines(); }          // l'imagerie montre déjà les côtes
    });
  }
  // Côtes et frontières en lignes vectorielles 3D : nettes à tous les zooms, 2 objets seulement.
  // Les classes three.js sont reprises de la grille du globe (même version que globe.gl, pas de téléchargement en plus).
  function vectorLines() {
    try {
      const scene = G.scene(); let grat = null;
      scene.traverse(o => { if (!grat && o.isLineSegments) grat = o; });
      if (!grat || typeof G.getCoords !== "function") return false;
      const LS = grat.constructor, Mat = grat.material.constructor;
      // La grille utilise une géométrie spéciale (GeoJSON) : on remonte jusqu'à la classe de base (BufferGeometry)
      let Geo = grat.geometry.constructor;
      while (Geo && !Object.prototype.hasOwnProperty.call(Geo.prototype, "setAttribute")) Geo = Object.getPrototypeOf(Geo.prototype)?.constructor;
      if (!Geo || Geo === Object) return false;
      const Attr = grat.geometry.getAttribute("position").constructor;
      const make = (rings, alt) => {
        const out = [];
        const push = (a, b) => { const p = G.getCoords(a[1], a[0], alt), q = G.getCoords(b[1], b[0], alt); out.push(p.x, p.y, p.z, q.x, q.y, q.z); };
        rings.forEach(r => {
          for (let i = 1; i < r.length; i++) {
            const a = r[i - 1], b = r[i], dl = Math.abs(b[0] - a[0]);
            if (dl > 180) continue;                                   // saut à l'antiméridien
            const n = Math.max(1, Math.ceil(Math.max(dl, Math.abs(b[1] - a[1])) / 2));   // segments longs découpés : ils épousent la sphère
            let prev = a;
            for (let k = 1; k <= n; k++) { const c = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]; push(prev, c); prev = c; }
          }
        });
        const geo = new Geo(); geo.setAttribute("position", new Attr(new Float32Array(out), 3));
        const line = new LS(geo, new Mat({ transparent: true, depthWrite: false }));
        scene.add(line); return line;
      };
      const coast = window.LAND && window.LAND.length ? window.LAND : (window.WORLD || []).flatMap(c => c[2]);
      vec = { coast: make(coast, .0025), borders: make((window.WORLD || []).flatMap(c => c[2]), .002) };
      G.showGraticules(false);
      colorLines();
      look = ""; theme();                               // le fond n'a plus besoin des traits (ils seraient flous)
      return true;
    } catch (err) { console.warn("Lignes vectorielles indisponibles :", err); vec = null; return false; }
  }
  function colorLines() {
    const night = settings.theme === "night";
    vec.coast.material.color.set(night ? "#ebe9e1" : "#0d0d0d"); vec.coast.material.opacity = night ? .55 : .5;
    const photo = imgOk[night ? MAPS.night : MAPS.paper] === true;
    vec.borders.material.color.set(photo ? "#ffffff" : (night ? "#ebe9e1" : "#0d0d0d"));
    vec.borders.material.opacity = photo ? (night ? .14 : .28) : (night ? .25 : .2);
  }
  // Prépare les shaders et envoie la texture à la carte graphique avant la première transition (évite l'à-coup du premier vol)
  function warmup() {
    G.pointOfView({ lat: VOYAGE.home[2], lng: VOYAGE.home[3], altitude: 1.5 }, 0);
    G.pathsData([{ pts: [[0, 0, .1], [10, 10, .1]], c: ACCENT, w: .5, dl: 1, dg: 0, ig: 0, t: 0 }]);
    root.className = "on";
    G.resumeAnimation();
    setTimeout(() => { if (!vec) vectorLines(); }, 200);              // la grille du globe existe après le premier rendu
    setTimeout(() => { if (!root.classList.contains("in")) { G.pauseAnimation(); root.className = ""; G.pathsData([]); } }, 700);
  }

  function run(from, to, apply) {
    timers.forEach(clearTimeout); timers = [];
    const id = ++runId, later = (ms, f) => timers.push(setTimeout(() => id === runId && f(), ms));
    const A = VOYAGE[from] || VOYAGE.home, B = VOYAGE[to] || VOYAGE.home;
    const va = vgeo.toV(A[2], A[3]), vb = vgeo.toV(B[2], B[3]), d = vgeo.angle(va, vb), km = d * 6371;
    const fly = (1100 + d / Math.PI * 900) * (LOW ? .85 : 1);           // ~1,1 s à 2 s selon la distance
    const near = vgeo.clamp(.22 + d * .3, .22, .75), high = vgeo.clamp(.35 + d * 1.2, near + .1, 2.5);
    const top = vgeo.clamp(d * .34, .035, Math.min(.55, high * .4));     // hauteur de l'arc : proportionnelle à la distance
    const REVEAL = 300, SETTLE = 340, OUT = 440, N = LOW ? 64 : 110;
    theme();
    root.className = "on";                                          // visible pour pouvoir mesurer la zone
    if (G.width() !== VW() || G.height() !== VH()) G.width(VW()).height(VH());
    off = { x: 0, y: 0 };
    // Trajectoire : grand cercle, avec une montée puis une descente
    const route = [];
    const lift = p => top * Math.pow(Math.sin(Math.PI * p), .85);      // montée franche, descente douce : vraie courbe
    for (let i = 0; i <= N; i++) { const p = i / N, [la, lo] = vgeo.toLL(vgeo.slerp(va, vb, p)); route.push([la, lo, lift(p)]); }
    const at = p => { const [la, lo] = vgeo.toLL(vgeo.slerp(va, vb, p)); return [la, lo, lift(p)]; };
    const city = (P, end) => ({ name: P[0], code: P[1], lat: P[2], lng: P[3], end });
    const cA = city(A, false), cB = city(B, true), pD = { plane: true, lat: A[2], lng: A[3], alt: 0 };
    const amb = ambient(A, B);
    G.pathsData([]).arcsData(amb.arcs).ringsData(amb.rings).htmlElementsData([cA]);
    G.pointOfView({ lat: A[2], lng: A[3], altitude: near }, 0);
    root.querySelector(".v3-route").textContent = `${A[1]}  ──  ${B[1]}`;
    root.querySelector(".v3-km").textContent = `0 / ${fmtNum(km)} KM`;
    root.querySelector(".v3-pos").textContent = vgeo.coord(A[2], A[3]);
    root.querySelector(".v3-title span").textContent = String(VIEWS[to] || "").toUpperCase();
    if (plane) plane.style.opacity = 0;
    const tdpr = Math.min(devicePixelRatio || 1, LOW ? 1.5 : 2);
    trail.width = VW() * tdpr; trail.height = VH() * tdpr; tctx.setTransform(tdpr, 0, 0, tdpr, 0, 0);
    tctx.clearRect(0, 0, VW(), VH());
    const [ox, oy] = voyageOrigin();
    root.style.setProperty("--ox", ox + "px"); root.style.setProperty("--oy", oy + "px");
    root.className = "on"; document.body.classList.add("voyaging");
    G.resumeAnimation();
    requestAnimationFrame(() => requestAnimationFrame(() => id === runId && root.classList.add("in")));

    const sun0 = Date.now(); setSun(sun0);
    later(REVEAL, () => {
      apply();                                                             // la page change derrière le globe
      G.htmlElementsData([cA, cB, pD]);
      G.pathsData([]);                                                 // pas de ligne : seule la traînée de l'avion marque le trajet
      // Traînée : les points de trajectoire juste derrière l'avion, reprojetés à chaque image (elle reste collée au globe)
      const night = settings.theme === "night", TRAIL = LOW ? 18 : 32;
      const tail = vgeo.clamp(.05 + d * .05, .07, .16);                // longueur de la traînée (part du trajet)
      tctx.lineCap = "round";
      // La traînée est un tracé 3D de globe.gl (même repère que le globe et l'avion : elle reste collée à l'avion)
      const inkRGB = night ? "235,233,225" : "13,13,13", tA = night ? .5 : .4;
      const drawTrail = (p) => {
        const pts = [];
        for (let i = 0; i <= TRAIL; i++) { const q = p - tail * (1 - i / TRAIL); if (q >= 0) pts.push(at(q)); }
        if (pts.length < 2) return;
        G.pathsData([{ pts, c: [`rgba(${inkRGB},0)`, `rgba(${inkRGB},${tA})`], w: LOW ? null : .45, dl: 1, dg: 0, ig: 0, t: 0 }]);
      };
      let fadeA = 1;
      const fadeTrail = () => { if (fadeA > 0) { fadeA = 0; G.pathsData([]); } };
      trail.style.opacity = 1;
      const t0 = performance.now(), deltas = [];
      let cam = va, lng = A[3], last = t0, frame = 0, ang = null;
      const step = now => {
        if (id !== runId) return;
        const dt = Math.min(now - last, 60); if (now > last) deltas.push(now - last); last = now; frame++;
        const p = vgeo.clamp((now - t0) / fly, 0, 1);
        // Caméra : suit l'avion avec un amortissement
        const k = 1 - Math.exp(-dt / 160);
        cam = vgeo.slerp(cam, vgeo.slerp(va, vb, p), k);
        const [la, lo] = vgeo.toLL(cam); lng = vgeo.unwrap(lng, lo);
        const prog = vgeo.clamp(vgeo.angle(va, cam) / (d || 1), 0, 1);
        G.pointOfView({ lat: la, lng, altitude: near + (high - near) * Math.sin(Math.PI * prog) }, 0);
        setSun(sun0 + (now - t0) / (fly + SETTLE) * 6 * 3600e3);         // 6 h de rotation de la Terre pendant le vol
        // Calage de la traînée sur le repère de globe.gl : on compare la position réelle du point de départ
        // (placé par globe.gl) à celle calculée ; l'écart éventuel est appliqué à la traînée
        if (frame === 3 && cA.el && cA.el.isConnected) {
          const r1 = cA.el.getBoundingClientRect(), rr = trail.getBoundingClientRect(), s0 = G.getScreenCoords(A[2], A[3], .004);
          if (s0 && isFinite(s0.x) && r1.width === 0) off = { x: r1.left - rr.left - s0.x, y: r1.top - rr.top - s0.y };
        }
        // Avion : position sur le globe (placée par globe.gl) et cap (orienté vers le point suivant de la trajectoire)
        if (p < 1 && plane) {
          const [pla, plo, palt] = at(p), [nla, nlo, nalt] = at(Math.min(1, p + .01));
          const s = G.getScreenCoords(pla, plo, palt), n = G.getScreenCoords(nla, nlo, nalt);
          if (s && n && isFinite(s.x) && isFinite(n.x)) {
            const target = Math.atan2(n.y - s.y, n.x - s.x);
            ang = ang == null ? target : ang + Math.atan2(Math.sin(target - ang), Math.cos(target - ang)) * Math.min(1, dt / 90);
            const sc = 1 + .55 * (palt / (top || 1));
            pD.lat = pla; pD.lng = plo; pD.alt = palt; G.htmlElementsData([cA, cB, pD]);
            plane.style.transform = `rotate(${ang}rad) scale(${sc.toFixed(3)})`;
            plane.style.setProperty("--sh", `${(4 + 10 * palt / (top || 1)).toFixed(1)}px`);
            plane.style.opacity = Math.min(1, p * 12);
            drawTrail(p);
          }
        } else { if (plane) plane.style.opacity = 0; fadeTrail(); }
        if (frame % 3 === 0) {
          root.querySelector(".v3-km").textContent = `${fmtNum(km * p)} / ${fmtNum(km)} KM`;
          root.querySelector(".v3-pos").textContent = vgeo.coord(la, lo);
        }
        if (now - t0 < fly + SETTLE + OUT) requestAnimationFrame(step);
        else adapt(deltas);
      };
      requestAnimationFrame(step);
      later(fly * .4, () => root.classList.add("titled"));
      later(fly, () => {
        G.ringsData([...amb.rings, { lat: B[2], lng: B[3], r: LOW ? 3 : 4.5, v: 3, per: 650 }]);   // onde d'arrivée
        root.classList.add("arrive");
      });
      later(fly + SETTLE, () => root.classList.add("out"));
      later(fly + SETTLE + OUT, () => {
        root.className = ""; document.body.classList.remove("voyaging");
        G.pauseAnimation(); G.pathsData([]).arcsData([]).ringsData([]).htmlElementsData([]);
      });
    });
  }
  // Grandes villes du monde : points de départ du trafic et des signaux ambiants
  const HUBS = [[51.47, -.45], [40.64, -73.78], [25.25, 55.36], [1.36, 103.99], [35.55, 139.78], [-33.94, 151.18], [33.94, -118.41],
    [49.01, 2.55], [50.04, 8.56], [52.31, 4.76], [41.98, -87.9], [-23.43, -46.47], [19.09, 72.87], [22.31, 113.92], [37.46, 126.44],
    [-26.14, 28.24], [30.12, 31.41], [55.97, 37.41], [43.68, -79.63], [19.44, -99.07], [-34.82, -58.54], [13.69, 100.75],
    [45.72, 5.08], [40.47, -3.56], [41.8, 12.24], [64.13, -21.94], [-1.32, 36.93], [6.58, 3.32], [31.14, 121.81], [-37.67, 144.84]];
  function ambient(A, B) {
    const pick = n => Array.from({ length: n }, () => HUBS[(Math.random() * HUBS.length) | 0]);
    const night = settings.theme === "night", n = LOW ? 7 : 16;
    const arcs = [];
    for (let i = 0; i < n * 3 && arcs.length < n; i++) {
      const [a, b] = pick(2); if (a === b) continue;
      const far = vgeo.angle(vgeo.toV(...a), vgeo.toV(...b));
      if (far < .15) continue;
      arcs.push({ startLat: a[0], startLng: a[1], endLat: b[0], endLng: b[1], g: Math.random() * 1.6,
        t: 1800 + far * 1400 + Math.random() * 900,
        c: night ? ["rgba(255,214,150,0)", "rgba(255,214,150,.55)"] : ["rgba(255,255,255,0)", "rgba(255,255,255,.7)"] });
    }
    // Signaux : impulsions lentes, désynchronisées, sur quelques villes
    const rings = pick(LOW ? 5 : 11).map(h => ({ lat: h[0], lng: h[1], white: true, r: 1.2 + Math.random() * 1.6, v: .8 + Math.random() * .6, per: 1400 + Math.random() * 1800 }));
    // Départ et arrivée : impulsion douce et permanente
    rings.push({ lat: A[2], lng: A[3], r: 1.6, v: 1.2, per: 1500, a: .6 }, { lat: B[2], lng: B[3], r: 1.6, v: 1.2, per: 1500, a: .6 });
    return { arcs, rings };
  }
  // Ajustement automatique : si la transition a été lente, on passe en économie, puis en transition légère
  function adapt(deltas) {
    if (deltas.length < 10) return;
    const med = deltas.slice().sort((a, b) => a - b)[deltas.length >> 1];
    if (med > 34 && !LOW) { save("voyLow", true); console.info("Transition voyage : profil économie activé (prochain chargement)."); }
    else if (med > 45 && LOW) { save("voyOff3d", true); state = "failed"; console.info("Transition voyage : globe 3D désactivé, transition légère utilisée."); }
  }
  return { load: load3d, run, ready: () => state === "ready", low: LOW };
})();

/* ---------- Transition légère (sans globe) ---------- */
function voyageLite(from, to, apply) {
  let el = document.getElementById("voyageLite");
  if (!el) {
    el = document.createElement("div"); el.id = "voyageLite"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<div class="v3-hud mono"><b class="v3-route"></b></div><div class="vl-plane">${PLANE_SVG}</div><div class="v3-title"><span></span><i></i></div>`;
    document.body.appendChild(el);
  }
  const A = VOYAGE[from] || VOYAGE.home, B = VOYAGE[to] || VOYAGE.home, [ox, oy] = voyageOrigin();
  el.querySelector(".v3-route").textContent = `${A[1]}  ──  ${B[1]}`;
  el.querySelector(".v3-title span").textContent = String(VIEWS[to] || "").toUpperCase();
  el.style.setProperty("--ox", ox + "px"); el.style.setProperty("--oy", oy + "px");
  el.className = "on";
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in", "titled")));
  setTimeout(() => { apply(); el.classList.add("out"); }, 520);
  setTimeout(() => { el.className = ""; }, 520 + 460);
}

/* ---------- Point d'entrée utilisé par la navigation ---------- */
function voyage(from, to, apply) {
  if (voyage3d.ready()) return voyage3d.run(from, to, apply);
  voyage3d.load();
  voyageLite(from, to, apply);
}
// Téléchargement de la bibliothèque 3D en arrière-plan, quand le navigateur est inactif
addEventListener("load", () => {
  const go = () => { if (fxOn()) voyage3d.load(); };
  "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 3000 }) : setTimeout(go, 1500);
});
