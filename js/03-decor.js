/* OSINT Hub — 03-decor.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 5. DÉCOR : COURBES DE NIVEAU ANIMÉES ---------- */
const topo = (() => {
  const c = $("topo"), ctx = c.getContext("2d");
  const STEP = 16;
  const SEG = [[], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0], [3, 0], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], []];
  let W = 0, H = 0, t = Math.random() * 50, last = 0, minor = "", major = "";
  const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const sm = x => x * x * (3 - 2 * x);
  function noise(x, y) {
    const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
    const a = hash(i, j), b = hash(i + 1, j), cc = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v;
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function refreshColors() {
    const night = settings.theme === "night";
    minor = night ? "rgba(235,233,225,.06)" : "rgba(13,13,13,.075)";
    major = night ? "rgba(235,233,225,.13)" : "rgba(13,13,13,.16)";
    if (!fxOn()) ctx.clearRect(0, 0, W, H);
  }
  function draw() {
    const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1, f = new Float32Array(cols * rows);
    mouse.sx += (mouse.x - mouse.sx) * .07; mouse.sy += (mouse.y - mouse.sy) * .07;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * STEP, y = j * STEP, dx = x - mouse.sx, dy = y - mouse.sy;
      f[j * cols + i] = noise(x * .0032 + t * .025, y * .0032) + .5 * noise(x * .008, y * .008 - t * .035) + .6 * Math.exp(-(dx * dx + dy * dy) / 40000);
    }
    ctx.clearRect(0, 0, W, H);
    let n = 0;
    for (let L = .25; L < 1.9; L += .11, n++) {
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
        const a = f[j * cols + i], b = f[j * cols + i + 1], cc = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
        if (!idx || idx === 15) continue;
        const x = i * STEP, y = j * STEP, s = SEG[idx];
        const pt = e => e === 0 ? [x + STEP * (L - a) / (b - a), y] : e === 1 ? [x + STEP, y + STEP * (L - b) / (cc - b)]
          : e === 2 ? [x + STEP * (L - d) / (cc - d), y + STEP] : [x, y + STEP * (L - a) / (d - a)];
        for (let k = 0; k < s.length; k += 2) { const p = pt(s[k]), q = pt(s[k + 1]); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      }
      ctx.strokeStyle = n % 4 === 0 ? major : minor; ctx.lineWidth = n % 4 === 0 ? 1.2 : 1; ctx.stroke();
    }
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!fxOn() || document.hidden || current === "map" || ts - last < 50) return;
    t += last ? Math.min(ts - last, 100) / 1000 : 0; last = ts;
    draw();
  }
  addEventListener("resize", resize);
  addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  resize();
  return { start: () => requestAnimationFrame(loop), refreshColors };
})();
