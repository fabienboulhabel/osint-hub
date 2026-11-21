/* OSINT Hub — 13-parametres.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 14. À PROPOS, TEXTES LÉGAUX, PARAMÈTRES ---------- */
// Mini-convertisseur Markdown → HTML (titres, listes, citations, tableaux, gras, liens)
function md(src) {
  const lines = String(src || "").replace(/\r/g, "").split("\n");
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => {
      if (/CONFIDENTIALITE\.md/.test(u)) return `<a href="#about" data-tab-link="privacy">${t}</a>`;
      if (/CONDITIONS_UTILISATION\.md/.test(u)) return `<a href="#about" data-tab-link="terms">${t}</a>`;
      return `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
    });
  const isBlock = l => /^(#{1,4}\s|>|\s*[-*]\s|\||\d+\.\s)/.test(l);
  let html = "", i = 0;
  while (i < lines.length) {
    const l = lines[i]; let m;
    if (!l.trim()) { i++; continue; }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; continue; }
    if (l.startsWith(">")) { const b = []; while (i < lines.length && lines[i].startsWith(">")) b.push(lines[i++].replace(/^>\s?/, "")); html += `<blockquote><p>${b.map(inline).join("<br>")}</p></blockquote>`; continue; }
    if (/^\s*[-*]\s/.test(l)) { html += "<ul>"; while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>`; html += "</ul>"; continue; }
    if (/^\d+\.\s/.test(l)) { html += "<ol>"; while (i < lines.length && /^\d+\.\s/.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\d+\.\s+/, ""))}</li>`; html += "</ol>"; continue; }
    if (l.startsWith("|")) {
      const rows = []; while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(s => s.trim());
      html += `<table><thead><tr>${cells(rows[0]).map(h => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(2).map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      continue;
    }
    const p = []; while (i < lines.length && lines[i].trim() && !isBlock(lines[i])) p.push(lines[i++]);
    html += `<p>${inline(p.join(" "))}</p>`;
  }
  return html;
}
async function loadLegal() {
  let t = window.LEGAL?.terms || "", p = window.LEGAL?.privacy || "";
  if (location.protocol.startsWith("http")) { // en ligne : on lit directement les fichiers .md du dépôt
    try {
      const get = f => fetch(f, { cache: "no-cache" }).then(r => r.ok ? r.text() : Promise.reject());
      [t, p] = await Promise.all([get("CONDITIONS_UTILISATION.md"), get("CONFIDENTIALITE.md")]);
    } catch { /* on garde la copie intégrée */ }
  }
  $("termsDoc").innerHTML = md(t); $("privacyDoc").innerHTML = md(p); $("gateTerms").innerHTML = md(t);
}
let pendingTab = null;
function selectTab(tab) {
  $$("#aboutTabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  $$(".tab-pane").forEach(p => p.hidden = p.dataset.pane !== tab);
}
$$("#aboutTabs button").forEach(b => b.onclick = () => selectTab(b.dataset.tab));
document.addEventListener("click", e => {
  const a = e.target.closest("[data-tab-link]");
  if (!a || a.closest("#gate")) { if (a) e.preventDefault(); return; }
  pendingTab = a.dataset.tabLink;
  if (current === "about") { e.preventDefault(); selectTab(pendingTab); pendingTab = null; window.scrollTo(0, 0); }
});
onEnter.about = () => { if (pendingTab) { selectTab(pendingTab); pendingTab = null; } };
$("setExport").onclick = exportAll;
$("setCustom").onclick = () => openMenu(true);
$("setCharter").onclick = () => { localStorage.removeItem(PREFIX + "terms"); showGate(); };
$("setWipe").onclick = async () => {
  if (!confirm("Effacer TOUTES les données d'OSINT Hub sur ce navigateur ?")) return;
  if (!confirm("Dernière confirmation : cette action est irréversible. As-tu fait une sauvegarde ?")) return;
  Object.keys(localStorage).filter(k => k.startsWith(PREFIX) || LEGACY.includes(k)).forEach(k => localStorage.removeItem(k));
  try { await idb.clear("images"); await idb.clear("kv"); } catch { /* rien à effacer */ }
  location.hash = ""; location.reload();
};
["repoLink", "footRepo"].forEach(id => $(id).href = REPO_URL);
$("aboutVer").textContent = "VERSION " + VERSION;
$("footVer").textContent = "v" + VERSION;

/* ---------- 15. CHARTE AU PREMIER LANCEMENT ---------- */
const gateOpen = () => !$("gate").hidden;
function showGate() { $("gate").hidden = false; $("gateOk").checked = false; $("gateGo").disabled = true; }
$("gateOk").onchange = e => $("gateGo").disabled = !e.target.checked;
$("gateGo").onclick = () => { save("terms", TERMS_VERSION); $("gate").hidden = true; toast("Bienvenue sur le terrain."); };
