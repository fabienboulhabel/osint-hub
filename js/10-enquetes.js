/* OSINT Hub — 10-enquetes.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 12. ENQUÊTES ---------- */
let cases = load("cases", null);
if (!Array.isArray(cases) || !cases.length) {
  cases = [{ id: Date.now(), name: "Exercice 1", entries: [], links: [] }];
  const old = load("report", []); // reprise des rapports de la toute première version
  if (Array.isArray(old) && old.length) cases[0].entries = old.map(e => ({ date: new Date().toISOString(), conf: 3, ...e }));
}
cases.forEach(c => { c.id = String(c.id); c.links = Array.isArray(c.links) ? c.links : []; c.entries = Array.isArray(c.entries) ? c.entries : []; c.entries.forEach(e => { e.id = e.id || uid(); }); });
let activeCase = String(load("activeCase", cases[0].id));
let caseMode = load("caseMode", "board");
let editingId = null; // fiche en cours de modification
// Les identifiants sont comparés en texte : évite les dossiers « introuvables » après une mise à jour
const currentCase = () => cases.find(c => c.id === String(activeCase)) || cases[0];
const stars = n => "★".repeat(n) + "☆".repeat(5 - n);

function saveCases() {
  activeCase = currentCase().id;
  save("cases", cases); save("activeCase", activeCase);
  renderCaseSelect(); renderTimeline(); renderBoard();
  try { refreshCaseMarkers(); refreshTraining(); } catch (err) { console.warn(err); }
}
function addEntry(e) {
  currentCase().entries.push({ id: uid(), date: new Date().toISOString(), conf: 3, clue: "", hyp: "", proof: "", gps: "", ...e });
  bump(2); saveCases(); toast(`Fiche ajoutée à « ${currentCase().name} »`);
}
function renderCaseSelect() {
  const cur = currentCase();
  const html = cases.map(c => `<option value="${c.id}" ${c.id === cur.id ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  $$(".caseSelect").forEach(s => s.innerHTML = html);
  $("caseChips").innerHTML = cases.map(c => `<button class="case-chip ${c.id === cur.id ? "on" : ""}" data-cid="${c.id}">${esc(c.name)}<small>${c.entries.length}</small></button>`).join("")
    ;
  $$("[data-cid]").forEach(b => b.onclick = () => switchCase(b.dataset.cid));
  const n = cur.entries.length;
  $("caseMeta").textContent = `${cases.length} DOSSIER${cases.length > 1 ? "S" : ""} · ${n} FICHE${n > 1 ? "S" : ""}`;
  $("caseTitle").textContent = cur.name;
}
function switchCase(id) { cancelEdit(); activeCase = String(id); saveCases(); toast(`Dossier actif : ${currentCase().name}`); }
function createCase(name) {
  let n = (name ?? $("newCase").value).trim();
  if (!n) { $("newCase").focus(); return toast("Écris d'abord le nom du dossier dans le champ"); }
  if (cases.some(c => c.name.toLowerCase() === n.toLowerCase())) return toast("Un dossier porte déjà ce nom");
  const c = { id: "c" + Date.now().toString(36), name: n, entries: [], links: [] };
  cases.push(c); activeCase = c.id; $("newCase").value = ""; cancelEdit(); saveCases();
  toast(`Dossier « ${n} » créé et activé`);
}
$$(".caseSelect").forEach(s => s.onchange = e => switchCase(e.target.value));
$("addCase").onclick = () => createCase();
$("newCase").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); createCase(); } };
$("renameCase").onclick = () => { const n = prompt("Nouveau nom :", currentCase().name); if (n?.trim()) { currentCase().name = n.trim(); saveCases(); } };
$("delCase").onclick = () => {
  if (cases.length === 1) return toast("Il faut garder au moins un dossier");
  if (!confirm(`Supprimer « ${currentCase().name} » et ses ${currentCase().entries.length} fiches ?`)) return;
  cancelEdit(); cases = cases.filter(c => c.id !== currentCase().id); activeCase = cases[0].id; saveCases(); gcImages();
};
$("rConf").oninput = e => $("rConfLbl").textContent = stars(+e.target.value);
const formIds = ["rClue", "rHyp", "rProof", "rGps"];
let formImgs = []; // images jointes à la fiche en cours de saisie (identifiants IndexedDB)
function readForm() { return { clue: $("rClue").value.trim(), hyp: $("rHyp").value.trim(), proof: $("rProof").value.trim(), gps: $("rGps").value.trim(), conf: +$("rConf").value, imgs: [...formImgs] }; }
function clearForm() { formIds.forEach(i => $(i).value = ""); $("rConf").value = 3; $("rConfLbl").textContent = stars(3); formImgs = []; renderFormImgs(); }

/* --- Images des fiches (stockées dans IndexedDB, pas dans localStorage) --- */
const imgCache = new Map();
async function imgURL(id) {
  if (imgCache.has(id)) return imgCache.get(id);
  try { const b = await idb.get("images", id); if (!b) return ""; const u = URL.createObjectURL(b); imgCache.set(id, u); return u; } catch { return ""; }
}
function fillImgs(root) { root.querySelectorAll("img[data-img]").forEach(async im => { const u = await imgURL(im.dataset.img); if (u) im.src = u; else im.closest(".thumb")?.classList.add("missing"); }); }
async function storeImage(file) {
  if (!file?.type?.startsWith("image/")) { toast("Ce fichier n'est pas une image"); return null; }
  if (file.size > 25e6) { toast("Image trop lourde (25 Mo maximum)"); return null; }
  const id = "i" + uid().slice(1);
  try { await idb.set("images", id, file); return id; }
  catch { toast("Impossible d'enregistrer l'image (stockage du navigateur plein ?)"); return null; }
}
async function addFormImages(files) {
  for (const f of files) { const id = await storeImage(f); if (id) formImgs.push(id); }
  renderFormImgs();
}
function renderFormImgs() {
  $("rImgs").innerHTML = formImgs.map(id => `<span class="thumb"><img data-img="${id}" alt="Image jointe"><button class="del" data-rmimg="${id}" title="Retirer l'image" aria-label="Retirer l'image">✕</button></span>`).join("")
    + `<label class="thumb add" title="Joindre une image (ou Ctrl+V dans le formulaire)">+ Image<input type="file" id="rImgIn" accept="image/*" multiple hidden></label>`;
  fillImgs($("rImgs"));
  $$("[data-rmimg]").forEach(b => b.onclick = () => { formImgs = formImgs.filter(x => x !== b.dataset.rmimg); renderFormImgs(); gcImages(); });
  $("rImgIn").onchange = ev => { addFormImages([...ev.target.files]); ev.target.value = ""; };
}
// Supprime de IndexedDB les images qui ne sont plus utilisées par aucune fiche
async function gcImages() {
  try {
    const used = new Set([...formImgs, ...cases.flatMap(c => c.entries.flatMap(x => x.imgs || []))]);
    for (const id of await idb.keys("images")) if (!used.has(id)) { await idb.del("images", id); const u = imgCache.get(id); if (u) { URL.revokeObjectURL(u); imgCache.delete(id); } }
  } catch { /* stockage indisponible */ }
}
$("formCard").addEventListener("paste", ev => {
  const files = [...(ev.clipboardData?.files || [])].filter(f => f.type.startsWith("image/"));
  if (files.length) { ev.preventDefault(); ev.stopPropagation(); addFormImages(files); toast("Image jointe à la fiche"); }
});
$("formCard").addEventListener("dragover", ev => ev.preventDefault());
$("formCard").addEventListener("drop", ev => {
  const files = [...(ev.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/"));
  if (files.length) { ev.preventDefault(); ev.stopPropagation(); addFormImages(files); }
});
// Visionneuse d'image (agrandissement)
async function openLightbox(id, caption) {
  const u = await imgURL(id); if (!u) return toast("Image introuvable");
  const box = document.createElement("div");
  box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Image de la fiche");
  box.innerHTML = `<figure><img src="${u}" alt=""><figcaption class="mono small">${esc(caption || "")}</figcaption>
    <div class="row"><button class="btn sm" id="lbPhoto">Analyser dans le module Photo</button><button class="btn ghost sm" id="lbClose">Fermer (Échap)</button></div></figure>`;
  document.body.appendChild(box);
  const close = () => { box.remove(); removeEventListener("keydown", onKey, true); };
  const onKey = k => { if (k.key === "Escape") { k.stopPropagation(); close(); } };
  addEventListener("keydown", onKey, true);
  box.onclick = ev => { if (ev.target === box) close(); };
  $("lbClose").onclick = close;
  $("lbPhoto").onclick = async () => { const b = await idb.get("images", id); close(); go("photo"); setTimeout(() => loadImage(new File([b], `fiche-${id}.${(b.type.split("/")[1] || "jpg")}`, { type: b.type })), 600); };
}
$("rAdd").onclick = () => {
  const e = readForm();
  if (!e.clue && !e.hyp && !e.proof && !e.gps && !e.imgs.length) return toast("Remplis au moins un champ");
  if (e.gps && !parseLatLng(e.gps)) return toast("Coordonnées non reconnues (ex : 45.7640, 4.8357)");
  if (editingId) {
    const it = currentCase().entries.find(x => x.id === editingId);
    if (it) { Object.assign(it, e, { edited: new Date().toISOString() }); toast("Fiche modifiée"); }
    cancelEdit(); saveCases(); gcImages(); return;
  }
  addEntry(e); clearForm();
};
function editEntry(id) {
  const c = currentCase(), i = c.entries.findIndex(x => x.id === id); if (i < 0) return;
  const e = c.entries[i];
  editingId = id;
  $("rClue").value = e.clue || ""; $("rHyp").value = e.hyp || ""; $("rProof").value = e.proof || ""; $("rGps").value = e.gps || "";
  $("rConf").value = e.conf || 3; $("rConfLbl").textContent = stars(e.conf || 3);
  formImgs = [...(e.imgs || [])]; renderFormImgs();
  $("formTitle").textContent = `Modifier la fiche ${pad(i + 1)}`;
  $("rAdd").textContent = "Enregistrer les modifications";
  $("rCancel").hidden = false; $("formCard").classList.add("editing");
  $$(".pin-card").forEach(p => p.classList.toggle("editing", p.dataset.id === id));
  $("formCard").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("rClue").focus({ preventScroll: true }), 300);
}
function cancelEdit() {
  if (!editingId) return;
  editingId = null; clearForm(); gcImages();
  $("formTitle").textContent = "Nouvelle fiche"; $("rAdd").textContent = "Ajouter la fiche";
  $("rCancel").hidden = true; $("formCard").classList.remove("editing");
  $$(".pin-card.editing").forEach(p => p.classList.remove("editing"));
}
$("rCancel").onclick = cancelEdit;
function deleteEntry(id) {
  const c = currentCase();
  if (!confirm("Supprimer cette fiche ?")) return;
  if (editingId === id) cancelEdit();
  c.entries = c.entries.filter(e => e.id !== id);
  c.links = c.links.filter(([a, b]) => a !== id && b !== id);
  saveCases(); gcImages();
}
function renderTimeline() {
  const list = currentCase().entries, nl = currentCase().links.length;
  $("rCount").textContent = `${list.length} FICHE${list.length > 1 ? "S" : ""} · ${nl} FIL${nl > 1 ? "S" : ""}`;
  $("rList").innerHTML = list.length ? list.map((e, i) => `
    <li><div class="meta"><span>FICHE ${pad(i + 1)}</span><span>${new Date(e.date).toLocaleString("fr-FR")}</span><span class="conf">${stars(e.conf || 3)}</span>${e.edited ? '<span>MODIFIÉE</span>' : ""}<button class="edit-b" data-eid="${e.id}" title="Modifier">✎ Modifier</button><button class="del" data-id="${e.id}" title="Supprimer">✕</button></div>
      ${e.clue ? `<div><b>Indice</b>${esc(e.clue)}</div>` : ""}${e.hyp ? `<div><b>Hypothèse</b>${esc(e.hyp)}</div>` : ""}
      ${e.proof ? `<div><b>Preuve</b>${esc(e.proof)}</div>` : ""}${e.gps ? `<div><b>GPS</b><a href="#" data-gps="${esc(e.gps)}">${esc(e.gps)} → carte</a></div>` : ""}
      ${(e.imgs || []).length ? `<div class="tl-imgs">${e.imgs.map(id => `<button class="thumb" data-lb="${id}" data-cap="Fiche ${pad(i + 1)}" title="Agrandir"><img data-img="${id}" alt="Image de la fiche ${i + 1}"></button>`).join("")}</div>` : ""}
    </li>`).join("") : `<li class="empty" style="border:0">Aucune fiche. Ajoute un indice, ou envoie-en depuis la Carte ou la Photo.</li>`;
  $$("#rList .del").forEach(d => d.onclick = () => deleteEntry(d.dataset.id));
  $$("#rList [data-eid]").forEach(d => d.onclick = () => editEntry(d.dataset.eid));
  $$("#rList [data-lb]").forEach(d => d.onclick = () => openLightbox(d.dataset.lb, d.dataset.cap));
  fillImgs($("rList"));
  $$("#rList [data-gps]").forEach(a => a.onclick = ev => { ev.preventDefault(); const p = parseLatLng(a.dataset.gps); if (p) openOnMap(...p, 16); });
}

// Tableau d'enquête : fiches déplaçables reliées par des fils
const CARD_W = 230, BOARD_W = 1800, BOARD_H = 1200;
let linking = false, linkFrom = null;
const defaultHint = $("boardHint").textContent;
const gridPos = i => [30 + (i % 5) * 270, 40 + Math.floor(i / 5) * 230];
function renderBoard() {
  const c = currentCase(), board = $("board");
  board.querySelectorAll(".pin-card, .board-empty").forEach(n => n.remove());
  if (!c.entries.length) board.insertAdjacentHTML("beforeend", `<div class="board-empty">AUCUNE FICHE — ajoute un indice à gauche, ou envoie-en depuis la Carte ou la Photo.</div>`);
  c.entries.forEach((e, i) => {
    if (e.x == null || e.y == null) [e.x, e.y] = gridPos(i);
    const el = document.createElement("div");
    el.className = "pin-card"; el.dataset.id = e.id;
    el.style.left = e.x + "px"; el.style.top = e.y + "px";
    el.innerHTML = `<div class="pc-head"><span>FICHE ${pad(i + 1)} · <span class="conf">${stars(e.conf || 3)}</span></span><span class="pc-btns"><button class="edit-b" data-edit-card title="Modifier">✎</button><button class="del" data-del title="Supprimer">✕</button></span></div>
      ${e.clue ? `<div class="pc-row"><i>IND</i>${esc(trunc(e.clue, 120))}</div>` : ""}
      ${e.hyp ? `<div class="pc-row"><i>HYP</i>${esc(trunc(e.hyp, 100))}</div>` : ""}
      ${e.proof ? `<div class="pc-row"><i>PRV</i>${esc(trunc(e.proof, 80))}</div>` : ""}
      ${(e.imgs || []).length ? `<div class="pc-img" data-pcimg="${e.imgs[0]}"><img data-img="${e.imgs[0]}" alt="">${e.imgs.length > 1 ? `<span class="mono">+${e.imgs.length - 1}</span>` : ""}</div>` : ""}
      ${e.gps ? `<span class="pc-gps" data-gpsgo title="Voir sur la carte">GPS ${esc(e.gps)} →</span>` : ""}`;
    if (linkFrom === e.id) el.classList.add("sel");
    if (editingId === e.id) el.classList.add("editing");
    board.appendChild(el);
    bindCard(el, e);
  });
  fillImgs(board);
  drawStrings();
}
const anchor = e => [e.x + CARD_W / 2, e.y];
function drawStrings() {
  const c = currentCase(), svg = $("strings");
  const byId = Object.fromEntries(c.entries.map(e => [e.id, e]));
  c.links = c.links.filter(([a, b]) => byId[a] && byId[b]);
  svg.innerHTML = c.links.map(([a, b], k) => {
    const [x1, y1] = anchor(byId[a]), [x2, y2] = anchor(byId[b]);
    const sag = Math.min(140, Math.hypot(x2 - x1, y2 - y1) * .2);
    const d = `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag} ${x2} ${y2}`;
    return `<g data-k="${k}"><path class="hit" d="${d}"/><path class="s" d="${d}"/></g>`;
  }).join("");
  svg.querySelectorAll("g").forEach(g => g.querySelector(".hit").onclick = () => {
    if (confirm("Supprimer ce fil ?")) { c.links.splice(+g.dataset.k, 1); saveCases(); }
  });
}
function bindCard(el, e) {
  el.onpointerdown = ev => {
    if (ev.button !== 0) return;
    if (ev.target.closest("[data-del]")) return deleteEntry(e.id);
    if (ev.target.closest("[data-edit-card]")) return editEntry(e.id);
    if (ev.target.closest("[data-pcimg]") && !linking) return openLightbox(ev.target.closest("[data-pcimg]").dataset.pcimg, `Fiche ${pad(currentCase().entries.indexOf(e) + 1)}`);
    if (ev.target.closest("[data-gpsgo]") && !linking) { const p = parseLatLng(e.gps); if (p) openOnMap(...p, 16); return; }
    if (linking) return linkClick(e, el);
    ev.preventDefault();
    el.setPointerCapture(ev.pointerId); el.classList.add("dragging");
    const sx = ev.clientX, sy = ev.clientY, ox = e.x, oy = e.y; let moved = false;
    el.onpointermove = m => {
      const dx = m.clientX - sx, dy = m.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      e.x = Math.max(0, Math.min(BOARD_W - CARD_W, ox + dx)); e.y = Math.max(12, Math.min(BOARD_H - 80, oy + dy));
      el.style.left = e.x + "px"; el.style.top = e.y + "px";
      drawStrings();
    };
    el.onpointerup = () => { el.onpointermove = el.onpointerup = null; el.classList.remove("dragging"); if (moved) save("cases", cases); };
  };
  el.ondblclick = () => { if (!linking) editEntry(e.id); };
}
function linkClick(e, el) {
  if (!linkFrom) { linkFrom = e.id; el.classList.add("sel"); return; }
  if (linkFrom === e.id) { linkFrom = null; el.classList.remove("sel"); return; }
  const c = currentCase();
  if (!c.links.some(([a, b]) => (a === linkFrom && b === e.id) || (a === e.id && b === linkFrom))) c.links.push([linkFrom, e.id]);
  linkFrom = null; saveCases(); toast("Fiches reliées");
}
$("linkMode").onclick = () => {
  linking = !linking; linkFrom = null;
  $("board").classList.toggle("linking", linking);
  $("linkMode").classList.toggle("on", linking);
  $("boardHint").textContent = linking ? "MODE LIAISON — clique une fiche, puis une autre. Reclique le bouton (ou Échap) pour terminer." : defaultHint;
  $$(".pin-card.sel").forEach(x => x.classList.remove("sel"));
};
$("tidyBoard").onclick = () => { currentCase().entries.forEach((e, i) => [e.x, e.y] = gridPos(i)); saveCases(); };
function setCaseMode(m) {
  caseMode = m; save("caseMode", m);
  $$(".seg [data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === m));
  const board = m === "board";
  $("boardScroll").hidden = !board; $("boardHint").hidden = !board; $("linkMode").hidden = !board; $("tidyBoard").hidden = !board;
  $("rList").hidden = board;
}
$$(".seg [data-mode]").forEach(b => b.onclick = () => setCaseMode(b.dataset.mode));

$("exportMd").onclick = () => {
  const c = currentCase(), cell = s => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const num = Object.fromEntries(c.entries.map((e, i) => [e.id, i + 1]));
  let md = `# ${c.name}\n\n_Exporté le ${new Date().toLocaleString("fr-FR")} · ${c.entries.length} fiches_\n\n| # | Date | Indice | Hypothèse | Preuve | GPS | Confiance |\n|---|---|---|---|---|---|---|\n`;
  c.entries.forEach((e, i) => md += `| ${i + 1} | ${new Date(e.date).toLocaleString("fr-FR")} | ${cell(e.clue)} | ${cell(e.hyp)} | ${cell(e.proof)} | ${cell(e.gps)} | ${e.conf || 3}/5 |\n`);
  if (c.links.length) md += `\n## Liens entre fiches\n\n${c.links.map(([a, b]) => `- Fiche ${num[a]} ↔ Fiche ${num[b]}`).join("\n")}\n`;
  download(`${c.name.replace(/[^\w-]+/g, "_")}.export.md`, md, "text/markdown");
  if (!flags.exported) { flags.exported = true; save("flags", flags); refreshTraining(); }
};
onEnter.cases = () => renderBoard();

