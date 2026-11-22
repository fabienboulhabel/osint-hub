/* OSINT Hub — 09-entrainement.js · voir js/README.md pour l'ordre de chargement */
/* ---------- 11. ENTRAÎNEMENT ---------- */
const PROGRAM = window.PROGRAM, RANKS = window.RANKS;
let progress = load("progress", []);       // étapes cochées à la main
let quizStats = load("quizStats", {});     // { id: { best, plays, last, date } }
let flags = load("flags", {});             // { exported: true… }

// --- GeoGuessr : cartes et sessions
const GG_FRANCE = "https://www.geoguessr.com/maps/france"; // carte officielle « France »
const GG_AURA = "https://www.geoguessr.com/maps/655254048164cfc43ee03bab"; // carte Lyon / Auvergne-Rhône-Alpes
let ggMaps = load("ggMaps", [{ name: "France", url: GG_FRANCE }, { name: "Lyon / AURA", url: GG_AURA }]);
ggMaps = ggMaps
  .filter(m => !(m.name === "No Move" && /geoguessr\.com\/?$/.test(m.url)))          // « No Move » est un mode, pas une carte
  .map(m => /geoguessr\.com\/maps\/?$/.test(m.url) || (!m.url && /lyon|aura/i.test(m.name))
    ? { ...m, url: m.name === "France" ? GG_FRANCE : /lyon|aura/i.test(m.name) ? GG_AURA : "" } : m);
save("ggMaps", ggMaps);
let sessions = load("sessions", load("gg", []));
let ggGoal = load("ggGoal", 20000);
const GG_MODES = ["Move", "No Move", "NMPZ"];

// --- Badges : [id, nom, description, icône, condition]
const BADGES = [
  ["first", "Premier pas", "Valider une étape du programme", "◆", s => s.doneCount >= 1],
  ["streak3", "Régulier", "3 jours d'activité d'affilée", "3", s => s.streak >= 3],
  ["streak7", "Discipliné", "7 jours d'affilée", "7", s => s.streak >= 7],
  ["perfect", "Sans faute", "10/10 à un exercice", "★", s => s.perfect],
  ["nomove", "Œil de lynx", "5 parties en No Move", "◎", s => s.nm >= 5],
  ["lyon", "Gone", "5 parties sur la carte Lyon", "L", s => s.lyon >= 5],
  ["record", "Record", "20 000 points sur une partie", "▲", s => s.maxScore >= 20000],
  ["memo", "Mémoire de terrain", "10 indices perso dans le mémo", "✎", s => s.userMemo >= 10],
  ["string", "Tisseur de fils", "5 fils sur un tableau d'enquête", "⌇", s => s.links >= 5],
  ["archiv", "Archiviste", "Exporter un rapport", "⤓", s => s.exported],
  ["hours", "Endurant", "5 h d'entraînement chronométré", "◷", s => s.totalSecs >= 18000],
  ["all", "Enquêteur accompli", "Terminer tout le programme", "V", s => s.allDone]
];

function computeTraining() {
  const lyon = sessions.filter(s => /lyon|aura/i.test(s.map || "")).length;
  const nm = sessions.filter(s => s.mode === "No Move").length;
  const mv = sessions.filter(s => !s.mode || s.mode === "Move").length;
  const maxScore = sessions.reduce((m, s) => Math.max(m, +s.score || 0), 0);
  const qb = id => quizStats[id]?.best || 0;
  const userMemo = memo.filter(m => !m.builtin).length;
  const links = Math.max(0, ...cases.map(c => c.links.length));
  const auto = new Set();
  if (mv >= 5) auto.add("gg1");
  if (qb("france") >= 8) auto.add("fr1");
  if (qb("dep") >= 8) auto.add("dep1");
  if (userMemo >= 10) auto.add("fr2");
  if (nm >= 5) auto.add("nm1");
  if (lyon >= 5) auto.add("nm2");
  if (qb("shadow") >= 7) auto.add("sh1");
  if (maxScore >= 20000) auto.add("nm3");
  if (sessions.some(x => /^Exercice photo/.test(x.map || "") && +x.score >= 12000)) auto.add("pe1");
  if (cases.some(c => c.entries.length >= 5 && c.links.length >= 4)) auto.add("rep1");
  if (flags.exported) auto.add("rep2");
  const done = id => auto.has(id) || progress.includes(id);
  const items = PROGRAM.flatMap((l, li) => l.items.map(it => ({ ...it, lvl: li + 1 })));
  const doneItems = items.filter(it => done(it.id));
  const s = { lyon, nm, maxScore, userMemo, links, streak: streak(), totalSecs, exported: !!flags.exported,
    perfect: Object.values(quizStats).some(q => q.best === 10), doneCount: doneItems.length, allDone: doneItems.length === items.length };
  const unlocked = BADGES.filter(b => b[4](s)).map(b => b[0]);
  const xp = doneItems.reduce((a, it) => a + it.xp, 0)
    + Object.values(quizStats).reduce((a, q) => a + (q.best || 0) * 3, 0)
    + Math.min(sessions.length * 3, 150) + unlocked.length * 10;
  let ri = 0; RANKS.forEach((r, i) => { if (xp >= r[0]) ri = i; });
  const rank = { name: RANKS[ri][1], roman: RANKS[ri][2], min: RANKS[ri][0], next: RANKS[ri + 1] };
  return { done, items, doneItems, xp, rank, unlocked, s };
}

