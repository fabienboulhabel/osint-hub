/* OSINT Hub — 04-accueil.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 6. ACCUEIL : GLOBE, RÉTICULE, FICHES ---------- */
/* --- Lieux et parcours prédéfinis (monde entier) pour la coupe topographique --- */
const PLACES = {
  lyon: ["Lyon", 45.764, 4.8357], montblanc: ["Mont Blanc", 45.8326, 6.8652], marseille: ["Marseille", 43.2965, 5.3698],
  ventoux: ["Mont Ventoux", 44.1741, 5.2789], toulouse: ["Toulouse", 43.6047, 1.4442], aneto: ["Pic d'Aneto", 42.6311, 0.6567],
  ktm: ["Katmandou", 27.7172, 85.324], everest: ["Everest", 27.9881, 86.925], santiago: ["Santiago du Chili", -33.4489, -70.6693],
  aconcagua: ["Aconcagua", -32.6532, -70.0109], moshi: ["Moshi", -3.3349, 37.3404], kili: ["Kilimandjaro", -3.0674, 37.3556],
  tokyo: ["Tokyo", 35.6762, 139.6503], fuji: ["Mont Fuji", 35.3606, 138.7274], gcs: ["Grand Canyon (rive sud)", 36.0544, -112.1401],
  gcn: ["Grand Canyon (rive nord)", 36.1979, -112.0526], hilo: ["Hilo", 19.7071, -155.0885], maunakea: ["Mauna Kea", 19.8207, -155.4681]
};
const ROUTES = [["lyon", "montblanc"], ["marseille", "ventoux"], ["toulouse", "aneto"], ["ktm", "everest"], ["santiago", "aconcagua"],
  ["moshi", "kili"], ["tokyo", "fuji"], ["gcs", "gcn"], ["hilo", "maunakea"]];
// Profil de secours (hors ligne) pour Lyon → Mont Blanc : [km, m]
const LYON_MB_FALLBACK = [[0, 170], [12, 210], [25, 240], [38, 260], [52, 300], [62, 420], [70, 380], [82, 520], [90, 300], [97, 890], [104, 600], [110, 270],
  [122, 300], [134, 340], [148, 900], [158, 1550], [166, 1100], [176, 1000], [184, 1600], [192, 1035], [198, 2600], [203, 3800], [206, 4806], [210, 3600]];

// Géodésie : distance et points intermédiaires sur le grand cercle
const RADK = Math.PI / 180;
function gcDist(a, b) {
  const [p1, l1, p2, l2] = [a[0] * RADK, a[1] * RADK, b[0] * RADK, b[1] * RADK];
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function gcPoints(a, b, n) {
  const toV = ([la, lo]) => [Math.cos(la * RADK) * Math.cos(lo * RADK), Math.cos(la * RADK) * Math.sin(lo * RADK), Math.sin(la * RADK)];
  const A = toV(a), B = toV(b), d = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s1 = d ? Math.sin((1 - t) * d) / Math.sin(d) : 1 - t, s2 = d ? Math.sin(t * d) / Math.sin(d) : t;
    const v = [s1 * A[0] + s2 * B[0], s1 * A[1] + s2 * B[1], s1 * A[2] + s2 * B[2]];
    out.push([Math.atan2(v[2], Math.hypot(v[0], v[1])) / RADK, Math.atan2(v[1], v[0]) / RADK]);
  }
  return out;
}
const regionName = (() => { let dn = null; try { dn = new Intl.DisplayNames(["fr"], { type: "region" }); } catch { } return (a2, en) => { try { return (a2 && dn?.of(a2)) || en; } catch { return en; } }; })();
const fmtLat = (la, lo) => `${Math.abs(la).toFixed(4)}°${la >= 0 ? "N" : "S"} · ${Math.abs(lo).toFixed(4)}°${lo >= 0 ? "E" : "O"}`;

/* --- Points enregistrés (partagés entre le globe et la coupe) --- */
let gPoints = load("globePoints", [{ id: "p-lyon", name: "Lyon", lat: 45.764, lng: 4.8357 }]);
const saveGPoints = () => { save("globePoints", gPoints); renderGPoints(); profile.fillSelects(); globe.draw(); };