/* --- Recherche dans toutes les fiches de tous les dossiers --- */
function searchCases(q) {
  const n = norm(q).trim(); if (n.length < 2) return [];
  const out = [];
  cases.forEach(c => c.entries.forEach((x, i) => {
    const txt = [x.clue, x.hyp, x.proof, x.gps].filter(Boolean).join(" · ");
    const at = norm(txt).indexOf(n);
    if (at >= 0 || norm(c.name).includes(n)) out.push({ c, x, i, txt, at: Math.max(0, at) });
  }));
  return out.slice(0, 30);
}
$("caseSearch").oninput = () => {
  const q = $("caseSearch").value, res = searchCases(q);
  if (!q.trim()) return ($("caseResults").innerHTML = "");
  $("caseResults").innerHTML = res.length ? res.map((r, k) => {
    const s = Math.max(0, r.at - 30), snip = (s ? "…" : "") + r.txt.slice(s, s + 110) + (r.txt.length > s + 110 ? "…" : "");
    return `<button class="cs-res" data-k="${k}"><span class="mono small">${esc(r.c.name)} · FICHE ${pad(r.i + 1)}</span><span>${esc(snip)}</span></button>`;
  }).join("") : `<p class="small muted cs-none">Aucune fiche ne contient « ${esc(q)} ».</p>`;
  $$("#caseResults [data-k]").forEach(b => b.onclick = () => {
    const r = res[+b.dataset.k];
    $("caseSearch").value = ""; $("caseResults").innerHTML = "";
    if (r.c.id !== currentCase().id) switchCase(r.c.id);
    setTimeout(() => focusEntry(r.x.id), 80);
  });
};
$("caseSearch").onkeydown = ev => { if (ev.key === "Escape") { $("caseSearch").value = ""; $("caseResults").innerHTML = ""; } if (ev.key === "Enter") $("caseResults").querySelector("[data-k]")?.click(); };
function focusEntry(id) {
  if (caseMode === "board") {
    const el = document.querySelector(`.pin-card[data-id="${id}"]`); if (!el) return;
    const sc = $("boardScroll"); sc.scrollTo({ left: el.offsetLeft - 40, top: el.offsetTop - 40, behavior: "smooth" });
    $("boardScroll").scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2200);
  } else {
    const i = currentCase().entries.findIndex(x => x.id === id), li = $("rList").children[i];
    li?.scrollIntoView({ behavior: "smooth", block: "center" }); li?.classList.add("flash"); setTimeout(() => li?.classList.remove("flash"), 2200);
  }
}