let trainReady = false;
const openGuides = new Set();
function refreshTraining() {
  const st = computeTraining();
  // Rang
  $("rankNum").textContent = st.rank.roman;
  $("rankName").textContent = st.rank.name;
  const nx = st.rank.next;
  $("xpFill").style.width = (nx ? (st.xp - st.rank.min) / (nx[0] - st.rank.min) * 100 : 100) + "%";
  $("xpText").textContent = nx ? `${st.xp} XP · encore ${nx[0] - st.xp} XP pour « ${nx[1]} »` : `${st.xp} XP · rang maximal atteint`;
  // Défis du jour
  const k = todayKey(), dq = dailyQuizDef(), gd = ggDaily();
  $("dailyQuizName").textContent = dq.name;
  $("dailyQuizState").innerHTML = load("quizDaily", "") === k ? '<span class="done">✓ FAIT AUJOURD\'HUI</span>' : "10 QUESTIONS · CLIQUE POUR LANCER";
  $("dailyGgName").textContent = `${gd.mode} · ${fmtNum(gd.target)} pts`;
  $("dailyGgState").innerHTML = load("ggDailyDone", "") === k ? '<span class="done">✓ RELEVÉ</span>' : (gd.map ? esc(gd.map.name.toUpperCase()) : "AJOUTE LE LIEN D'UNE CARTE");
  // Programme
  const nextIt = st.items.find(it => !st.done(it.id));
  const actBtn = it => it.quiz ? `<button class="btn sm" data-quiz="${it.quiz}">Lancer l'exercice →</button>`
    : it.url ? `<a class="btn sm" href="${it.url}" target="_blank" rel="noopener">Ouvrir l'outil ↗</a>`
    : it.gg ? `<button class="btn sm" data-ttab-go="gg">Enregistrer une session →</button>`
    : it.memo ? `<button class="btn sm" data-ttab-go="memo">Ouvrir le mémo →</button>`
    : it.go ? `<a class="btn sm" href="#${it.go}">Ouvrir le module →</a>` : "";
  const guide = it => `<div class="guide">
      <div class="g-col"><h5 class="mono">POURQUOI</h5><p>${esc(it.why)}</p>
        <h5 class="mono">C'EST FAIT QUAND…</h5><p>${esc(it.done)}</p>
        ${it.tip ? `<p class="g-tip"><b class="mono">ASTUCE</b> ${esc(it.tip)}</p>` : ""}</div>
      <div class="g-col"><h5 class="mono">COMMENT FAIRE</h5><ol>${it.how.map(h => `<li>${esc(h)}</li>`).join("")}</ol>
        <div class="row wrap-row">${actBtn(it)}${it.auto ? `<span class="mono small muted">Validation automatique</span>` : `<span class="mono small muted">Coche la case quand c'est fait</span>`}</div></div></div>`;
  $("program").innerHTML = `
    <div class="how-it-works">
      <div><span class="mono hw-n">1</span><b>Suis l'ordre</b><p>Les niveaux vont du plus simple au plus avancé. Commence par l'étape mise en avant ci-dessous.</p></div>
      <div><span class="mono hw-n">2</span><b>Ouvre le guide</b><p>Chaque étape explique pourquoi, comment, et à quoi on reconnaît qu'elle est terminée.</p></div>
      <div><span class="mono hw-n">3</span><b>Valide</b><p>Les étapes <em class="mono tag">AUTO</em> se cochent seules. Les autres, coche-les toi-même quand le critère est rempli.</p></div>
      <div><span class="mono hw-n">4</span><b>Un peu chaque jour</b><p>20 à 30 minutes par jour valent mieux que 3 heures le dimanche : ta série de jours le montre.</p></div>
    </div>
    ${nextIt ? `<section class="next-step">
      <div class="ns-head"><span class="mono">▶ TON PROCHAIN PAS · NIV. ${nextIt.lvl} · ${esc(PROGRAM[nextIt.lvl - 1].name.toUpperCase())}</span><span class="mono">${nextIt.time ? "≈ " + esc(nextIt.time) + " · " : ""}+${nextIt.xp} XP</span></div>
      <h3>${esc(nextIt.t)}</h3>${guide(nextIt)}</section>`
    : `<section class="next-step"><h3>Programme terminé. Bravo.</h3><p>Continue avec les défis du jour, Gralhix et tes propres objectifs.</p></section>`}
    ${PROGRAM.map((L, li) => {
    const d = L.items.filter(it => st.done(it.id)).length, pct = Math.round(d / L.items.length * 100);
    const isOpenLvl = nextIt && nextIt.lvl === li + 1;
    return `<article class="level ${d === L.items.length ? "complete" : ""} ${isOpenLvl ? "current" : ""}">
      <header><span class="lv-n mono">NIV. ${li + 1}</span><div><h3>${L.name}</h3><p class="small muted">${L.desc}</p></div><span class="lv-p mono">${d}/${L.items.length}</span></header>
      <div class="lv-bar"><i style="width:${pct}%"></i></div>
      <p class="lv-goal"><b class="mono">OBJECTIF</b> ${esc(L.goal)}</p>
      <ul>${L.items.map(it => {
        const ok = st.done(it.id), open = openGuides.has(it.id);
        return `<li class="${ok ? "done" : ""} ${open ? "open" : ""} ${nextIt && it.id === nextIt.id ? "is-next" : ""}">
          <div class="it-row"><label class="pchk" title="${it.auto ? "Validée automatiquement" : "Cocher quand c'est fait"}"><input type="checkbox" data-pid="${it.id}" ${ok ? "checked" : ""} ${it.auto ? "disabled" : ""}><span></span></label>
          <button class="it-t" data-guide="${it.id}"><span class="t">${esc(it.t)}</span>${it.auto ? '<em class="mono tag">AUTO</em>' : ""}${it.time ? `<span class="mono small muted it-time">${esc(it.time)}</span>` : ""}<span class="xp mono">+${it.xp}</span><span class="mono chev">${open ? "−" : "+"}</span></button></div>
          ${open ? guide(it) : ""}</li>`;
      }).join("")}</ul></article>`;
  }).join("")}`;
  $$("[data-guide]").forEach(b => b.onclick = () => { const id = b.dataset.guide; openGuides.has(id) ? openGuides.delete(id) : openGuides.add(id); refreshTraining(); });
  $$("[data-pid]").forEach(c => c.onchange = () => {
    progress = c.checked ? [...new Set([...progress, c.dataset.pid])] : progress.filter(x => x !== c.dataset.pid);
    save("progress", progress); if (c.checked) { bump(3); toast("Étape validée"); } refreshTraining();
  });
  $$("#program [data-quiz]").forEach(b => b.onclick = () => startQuiz(b.dataset.quiz));
  $$("#program [data-ttab-go]").forEach(b => b.onclick = () => { setTrainTab(b.dataset.ttabGo); window.scrollTo({ top: $("trainTabs").offsetTop - 80, behavior: "smooth" }); });
  // Badges
  $("badges").innerHTML = BADGES.map(b => `<div class="badge-st ${st.unlocked.includes(b[0]) ? "on" : ""}" title="${b[2]}"><span class="b-ico">${b[3]}</span><b>${b[1]}</b><small>${b[2]}</small></div>`).join("");
  $("badgeCount").textContent = `${st.unlocked.length}/${BADGES.length}`;
  const prev = load("badges", []), fresh = st.unlocked.filter(b => !prev.includes(b));
  if (fresh.length || prev.length !== st.unlocked.length) save("badges", st.unlocked);
  if (fresh.length && trainReady) { const b = BADGES.find(x => x[0] === fresh[0]); setTimeout(() => toast(`Badge débloqué : ${b[1]}`), 500); }
  trainReady = true;
  return st;
}

function setTrainTab(t) {
  $$("#trainTabs button").forEach(b => b.classList.toggle("on", b.dataset.ttab === t));
  $$(".tpane").forEach(p => p.hidden = p.dataset.tpane !== t);
  save("trainTab", t);
  if (t === "gg") setTimeout(drawChart, 30);
}
$$("#trainTabs button").forEach(b => b.onclick = () => setTrainTab(b.dataset.ttab));

// --- Défis perso : liste modifiable, avec des défis proposés par défaut
const DEFAULT_TASKS = [
    { t: "Gralhix — premier défi de géolocalisation", url: "https://gralhix.com" },
    { t: "Bellingcat — guide de géolocalisation", url: "https://www.bellingcat.com/category/resources/how-tos/" },
    { t: "Maîtriser la recherche d'image inversée (Lens, Yandex, TinEye)", url: "https://tineye.com/" },
    { t: "Configurer un navigateur dédié (OPSEC)", url: "" },
    { t: "Archiver une page avec la Wayback Machine", url: "https://web.archive.org/" },
    { t: "Explorer le Géoportail IGN (sentiers, photos aériennes)", url: "https://www.geoportail.gouv.fr/" }
];
const freshDefaults = () => DEFAULT_TASKS.map(x => ({ ...x, d: false }));
let tasks = load("tasks", null);
// Premier lancement, ou liste vide héritée d'une version précédente : on propose les défis par défaut une seule fois
if (!Array.isArray(tasks) || (!tasks.length && !load("tasksSeeded", false))) { tasks = freshDefaults(); save("tasks", tasks); }
save("tasksSeeded", true);
tasks = tasks.map(x => ({ t: x.t, d: !!x.d, url: x.url || "" }));