/* --- GLOBE INTERACTIF --- */
const globe = (() => {
  const c = $("globe"), ctx = c.getContext("2d"), RAD = Math.PI / 180;
  // Pré-calcul : boîtes englobantes des pays (pour le survol)
  const COUNTRIES = (window.WORLD || []).map(([en, a2, rings]) => {
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    rings.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
    return { en, a2, rings, bb: [x0, y0, x1, y1], fr: regionName(a2, en) };
  });
  // Terres détaillées (îles comprises) et petits pays / territoires
  const LANDP = (window.LAND || []).map(ring => {
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    ring.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    return { ring, bb: [x0, y0, x1, y1] };
  });
  const SMALLP = (window.SMALL || []).map(([a2, name, lat, lng]) => ({ fr: name || regionName(a2, a2), a2, lat, lng, small: true }));
  let off = document.createElement("canvas"), octx = off.getContext("2d"), staticKey = "";
  let ptr = null; // dernière position de la souris sur le globe (en pixels)
  let size = 0, lon0 = 4.8, lat0 = 30, zoom = 1, spin = load("globeSpin", true), dragging = null, moved = false;
  let hover = null, hoverCountry = null, sel = null, mark = null, route = null, tween = null, lastInteract = 0, tt = 0, dirty = true;
  let ink = "#0d0d0d", soft = "", land = "", sea = "";

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2); size = c.clientWidth;
    if (!size) return;
    c.width = c.height = size * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true;
  }
  function refreshColors() {
    const night = settings.theme === "night";
    ink = cssVar("--ink") || "#0d0d0d";
    soft = night ? "rgba(235,233,225,.16)" : "rgba(13,13,13,.14)";
    land = night ? "rgba(235,233,225,.10)" : "rgba(13,13,13,.07)";
    sea = night ? "rgba(235,233,225,.02)" : "rgba(255,255,255,.35)";
    dirty = true; draw();
  }
  const R = () => size * .4 * zoom;
  function proj(lon, lat) {
    const r = R(), cx = size / 2, cy = size / 2;
    const l = (lon - lon0) * RAD, p = lat * RAD, p0 = lat0 * RAD;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    let x = r * Math.cos(p) * Math.sin(l), y = -r * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
    if (cosc < 0) { const k = r / (Math.hypot(x, y) || 1); x *= k; y *= k; } // point caché : ramené sur le bord
    return [cx + x, cy + y, cosc];
  }
  function unproj(px, py) {
    const r = R(), x = (px - size / 2) / r, y = -(py - size / 2) / r, rho = Math.hypot(x, y);
    if (rho > 1) return null;
    const cc = Math.asin(rho), p0 = lat0 * RAD;
    const lat = rho ? Math.asin(Math.cos(cc) * Math.sin(p0) + y * Math.sin(cc) * Math.cos(p0) / rho) : p0;
    const lon = lon0 * RAD + Math.atan2(x * Math.sin(cc), rho * Math.cos(cc) * Math.cos(p0) - y * Math.sin(cc) * Math.sin(p0));
    return [lat / RAD, ((lon / RAD + 540) % 360) - 180];
  }
  function inRing(ring, x, y) {
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  const inBB = (bb, lat, lng) => lng >= bb[0] && lng <= bb[2] && lat >= bb[1] && lat <= bb[3];
  function countryAt(lat, lng) {
    const big = COUNTRIES.find(k => inBB(k.bb, lat, lng) && k.rings.some(r => inRing(r, lng, lat)));
    // Petits pays / îles : le plus proche dans un rayon qui dépend du zoom
    const lim = 2.2 / zoom; let best = null, bd = lim;
    SMALLP.forEach(p => { const d = Math.hypot(p.lat - lat, (p.lng - lng) * Math.cos(lat * RAD)); if (d < bd) { bd = d; best = p; } });
    if (best && (!big || bd < .6 / zoom)) return best;
    if (big) return big;
    if (LANDP.some(l => inBB(l.bb, lat, lng) && inRing(l.ring, lng, lat))) return { fr: "Île / terre", island: true };
    return null;
  }
  function path(pts) {
    let pen = false;
    for (const [lo, la] of pts) {
      const [x, y, v] = proj(lo, la);
      if (v > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
    }
  }
  function renderStatic(r, cx, cy) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (off.width !== size * dpr) { off.width = off.height = size * dpr; }
    const g = octx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
    const pathTo = pts => { let pen = false; for (const [lo, la] of pts) { const [x, y, v] = proj(lo, la); if (v > 0) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false; } };
    const poly = ring => { const pts = ring.map(([lo, la]) => proj(lo, la)); if (!pts.some(p => p[2] > 0)) return false; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); return true; };
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = sea; g.fill(); g.clip();
    g.beginPath(); g.strokeStyle = soft; g.lineWidth = .7;
    for (let lo = -180; lo < 180; lo += 15) { const pts = []; for (let la = -90; la <= 90; la += 3) pts.push([lo, la]); pathTo(pts); }
    for (let la = -75; la <= 75; la += 15) { const pts = []; for (let lo = -180; lo <= 180; lo += 3) pts.push([lo, la]); pathTo(pts); }
    g.stroke();
    // Terres émergées détaillées (îles comprises)
    g.fillStyle = land; g.strokeStyle = soft; g.lineWidth = .7;
    LANDP.forEach(l => { if (poly(l.ring)) { g.fill(); g.stroke(); } });
    // Frontières des pays
    COUNTRIES.forEach(k => {
      const isSel = sel && k === sel.country;
      k.rings.forEach(ring => { if (poly(ring)) { if (isSel) { g.fillStyle = ACCENT + "40"; g.fill(); } g.strokeStyle = isSel ? ACCENT : soft; g.lineWidth = isSel ? 1.4 : .6; g.stroke(); } });
    });
    // Petits pays et territoires : un repère (taille selon le zoom)
    const rad = Math.min(3.2, 1.2 + zoom * .4);
    g.fillStyle = ink; g.font = "600 9px JetBrains Mono, monospace"; g.textBaseline = "middle"; g.textAlign = "left";
    SMALLP.forEach(p => {
      const [x, y, v] = proj(p.lng, p.lat); if (v <= .05) return;
      g.globalAlpha = .55; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); g.globalAlpha = 1;
      if (zoom >= 3.2) { g.globalAlpha = .7; g.fillText(p.fr, x + rad + 3, y); g.globalAlpha = 1; }
    });
    g.restore();
  }
  function draw() {
    if (!size) return;
    const r = R(), cx = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);
    // Graduations de la lunette (uniquement sans zoom)
    if (zoom <= 1.05) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      for (let a = 0; a < 360; a += 5) {
        const r1 = r + 10, r2 = r + (a % 30 === 0 ? 22 : 15), s = Math.sin(a * RAD), co = Math.cos(a * RAD);
        ctx.beginPath(); ctx.moveTo(cx + r1 * co, cy + r1 * s); ctx.lineTo(cx + r2 * co, cy + r2 * s); ctx.stroke();
      }
      ctx.font = "600 10px JetBrains Mono, monospace"; ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      [["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["O", -1, 0]].forEach(([t, x, y]) => ctx.fillText(t, cx + x * (r + 34), cy + y * (r + 34)));
    }
    // Couche fixe (mer, graticule, terres, frontières) : recalculée seulement quand la vue change
    const key = [size, lon0.toFixed(3), lat0.toFixed(3), zoom.toFixed(3), ink, land, sel?.country?.fr || ""].join("|");
    if (key !== staticKey) { renderStatic(r, cx, cy); staticKey = key; }
    ctx.drawImage(off, 0, 0, size, size);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    // Pays survolé (dessiné à part pour suivre la souris sans tout recalculer)
    if (hoverCountry && !hoverCountry.island) {
      if (hoverCountry.small) {
        const [x, y, v] = proj(hoverCountry.lng, hoverCountry.lat);
        if (v > 0) { ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = ACCENT + "33"; ctx.fill(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.6; ctx.stroke(); }
      } else hoverCountry.rings.forEach(ring => {
        const pts = ring.map(([lo, la]) => proj(lo, la));
        if (!pts.some(p => p[2] > 0)) return;
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        ctx.fillStyle = ACCENT + "26"; ctx.fill(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.4; ctx.stroke();
      });
    }
    // Méridien de balayage
    if (fxOn()) {
      const scanLon = lon0 - 90 + ((tt * 20) % 180);
      ctx.beginPath(); const sp = []; for (let la = -90; la <= 90; la += 2) sp.push([scanLon, la]); path(sp);
      ctx.strokeStyle = ACCENT + "77"; ctx.lineWidth = 1.2; ctx.stroke();
    }
    // Trajet de la coupe topographique
    if (route) {
      ctx.beginPath(); path(gcPoints(route[0], route[1], 80).map(([la, lo]) => [lo, la]));
      ctx.setLineDash([6, 4]); ctx.strokeStyle = ACCENT; ctx.lineWidth = 2.2; ctx.stroke(); ctx.setLineDash([]);
      [["A", route[0]], ["B", route[1]]].forEach(([t, p]) => {
        const [x, y, v] = proj(p[1], p[0]); if (v <= 0) return;
        ctx.fillStyle = ACCENT; ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.fillStyle = "#fff"; ctx.font = "800 9px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y + .5);
      });
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
    // Points enregistrés
    ctx.font = "700 10px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    gPoints.forEach(p => {
      const [x, y, v] = proj(p.lng, p.lat); if (v <= 0) return;
      ctx.fillStyle = ink; ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = ink; ctx.fillText(p.name.toUpperCase(), x + 7, y);
    });
    // Point sélectionné (réticule pulsé)
    const drawReticle = (p, col, pulse) => {
      const [x, y, v] = proj(p[1], p[0]); if (v <= 0) return;
      const k = pulse ? (tt * .8) % 1 : 0;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 4, y); ctx.moveTo(x + 4, y); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 4); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 14); ctx.stroke();
      if (pulse) { ctx.beginPath(); ctx.arc(x, y, 8 + k * 20, 0, 7); ctx.globalAlpha = 1 - k; ctx.stroke(); ctx.globalAlpha = 1; }
    };
    if (sel) drawReticle([sel.lat, sel.lng], ACCENT, fxOn());
    if (mark) { const [x, y, v] = proj(mark[1], mark[0]); if (v > 0) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = ACCENT; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); } }
    const lonN = ((lon0 + 540) % 360) - 180;
    $("globeRead").textContent = `CENTRE ${fmtLat(lat0, lonN)} · ZOOM ×${zoom.toFixed(1)}`;
    dirty = false;
  }
  function loop() {
    requestAnimationFrame(loop);
    if (current !== "home" || document.hidden) return;
    tt += 1 / 60;
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / 900), e = 1 - Math.pow(1 - k, 3);
      let dl = ((tween.lon - tween.l0 + 540) % 360) - 180;
      lon0 = tween.l0 + dl * e; lat0 = tween.p0 + (tween.lat - tween.p0) * e; zoom = tween.z0 + (tween.z - tween.z0) * e;
      if (k >= 1) tween = null; dirty = true;
    } else if (!dragging && !ptr && spin && fxOn() && !sel && performance.now() - lastInteract > 2500) { lon0 += .06; dirty = true; }
    if (ptr && !dragging && (dirty || tween)) updateHover();
    if (fxOn() && (sel || route)) dirty = true;
    if (dirty || fxOn()) draw();
  }
  // Pays sous la souris : recalculé à chaque mouvement ET à chaque fois que le globe bouge
  function updateHover() {
    const tip = $("globeTip"), [px, py] = ptr, ll = unproj(px, py);
    if (!ll) { if (hoverCountry) { hoverCountry = null; dirty = true; if (!fxOn()) draw(); } tip.hidden = true; return; }
    const k = countryAt(...ll);
    if (k !== hoverCountry) { hoverCountry = k; dirty = true; if (!fxOn()) draw(); }
    tip.hidden = false;
    tip.style.left = Math.min(px + 16, size - 170) + "px"; tip.style.top = (py > size - 60 ? py - 44 : py + 18) + "px";
    tip.innerHTML = `<b>${esc(k ? k.fr : "Océan")}</b><br>${fmtLat(...ll)}`;
  }
  function flyTo(lat, lng, z) { tween = { t0: performance.now(), l0: lon0, p0: lat0, z0: zoom, lon: lng, lat: Math.max(-70, Math.min(70, lat)), z: z ?? Math.max(zoom, 1.8) }; }
  function select(lat, lng, label) {
    sel = { lat, lng, country: countryAt(lat, lng), label: label || "" };
    renderSel(); dirty = true;
    if (!label) reverseName(lat, lng);
  }
  let revTimer;
  function reverseName(lat, lng) {
    clearTimeout(revTimer);
    revTimer = setTimeout(async () => {
      try {
        const r = await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=fr&lat=${lat}&lon=${lng}`)).json();
        if (sel && sel.lat === lat && sel.lng === lng && r?.address) {
          const a = r.address; sel.label = a.city || a.town || a.village || a.municipality || a.county || a.state || ""; renderSel();
        }
      } catch { /* hors ligne : on garde le pays */ }
    }, 400);
  }
  // Interactions souris
  c.addEventListener("pointerdown", e => { dragging = { x: e.clientX, y: e.clientY }; moved = false; c.setPointerCapture(e.pointerId); tween = null; lastInteract = performance.now(); });
  c.addEventListener("pointermove", e => {
    const rect = c.getBoundingClientRect(), px = (e.clientX - rect.left) * size / rect.width, py = (e.clientY - rect.top) * size / rect.height;
    if (dragging) {
      const k = 140 / (size || 400) / zoom, dx = (e.clientX - dragging.x) * k, dy = (e.clientY - dragging.y) * k;
      if (Math.abs(e.clientX - dragging.x) + Math.abs(e.clientY - dragging.y) > 2) moved = true;
      lon0 -= dx; lat0 = Math.max(-80, Math.min(80, lat0 + dy));
      dragging = { x: e.clientX, y: e.clientY }; lastInteract = performance.now(); dirty = true;
      $("globeTip").hidden = true; if (!fxOn()) draw(); return;
    }
    ptr = [px, py]; updateHover();
  });
  c.addEventListener("pointerup", e => {
    const was = dragging; dragging = null; lastInteract = performance.now();
    if (was && !moved) { const rect = c.getBoundingClientRect(), ll = unproj((e.clientX - rect.left) * size / rect.width, (e.clientY - rect.top) * size / rect.height); if (ll) select(...ll); }
  });
  c.addEventListener("pointercancel", () => dragging = null);
  c.addEventListener("pointerleave", () => { ptr = null; $("globeTip").hidden = true; if (hoverCountry) { hoverCountry = null; dirty = true; if (!fxOn()) draw(); } });
  c.addEventListener("wheel", e => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
  c.addEventListener("dblclick", e => { const rect = c.getBoundingClientRect(), ll = unproj((e.clientX - rect.left) * size / rect.width, (e.clientY - rect.top) * size / rect.height); if (ll) openOnMap(ll[0], ll[1], 12); });
  function setZoom(z) { zoom = Math.max(1, Math.min(8, z)); lastInteract = performance.now(); dirty = true; draw(); }
  $("gZoomIn").onclick = () => setZoom(zoom * 1.4);
  $("gZoomOut").onclick = () => setZoom(zoom / 1.4);
  $("gHome").onclick = () => { sel = null; renderSel(); flyTo(30, 4.8, 1); };
  $("gSpin").onclick = () => { spin = !spin; save("globeSpin", spin); $("gSpin").classList.toggle("on", spin); toast(spin ? "Rotation automatique activée" : "Rotation automatique coupée"); };
  $("gSpin").classList.toggle("on", spin);
  addEventListener("resize", () => { resize(); draw(); });
  return {
    start: () => { resize(); refreshColors(); requestAnimationFrame(loop); }, resize, draw: () => { dirty = true; draw(); }, refreshColors,
    flyTo, select, getSel: () => sel, clearSel: () => { sel = null; renderSel(); dirty = true; },
    setMark: m => { mark = m; dirty = true; if (!fxOn()) draw(); }, setRoute: r => { route = r; dirty = true; draw(); }
  };
})();

// Panneau du point sélectionné
function renderSel() {
  const s = globe.getSel();
  if (!s) { $("gSel").innerHTML = `<p class="muted small">Clique sur le globe pour sélectionner un point, ou cherche un lieu.</p>`; return; }
  const country = s.country ? s.country.fr : "Océan";
  $("gSel").innerHTML = `<div class="gs-head"><b>${esc(s.label || country)}</b><span class="mono small">${fmtLat(s.lat, s.lng)}${s.label ? " · " + esc(country) : ""}</span></div>
    <div class="gs-act">
      <button data-ga="save">+ Mes points</button><button data-ga="map">Carte</button><button data-ga="sat">Vue satellite</button>
      <button data-ga="A">Départ A</button><button data-ga="B">Arrivée B</button><button data-ga="copy">Copier</button><button data-ga="x" title="Désélectionner">✕</button>
    </div>`;
  $$("#gSel [data-ga]").forEach(b => b.onclick = () => {
    const a = b.dataset.ga, name = s.label || (s.country ? s.country.fr : "Point");
    if (a === "save") {
      const n = prompt("Nom du point :", name); if (n === null) return;
      gPoints.push({ id: uid(), name: n.trim() || name, lat: +s.lat.toFixed(5), lng: +s.lng.toFixed(5) }); saveGPoints(); toast("Point ajouté");
    }
    if (a === "map") openOnMap(s.lat, s.lng, 13);
    if (a === "sat") openUrl(gmapsEmbed(s.lat, s.lng, 16, "k"), `Satellite · ${name}`);
    if (a === "A" || a === "B") profile.setEnd(a, { name, lat: s.lat, lng: s.lng });
    if (a === "copy") navigator.clipboard.writeText(`${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`).then(() => toast("Coordonnées copiées"));
    if (a === "x") globe.clearSel();
  });
}
function renderGPoints() {
  $("gPoints").innerHTML = gPoints.map(p => `<li><button class="gp-go" data-gp="${p.id}">${esc(p.name)}</button><button class="del" data-gpe="${p.id}" title="Renommer">✎</button><button class="del" data-gpd="${p.id}" title="Supprimer">✕</button></li>`).join("")
    || `<li class="muted small">Aucun point enregistré.</li>`;
  $$("[data-gp]").forEach(b => b.onclick = () => { const p = gPoints.find(x => x.id === b.dataset.gp); globe.flyTo(p.lat, p.lng); globe.select(p.lat, p.lng, p.name); });
  $$("[data-gpe]").forEach(b => b.onclick = () => { const p = gPoints.find(x => x.id === b.dataset.gpe); const n = prompt("Nouveau nom :", p.name); if (n?.trim()) { p.name = n.trim(); saveGPoints(); } });
  $$("[data-gpd]").forEach(b => b.onclick = () => { if (confirm("Supprimer ce point ?")) { gPoints = gPoints.filter(x => x.id !== b.dataset.gpd); saveGPoints(); } });
}
// Recherche d'un lieu dans le monde
let gTimer;
$("gSearch").oninput = () => {
  clearTimeout(gTimer);
  const q = $("gSearch").value.trim(), ll = parseLatLng(q);
  if (!q) return ($("gResults").innerHTML = "");
  if (ll && /^[-\d.,;\s]+$/.test(q)) { $("gResults").innerHTML = `<div data-gll="${ll}" data-gn="">→ Aller à ${fmtLat(...ll)}</div>`; return bindGRes(); }
  gTimer = setTimeout(async () => {
    try {
      const r = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=fr&q=${enc(q)}`)).json();
      $("gResults").innerHTML = r.map(x => `<div data-gll="${x.lat},${x.lon}" data-gn="${esc(x.display_name.split(",")[0])}">${esc(x.display_name)}</div>`).join("") || "<div>Aucun résultat</div>";
      bindGRes();
    } catch { $("gResults").innerHTML = "<div>Recherche indisponible (connexion ?)</div>"; }
  }, 900);
};
$("gSearch").onkeydown = e => { if (e.key === "Enter") $("gResults").querySelector("[data-gll]")?.click(); };
function bindGRes() {
  $$("#gResults [data-gll]").forEach(d => d.onclick = () => {
    const [a, b] = d.dataset.gll.split(",").map(Number);
    globe.flyTo(a, b, 2.4); globe.select(a, b, d.dataset.gn || ""); $("gResults").innerHTML = ""; $("gSearch").value = "";
  });
}

