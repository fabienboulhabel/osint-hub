/* OSINT Hub — 11-sauvegarde.js · voir js/README.md pour l'ordre de chargement */
/* OSINT Hub — sauvegarde.js
   Sauvegarde complète (données + images des fiches), restauration,
   rappel périodique et sauvegarde automatique dans un dossier du PC (Edge / Chrome). */

const BACKUP_KEYS = ["cases", "activeCase", "tasks", "sessions", "ggMaps", "ggGoal", "totalSecs", "activity", "searchHistory", "settings",
  "progress", "quizStats", "memo", "flags", "badges", "quizDaily", "ggDailyDone", "trainTab", "caseMode", "globePoints", "profileEnds",
  "playHist", "backupEvery"];

const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const dataURLToBlob = async u => (await fetch(u)).blob();

async function buildBackup() {
  save("totalSecs", totalSecs);
  const data = { app: "osint-hub", version: VERSION, date: new Date().toISOString(), images: {} };
  BACKUP_KEYS.forEach(k => { const v = load(k, undefined); if (v !== undefined) data[k] = v; });
  try {
    for (const id of await idb.keys("images")) { const b = await idb.get("images", id); if (b) data.images[id] = await blobToDataURL(b); }
  } catch (err) { console.warn("Images non incluses :", err); }
  return data;
}
function markBackedUp() { save("lastBackup", new Date().toISOString()); hideBackupReminder(); renderBackupStatus(); }

async function exportAll() {
  const data = await buildBackup(), n = Object.keys(data.images).length;
  download(`osint-hub-sauvegarde-${todayKey()}.json`, JSON.stringify(data), "application/json");
  markBackedUp();
  toast(`Sauvegarde téléchargée${n ? ` (${n} image${n > 1 ? "s" : ""} incluse${n > 1 ? "s" : ""})` : ""}`);
}
async function restoreBackup(d) {
  if (!d || !Array.isArray(d.cases)) throw new Error("Fichier de sauvegarde invalide");
  BACKUP_KEYS.forEach(k => d[k] !== undefined && save(k, d[k]));
  if (d.images && typeof d.images === "object") {
    await idb.clear("images");
    for (const [id, url] of Object.entries(d.images)) await idb.set("images", id, await dataURLToBlob(url));
  }
}
$("exportJson").onclick = exportAll;
$("importJson").onchange = async e => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  let d;
  try { d = JSON.parse(await f.text()); if (!Array.isArray(d.cases)) throw 0; }
  catch { return toast("Fichier de sauvegarde invalide"); }
  if (!confirm(`Remplacer toutes les données actuelles par cette sauvegarde${d.date ? ` du ${new Date(d.date).toLocaleString("fr-FR")}` : ""} ?`)) return;
  await restoreBackup(d);
  location.reload();
};

/* ---------- Rappel périodique ---------- */
function daysSinceBackup() { const l = load("lastBackup", null); return l ? (Date.now() - new Date(l)) / 864e5 : Infinity; }
function hasRealData() { return cases.some(c => c.entries.length) || sessions.length || progress.length || Object.keys(quizStats).length; }
function hideBackupReminder() { $("backupBar")?.remove(); }
function showBackupReminder() {
  if ($("backupBar")) return;
  const d = daysSinceBackup();
  const bar = document.createElement("div");
  bar.id = "backupBar"; bar.className = "backup-bar"; bar.setAttribute("role", "status");
  bar.innerHTML = `<span><b>Pense à sauvegarder.</b> ${d === Infinity ? "Aucune sauvegarde n'a encore été faite." : `Dernière sauvegarde il y a ${Math.floor(d)} jours.`} Tes données ne sont que dans ce navigateur.</span>
    <button class="btn sm" id="bbSave">Sauvegarder maintenant</button><button class="btn ghost sm" id="bbLater">Plus tard</button>`;
  document.body.appendChild(bar);
  $("bbSave").onclick = exportAll;
  $("bbLater").onclick = () => { save("backupSnooze", Date.now() + 864e5); hideBackupReminder(); };
}
function checkBackupReminder() {
  const every = load("backupEvery", 7);
  if (!every || autoDir.active || !hasRealData()) return;
  if (load("backupSnooze", 0) > Date.now()) return;
  if (daysSinceBackup() >= every) showBackupReminder();
}