// Ouvre un lien dans la visionneuse du hub (onglet du navigateur si la visionneuse est désactivée)
function openInHub(url, title) {
    if (settings.viewer === false) return window.open(url, "_blank", "noopener");
    viewer.open(title, url, url, "Si la page reste blanche ou affiche « refusé de se connecter », ce site interdit l'affichage intégré : clique ↗ en haut du panneau pour l'ouvrir dans un onglet.");
}
function renderTasks() {
    $("taskList").innerHTML = tasks.length
        ? tasks.map((x, i) => `<li class="${x.d ? "done" : ""}">
        <input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""} aria-label="Défi terminé">
        <span class="t">${esc(x.t)}</span>
        ${x.url ? `<button class="task-link" data-u="${i}" title="Ouvrir dans le hub : ${esc(x.url)}">Ouvrir ▣</button>` : ""}
        <button class="del" data-x="${i}" title="Supprimer ce défi" aria-label="Supprimer ce défi">✕</button></li>`).join("")
        : `<li class="empty">Aucun défi. Ajoute les tiens, ou rétablis la liste proposée.</li>`;
    $$("#taskList input").forEach(c => c.onchange = () => { tasks[c.dataset.i].d = c.checked; save("tasks", tasks); if (c.checked) { bump(2); toast("Défi validé"); } renderTasks(); });
    $$("#taskList [data-u]").forEach(b => b.onclick = () => { const x = tasks[b.dataset.u]; openInHub(x.url, trunc(x.t, 30)); });
    $$("#taskList .del").forEach(d => d.onclick = () => {
        const x = tasks[d.dataset.x]; if (!confirm(`Supprimer « ${x.t} » ?`)) return;
        tasks.splice(d.dataset.x, 1); save("tasks", tasks); renderTasks();
    });
    const done = tasks.filter(x => x.d).length, pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    $("taskBar").style.width = pct + "%"; $("taskPct").textContent = tasks.length ? `${done}/${tasks.length} · ${pct} %` : "";
    const missing = DEFAULT_TASKS.filter(dft => !tasks.some(x => x.t === dft.t)).length;
    $("taskReset").hidden = !missing; $("taskReset").textContent = `Rétablir les défis proposés (${missing})`;
}
$("taskAdd").onclick = () => {
    const v = $("taskInput").value.trim(); if (!v) return toast("Écris d'abord le défi");
    let u = $("taskUrl").value.trim();
    if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
    tasks.push({ t: v, d: false, url: u }); save("tasks", tasks);
    $("taskInput").value = ""; $("taskUrl").value = ""; renderTasks();
};
$("taskInput").onkeydown = $("taskUrl").onkeydown = e => e.key === "Enter" && $("taskAdd").click();
$("taskReset").onclick = () => {
    DEFAULT_TASKS.forEach(dft => { if (!tasks.some(x => x.t === dft.t)) tasks.push({ ...dft, d: false }); });
    save("tasks", tasks); renderTasks(); toast("Défis proposés rétablis");
};

// --- Exercices (quiz)
const mcq = (q, correct, wrong, explain) => { const opts = shuffle([correct, ...wrong.slice(0, 3)]); return { q, opts, a: opts.indexOf(correct), explain }; };
function genDep(scope) {
  const pool = scope === "aura" ? window.DEPTS.filter(d => window.AURA.includes(d[0])) : window.DEPTS;
  return pick(pool, 10).map(d => {
    const o = pick(pool.filter(x => x !== d), 3), t = (Math.random() * 4) | 0, ex = `${d[0]} = ${d[1]}, préfecture : ${d[2]}.`;
    if (t === 0) return mcq(`Quel département porte le numéro ${d[0]} ?`, d[1], o.map(x => x[1]), ex);
    if (t === 1) return mcq(`Quel est le numéro du département « ${d[1]} » ?`, d[0], o.map(x => x[0]), ex);
    if (t === 2) return mcq(`Quelle est la préfecture du département « ${d[1]} » (${d[0]}) ?`, d[2], o.map(x => x[2]), ex);
    return mcq(`${d[2]} est la préfecture de quel département ?`, `${d[1]} (${d[0]})`, o.map(x => `${x[1]} (${x[0]})`), ex);
  });
}
const CARDINAL = d => ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"][Math.round(d / 45) % 8];
function genShadow() {
  if (!window.SunCalc) return null;
  const qs = [], fmt = d => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  for (let guard = 0; qs.length < 10 && guard < 300; guard++) {
    const [city, lat, lng] = window.SHADOW_CITIES[(Math.random() * window.SHADOW_CITIES.length) | 0];
    const y = new Date().getFullYear(), day = new Date(y, 0, 1 + ((Math.random() * 365) | 0), 12);
    const t = SunCalc.getTimes(day, lat, lng);
    const start = t.sunrise.getTime() + 90 * 6e4, end = t.sunset.getTime() - 90 * 6e4;
    if (!(end > start)) continue;
    const when = new Date(start + Math.random() * (end - start));
    when.setMinutes(when.getMinutes() < 30 ? 0 : 30, 0, 0);
    const p = SunCalc.getPosition(when, lat, lng);
    if (p.altitude < .08) continue;
    const az = (p.azimuth * 180 / Math.PI + 180) % 360, sh = (az + 180) % 360, ratio = 1 / Math.tan(p.altitude);
    const cands = [-4.5, -3.5, -2.5, -1.5, 1.5, 2.5, 3.5, 4.5].map(k => new Date(when.getTime() + k * 36e5)).filter(d => d >= t.sunrise && d <= t.sunset);
    if (cands.length < 3) continue;
    qs.push(mcq(`${city}, le ${when.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. L'ombre d'un poteau vertical pointe vers ${sh.toFixed(0)}° (${CARDINAL(sh)}) et mesure environ ${ratio.toFixed(1).replace(".", ",")} fois sa hauteur. Quelle heure est-il ?`,
      fmt(when), pick(cands, 3).map(fmt),
      `Soleil à ${az.toFixed(0)}° d'azimut et ${(p.altitude * 180 / Math.PI).toFixed(0)}° de hauteur. L'ombre part à l'opposé du soleil : vers l'ouest le matin, vers le nord autour du midi solaire (entre 12 h 30 et 14 h 30 en France selon la saison et la longitude), vers l'est le soir. Plus elle est longue, plus le soleil est bas.`));
  }
  return qs;
}
const QUIZZES = [
  { id: "dep", name: "Départements", desc: "Numéros, noms et préfectures. Indispensable pour lire les plaques et les panneaux.", opts: [["fr", "France entière"], ["aura", "Auvergne-Rhône-Alpes"]], gen: o => genDep(o) },
  { id: "france", name: "Indices France & Lyon", desc: "Signalisation, plaques, bornes, architecture et repères lyonnais.", gen: () => pick(window.BANK_FRANCE, 10).map(b => mcq(...b)) },
  { id: "europe", name: "Indices Europe", desc: "Plaques, panneaux et conduite chez nos voisins : Suisse, Italie, Espagne, Allemagne, Belgique…", gen: () => pick(window.BANK_EUROPE, 10).map(b => mcq(...b)) },
  { id: "osint", name: "Outils & méthode", desc: "Le bon outil pour la bonne question, et les règles du terrain.", gen: () => pick(window.BANK_OSINT, 10).map(b => mcq(...b)) },
  { id: "shadow", name: "Ombres & heure", desc: "Chronolocalisation : retrouver l'heure à partir de la direction et de la longueur d'une ombre.", gen: genShadow, needs: "SunCalc" }
];
const dailyQuizDef = () => QUIZZES[dayIndex() % QUIZZES.length];
let quiz = null, quizTimer = null;

