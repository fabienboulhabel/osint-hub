/* OSINT Hub — 17-voyage.js · transition « voyage » : un avion survole la planète d'une page à l'autre
   Chaque page est associée à une ville : modifie la liste VOYAGE pour changer les destinations. */
const VOYAGE = {
  home:      ["Lyon", 45.764, 4.836],
  dashboard: ["Paris", 48.857, 2.352],
  search:    ["New York", 40.713, -74.006],
  map:       ["Tokyo", 35.676, 139.650],
  photo:     ["Rio de Janeiro", -22.907, -43.173],
  training:  ["Le Cap", -33.925, 18.424],
  cases:     ["Sydney", -33.869, 151.209],
  about:     ["Reykjavik", 64.147, -21.942]
};
const voyage = (() => {
  const R = Math.PI / 180;
  let cv = null, ctx = null, runId = 0;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const toV = (la, lo) => [Math.cos(la * R) * Math.cos(lo * R), Math.cos(la * R) * Math.sin(lo * R), Math.sin(la * R)];
  const toLL = v => [Math.atan2(v[2], Math.hypot(v[0], v[1])) / R, Math.atan2(v[1], v[0]) / R];
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function slerp(a, b, d, t) {
    if (d < 1e-6) return a;
    const s1 = Math.sin((1 - t) * d) / Math.sin(d), s2 = Math.sin(t * d) / Math.sin(d);
    return [s1 * a[0] + s2 * b[0], s1 * a[1] + s2 * b[1], s1 * a[2] + s2 * b[2]];
  }
  return function (from, to, apply) {
    if (!cv) {
      cv = document.createElement("canvas"); cv.id = "voyage"; cv.setAttribute("aria-hidden", "true");
      document.body.appendChild(cv); ctx = cv.getContext("2d");
    }
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const A = VOYAGE[from] || VOYAGE.home, B = VOYAGE[to] || VOYAGE.home;
    const va = toV(A[1], A[2]), vb = toV(B[1], B[2]);
    const d = Math.acos(clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1)), km = d * 6371;
    const dur = 1400 + d / Math.PI * 700;                 // 1,4 s (courte distance) à 2,1 s (antipodes)
    const zEnd = 4.5, zMid = clamp(4.5 - d * 3.2, 1, 3.6); // zoom au départ/arrivée et au plus haut du vol
    const base = Math.min(W, H) * .34, cx = W / 2, cy = H / 2;
    const ink = cssVar("--ink"), paper = cssVar("--paper"), muted = cssVar("--muted");
    const night = settings.theme === "night";
    const land = night ? "rgba(235,233,225,.13)" : "rgba(13,13,13,.09)", grid = night ? "rgba(235,233,225,.13)" : "rgba(13,13,13,.11)";
    const route = []; for (let i = 0; i <= 80; i++) route.push(toLL(slerp(va, vb, d, i / 80)));
    const id = ++runId, t0 = performance.now();
    let applied = false, heading = 0;
    cv.classList.add("on");
    const frame = now => {
      if (id !== runId) return;
      const t = clamp((now - t0) / dur, 0, 1);
      const p = ease(clamp((t - .1) / .78, 0, 1));            // avancement du vol
      const z = zMid + (zEnd - zMid) * (1 - Math.sin(Math.PI * p));
      const r = base * z, [lat0, lon0] = toLL(slerp(va, vb, d, p));
      const sp = Math.sin(lat0 * R), cp = Math.cos(lat0 * R);
      const proj = (la, lo) => {
        const l = (lo - lon0) * R, ph = la * R, c = sp * Math.sin(ph) + cp * Math.cos(ph) * Math.cos(l);
        let x = r * Math.cos(ph) * Math.sin(l), y = -r * (cp * Math.sin(ph) - sp * Math.cos(ph) * Math.cos(l));
        if (c < 0) { const k = r / (Math.hypot(x, y) || 1); x *= k; y *= k; } // face cachée : ramenée sur le bord
        return [cx + x, cy + y, c];
      };
      const line = pts => { let pen = false; for (const [la, lo] of pts) { const [x, y, v] = proj(la, lo); if (v > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; } };
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = t < .08 ? t / .08 : t > .9 ? (1 - t) / .1 : 1;
      ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
      // Planète : graticule, pays
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
      ctx.beginPath();
      for (let lo = -180; lo < 180; lo += 15) { const a = []; for (let la = -90; la <= 90; la += 4) a.push([la, lo]); line(a); }
      for (let la = -75; la <= 75; la += 15) { const a = []; for (let lo = -180; lo <= 180; lo += 4) a.push([la, lo]); line(a); }
      ctx.strokeStyle = grid; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = land; ctx.strokeStyle = grid; ctx.lineWidth = 1;
      (window.WORLD || []).forEach(([, , rings]) => rings.forEach(ring => {
        const pts = ring.map(([lo, la]) => proj(la, lo)); if (!pts.some(q => q[2] > 0)) return;
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
      }));
      // Trajet : parcouru en couleur d'accent, restant en pointillés
      const k = Math.round(p * 80);
      ctx.setLineDash([6, 6]); ctx.beginPath(); line(route.slice(k)); ctx.strokeStyle = muted; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); line(route.slice(0, k + 1)); ctx.strokeStyle = ACCENT; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
      // Villes de départ et d'arrivée
      ctx.font = "800 12px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      [A, B].forEach(P => {
        const [x, y, v] = proj(P[1], P[2]); if (v <= 0) return;
        ctx.fillStyle = ACCENT; ctx.fillRect(x - 5, y - 5, 10, 10);
        ctx.fillStyle = ink; ctx.fillText(P[0].toUpperCase(), x + 11, y);
      });
      // Avion : toujours au centre, orienté vers la suite du trajet
      if (k < 80) { const [nx, ny] = proj(...route[Math.min(k + 2, 80)]); if (Math.hypot(nx - cx, ny - cy) > 1) heading = Math.atan2(ny - cy, nx - cx); }
      const s = 1 + .5 * Math.sin(Math.PI * p);
      ctx.save(); ctx.translate(cx + 4 * s, cy + 6 * s); ctx.rotate(heading); ctx.scale(s, s);
      ctx.fillStyle = "rgba(0,0,0,.18)"; plane(); ctx.fill(); ctx.restore();              // ombre
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(heading); ctx.scale(s, s);
      plane(); ctx.fillStyle = ink; ctx.fill(); ctx.strokeStyle = paper; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      // Textes
      ctx.textBaseline = "top"; ctx.fillStyle = ink; ctx.font = "800 12px JetBrains Mono, monospace";
      ctx.fillText(`▸ EN ROUTE · ${A[0].toUpperCase()} → ${B[0].toUpperCase()}`, 28, 28);
      ctx.fillStyle = muted;
      ctx.fillText(`${fmtNum(km * p)} / ${fmtNum(km)} KM · ${Math.abs(lat0).toFixed(2)}°${lat0 >= 0 ? "N" : "S"} ${Math.abs(lon0).toFixed(2)}°${lon0 >= 0 ? "E" : "O"}`, 28, 48);
      const fs = Math.round(clamp(W * .065, 34, 96));
      ctx.textBaseline = "bottom"; ctx.fillStyle = ink; ctx.font = `900 ${fs}px Archivo, "Arial Black", sans-serif`;
      ctx.fillText(String(VIEWS[to] || "").toUpperCase(), 28, H - 28);
      ctx.fillStyle = ACCENT; ctx.fillRect(28, H - 28 - fs - 14, 60, 5);
      ctx.globalAlpha = 1;
      if (!applied && t >= .15) { applied = true; apply(); }   // la nouvelle page se prépare derrière la planète
      if (t < 1) requestAnimationFrame(frame); else { cv.classList.remove("on"); ctx.clearRect(0, 0, W, H); }
    };
    function plane() {
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(4, -3); ctx.lineTo(-4, -14); ctx.lineTo(-8, -14); ctx.lineTo(-3, -3);
      ctx.lineTo(-11, -3); ctx.lineTo(-14, -8); ctx.lineTo(-16, -8); ctx.lineTo(-14, 0); ctx.lineTo(-16, 8); ctx.lineTo(-14, 8);
      ctx.lineTo(-11, 3); ctx.lineTo(-3, 3); ctx.lineTo(-8, 14); ctx.lineTo(-4, 14); ctx.lineTo(4, 3); ctx.closePath();
    }
    requestAnimationFrame(frame);
  };
})();
