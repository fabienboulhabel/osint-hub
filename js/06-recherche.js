/* OSINT Hub — 06-recherche.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 8. RECHERCHE ---------- */
const detectType = q => {
  if (!q) return null;
  if (/^https?:\/\/\S+\.(jpe?g|png|webp|gif|bmp|avif)(\?\S*)?$/i.test(q)) return "image";
  if (/^https?:\/\//i.test(q)) return "url";
  if (/^\S+$/.test(q)) return "pseudo";
  return "name";
};
const typeLabel = { pseudo: "PSEUDO", name: "NOM / TEXTE", url: "URL DE PAGE", image: "URL D'IMAGE" };
function dorkQuery() {
  const q = $("q").value.trim(); if (!q) return "";
  const term = $("dorkExact").checked ? `"${q}"` : q;
  const sites = $$(".dork:checked").map(c => c.value);
  const parts = [sites.length ? `${term} (${sites.join(" OR ")})` : term];
  const v = id => $(id).value.trim();
  const quote = w => /\s/.test(w) ? `"${w}"` : w;
  if (v("advTitle")) parts.push(`intitle:${quote(v("advTitle"))}`);
  if (v("advUrl")) parts.push(`inurl:${quote(v("advUrl"))}`);
  if (v("advType")) parts.push(`filetype:${v("advType")}`);
  if (v("advSite")) parts.push(`site:${v("advSite").replace(/^https?:\/\//, "").replace(/\/.*$/, "")}`);
  if (v("advOr")) parts.push("(" + v("advOr").split(/\s+/).map(quote).join(" OR ") + ")");
  if (v("advNot")) parts.push(v("advNot").split(/\s+/).map(w => "-" + w.replace(/^-/, "")).join(" "));
  if (v("advAfter")) parts.push(`after:${v("advAfter")}`);
  if (v("advBefore")) parts.push(`before:${v("advBefore")}`);
  return parts.join(" ");
}
$$(".adv-in").forEach(i => i.addEventListener("input", () => renderTools()));
$("advReset").onclick = ev => { ev.preventDefault(); $$(".adv-in").forEach(i => i.value = ""); renderTools(); };
const toolGroups = [
  { name: "Moteurs & Dorks", for: ["pseudo", "name"], tools: [
    ["Google", "Avec tes filtres", () => `https://www.google.com/search?q=${enc(dorkQuery())}`],
    ["Bing", "Résultats différents de Google", () => `https://www.bing.com/search?q=${enc(dorkQuery())}`],
    ["DuckDuckGo", "Sans personnalisation", () => `https://duckduckgo.com/?q=${enc(dorkQuery())}`],
    ["Google Images", "Photos associées", () => `https://www.google.com/search?tbm=isch&q=${enc(dorkQuery())}`]] },
  { name: "Pseudos", for: ["pseudo"], tools: [
    ["WhatsMyName", "Présence sur des centaines de sites", q => `https://whatsmyname.app/?q=${enc(q)}`],
    ["Instagram", "Profil direct", q => `https://www.instagram.com/${enc(q)}/`],
    ["TikTok", "Profil direct", q => `https://www.tiktok.com/@${enc(q)}`],
    ["X / Twitter", "Profil direct", q => `https://x.com/${enc(q)}`]] },
  { name: "Image inversée", for: ["image"], tools: [
    ["Google Lens", "Objets, lieux, visages publics", q => `https://lens.google.com/uploadbyurl?url=${enc(q)}`],
    ["Yandex", "Très bon sur les lieux", q => `https://yandex.com/images/search?rpt=imageview&url=${enc(q)}`],
    ["TinEye", "Première apparition d'une image", q => `https://tineye.com/search?url=${enc(q)}`],
    ["Bing Visual", "Alternative", q => `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${enc(q)}`]] },
  { name: "Archives", for: ["url", "image"], tools: [
    ["Wayback Machine", "Historique de la page", q => `https://web.archive.org/web/*/${q}`],
    ["Archiver maintenant", "Créer une preuve horodatée", q => `https://web.archive.org/save/${q}`],
    ["archive.today", "Dernière capture", q => `https://archive.ph/newest/${q}`]] }
];
let searchHist = load("searchHistory", []);
function remember(q) { searchHist = [q, ...searchHist.filter(x => x !== q)].slice(0, 8); save("searchHistory", searchHist); renderHistory(); }
function renderHistory() {
  $("history").innerHTML = searchHist.map(h => `<button data-h="${esc(h)}">↺ ${esc(h)}</button>`).join("") + (searchHist.length ? `<button id="clearHist">✕ effacer</button>` : "");
  $$("#history [data-h]").forEach(b => b.onclick = () => { $("q").value = b.dataset.h; renderTools(); $("q").focus(); });
  $("clearHist")?.addEventListener("click", () => { searchHist = []; save("searchHistory", searchHist); renderHistory(); });
}
function runTool(gi, ti) { const q = $("q").value.trim(); remember(q); bump(1); openUrl(toolGroups[gi].tools[ti][2](q)); }
function renderTools() {
  const q = $("q").value.trim(), type = detectType(q);
  $("qType").textContent = type ? typeLabel[type] : "EN ATTENTE";
  $("qType").classList.toggle("off", !type);
  $("dorkPreview").textContent = dorkQuery() || "—";
  let first = true;
  $("toolGroups").innerHTML = toolGroups.map((g, gi) => {
    const ok = type && g.for.includes(type);
    return `<div class="group"><div class="g-head"><span class="mono">${"ABCD"[gi]}</span><h2>${g.name}</h2>
      <span class="state mono">${ok ? `${g.tools.length} OUTILS` : type ? "NON APPLICABLE" : "—"}</span>
      ${ok ? `<button class="btn ghost sm" data-all="${gi}">Tout ouvrir</button>` : ""}</div>
      <div class="rows">${g.tools.map((t, ti) => {
        const cls = ok ? (first ? (first = false, "first") : "") : "off";
        return `<button class="row-tool ${cls}" data-g="${gi}" data-t="${ti}"><span class="i">${pad(ti + 1)}</span><b>${t[0]}</b><span class="d">${t[1]}</span><span class="go">↗</span></button>`;
      }).join("")}</div></div>`;
  }).join("");
  $$(".row-tool").forEach(b => b.onclick = () => runTool(b.dataset.g, b.dataset.t));
  $$("[data-all]").forEach(b => b.onclick = () => toolGroups[b.dataset.all].tools.forEach((t, ti) => runTool(b.dataset.all, ti)));
}
$("q").oninput = renderTools;
$$(".dork, #dorkExact").forEach(c => c.onchange = renderTools);
$("q").onkeydown = e => { if (e.key === "Enter") document.querySelector(".row-tool.first")?.click(); };
$("copyDork").onclick = () => dorkQuery() ? navigator.clipboard.writeText(dorkQuery()).then(() => toast("Requête copiée")) : toast("Rien à copier");
onEnter.search = () => setTimeout(() => $("q").focus(), 80);