function renderQuizList() {
  const dq = dailyQuizDef();
  $("quizList").innerHTML = QUIZZES.map(q => {
    const st = quizStats[q.id] || {};
    return `<article class="qcard ${q.id === dq.id ? "daily" : ""}">
      <header><span class="mono">${q.id === dq.id ? "★ QUIZ DU JOUR" : "EXERCICE"}</span><span class="mono">${st.best != null ? `RECORD ${st.best}/10` : "JAMAIS JOUÉ"}</span></header>
      <h3>${q.name}</h3><p>${q.desc}</p>
      <div class="q-best">${Array.from({ length: 10 }, (_, i) => `<i class="${i < (st.best || 0) ? "on" : ""}"></i>`).join("")}</div>
      ${q.opts ? `<select class="sm-sel" data-qopt="${q.id}">${q.opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select>` : ""}
      <div class="q-foot"><span class="mono small muted">${st.plays || 0} partie(s)${st.last != null ? ` · dernière ${st.last}/10` : ""}</span><button class="btn" data-start="${q.id}">Lancer →</button></div>
    </article>`;
  }).join("");
  $$("[data-start]").forEach(b => b.onclick = () => startQuiz(b.dataset.start, document.querySelector(`[data-qopt="${b.dataset.start}"]`)?.value));
}
function startQuiz(id, opt) {
  const def = QUIZZES.find(q => q.id === id); if (!def) return;
  if (def.needs && !window[def.needs]) return toast("Exercice indisponible : le calcul solaire nécessite une connexion");
  const qs = def.gen(opt || def.opts?.[0][0]);
  if (!qs || qs.length < 5) return toast("Impossible de générer l'exercice, réessaie");
  setTrainTab("drills");
  quiz = { def, qs, i: 0, score: 0, answered: false, start: Date.now(), res: [], errors: [], done: false };
  $("quizList").hidden = true; $("quizBox").hidden = false;
  clearInterval(quizTimer);
  quizTimer = setInterval(() => { const t = $("qzTime"); if (t && quiz && !quiz.done) t.textContent = fmtT(Math.round((Date.now() - quiz.start) / 1000)).slice(3); }, 1000);
  renderQ();
  $("quizBox").scrollIntoView({ behavior: "smooth", block: "start" });
}
const startDailyQuiz = () => { go("training"); setTimeout(() => startQuiz(dailyQuizDef().id), current === "training" ? 0 : 500); };
function renderQ() {
  const q = quiz.qs[quiz.i], n = quiz.qs.length;
  quiz.answered = false;
  $("quizBox").innerHTML = `
    <div class="qz-head mono"><span>${quiz.def.name.toUpperCase()}</span><span>QUESTION ${quiz.i + 1}/${n}</span><span>SCORE ${quiz.score}</span><span id="qzTime">${fmtT(Math.round((Date.now() - quiz.start) / 1000)).slice(3)}</span><button class="btn ghost sm" id="qzQuit">Quitter</button></div>
    <div class="qz-bar" style="grid-template-columns:repeat(${n},1fr)">${quiz.qs.map((_, k) => `<i class="${k < quiz.i ? (quiz.res[k] ? "ok" : "ko") : k === quiz.i ? "cur" : ""}"></i>`).join("")}</div>
    <h3 class="qz-q">${esc(q.q)}</h3>
    <div class="qz-opts">${q.opts.map((o, k) => `<button class="qz-opt" data-k="${k}"><kbd>${k + 1}</kbd><span>${esc(o)}</span></button>`).join("")}</div>
    <div class="qz-fb" id="qzFb"></div>`;
  $$(".qz-opt").forEach(b => b.onclick = () => answer(+b.dataset.k));
  $("qzQuit").onclick = quitQuiz;
}
function answer(k) {
  if (!quiz || quiz.answered || quiz.done) return;
  const q = quiz.qs[quiz.i], ok = k === q.a;
  quiz.answered = true; quiz.res[quiz.i] = ok;
  if (ok) quiz.score++; else quiz.errors.push({ q: q.q, a: q.opts[q.a], you: q.opts[k] });
  $$(".qz-opt").forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add("right"); if (j === k && !ok) b.classList.add("wrong"); });
  $$(".qz-bar i")[quiz.i].className = ok ? "ok" : "ko";
  const last = quiz.i === quiz.qs.length - 1;
  $("qzFb").innerHTML = `<p class="${ok ? "" : "ko"}"><b>${ok ? "Exact." : `Raté — la réponse était : ${esc(q.opts[q.a])}.`}</b> ${esc(q.explain || "")}</p>
    <div class="row"><button class="btn" id="qzNext">${last ? "Voir le résultat" : "Question suivante"} <span>→</span></button><span class="mono small muted">ou touche Entrée</span></div>`;
  $("qzNext").onclick = nextQ;
  $("qzNext").focus({ preventScroll: true });
}
function nextQ() { if (!quiz?.answered) return; quiz.i++; quiz.i >= quiz.qs.length ? finishQuiz() : renderQ(); }
function finishQuiz() {
  quiz.done = true; clearInterval(quizTimer);
  const n = quiz.qs.length, sc = Math.round(quiz.score / n * 10), time = Math.round((Date.now() - quiz.start) / 1000), id = quiz.def.id;
  const prev = quizStats[id] || {}, record = prev.best == null || sc > prev.best;
  quizStats[id] = { best: Math.max(prev.best ?? 0, sc), plays: (prev.plays || 0) + 1, last: sc, date: todayKey() };
  save("quizStats", quizStats);
  bump(sc >= 8 ? 4 : 2);
  let dailyMsg = "";
  if (id === dailyQuizDef().id && load("quizDaily", "") !== todayKey()) { save("quizDaily", todayKey()); bump(3); dailyMsg = " Quiz du jour validé."; }
  const msg = sc === 10 ? "Sans faute." : sc >= 8 ? "Très solide." : sc >= 5 ? "Bonne base, encore un effort." : "À retravailler : relis les explications ci-dessous.";
  $("quizBox").innerHTML = `
    <div class="qz-head mono"><span>${quiz.def.name.toUpperCase()} — RÉSULTAT</span><span>${fmtT(time).slice(3)}</span></div>
    <div class="qz-res">
      <div class="qz-score">${sc}<small>/10</small></div>
      <p class="lead" style="margin:10px auto 0">${msg}${record && prev.best != null ? " Nouveau record !" : ""}${dailyMsg}</p>
      <div class="row"><button class="btn" id="qzAgain">Rejouer <span>↻</span></button><button class="btn ghost" id="qzBack">Tous les exercices</button></div>
      ${quiz.errors.length ? `<ul class="qz-err">${quiz.errors.map(e => `<li>${esc(e.q)}<br><s>${esc(e.you)}</s> → <b>${esc(e.a)}</b></li>`).join("")}</ul>` : ""}
    </div>`;
  $("qzAgain").onclick = () => startQuiz(id, quiz.def.opts ? document.querySelector(`[data-qopt="${id}"]`)?.value : undefined);
  $("qzBack").onclick = quitQuiz;
  renderQuizList(); refreshTraining();
}
function quitQuiz() { clearInterval(quizTimer); quiz = null; $("quizBox").hidden = true; $("quizBox").innerHTML = ""; $("quizList").hidden = false; renderQuizList(); }
$("dailyQuizBtn").onclick = () => startQuiz(dailyQuizDef().id);
$("dailyGgBtn").onclick = () => setTrainTab("gg");

