/* OSINT Hub — 18-reseau.js · fond animé de l'accueil : un graphe d'enquête.
   Des indices (pseudos, photos, coordonnées, domaines…) reliés entre eux ; des « pistes » circulent le long des liens.
   Le curseur agit comme l'enquêteur : il se relie aux indices proches et révèle leur contenu. */
const reseau = (() => {
  // [type, exemples] : textes fictifs, uniquement décoratifs
  const TYPES = [
    ["PSEUDO", ["@jean_d69", "@lyon.walker", "@kms_photo", "@m.durand", "@rhone_trail"]],
    ["PHOTO", ["IMG_0412.JPG", "DSC_7781.JPG", "PXL_2026.JPG", "story_0915.png"]],
    ["GPS", ["45.764 N · 4.836 E", "45.188 N · 5.724 E", "43.296 N · 5.370 E", "48.857 N · 2.352 E"]],
    ["EXIF", ["Canon EOS 80D", "iPhone 14 · 18:42", "f/2.8 · 1/250", "GPS : absent"]],
    ["SITE", ["site:leboncoin.fr", "forum-velo.fr", "inurl:profil", "filetype:pdf"]],
    ["ARCHIVE", ["web.archive.org 2024", "archive.ph", "capture 14/03"]],
    ["LIEU", ["Gare Part-Dieu", "Arrêt TCL Bellecour", "Pont Lafayette", "Col de la Croix-Rousse"]],
    ["HEURE", ["ombre → NO · 17 h", "soleil 38° · 10 h", "lever 07:51"]],
    ["INDICE", ["plaque 69", "borne jaune · D", "panneau bilingue", "toit tuiles rouges"]]
  ];
  let cv, ctx, W = 0, H = 0, nodes = [], edges = [], pulses = [], last = 0;
  const mouse = { x: -9999, y: -9999 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function build() {
    const n = Math.round(Math.min(60, Math.max(22, W * H / 24000)));
    nodes = [];
    // Répartition régulière : un nouvel indice ne se pose pas trop près d'un autre
    for (let tries = 0; nodes.length < n && tries < n * 40; tries++) {
      const x = rnd(0, W), y = rnd(0, H);
      if (nodes.some(o => Math.hypot(o.x - x, o.y - y) < 95)) continue;
      const [type, ex] = TYPES[(Math.random() * TYPES.length) | 0];
      nodes.push({ x, y, vx: rnd(-.1, .1), vy: rnd(-.1, .1), type, txt: ex[(Math.random() * ex.length) | 0], r: rnd(2.5, 4.5), hot: 0, key: Math.random() < .18 });
    }
    pulses = [];
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  function draw(dt) {
    const ink = cssVar("--ink"), night = settings.theme === "night";
    const faint = night ? "rgba(235,233,225," : "rgba(13,13,13,";
    ctx.clearRect(0, 0, W, H);
    // Déplacement lent, rebond sur les bords
    nodes.forEach(n => {
      n.x += n.vx * dt * .06; n.y += n.vy * dt * .06;
      if (n.x < -20 || n.x > W + 20) n.vx *= -1;
      if (n.y < -20 || n.y > H + 20) n.vy *= -1;
      const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
      n.hot += ((d < 170 ? 1 : 0) - n.hot) * .12;
    });
    // Liens entre indices : recalculés en continu (au plus 3 voisins proches chacun)
    const LINK = Math.min(210, Math.max(150, W / 8));
    edges = [];
    nodes.forEach((a, i) => nodes.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)])
      .filter(([j, d]) => j > i && d < LINK).sort((p, q) => p[1] - q[1]).slice(0, 3).forEach(([j]) => edges.push([i, j])));
    ctx.lineWidth = 1;
    edges.forEach(([a, b]) => {
      const A = nodes[a], B = nodes[b], hot = Math.max(A.hot, B.hot);
      ctx.strokeStyle = hot > .05 ? ACCENT + Math.round(40 + hot * 120).toString(16).padStart(2, "0") : faint + ".10)";
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    });
    // Pistes : un point qui parcourt un lien (une recherche qui en mène à une autre)
    if (Math.random() < dt / 700 && pulses.length < 7 && edges.length) { const e = edges[(Math.random() * edges.length) | 0]; pulses.push({ a: e[0], b: e[1], t: 0 }); }
    pulses = pulses.filter(p => {
      p.t += dt / 1600; if (p.t >= 1) { nodes[p.b].flash = 1; return false; }
      const A = nodes[p.a], B = nodes[p.b]; if (Math.hypot(A.x - B.x, A.y - B.y) > LINK) return false;
      const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t;
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
      ctx.strokeStyle = ACCENT + "55"; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(x, y); ctx.stroke();
      return true;
    });
    // Le curseur se relie aux indices proches
    nodes.forEach(n => {
      if (n.hot < .05) return;
      ctx.strokeStyle = ACCENT + Math.round(n.hot * 160).toString(16).padStart(2, "0");
      ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(n.x, n.y); ctx.stroke(); ctx.setLineDash([]);
    });
    // Indices et étiquettes : le contenu n'est révélé que pour les 3 indices les plus proches du curseur
    const reveal = new Set(nodes.filter(n => n.hot > .05).sort((a, b) => Math.hypot(a.x - mouse.x, a.y - mouse.y) - Math.hypot(b.x - mouse.x, b.y - mouse.y)).slice(0, 3));
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    nodes.forEach(n => {
      n.flash = Math.max(0, (n.flash || 0) - dt / 700);
      const glow = Math.max(n.hot, n.flash);
      const s = n.r + glow * 2.5;
      ctx.fillStyle = glow > .05 ? ACCENT : faint + (n.key ? ".45)" : ".28)");
      ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
      if (n.key || reveal.has(n)) {
        ctx.font = "700 9px JetBrains Mono, monospace";
        ctx.fillStyle = glow > .05 ? ACCENT : faint + ".32)";
        ctx.fillText(n.type, n.x + 8, n.y - 6);
        if (reveal.has(n)) {
          ctx.font = "600 11px JetBrains Mono, monospace";
          ctx.globalAlpha = Math.min(1, glow * 1.4); ctx.fillStyle = ink; ctx.fillText(n.txt, n.x + 8, n.y + 7); ctx.globalAlpha = 1;
        }
      }
    });
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    const on = current === "home" && fxOn() && !document.hidden;
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
  return { start };
})();
reseau.start();
