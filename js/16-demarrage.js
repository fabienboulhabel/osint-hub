/* OSINT Hub — 16-demarrage.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 17. DÉMARRAGE ---------- */
applySettings();
renderCaseSelect(); renderTimeline(); renderHistory(); renderTools();
renderGgMaps(); renderSessions(); renderGgDaily(); renderTasks(); renderMemo(); renderQuizList();
$("ggGoal").value = ggGoal;
setCaseMode(caseMode);
setTrainTab(load("trainTab", "program"));
refreshTraining();
$("rConfLbl").textContent = stars(3);
setSunNow();
loadLegal();
route();
renderGPoints(); renderSel(); profile.fillSelects();
globe.start();
refreshNetState(); initBackup(); renderMobNav(); labelIconButtons();
renderMemoReview(); renderPlayStats();
if (load("terms", null) !== TERMS_VERSION) showGate();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