// --- GeoGuessr
function ggDaily() {
  const r = seeded(dayIndex() * 7919 + 13);
  const maps = ggMaps.filter(m => m.url);
  const mapPick = maps.length ? maps[(r() * maps.length) | 0] : null;
  return { map: mapPick, mode: GG_MODES[(r() * 3) | 0], c: window.GG_CONSTRAINTS[(r() * window.GG_CONSTRAINTS.length) | 0], target: [12000, 15000, 17500, 20000][(r() * 4) | 0] };
}
function renderGgDaily() {
  const d = ggDaily(), done = load("ggDailyDone", "") === todayKey();
  $("ggDailyDate").textContent = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" }).toUpperCase();
  $("ggDaily").innerHTML = `<div class="dly ${done ? "done" : ""}">
    <div class="dly-grid"><div><small>CARTE</small><b>${d.map ? esc(d.map.name) : "—"}</b></div><div><small>MODE</small><b>${d.mode}</b></div><div><small>OBJECTIF</small><b>${fmtNum(d.target)}</b></div></div>
    <p class="dly-c">${esc(d.c)}</p>
    <div class="row">${d.map ? `<a class="btn" href="${esc(d.map.url)}" target="_blank" rel="noopener">Jouer <span>↗</span></a>` : `<span class="small muted">Ajoute le lien d'une carte ci-dessous pour activer le défi.</span>`}
      <span class="mono small ${done ? "ok-txt" : "muted"}">${done ? "✓ DÉFI RELEVÉ AUJOURD'HUI" : "Validé en enregistrant une session sur cette carte, dans ce mode, au-dessus de l'objectif."}</span></div></div>`;
}
function renderGgMaps() {
  $("ggLinks").innerHTML = ggMaps.map((m, i) => `<div class="gg-link">${m.url
      ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>`
      : `<button class="cfg" data-edit="${i}">${esc(m.name)} — ajouter le lien ✎</button>`}
    <button class="del" data-edit="${i}" title="Modifier">✎</button><button class="del" data-rm="${i}" title="Supprimer">✕</button></div>`).join("")
    || `<p class="empty">Aucune carte. Ajoute tes cartes GeoGuessr avec « + Carte ».</p>`;
  const cur = $("ggMap").value;
  $("ggMap").innerHTML = ggMaps.map(m => `<option>${esc(m.name)}</option>`).join("") + "<option>Autre</option>";
  if (cur) $("ggMap").value = cur;
  const names = [...new Set([...ggMaps.map(m => m.name), ...sessions.map(s => s.map).filter(Boolean)])];
  const fcur = $("ggFMap").value;
  $("ggFMap").innerHTML = `<option value="">Toutes cartes</option>` + names.map(n => `<option>${esc(n)}</option>`).join("");
  $("ggFMap").value = names.includes(fcur) ? fcur : "";
  $$("#ggLinks [data-edit]").forEach(b => b.onclick = () => {
    const m = ggMaps[b.dataset.edit];
    const name = prompt("Nom de la carte :", m.name); if (name === null) return;
    const url = prompt("Lien de la carte (copie l'adresse de la page de la carte sur GeoGuessr) :", m.url || "https://www.geoguessr.com/maps/"); if (url === null) return;
    ggMaps[b.dataset.edit] = { name: name.trim() || m.name, url: /^https?:\/\/\S+\/maps\/\S+/.test(url.trim()) ? url.trim() : "" };
    if (url.trim() && !ggMaps[b.dataset.edit].url) toast("Lien non reconnu : il doit ressembler à https://www.geoguessr.com/maps/…");
    save("ggMaps", ggMaps); renderGgMaps(); renderGgDaily(); refreshTraining();
  });
  $$("#ggLinks [data-rm]").forEach(b => b.onclick = () => { if (confirm("Supprimer cette carte ?")) { ggMaps.splice(b.dataset.rm, 1); save("ggMaps", ggMaps); renderGgMaps(); renderGgDaily(); } });
}
$("ggAddMap").onclick = () => {
  const name = prompt("Nom de la carte :"); if (!name) return;
  const url = prompt("Lien de la carte :", "https://www.geoguessr.com/maps/"); if (url === null) return;
  ggMaps.push({ name: name.trim(), url: /^https?:\/\/\S+\/maps\/\S+/.test(url.trim()) ? url.trim() : "" });
  save("ggMaps", ggMaps); renderGgMaps(); renderGgDaily();
};
const ggFiltered = () => { const fm = $("ggFMap").value, fo = $("ggFMode").value; return sessions.filter(s => (!fm || s.map === fm) && (!fo || (s.mode || "Move") === fo)); };
function renderSessions() {
  const fs = ggFiltered(), sc = fs.map(s => +s.score);
  const l5 = sc.slice(0, 5), p5 = sc.slice(5, 10);
  let trend = "—", cls = "";
  if (l5.length >= 3 && p5.length >= 3) { const d = Math.round(mean(l5) - mean(p5)); trend = (d >= 0 ? "+" : "") + fmtNum(d); cls = d >= 0 ? "up" : "down"; }
  const kpi = (l, v, c = "") => `<div class="kpi"><small>${l}</small><b class="${c}">${v}</b></div>`;
  $("ggKpis").innerHTML = kpi("PARTIES", fs.length) + kpi("MOYENNE", sc.length ? fmtNum(mean(sc)) : "—") + kpi("RECORD", sc.length ? fmtNum(Math.max(...sc)) : "—") + kpi("TENDANCE", trend, cls);
  $("ggCount").textContent = `${fs.length} SESSION${fs.length > 1 ? "S" : ""}`;
  $("ggList").innerHTML = fs.length ? fs.slice(0, 15).map(s => `<li>
      <div class="sess-top"><span class="t mono small">${esc(s.date)} — ${esc(s.map)}</span><span class="mode-tag">${esc(s.mode || "Move")}</span>${s.time ? `<span class="mono small muted">${s.time} min</span>` : ""}<b class="mono">${fmtNum(+s.score)}</b><button class="del" data-si="${sessions.indexOf(s)}">✕</button></div>
      ${s.note ? `<p class="sess-note">${esc(s.note)}</p>` : ""}</li>`).join("")
    : `<li class="empty">Aucune session${$("ggFMap").value || $("ggFMode").value ? " pour ce filtre" : ""}.</li>`;
  $$("#ggList [data-si]").forEach(d => d.onclick = () => { if (confirm("Supprimer cette session ?")) { sessions.splice(+d.dataset.si, 1); save("sessions", sessions); renderSessions(); refreshTraining(); } });
  drawChart();
}
function drawChart() {
  const c = $("ggChart"), dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  if (!W) return;
  c.width = W * dpr; c.height = H * dpr;
  const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
  const ink = cssVar("--ink"), muted = cssVar("--muted");
  const pts = ggFiltered().slice(0, 20).reverse().map(s => +s.score);
  ctx.font = "11px JetBrains Mono, monospace";
  if (pts.length < 2) { ctx.fillStyle = muted; ctx.textAlign = "center"; ctx.fillText("LA COURBE APPARAÎT À PARTIR DE 2 SESSIONS", W / 2, H / 2); $("ggAvg").textContent = ""; return; }
  let max = Math.max(...pts), min = Math.min(...pts);
  if (ggGoal) { max = Math.max(max, ggGoal); min = Math.min(min, ggGoal); }
  const p = 16, X = i => p + i * (W - p * 2) / (pts.length - 1), Y = v => H - p - (v - min) / ((max - min) || 1) * (H - p * 2);
  ctx.strokeStyle = muted; ctx.globalAlpha = .3; ctx.setLineDash([2, 4]);
  for (let k = 0; k <= 4; k++) { const y = p + k * (H - p * 2) / 4; ctx.beginPath(); ctx.moveTo(p, y); ctx.lineTo(W - p, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (ggGoal) {
    ctx.setLineDash([8, 5]); ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p, Y(ggGoal)); ctx.lineTo(W - p, Y(ggGoal)); ctx.stroke();
    ctx.fillStyle = ACCENT; ctx.textAlign = "right"; ctx.fillText(`OBJECTIF ${fmtNum(ggGoal)}`, W - p, Y(ggGoal) - 6);
  }
  ctx.setLineDash([]);
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.lineTo(X(pts.length - 1), H - p); ctx.lineTo(X(0), H - p); ctx.fillStyle = ACCENT + "26"; ctx.fill();
  ctx.beginPath(); pts.forEach((v, i) => i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)));
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
  const best = Math.max(...pts);
  pts.forEach((v, i) => { ctx.fillStyle = v === best ? ACCENT : ink; ctx.fillRect(X(i) - 3.5, Y(v) - 3.5, 7, 7); });
  $("ggAvg").textContent = `MOYENNE ${fmtNum(mean(pts))} · MEILLEUR ${fmtNum(best)} · ${pts.length} DERNIÈRES SESSIONS`;
}
$("ggAdd").onclick = () => {
  const v = $("ggScore").value;
  if (v === "") return toast("Saisis un score");
  const score = +v; if (score < 0 || score > 25000) return toast("Le score doit être entre 0 et 25 000");
  const s = { date: new Date().toLocaleDateString("fr-FR"), ts: new Date().toISOString(), map: $("ggMap").value, mode: $("ggMode").value, score,
    time: $("ggTime").value ? +$("ggTime").value : null, note: $("ggNote").value.trim() };
  const prevBest = Math.max(0, ...sessions.filter(x => x.map === s.map && (x.mode || "Move") === s.mode).map(x => +x.score));
  sessions.unshift(s); save("sessions", sessions); bump(2);
  const d = ggDaily();
  if (load("ggDailyDone", "") !== todayKey() && d.map && s.map === d.map.name && s.mode === d.mode && score >= d.target) { save("ggDailyDone", todayKey()); bump(5); toast("Défi du jour relevé !"); }
  else if (prevBest && score > prevBest) toast("Nouveau record sur cette carte et ce mode !");
  else toast("Session enregistrée");
  ["ggScore", "ggTime", "ggNote"].forEach(id => $(id).value = "");
  renderGgMaps(); renderSessions(); renderGgDaily(); refreshTraining();
};
$("ggScore").onkeydown = e => e.key === "Enter" && $("ggAdd").click();