/* --- Rapport PDF (mise en page imprimable → « Enregistrer au format PDF ») --- */
$("exportPdf").onclick = async () => {
  const c = currentCase();
  if (!c.entries.length) return toast("Ce dossier ne contient aucune fiche");
  const w = window.open("", "_blank");
  if (!w) return toast("Le navigateur a bloqué la fenêtre : autorise les fenêtres pour ce site");
  w.document.write("<p style='font-family:sans-serif'>Préparation du rapport…</p>");
  const imgs = {};
  for (const x of c.entries) for (const id of x.imgs || []) { const b = await idb.get("images", id).catch(() => null); if (b) imgs[id] = await blobToDataURL(b); }
  const num = Object.fromEntries(c.entries.map((x, i) => [x.id, i + 1]));
  const field = (l, v) => v ? `<tr><th>${l}</th><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>` : "";
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(c.name)} — rapport</title><style>
    @page { margin: 16mm; } body { font-family: "Segoe UI", Arial, sans-serif; color: #111; font-size: 11pt; }
    header { border-bottom: 3px solid #111; padding-bottom: 8px; margin-bottom: 18px; } h1 { margin: 0; font-size: 22pt; text-transform: uppercase; }
    .meta { font-family: Consolas, monospace; font-size: 9pt; color: #555; } .warn { border: 1px solid #d92d20; color: #d92d20; padding: 6px 8px; font-size: 9pt; margin-top: 8px; }
    .fiche { border: 1px solid #111; margin: 0 0 12px; page-break-inside: avoid; } .fiche h2 { margin: 0; padding: 6px 10px; background: #111; color: #fff; font-size: 10.5pt; font-family: Consolas, monospace; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; } th { width: 110px; text-align: left; vertical-align: top; padding: 5px 10px; font-family: Consolas, monospace; font-size: 8.5pt; text-transform: uppercase; color: #555; } td { padding: 5px 10px; }
    .imgs { display: flex; gap: 6px; flex-wrap: wrap; padding: 6px 10px 10px; } .imgs img { max-height: 170px; max-width: 48%; border: 1px solid #ccc; }
    a { color: #111; } ul { margin: 0; } footer { margin-top: 18px; font-size: 8.5pt; color: #555; border-top: 1px solid #ccc; padding-top: 6px; }
  </style></head><body><header><div class="meta">OSINT HUB · RAPPORT D'EXERCICE</div><h1>${esc(c.name)}</h1>
    <div class="meta">Généré le ${new Date().toLocaleString("fr-FR")} · ${c.entries.length} fiche(s) · ${c.links.length} lien(s)</div>
    <div class="warn">Document de travail. Les informations concernant une situation réelle se transmettent uniquement aux enquêteurs ou à l'association concernée ; elles ne se publient jamais.</div></header>
    ${c.entries.map((x, i) => `<section class="fiche"><h2><span>FICHE ${pad(i + 1)}</span><span>${"★".repeat(x.conf || 3)}${"☆".repeat(5 - (x.conf || 3))} · ${new Date(x.date).toLocaleString("fr-FR")}</span></h2><table>
      ${field("Indice", x.clue)}${field("Hypothèse", x.hyp)}${field("Preuve", x.proof)}
      ${x.gps ? `<tr><th>Coordonnées</th><td>${esc(x.gps)} · <a href="https://www.openstreetmap.org/?mlat=${parseLatLng(x.gps)?.[0]}&mlon=${parseLatLng(x.gps)?.[1]}#map=17/${parseLatLng(x.gps)?.join("/")}">voir sur une carte</a></td></tr>` : ""}
      ${c.links.some(([a, b]) => a === x.id || b === x.id) ? `<tr><th>Reliée à</th><td>${c.links.filter(([a, b]) => a === x.id || b === x.id).map(([a, b]) => "fiche " + num[a === x.id ? b : a]).join(", ")}</td></tr>` : ""}
      </table>${(x.imgs || []).filter(id => imgs[id]).length ? `<div class="imgs">${x.imgs.filter(id => imgs[id]).map(id => `<img src="${imgs[id]}">`).join("")}</div>` : ""}</section>`).join("")}
    <footer>Méthode : indice → hypothèse → preuve → coordonnées. Sources ouvertes uniquement.</footer>
    <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
  if (!flags.exported) { flags.exported = true; save("flags", flags); refreshTraining(); }
};
renderFormImgs();