onEnter.home = () => { globe.resize(); globe.draw(); setTimeout(() => profile.resize(), 30); };

// Réticule qui suit la souris sur l'accueil (masqué au-dessus du globe pour ne pas gêner le pointage)
addEventListener("mousemove", e => {
  if (current !== "home" || !fxOn()) return;
  $("cross").style.visibility = e.target.closest?.(".globe-wrap, .profile-band") ? "hidden" : "";
  document.querySelector("#cross .cx").style.top = e.clientY + "px";
  document.querySelector("#cross .cy").style.left = e.clientX + "px";
  const l = $("crossLbl"); l.style.left = e.clientX + 12 + "px"; l.style.top = e.clientY + 12 + "px";
  l.textContent = `X ${pad(e.clientX, 4)} · Y ${pad(e.clientY + Math.round(scrollY), 4)}`;
}, { passive: true });

/* --- COUPE TOPOGRAPHIQUE (monde entier, altitudes réelles) --- */
const profile = (() => {
  const c = $("profile"), ctx = c.getContext("2d"), N = 100;
  let W = 0, H = 0, mx = -1, t0 = 0, data = null, loading = false;
  let ends = load("profileEnds", { A: { name: "Lyon", lat: 45.764, lng: 4.8357 }, B: { name: "Mont Blanc", lat: 45.8326, lng: 6.8652 } });
  const cache = load("profileCache", {});

  function fillSelects() {
    const presetOpts = ROUTES.map(([a, b], i) => `<option value="${i}">${PLACES[a][0]} → ${PLACES[b][0]}</option>`).join("");
    $("pbPreset").innerHTML = `<option value="">Parcours prédéfinis…</option>${presetOpts}`;
    const opts = `<optgroup label="Mes points">${gPoints.map(p => `<option value="p:${p.id}">${esc(p.name)}</option>`).join("") || "<option disabled>— aucun —</option>"}</optgroup>
      <optgroup label="Lieux">${Object.entries(PLACES).map(([k, p]) => `<option value="k:${k}">${p[0]}</option>`).join("")}</optgroup>`;
    ["A", "B"].forEach(s => { const el = $("pb" + s); el.innerHTML = `<option value="">${esc(ends[s].name)} (actuel)</option>` + opts; });
  }
  const resolve = v => {
    if (v.startsWith("p:")) { const p = gPoints.find(x => x.id === v.slice(2)); return p && { name: p.name, lat: p.lat, lng: p.lng }; }
    if (v.startsWith("k:")) { const p = PLACES[v.slice(2)]; return p && { name: p[0], lat: p[1], lng: p[2] }; }
    return null;
  };
  function setEnd(side, p) { ends[side] = p; save("profileEnds", ends); fillSelects(); load_(); toast(`Point ${side} : ${p.name}`); }
  async function load_() {
    const A = [ends.A.lat, ends.A.lng], B = [ends.B.lat, ends.B.lng], dist = gcDist(A, B);
    globe.setRoute([A, B]);
    $("pbTitle").textContent = `${ends.A.name} → ${ends.B.name}`.toUpperCase();
    if (dist < .2) { data = null; $("pbState").textContent = "A et B sont trop proches."; draw(); return; }
    const pts = gcPoints(A, B, N), key = pts[0].concat(pts[N - 1]).map(v => v.toFixed(3)).join(",");
    if (cache[key]) { data = { pts, dist, elev: cache[key], src: "cache" }; t0 = performance.now(); $("pbState").textContent = ""; draw(); return; }
    loading = true; $("pbState").textContent = "Chargement des altitudes…"; draw();
    try {
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${pts.map(p => p[0].toFixed(5)).join(",")}&longitude=${pts.map(p => p[1].toFixed(5)).join(",")}`;
      const r = await (await fetch(url)).json();
      if (!Array.isArray(r.elevation)) throw 0;
      const elev = r.elevation.map(v => Math.max(v, -500));
      cache[key] = elev;
      const keys = Object.keys(cache); if (keys.length > 25) delete cache[keys[0]];
      save("profileCache", cache);
      data = { pts, dist, elev, src: "live" }; $("pbState").textContent = "";
    } catch {
      const isDefault = Math.abs(A[0] - 45.764) < .01 && Math.abs(B[0] - 45.8326) < .01;
      if (isDefault) {
        const f = d => { for (let i = 1; i < LYON_MB_FALLBACK.length; i++) if (d <= LYON_MB_FALLBACK[i][0]) { const [d0, a0] = LYON_MB_FALLBACK[i - 1], [d1, a1] = LYON_MB_FALLBACK[i]; return a0 + (a1 - a0) * (d - d0) / (d1 - d0); } return 3600; };
        data = { pts, dist, elev: pts.map((_, i) => f(i / (N - 1) * 210)), src: "schéma" };
        $("pbState").textContent = "Hors ligne : profil schématique.";
      } else { data = null; $("pbState").textContent = "Altitudes indisponibles (connexion ?)."; }
    }
    loading = false; t0 = performance.now(); draw();
  }
  function resize() { const dpr = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; if (!W) return; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
  function geom() {
    const padL = 54, padR = 18, top = 30, bot = 26;
    const mn = Math.min(0, ...data.elev), mxA = Math.max(...data.elev);
    const step = [100, 200, 500, 1000, 2000][[100, 200, 500, 1000, 2000].findIndex(s => (mxA - mn) / s <= 6)] || 2000;
    const lo = Math.floor(mn / step) * step, hi = Math.ceil((mxA * 1.12) / step) * step || step;
    return { padL, padR, top, bot, lo, hi, step, X: i => padL + i / (N - 1) * (W - padL - padR), Y: a => top + (1 - (a - lo) / (hi - lo)) * (H - top - bot) };
  }
  function draw() {
    if (!W) return;
    const ink = cssVar("--ink"), muted = cssVar("--muted");
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono, monospace"; ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (!data) { ctx.fillText(loading ? "CHARGEMENT DES ALTITUDES…" : "CHOISIS UN DÉPART A ET UNE ARRIVÉE B", W / 2, H / 2); $("pbStats").textContent = ""; return; }
    const g = geom(), e = data.elev;
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.textAlign = "right";
    for (let a = g.lo; a <= g.hi; a += g.step) { ctx.globalAlpha = .25; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(g.padL, g.Y(a)); ctx.lineTo(W - g.padR, g.Y(a)); ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.fillText(fmtNum(a) + " m", g.padL - 6, g.Y(a)); }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const kmStep = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(s => data.dist / s <= 8) || 5000;
    for (let d = 0; d <= data.dist + .01; d += kmStep) ctx.fillText(d + " km", g.X(d / data.dist * (N - 1)), H - g.bot + 8);
    // Mer sous 0 m
    if (g.lo < 0) { ctx.fillStyle = "rgba(37,99,235,.12)"; ctx.fillRect(g.padL, g.Y(0), W - g.padL - g.padR, g.Y(g.lo) - g.Y(0)); }
    const k = fxOn() ? Math.min(1, (performance.now() - t0) / 1400) : 1, last = Math.round((N - 1) * k);
    ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(g.lo));
    for (let i = 0; i <= last; i++) ctx.lineTo(g.X(i), g.Y(e[i]));
    ctx.lineTo(g.X(last), g.Y(g.lo)); ctx.closePath();
    ctx.save(); ctx.clip(); ctx.strokeStyle = ink; ctx.globalAlpha = .18; ctx.beginPath();
    for (let x = -H; x < W; x += 7) { ctx.moveTo(x, H); ctx.lineTo(x + H, 0); }
    ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
    ctx.beginPath(); for (let i = 0; i <= last; i++) i ? ctx.lineTo(g.X(i), g.Y(e[i])) : ctx.moveTo(g.X(i), g.Y(e[i]));
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    // Repères : A, B, point culminant
    const top = e.indexOf(Math.max(...e));
    ctx.font = "700 10px JetBrains Mono, monospace"; ctx.textBaseline = "bottom";
    const label = (i, t, col) => { if (i > last) return; const x = g.X(i), y = g.Y(e[i]); ctx.fillStyle = col; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.textAlign = i < 8 ? "left" : i > N - 9 ? "right" : "center"; ctx.fillText(t, x, y - 8); };
    label(0, "A · " + ends.A.name.toUpperCase(), ACCENT);
    label(N - 1, "B · " + ends.B.name.toUpperCase(), ACCENT);
    if (top > 3 && top < N - 4) label(top, `▲ ${fmtNum(e[top])} M`, ink);
    // Curseur
    if (mx >= g.padL && mx <= W - g.padR) {
      const i = Math.round((mx - g.padL) / (W - g.padL - g.padR) * (N - 1)), x = g.X(i), y = g.Y(e[i]);
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, g.top - 8); ctx.lineTo(x, H - g.bot); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = ACCENT; ctx.fill();
      const lbl = `${(i / (N - 1) * data.dist).toFixed(1)} KM · ${fmtNum(e[i])} M · ${fmtLat(...data.pts[i])}`;
      ctx.font = "800 11px JetBrains Mono, monospace"; const w = ctx.measureText(lbl).width + 14, bx = Math.min(Math.max(x - w / 2, g.padL), W - g.padR - w);
      ctx.fillStyle = ink; ctx.fillRect(bx, 2, w, 20); ctx.fillStyle = cssVar("--paper"); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(lbl, bx + 7, 12);
    }
    let up = 0, down = 0; for (let i = 1; i < N; i++) { const d = e[i] - e[i - 1]; d > 0 ? up += d : down -= d; }
    $("pbStats").textContent = `${data.dist.toFixed(1).replace(".", ",")} KM · MIN ${fmtNum(Math.min(...e))} M · MAX ${fmtNum(Math.max(...e))} M · D+ ${fmtNum(up)} M${data.src === "schéma" ? " · SCHÉMA" : ""}`;
    if (k < 1) requestAnimationFrame(draw);
  }
  const idxAt = e => { if (!data) return -1; const g = geom(), x = e.clientX - c.getBoundingClientRect().left; return Math.round((x - g.padL) / (W - g.padL - g.padR) * (N - 1)); };
  c.addEventListener("pointermove", e => {
    mx = e.clientX - c.getBoundingClientRect().left; draw();
    const i = idxAt(e); globe.setMark(data && i >= 0 && i < N ? data.pts[i] : null);
  });
  c.addEventListener("pointerleave", () => { mx = -1; draw(); globe.setMark(null); });
  c.addEventListener("dblclick", e => { const i = idxAt(e); if (data && i >= 0 && i < N) openOnMap(data.pts[i][0], data.pts[i][1], 14); });
  $("pbPreset").onchange = e => {
    if (e.target.value === "") return;
    const [a, b] = ROUTES[+e.target.value]; ends = { A: { name: PLACES[a][0], lat: PLACES[a][1], lng: PLACES[a][2] }, B: { name: PLACES[b][0], lat: PLACES[b][1], lng: PLACES[b][2] } };
    save("profileEnds", ends); fillSelects(); load_();
  };
  ["A", "B"].forEach(s => $("pb" + s).onchange = e => { const p = resolve(e.target.value); if (p) setEnd(s, p); });
  $("pbSwap").onclick = () => { ends = { A: ends.B, B: ends.A }; save("profileEnds", ends); fillSelects(); load_(); };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { resize(); if (!data && !loading) load_(); io.disconnect(); } }), { threshold: .2 });
  io.observe(c);
  addEventListener("resize", resize);
  return { resize, draw, fillSelects, setEnd };
})();

$$(".dossier").forEach(d => {
  d.addEventListener("mousemove", e => {
    if (!fxOn()) return;
    const r = d.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    d.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg)`;
  });
  d.addEventListener("mouseleave", () => d.style.transform = "");
});

const revealObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  if (e.target.matches("[data-scramble]")) scramble(e.target);
  revealObs.unobserve(e.target);
}), { threshold: .25 });
$$(".reveal, .block-head [data-scramble], .final [data-scramble]").forEach(el => revealObs.observe(el));

setInterval(() => { $("clock").textContent = new Date().toLocaleTimeString("fr-FR") + " — HEURE LOCALE"; }, 1000);
