/* OSINT Hub — 08-photo.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 10. ANALYSE PHOTO ---------- */
let exifPoint = null, currentFile = null;
const img = $("preview"), wrapEl = $("imgWrap");
async function loadImage(file) {
  if (!file || !file.type?.startsWith("image/")) return toast("Ce fichier n'est pas une image");
  currentFile = file; bump(1);
  img.src = URL.createObjectURL(file);
  wrapEl.classList.remove("zoom");
  $("photoView").classList.add("has");
  $("exifToMap").hidden = true; exifPoint = null;
  const rows = [["Fichier", file.name || "Image collée"], ["Taille", (file.size / 1024).toFixed(0) + " Ko"]];
  img.onload = () => { rows.splice(2, 0, ["Dimensions", `${img.naturalWidth} × ${img.naturalHeight} px`]); renderExif(rows); };
  try {
    const x = window.exifr ? (await exifr.parse(file, { gps: true }) || {}) : {};
    if (x.DateTimeOriginal) rows.push(["Date de prise", new Date(x.DateTimeOriginal).toLocaleString("fr-FR")]);
    if (x.Make || x.Model) rows.push(["Appareil", `${x.Make || ""} ${x.Model || ""}`.trim()]);
    if (x.LensModel) rows.push(["Objectif", x.LensModel]);
    if (x.Software) rows.push(["Logiciel", x.Software]);
    if (x.latitude != null) { exifPoint = [x.latitude, x.longitude]; rows.push(["GPS", fmtLL(...exifPoint)]); $("exifToMap").hidden = false; }
    if (rows.length <= 2) rows.push(["Info", "Aucune métadonnée : normal pour une image issue d'un réseau social (supprimées à l'envoi). Place à l'observation."]);
  } catch { rows.push(["Info", "Métadonnées illisibles"]); }
  renderExif(rows);
}
function renderExif(rows) { $("exif").innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td></tr>`).join(""); }
$("file").onchange = e => { loadImage(e.target.files[0]); e.target.value = ""; };
let dragDepth = 0;
addEventListener("dragenter", e => { if (current === "photo" && e.dataTransfer?.types?.includes("Files")) { dragDepth++; document.body.classList.add("dragging"); } });
addEventListener("dragleave", () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove("dragging"); } });
addEventListener("dragover", e => e.preventDefault());
addEventListener("drop", e => {
  e.preventDefault(); dragDepth = 0; document.body.classList.remove("dragging");
  if (current === "photo" && e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
});
document.addEventListener("paste", e => {
  if (isTyping() && current !== "photo") return;
  const f = [...(e.clipboardData?.files || [])][0];
  if (f?.type.startsWith("image/")) { if (current !== "photo") { go("photo"); setTimeout(() => loadImage(f), 700); } else loadImage(f); }
});
img.onclick = e => { wrapEl.classList.toggle("zoom"); moveZoom(e); };
img.onmousemove = moveZoom;
function moveZoom(e) {
  if (!wrapEl.classList.contains("zoom")) return;
  const pv = $("photoView").getBoundingClientRect();
  const px = (e.clientX - pv.left - wrapEl.offsetLeft) / wrapEl.offsetWidth, py = (e.clientY - pv.top - wrapEl.offsetTop) / wrapEl.offsetHeight;
  wrapEl.style.transformOrigin = `${Math.max(0, Math.min(1, px)) * 100}% ${Math.max(0, Math.min(1, py)) * 100}%`;
}
$("photoView").onmouseleave = () => wrapEl.classList.remove("zoom");
function applyImgFx() {
  const c = $("fxC").value, b = $("fxB").value, s = $("fxS").value;
  $$(".sliders output").forEach((o, i) => o.textContent = [c, b, s][i]);
  img.style.filter = `contrast(${c}%) brightness(${b}%) saturate(${s}%)${$("fxI").checked ? " invert(1)" : ""}${$("fxG").checked ? " grayscale(1)" : ""}`;
  $("gridOv").className = "grid-ov" + ($("gridT").checked ? " thirds" : "") + ($("gridF").checked ? " fine" : "");
}
["fxC", "fxB", "fxS", "fxI", "fxG", "gridT", "gridF"].forEach(id => $(id).addEventListener("input", applyImgFx));
$("fxReset").onclick = () => { $("fxC").value = $("fxB").value = $("fxS").value = 100; ["fxI", "fxG", "gridT", "gridF"].forEach(id => $(id).checked = false); applyImgFx(); };
$("exifToMap").onclick = () => exifPoint && openOnMap(...exifPoint);
$("copyImg").onclick = async () => {
  if (!currentFile) return toast("Charge d'abord une image");
  try {
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast("Image copiée : colle-la dans l'outil (Ctrl+V)");
  } catch { toast("Copie impossible ici : glisse le fichier dans l'outil"); }
};
const clueFields = ["Panneaux / textes", "Langue / écriture", "Plaques", "Mobilier urbain", "Végétation / climat", "Relief / horizon", "Architecture", "Enseignes", "Transports", "Ombres / heure"];
$("clueGrid").innerHTML = clueFields.map((f, i) => `<div class="clue"><label for="c${i}">${f}</label><input id="c${i}" data-c="${i}" placeholder="…"></div>`).join("");
$("cluesToCase").onclick = () => {
  const obs = $$("[data-c]").filter(i => i.value.trim()).map(i => `${clueFields[i.dataset.c]} : ${i.value.trim()}`);
  if (!obs.length) return toast("Aucune observation saisie");
  addEntry({ clue: obs.join(" · "), proof: exifPoint ? "Coordonnées GPS présentes dans les métadonnées" : (currentFile ? `Photo : ${currentFile.name || "image collée"}` : ""), gps: exifPoint ? fmtLL(...exifPoint) : "" });
  $$("[data-c]").forEach(i => i.value = "");
};

// Crée une fiche pré-remplie : la photo est jointe, les observations et le GPS éventuel sont recopiés
$("photoToCase").onclick = async () => {
  if (!currentFile) return toast("Charge d'abord une image");
  const id = await storeImage(currentFile); if (!id) return;
  const obs = $$("[data-c]").filter(i => i.value.trim()).map(i => `${clueFields[i.dataset.c]} : ${i.value.trim()}`);
  go("cases");
  setTimeout(() => {
    cancelEdit(); clearForm();
    formImgs = [id]; renderFormImgs();
    if (obs.length) $("rClue").value = obs.join("\n");
    if (exifPoint) $("rGps").value = fmtLL(...exifPoint);
    $("rProof").value = `Photo : ${currentFile.name || "image collée"}${exifPoint ? " · coordonnées GPS présentes dans les métadonnées" : ""}`;
    $$("[data-c]").forEach(i => i.value = "");
    $("formCard").scrollIntoView({ behavior: "smooth", block: "start" });
    $("rClue").focus({ preventScroll: true });
    toast("Fiche pré-remplie : complète-la puis « Ajouter la fiche »");
  }, 650);
};
