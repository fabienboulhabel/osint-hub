// ---------- Utilitaires ----------
const $ = (id) => document.getElementById(id);
const load = (key, def) => JSON.parse(localStorage.getItem(key) || JSON.stringify(def));
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));
const open = (url) => window.open(url, "_blank", "noopener");
const enc = encodeURIComponent;

// ---------- Onglets ----------
document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab, .panel").forEach(el => el.classList.remove("active"));
  btn.classList.add("active");
  $(btn.dataset.tab).classList.add("active");
}));

// ---------- 1. Lanceur OSINT ----------
const searches = {
  google:  () => `https://www.google.com/search?q=${enc(`"${$("pseudo").value}"`)}`,
  wmn:     () => `https://whatsmyname.app/?q=${enc($("pseudo").value)}`,
  lens:    () => `https://lens.google.com/uploadbyurl?url=${enc($("imgUrl").value)}`,
  yandex:  () => `https://yandex.com/images/search?rpt=imageview&url=${enc($("imgUrl").value)}`,
  tineye:  () => `https://tineye.com/search?url=${enc($("imgUrl").value)}`,
  wayback: () => `https://web.archive.org/web/*/${$("pageUrl").value}`
};
document.querySelectorAll("[data-search]").forEach(btn =>
  btn.addEventListener("click", () => open(searches[btn.dataset.search]())));

// ---------- 2. GEOINT ----------
const geoTools = [
  ["Google Street View", "https://www.google.com/maps", "Vue immersive"],
  ["Google Earth", "https://earth.google.com/web", "Relief 3D"],
  ["Géoportail IGN", "https://www.geoportail.gouv.fr/carte", "Sentiers, forêts, cadastre"],
  ["SunCalc", "https://www.suncalc.org", "Orientation via les ombres"],
  ["Overpass Turbo", "https://overpass-turbo.eu", "Requêtes OpenStreetMap"],
  ["Cartoradio", "https://www.cartoradio.fr", "Antennes relais"]
];
const renderLinks = (container, list) =>
  $(container).innerHTML = list.map(([n, u, d]) =>
    `<a href="${u}" target="_blank" rel="noopener">${n}<small>${d}</small></a>`).join("");
renderLinks("geoLinks", geoTools);

// ---------- 3. GeoGuessr ----------
// Remplace les URL par celles de tes cartes perso (copie l'URL depuis GeoGuessr)
renderLinks("ggLinks", [
  ["France", "https://www.geoguessr.com/maps", "Carte France"],
  ["Lyon / AURA", "https://www.geoguessr.com/maps", "Carte régionale"],
  ["No Move", "https://www.geoguessr.com", "Mode sans déplacement"]
]);
let sessions = load("gg", []);
const renderSessions = () => $("ggList").innerHTML =
  sessions.map(s => `<li>${s.date} — ${s.map} : <b>${s.score}</b></li>`).join("");
$("ggAdd").onclick = () => {
  if (!$("ggScore").value) return;
  sessions.unshift({ date: new Date().toLocaleDateString("fr-FR"), map: $("ggMap").value, score: $("ggScore").value });
  save("gg", sessions); renderSessions(); $("ggScore").value = "";
};
renderSessions();

// ---------- 4. Progression ----------
let tasks = load("tasks", [
  { t: "Défis Gralhix (Sofia Santos) — défi 1", d: false },
  { t: "Bellingcat — guide géolocalisation", d: false }
]);
const renderTasks = () => {
  $("taskList").innerHTML = tasks.map((x, i) =>
    `<li class="${x.d ? "done" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""} style="width:auto;min-width:0"> <span>${x.t}</span></li>`).join("");
  $("taskList").querySelectorAll("input").forEach(cb => cb.onchange = () => {
    tasks[cb.dataset.i].d = cb.checked; save("tasks", tasks); renderTasks();
  });
};
$("taskAdd").onclick = () => {
  if (!$("taskInput").value) return;
  tasks.push({ t: $("taskInput").value, d: false }); save("tasks", tasks); renderTasks(); $("taskInput").value = "";
};
renderTasks();

let secs = 0, timerId = null;
const fmt = s => new Date(s * 1000).toISOString().substring(11, 19);
$("tStart").onclick = () => { if (!timerId) timerId = setInterval(() => $("timer").textContent = fmt(++secs), 1000); };
$("tPause").onclick = () => { clearInterval(timerId); timerId = null; };
$("tReset").onclick = () => { $("tPause").onclick(); secs = 0; $("timer").textContent = fmt(0); };

// ---------- 5. Rapports ----------
let entries = load("report", []);
const renderReport = () => $("rList").innerHTML = entries.map(e =>
  `<li><b>Indice :</b> ${e.clue}<br><b>Hypothèse :</b> ${e.hyp}<br><b>Preuve :</b> ${e.proof}<br><b>GPS :</b> ${e.gps}</li>`).join("");
$("rAdd").onclick = () => {
  entries.push({ clue: $("rClue").value, hyp: $("rHyp").value, proof: $("rProof").value, gps: $("rGps").value });
  save("report", entries); renderReport();
  ["rClue", "rHyp", "rProof", "rGps"].forEach(id => $(id).value = "");
};
$("rExport").onclick = () => {
  const title = $("rTitle").value || "Rapport";
  let md = `# ${title}\n_Généré le ${new Date().toLocaleString("fr-FR")}_\n\n`;
  entries.forEach((e, i) => md += `## Élément ${i + 1}\n- **Indice** : ${e.clue}\n- **Hypothèse** : ${e.hyp}\n- **Preuve** : ${e.proof}\n- **GPS** : ${e.gps}\n\n`);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
  a.download = `${title.replace(/\s+/g, "_")}.md`; a.click();
};
$("rClear").onclick = () => { if (confirm("Effacer toutes les entrées ?")) { entries = []; save("report", entries); renderReport(); } };
renderReport();

// ---------- PWA ----------
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