// --- Partie intégrée (Street View dans le hub)
const play = (() => {
  let st = null, gmap = null, guessMk = null, layer = null;
  const SCALE = Object.fromEntries(Object.entries(PLAY_ZONES).map(([k, z]) => [k, z.scale])); // distance (km) qui fait chuter le score
  const pts = (d, z) => Math.round(5000 * Math.exp(-10 * d / SCALE[z]));
  function ensureMap() {
    if (!window.L) { $("pgResult").textContent = "Carte indisponible (connexion ?)."; return false; }
    if (!gmap) {
      gmap = L.map("pgMap", { zoomControl: true, attributionControl: false });
      L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png", { maxZoom: 18, attribution: "© IGN" }).addTo(gmap);
      layer = L.layerGroup().addTo(gmap);
      gmap.on("click", e => {
        if (!st || st.answered) return;
        if (guessMk) guessMk.setLatLng(e.latlng); else guessMk = L.marker(e.latlng, { icon: pinIcon() }).addTo(layer);
        st.guess = [e.latlng.lat, e.latlng.lng]; $("pgGuess").disabled = false;
      });
    }
    setTimeout(() => gmap.invalidateSize(), 60);
    return true;
  }
  function view() { { const [la, lo, zm] = PLAY_ZONES[st.zone].view; gmap.setView([la, lo], zm); } }
  function start() {
    const zone = $("playZone").value, pool = PLAY_ZONES[zone].pool();
    st = { zone, mode: $("playMode").value, list: pick(pool, 5), i: 0, total: 0, res: [] };
    $("playSetup").hidden = true; $("playGame").hidden = false;
    if (!ensureMap()) return;
    round();
  }
  function round() {
    const [, lat, lng] = st.list[st.i];
    st.answered = false; st.guess = null;
    layer.clearLayers(); guessMk = null; view();
    $("pgFrame").src = svEmbed(lat, lng);
    $("pgStill").hidden = st.mode !== "still";
    $("pgRound").textContent = `MANCHE ${st.i + 1}/${st.list.length}`;
    $("pgScore").textContent = `${fmtNum(st.total)} PTS`;
    $("pgResult").textContent = "Clique sur la carte pour placer ta réponse.";
    $("pgGuess").disabled = true; $("pgGuess").textContent = "Valider ma réponse";
  }
  function guess() {
    if (!st) return;
    if (st.answered) return next();
    if (!st.guess) return;
    const [name, lat, lng] = st.list[st.i], d = gcDist(st.guess, [lat, lng]), p = pts(d, st.zone);
    st.answered = true; st.total += p; st.res.push({ name, d, p });
    logPlay({ t: "sv", zone: st.zone, name, d, p });
    L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="pg-true"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(layer);
    L.polyline([st.guess, [lat, lng]], { color: ACCENT, weight: 2.5, dashArray: "6 5" }).addTo(layer);
    gmap.fitBounds([st.guess, [lat, lng]], { padding: [30, 30], maxZoom: 12 });
    $("pgResult").innerHTML = `<b>${esc(name)}</b><br>Écart : ${d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1).replace(".", ",") + " km"} · <b class="pg-pts">+${fmtNum(p)} pts</b>`;
    $("pgScore").textContent = `${fmtNum(st.total)} PTS`;
    $("pgGuess").textContent = st.i + 1 < st.list.length ? "Manche suivante →" : "Voir le résultat →";
    bump(1);
  }
  function next() {
    st.i++;
    if (st.i < st.list.length) return round();
    const z = "Partie intégrée — " + PLAY_ZONES[st.zone].name;
    $("pgFrame").src = "about:blank";
    $("playGame").hidden = true; $("playSetup").hidden = false;
    $("playSetup").insertAdjacentHTML("afterbegin", `<div class="play-end" id="playEnd"><div class="qz-score">${fmtNum(st.total)}<small>/25 000</small></div>
      <ul class="qz-err">${st.res.map(r => `<li>${esc(r.name)} — ${r.d.toFixed(1).replace(".", ",")} km · <b>${fmtNum(r.p)} pts</b></li>`).join("")}</ul>
      <div class="row"><button class="btn" id="playSave">Enregistrer dans mes sessions</button><button class="btn ghost" id="playClose">Fermer</button></div></div>`);
    const total = st.total, mode = st.mode === "still" ? "No Move" : "Move";
    $("playSave").onclick = () => {
      sessions.unshift({ date: new Date().toLocaleDateString("fr-FR"), ts: new Date().toISOString(), map: z, mode, score: total, time: null, note: "Partie intégrée au hub" });
      save("sessions", sessions); bump(2); $("playEnd").remove(); renderGgMaps(); renderSessions(); refreshTraining(); toast("Partie enregistrée");
    };
    $("playClose").onclick = () => $("playEnd").remove();
    st = null;
  }
  function quit() { st = null; $("pgFrame").src = "about:blank"; $("playGame").hidden = true; $("playSetup").hidden = false; }
  $("playStart").onclick = () => { $("playEnd")?.remove(); start(); };
  $("pgGuess").onclick = guess;
  $("pgSkip").onclick = () => {
    if (!st) return;
    const pool = PLAY_ZONES[st.zone].pool().filter(x => !st.list.includes(x));
    st.list[st.i] = pool[(Math.random() * pool.length) | 0]; round(); toast("Nouveau lieu");
  };
  $("pgQuit").onclick = quit;
  $("ggTryEmbed").onclick = () => {
    const m = ggMaps.find(x => x.url) || { name: "GeoGuessr", url: "https://www.geoguessr.com/maps/france" };
    viewer.open(`Test · ${m.name}`, m.url, m.url, "Test : si Edge affiche « refusé de se connecter » ou une page vide, c'est GeoGuessr qui bloque l'affichage dans un autre site.");
  };
  return { quit };
})();

$("ggFMap").onchange = $("ggFMode").onchange = renderSessions;
$("ggGoal").onchange = e => { ggGoal = Math.max(0, +e.target.value || 0); save("ggGoal", ggGoal); drawChart(); };
addEventListener("resize", () => current === "training" && drawChart());

