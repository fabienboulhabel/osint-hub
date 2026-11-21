/* OSINT Hub — 05-chrono.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 7. CHRONOMÈTRE ---------- */
let secs = 0, totalSecs = load("totalSecs", 0), timerId = null;
const fmtT = s => new Date(s * 1000).toISOString().substring(11, 19);
function toggleTimer() {
  const box = $("tToggle").parentElement;
  if (timerId) {
    clearInterval(timerId); timerId = null; save("totalSecs", totalSecs);
    $("tToggle").textContent = "▶"; box.classList.remove("running"); document.title = "OSINT Hub — carnet de terrain";
    return toast("Chrono en pause");
  }
  $("tToggle").textContent = "❚❚"; box.classList.add("running");
  timerId = setInterval(() => {
    secs++; totalSecs++;
    $("timer").textContent = fmtT(secs); document.title = `● ${fmtT(secs)} — OSINT Hub`;
    const qa = document.querySelector('[data-qa="chrono"] span'); if (qa) qa.textContent = `Chrono ${fmtT(secs)}`;
    if (secs % 10 === 0) save("totalSecs", totalSecs);
    if (secs % 60 === 0) bump(1);
  }, 1000);
  toast("Chrono lancé");
}
$("tToggle").onclick = toggleTimer;
$("tReset").onclick = () => { if (timerId) toggleTimer(); secs = 0; $("timer").textContent = fmtT(0); };
addEventListener("beforeunload", () => save("totalSecs", totalSecs));