/* ---------- Sauvegarde automatique dans un dossier (File System Access API) ---------- */
const autoDir = { handle: null, active: false, last: "", supported: "showDirectoryPicker" in window };
async function writeAutoBackup(force) {
  if (!autoDir.handle) return false;
  try {
    if ((await autoDir.handle.queryPermission({ mode: "readwrite" })) !== "granted") { autoDir.active = false; renderBackupStatus(); return false; }
    const data = await buildBackup(), json = JSON.stringify(data);
    const sig = json.length + ":" + BACKUP_KEYS.map(k => localStorage.getItem(PREFIX + k)?.length || 0).join(",");
    if (!force && sig === autoDir.last) return true; // rien n'a changé
    for (const name of [`osint-hub-auto-${todayKey()}.json`, "osint-hub-auto-derniere.json"]) {
      const fh = await autoDir.handle.getFileHandle(name, { create: true }), w = await fh.createWritable();
      await w.write(json); await w.close();
    }
    autoDir.last = sig; autoDir.active = true;
    markBackedUp();
    return true;
  } catch (err) { console.warn("Sauvegarde automatique impossible :", err); autoDir.active = false; renderBackupStatus(); return false; }
}
async function chooseBackupDir() {
  if (!autoDir.supported) return toast("Ce navigateur ne permet pas de choisir un dossier (utilise Edge ou Chrome).");
  try {
    const h = await window.showDirectoryPicker({ id: "osint-hub-backup", mode: "readwrite" });
    autoDir.handle = h; await idb.set("kv", "backupDir", h);
    if (await writeAutoBackup(true)) toast(`Sauvegarde automatique activée dans « ${h.name} »`);
  } catch (err) { if (err.name !== "AbortError") toast("Impossible d'utiliser ce dossier"); }
}
async function reactivateBackupDir() {
  if (!autoDir.handle) return chooseBackupDir();
  try {
    if ((await autoDir.handle.requestPermission({ mode: "readwrite" })) === "granted") { await writeAutoBackup(true); toast("Sauvegarde automatique réactivée"); }
  } catch { toast("Permission refusée"); }
}
async function stopBackupDir() {
  autoDir.handle = null; autoDir.active = false; await idb.del("kv", "backupDir"); renderBackupStatus(); toast("Sauvegarde automatique désactivée");
}
function renderBackupStatus() {
  const box = $("backupStatus"); if (!box) return;
  const l = load("lastBackup", null), last = l ? new Date(l).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "jamais";
  let html;
  if (!autoDir.supported) html = `<p class="small muted">Ton navigateur ne permet pas la sauvegarde automatique dans un dossier. Utilise le rappel ci-dessous et le bouton « Sauvegarder ».</p>`;
  else if (autoDir.handle && autoDir.active) html = `<p class="small"><b class="ok-txt">● Active</b> dans le dossier « ${esc(autoDir.handle.name)} ». Un fichier par jour + « osint-hub-auto-derniere.json ».</p>
      <div class="row wrap-row"><button class="btn ghost sm" id="bdNow">Sauvegarder maintenant</button><button class="btn ghost sm" id="bdChange">Changer de dossier</button><button class="btn ghost sm" id="bdStop">Désactiver</button></div>`;
  else if (autoDir.handle) html = `<p class="small"><b style="color:var(--danger)">● En pause</b> : le navigateur demande de réautoriser l'accès au dossier « ${esc(autoDir.handle.name)} » (normal après un redémarrage).</p>
      <div class="row wrap-row"><button class="btn sm" id="bdReact">Réactiver</button><button class="btn ghost sm" id="bdStop">Désactiver</button></div>`;
  else html = `<p class="small muted">Choisis un dossier (OneDrive, clé USB, NAS…) : l'application y écrit une sauvegarde à chaque modification.</p>
      <button class="btn sm" id="bdChoose">Choisir un dossier</button>`;
  box.innerHTML = html + `<p class="mono small muted" style="margin-top:8px">DERNIÈRE SAUVEGARDE : ${last.toUpperCase()}</p>`;
  $("bdChoose") && ($("bdChoose").onclick = chooseBackupDir);
  $("bdChange") && ($("bdChange").onclick = chooseBackupDir);
  $("bdReact") && ($("bdReact").onclick = reactivateBackupDir);
  $("bdStop") && ($("bdStop").onclick = stopBackupDir);
  $("bdNow") && ($("bdNow").onclick = async () => { if (await writeAutoBackup(true)) toast("Sauvegarde écrite"); });
}
$("backupEvery").value = String(load("backupEvery", 7));
$("backupEvery").onchange = e => { save("backupEvery", +e.target.value); toast(+e.target.value ? `Rappel tous les ${e.target.value} jours` : "Rappel désactivé"); };

async function initBackup() {
  if (autoDir.supported) {
    try {
      const h = await idb.get("kv", "backupDir");
      if (h) { autoDir.handle = h; autoDir.active = (await h.queryPermission({ mode: "readwrite" })) === "granted"; }
    } catch { /* IndexedDB indisponible */ }
  }
  renderBackupStatus();
  setTimeout(checkBackupReminder, 4000);
  // Écriture automatique : toutes les 2 minutes si quelque chose a changé, et en quittant l'onglet
  setInterval(() => autoDir.active && writeAutoBackup(), 120000);
  document.addEventListener("visibilitychange", () => { if (document.hidden && autoDir.active) writeAutoBackup(); });
}