// --- Mémo d'indices
let memo = load("memo", null);
if (!Array.isArray(memo)) memo = window.MEMO_BUILTIN.map(m => ({ ...m, id: uid(), builtin: true, date: new Date().toISOString() }));
let memoFilter = "";
$("memoCat").innerHTML = window.MEMO_CATS.map(c => `<option>${c}</option>`).join("");
function memoVisible() { const q = norm($("memoQ").value); return memo.filter(m => (!memoFilter || m.cat === memoFilter) && (!q || norm(`${m.cat} ${m.zone} ${m.text}`).includes(q))); }
function renderMemo() {
  const counts = c => memo.filter(m => !c || m.cat === c).length;
  $("memoChips").innerHTML = ["", ...window.MEMO_CATS].filter(c => !c || counts(c)).map(c => `<button class="chip ${c === memoFilter ? "on" : ""}" data-cat="${esc(c)}">${c || "Tout"}<small>${counts(c)}</small></button>`).join("");
  $$("#memoChips .chip").forEach(b => b.onclick = () => { memoFilter = b.dataset.cat; renderMemo(); });
  const list = memoVisible();
  $("memoGrid").innerHTML = list.length ? list.map(m => `<article class="memo-card">
      <div class="mm-head"><span class="mm-cat">${esc(m.cat)}</span><button class="del" data-mdel="${m.id}" title="Supprimer">✕</button></div>
      <span class="mm-zone">${esc(m.zone || "—")}</span><p>${esc(m.text)}</p>
      <div class="mm-foot"><span>${m.builtin ? "INDICE DE BASE" : new Date(m.date).toLocaleDateString("fr-FR")}</span>${m.src ? `<a href="${esc(m.src)}" target="_blank" rel="noopener">source ↗</a>` : ""}</div></article>`).join("")
    : `<p class="empty">Aucun indice ne correspond.</p>`;
  $$("[data-mdel]").forEach(b => b.onclick = () => { if (confirm("Supprimer cet indice ?")) { memo = memo.filter(m => m.id !== b.dataset.mdel); save("memo", memo); renderMemo(); refreshTraining(); } });
}
$("memoQ").oninput = renderMemo;
$("memoAdd").onclick = () => {
  const text = $("memoText").value.trim(); if (!text) return toast("Décris l'indice");
  const src = $("memoSrc").value.trim();
  memo.unshift({ id: uid(), cat: $("memoCat").value, zone: $("memoZone").value.trim(), text, src: /^https?:\/\//.test(src) ? src : "", date: new Date().toISOString() });
  save("memo", memo); bump(1);
  ["memoZone", "memoText", "memoSrc"].forEach(id => $(id).value = "");
  renderMemo(); refreshTraining(); toast("Indice ajouté au mémo");
};
// Révision espacée (méthode Leitner) : un indice bien su revient de plus en plus tard, un indice raté revient vite
const SR_DAYS = [0, 1, 3, 7, 15, 30];
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return todayKey(d); };
const saveMemo = () => save("memo", memo.map(({ _again, ...x }) => x));
const memoDue = () => memo.filter(m => m.zone && (!m.due || m.due <= todayKey()));
let srQueue = [];
function renderMemoReview() {
  const due = memoDue().length, total = memo.filter(m => m.zone).length;
  $("memoReview").textContent = due ? `Réviser (${due})` : "Réviser";
  if (srQueue.length) return;
  const known = memo.filter(m => (m.box || 0) >= 3).length;
  $("memoReviewBox").innerHTML = `<p class="small">${due ? `<b>${due} indice${due > 1 ? "s" : ""} à réviser aujourd'hui.</b>` : "Rien à réviser aujourd'hui : reviens demain."}</p>
    <p class="small muted">Lis l'indice, devine la zone, retourne la carte et dis honnêtement si tu savais. Les indices sus reviennent dans 1, 3, 7, 15 puis 30 jours ; les ratés reviennent tout de suite.</p>
    <p class="mono small muted">${known}/${total} INDICES BIEN ANCRÉS</p>`;
}
function srNext() {
  const m = srQueue[0];
  if (!m) { renderMemoReview(); return toast("Révision terminée"); }
  $("memoReviewBox").innerHTML = `<div class="flash-card"><div class="mm-head"><span class="mm-cat">${esc(m.cat)}</span><span class="mono small muted">RESTE ${srQueue.length} · BOÎTE ${m.box || 0}/5</span></div>
    <p style="margin-top:10px">${esc(m.text)}</p><div id="flashAns"><button class="btn sm" id="flashFlip">Retourner : quelle zone ?</button></div></div>`;
  $("flashFlip").onclick = () => {
    $("flashAns").innerHTML = `<p class="flash-ans">${esc(m.zone)}</p><div class="row"><button class="btn sm" id="srOk">Je savais ✓</button><button class="btn ghost sm" id="srKo">À revoir ✕</button></div>`;
    $("srOk").onclick = () => { m.box = Math.min(5, (m.box || 0) + 1); m.due = addDays(SR_DAYS[m.box]); srQueue.shift(); saveMemo(); bump(1); srNext(); };
    $("srKo").onclick = () => { m.box = 0; m.due = todayKey(); srQueue.shift(); if (!m._again) { m._again = true; srQueue.push(m); } saveMemo(); srNext(); };
  };
}
$("memoReview").onclick = () => {
  const due = memoDue();
  if (!due.length) return toast("Aucun indice à réviser aujourd'hui");
  srQueue = shuffle(due).slice(0, 20); srQueue.forEach(m => delete m._again); srNext();
};

// --- Historique détaillé des parties intégrées (Street View) et des exercices photo
let playHist = load("playHist", []);
function logPlay(r) { playHist.unshift({ ...r, date: new Date().toISOString() }); playHist = playHist.slice(0, 400); save("playHist", playHist); renderPlayStats(); }
function renderPlayStats() {
  if (!playHist.length) return ($("playStats").innerHTML = `<p class="small muted">Joue une partie intégrée ou un exercice photo : tes erreurs moyennes et les lieux les plus ratés apparaîtront ici.</p>`);
  const km = d => d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(d < 10 ? 1 : 0).replace(".", ",") + " km";
  const grp = (f) => Object.values(playHist.reduce((a, r) => { const k = f(r); (a[k] ||= { k, n: 0, d: 0, p: 0 }); a[k].n++; a[k].d += r.d; a[k].p += r.p; return a; }, {}));
    const byType = grp(r => (r.t === "photo" ? "Photos" : "Street View") + " · " + (PLAY_ZONES[r.zone]?.name || "France"));
  const byPlace = grp(r => r.name).filter(x => x.n >= 1).sort((a, b) => b.d / b.n - a.d / a.n);
  const last10 = playHist.slice(0, 10), prev10 = playHist.slice(10, 20);
  const trend = prev10.length >= 5 ? mean(last10.map(r => r.d)) - mean(prev10.map(r => r.d)) : null;
  $("playStats").innerHTML = `<div class="kpis">
      <div class="kpi"><small>MANCHES</small><b>${playHist.length}</b></div>
      <div class="kpi"><small>ERREUR MOYENNE</small><b>${km(mean(playHist.map(r => r.d)))}</b></div>
      <div class="kpi"><small>POINTS MOYENS</small><b>${fmtNum(mean(playHist.map(r => r.p)))}</b></div>
      <div class="kpi"><small>10 DERNIÈRES</small><b class="${trend == null ? "" : trend <= 0 ? "up" : "down"}">${trend == null ? "—" : (trend <= 0 ? "−" : "+") + km(Math.abs(trend))}</b></div></div>
    <table class="kv">${byType.map(x => `<tr><td>${esc(x.k)}</td><td>${x.n} manche(s) · erreur moyenne ${km(x.d / x.n)}</td></tr>`).join("")}</table>
    <h4 class="mono small">LIEUX LES PLUS RATÉS</h4>
    <ul class="list small">${byPlace.slice(0, 5).map(x => `<li><span class="t">${esc(x.k)}</span><span class="mono">${km(x.d / x.n)}${x.n > 1 ? ` · ×${x.n}` : ""}</span></li>`).join("")}</ul>
    <p class="small muted">Astuce : ajoute au Mémo l'indice qui t'aurait permis de trouver les lieux de cette liste.</p>
    <button class="link-btn small" id="phReset">Effacer cet historique</button>`;
  $("phReset").onclick = () => { if (confirm("Effacer l'historique des parties intégrées et exercices photo ?")) { playHist = []; save("playHist", playHist); renderPlayStats(); } };
}

// --- Exercice photo : vraies images géolocalisées de Wikimedia Commons
const photoEx = (() => {
  let st = null, gmap = null, layer = null, mk = null;
  const SCALE = Object.fromEntries(Object.entries(PLAY_ZONES).map(([k, z]) => [k, z.scale])), pts = (d, z) => Math.round(5000 * Math.exp(-10 * d / SCALE[z]));
  const BAD = /(map|carte|plan|logo|blason|coat[_ ]of[_ ]arms|drawing|diagram|schema|scan|signature|flag|drapeau|\.svg|\.png|\.tif)/i;
  const strip = h => String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  async function fetchPhoto(zone, avoid) {
    const pool = PLAY_ZONES[zone].pool();
    for (let tries = 0; tries < 6; tries++) {
      const [city, lat, lng] = pool[(Math.random() * pool.length) | 0];
      const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=10000&ggslimit=50&ggsnamespace=6&prop=imageinfo|coordinates&iiprop=url|extmetadata|mime|size&iiurlwidth=1400`;
      const r = await (await fetch(url)).json();
      const cands = Object.values(r?.query?.pages || {}).filter(p => {
        const ii = p.imageinfo?.[0];
        return ii && p.coordinates?.[0] && ii.mime === "image/jpeg" && !BAD.test(p.title) && (ii.width || 0) >= 800 && !avoid.has(p.pageid);
      });
      if (cands.length) {
        const p = cands[(Math.random() * cands.length) | 0], ii = p.imageinfo[0], md = ii.extmetadata || {};
        return { id: p.pageid, city, title: p.title.replace(/^File:|^Fichier:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " "),
          lat: p.coordinates[0].lat, lng: p.coordinates[0].lon, img: ii.thumburl || ii.url, page: ii.descriptionurl,
          author: strip(md.Artist?.value) || "auteur inconnu", license: strip(md.LicenseShortName?.value) || "licence libre" };
      }
    }
    throw new Error("Aucune photo trouvée");
  }
  function ensureMap() {
    if (!window.L) { $("peResult").textContent = "Carte indisponible (connexion ?)."; return false; }
    if (!gmap) {
      gmap = L.map("peMap", { attributionControl: false });
      L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png", { maxZoom: 18 }).addTo(gmap);
      layer = L.layerGroup().addTo(gmap);
      gmap.on("click", e => {
        if (!st || st.answered || !st.cur) return;
        if (mk) mk.setLatLng(e.latlng); else mk = L.marker(e.latlng, { icon: pinIcon() }).addTo(layer);
        st.guess = [e.latlng.lat, e.latlng.lng]; $("peGuess").disabled = false;
      });
    }
    setTimeout(() => gmap.invalidateSize(), 60);
    return true;
  }
  async function round() {
    st.answered = false; st.guess = null; st.cur = null; mk = null; layer.clearLayers();
    { const [la, lo, zm] = PLAY_ZONES[st.zone].view; gmap.setView([la, lo], zm); }
    $("peRound").textContent = `PHOTO ${st.i + 1}/5`; $("peScore").textContent = `${fmtNum(st.total)} PTS`;
    $("peResult").textContent = "Clique sur la carte pour placer ta réponse."; $("peGuess").disabled = true; $("peGuess").textContent = "Valider ma réponse";
    $("peImg").removeAttribute("src"); $("peLoad").hidden = false; $("peLoad").textContent = "Chargement d'une photo…";
    try {
      const ph = await fetchPhoto(st.zone, st.seen);
      if (!st) return;
      st.cur = ph; st.seen.add(ph.id);
      $("peImg").onload = () => { $("peLoad").hidden = true; };
      $("peImg").src = ph.img;
    } catch { $("peLoad").textContent = "Impossible de charger une photo (connexion ?). Clique « Autre photo »."; }
  }
  function guess() {
    if (!st) return;
    if (st.answered) return next();
    if (!st.guess || !st.cur) return;
    const c = st.cur, d = gcDist(st.guess, [c.lat, c.lng]), p = pts(d, st.zone);
    st.answered = true; st.total += p; st.res.push({ name: c.title, d, p });
    logPlay({ t: "photo", zone: st.zone, name: c.city, d, p });
    L.marker([c.lat, c.lng], { icon: L.divIcon({ className: "", html: '<div class="pg-true"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(layer);
    L.polyline([st.guess, [c.lat, c.lng]], { color: ACCENT, weight: 2.5, dashArray: "6 5" }).addTo(layer);
    gmap.fitBounds([st.guess, [c.lat, c.lng]], { padding: [30, 30], maxZoom: 13 });
    $("peResult").innerHTML = `<b>${esc(c.title)}</b><br>Près de ${esc(c.city)} · écart ${d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1).replace(".", ",") + " km"} · <b class="pg-pts">+${fmtNum(p)} pts</b>
      <br><span class="muted">Photo : ${esc(trunc(c.author, 60))} · ${esc(c.license)} · <a href="${esc(c.page)}" target="_blank" rel="noopener">voir sur Commons ↗</a></span>`;
    $("peScore").textContent = `${fmtNum(st.total)} PTS`;
    $("peGuess").textContent = st.i < 4 ? "Photo suivante →" : "Voir le résultat →";
    bump(1);
  }
  function next() {
    st.i++;
    if (st.i < 5) return round();
    const total = st.total, z = "Exercice photo — " + PLAY_ZONES[st.zone].name;
    $("peGame").hidden = true; $("peSetup").hidden = false;
    $("peSetup").insertAdjacentHTML("afterbegin", `<div class="play-end" id="peEnd"><div class="qz-score">${fmtNum(total)}<small>/25 000</small></div>
      <ul class="qz-err">${st.res.map(r => `<li>${esc(r.name)} — ${r.d.toFixed(1).replace(".", ",")} km · <b>${fmtNum(r.p)} pts</b></li>`).join("")}</ul>
      <div class="row"><button class="btn" id="peSave">Enregistrer dans mes sessions</button><button class="btn ghost" id="peClose">Fermer</button></div></div>`);
    $("peSave").onclick = () => {
      sessions.unshift({ date: new Date().toLocaleDateString("fr-FR"), ts: new Date().toISOString(), map: z, mode: "No Move", score: total, time: null, note: "Exercice photo (Wikimedia Commons)" });
      save("sessions", sessions); bump(2); $("peEnd").remove(); renderGgMaps(); renderSessions(); refreshTraining(); toast("Exercice enregistré");
    };
    $("peClose").onclick = () => $("peEnd").remove();
    st = null;
  }
  $("peStart").onclick = () => {
    $("peEnd")?.remove();
    st = { zone: $("peZone").value, i: 0, total: 0, res: [], seen: new Set() };
    $("peSetup").hidden = true; $("peGame").hidden = false;
    if (ensureMap()) round();
  };
  $("peGuess").onclick = guess;
  $("peSkip").onclick = () => { if (st && !st.answered) round(); };
  $("peQuit").onclick = () => { st = null; $("peGame").hidden = true; $("peSetup").hidden = false; };
  return {};
})();
onEnter.training = () => { refreshTraining(); renderGgDaily(); renderMemoReview(); renderPlayStats(); if (!quiz) renderQuizList(); if ($("trainTabs").querySelector(".on")?.dataset.ttab === "gg") setTimeout(drawChart, 40); };
