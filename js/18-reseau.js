/* OSINT Hub — 18-reseau.js · fond animé : un graphe d'enquête, sur toutes les pages (sauf la carte).
   Des indices reliés entre eux ; quelques « pistes » circulent le long des liens.
   Le curseur se relie aux indices proches et révèle le contenu des deux plus proches.
   Réglages : liste TYPES (contenus fictifs) et objet CFG (densité, intensité). */
const reseau = (() => {
  const TYPES = [
    ["PSEUDO", ["@jean_d69", "@lyon.walker", "@kms_photo", "@rhone_trail"]],
    ["PHOTO", ["IMG_0412.JPG", "DSC_7781.JPG", "PXL_2026.JPG"]],
    ["GPS", ["45.764 N · 4.836 E", "45.188 N · 5.724 E", "43.296 N · 5.370 E"]],
    ["EXIF", ["Canon EOS 80D", "iPhone 14 · 18:42", "GPS : absent"]],
    ["SITE", ["site:leboncoin.fr", "inurl:profil", "filetype:pdf"]],
    ["ARCHIVE", ["web.archive.org 2024", "archive.ph"]],
    ["LIEU", ["Gare Part-Dieu", "Arrêt TCL Bellecour", "Pont Lafayette"]],
    ["HEURE", ["ombre → NO · 17 h", "soleil 38° · 10 h"]],
    ["INDICE", ["plaque 69", "borne jaune · D", "toit tuiles rouges"]]
  ];
  const CFG = {
    area: 52000,       // surface d'écran (px²) par indice : plus grand = moins d'indices
    minGap: 150,       // distance minimale entre deux indices
    maxLinks: 2,       // liens par indice
    reveal: 2,         // indices dont le contenu est révélé près du curseur
    homeAlpha: 1,      // intensité sur l'accueil
    pageAlpha: .5      // intensité sur les autres pages (plus discret derrière le contenu)
  };
  let cv, ctx, W = 0, H = 0, nodes = [], pulses = [], last = 0;
  const mouse = { x: -9999, y: -9999 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hex = a => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  function build() {
    const n = Math.round(Math.min(30, Math.max(12, W * H / CFG.area)));
    nodes = [];
    for (let tries = 0; nodes.length < n && tries < n * 60; tries++) {
      const x = rnd(20, W - 20), y = rnd(20, H - 20);
      if (nodes.some(o => Math.hypot(o.x - x, o.y - y) < CFG.minGap)) continue;
      const [type, ex] = TYPES[(Math.random() * TYPES.length) | 0];
      nodes.push({ x, y, vx: rnd(-.07, .07), vy: rnd(-.07, .07), type, txt: ex[(Math.random() * ex.length) | 0], hot: 0, flash: 0, key: Math.random() < .12 });
    }
    pulses = [];
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  function draw(dt) {
    const home = current === "home", A0 = home ? CFG.homeAlpha : CFG.pageAlpha;
    const night = settings.theme === "night", ink = cssVar("--ink");
    const base = night ? "rgba(235,233,225," : "rgba(13,13,13,";
    const LINK = Math.min(260, Math.max(190, W / 6.5));
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = A0;
    nodes.forEach(n => {
      n.x += n.vx * dt * .06; n.y += n.vy * dt * .06;
      if (n.x < 10 || n.x > W - 10) n.vx *= -1;
      if (n.y < 10 || n.y > H - 10) n.vy *= -1;
      n.hot += ((Math.hypot(n.x - mouse.x, n.y - mouse.y) < 150 ? 1 : 0) - n.hot) * .1;
      n.flash = Math.max(0, n.flash - dt / 900);
    });
    // Liens : au plus 2 voisins proches par indice
    const edges = [];
    nodes.forEach((a, i) => nodes.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)])
      .filter(([j, d]) => j > i && d < LINK).sort((p, q) => p[1] - q[1]).slice(0, CFG.maxLinks).forEach(([j, d]) => edges.push([i, j, d])));
    ctx.lineWidth = 1;
    edges.forEach(([a, b, d]) => {
      const hot = Math.max(nodes[a].hot, nodes[b].hot), fade = 1 - d / LINK;   // les liens longs s'estompent
      ctx.strokeStyle = hot > .05 ? ACCENT + hex(.25 + hot * .45) : base + (.12 * fade).toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
    });
    // Pistes : rares et lentes
    if (Math.random() < dt / 1800 && pulses.length < 3 && edges.length) { const e = edges[(Math.random() * edges.length) | 0]; pulses.push({ a: e[0], b: e[1], t: 0 }); }
    pulses = pulses.filter(p => {
      p.t += dt / 2200;
      const A = nodes[p.a], B = nodes[p.b];
      if (p.t >= 1) { B.flash = 1; return false; }
      if (Math.hypot(A.x - B.x, A.y - B.y) > LINK) return false;
      const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t;
      ctx.strokeStyle = ACCENT + "66"; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
      return true;
    });
    // Curseur relié aux indices proches
    const near = nodes.filter(n => n.hot > .05).sort((a, b) => Math.hypot(a.x - mouse.x, a.y - mouse.y) - Math.hypot(b.x - mouse.x, b.y - mouse.y)).slice(0, CFG.reveal);
    ctx.setLineDash([3, 5]);
    near.forEach(n => { ctx.strokeStyle = ACCENT + hex(n.hot * .6); ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(n.x, n.y); ctx.stroke(); });
    ctx.setLineDash([]);
    // Indices
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    nodes.forEach(n => {
      const glow = Math.max(n.hot, n.flash), on = glow > .05, s = 4 + glow * 3;
      ctx.fillStyle = on ? ACCENT : base + (n.key ? ".40)" : ".22)");
      ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
      if (home && n.key && !near.includes(n)) {                    // quelques types visibles, sur l'accueil seulement
        ctx.font = "700 9px JetBrains Mono, monospace"; ctx.fillStyle = base + ".30)"; ctx.fillText(n.type, n.x + 8, n.y);
      }
    });
    // Contenu révélé : étiquette sur fond, pour rester lisible
    near.forEach(n => {
      const a = Math.min(1, n.hot * 1.3);
      ctx.font = "700 9px JetBrains Mono, monospace"; const w1 = ctx.measureText(n.type).width;
      ctx.font = "600 11px JetBrains Mono, monospace"; const w2 = ctx.measureText(n.txt).width;
      const w = Math.max(w1, w2) + 14, x = Math.min(n.x + 10, W - w - 6), y = n.y - 16;
      ctx.globalAlpha = A0 * a;
      ctx.fillStyle = cssVar("--card") || "#f7f6f1"; ctx.fillRect(x, y, w, 32);
      ctx.strokeStyle = ACCENT; ctx.strokeRect(x + .5, y + .5, w - 1, 31);
      ctx.fillStyle = ACCENT; ctx.font = "700 9px JetBrains Mono, monospace"; ctx.fillText(n.type, x + 7, y + 9);
      ctx.fillStyle = ink; ctx.font = "600 11px JetBrains Mono, monospace"; ctx.fillText(n.txt, x + 7, y + 22);
      ctx.globalAlpha = A0;
    });
    ctx.globalAlpha = 1;
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    // Partout sauf sur la carte (plein écran) ; figé si « Effets animés » est coupé
    const on = current && current !== "map" && fxOn() && !document.hidden;
    cv.style.display = on ? "block" : "none";
    if (!on) { last = 0; return; }
    const dt = last ? Math.min(ts - last, 50) : 16; last = ts;
    draw(dt);
  }
  function start() {
    cv = document.createElement("canvas"); cv.id = "reseau"; cv.setAttribute("aria-hidden", "true");
    document.body.insertBefore(cv, document.body.firstChild);
    ctx = cv.getContext("2d");
    addEventListener("resize", resize);
    addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; });
    resize(); requestAnimationFrame(loop);
  }
  return { start, CFG };
})();
reseau.start();
