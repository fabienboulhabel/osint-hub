/* OSINT Hub — 00-base.js · chargé en premier
   1. Bandeau d'erreur : toute erreur JavaScript s'affiche avec un bouton « Copier »
   2. Base IndexedDB : stockage des images des fiches et du dossier de sauvegarde
   3. État de la connexion : badge « HORS LIGNE » et avertissements par module */

/* ---------- 1. BANDEAU D'ERREUR ---------- */
(() => {
  const seen = new Set();
  function show(msg, src) {
    const key = msg + src;
    if (seen.has(key)) return;
    seen.add(key);
    let bar = document.getElementById("errBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "errBar"; bar.className = "err-bar"; bar.setAttribute("role", "alert");
      bar.innerHTML = `<div class="err-in"><b>Un problème est survenu.</b> <span>Copie le message et envoie-le pour qu'il soit corrigé.</span>
        <pre id="errTxt"></pre><div class="err-act"><button id="errCopy">Copier le message</button><button id="errClose">Fermer</button></div></div>`;
      (document.body || document.documentElement).appendChild(bar);
      bar.querySelector("#errClose").onclick = () => { bar.remove(); seen.clear(); };
      bar.querySelector("#errCopy").onclick = () => {
        const txt = `OSINT Hub ${typeof VERSION !== "undefined" ? VERSION : "?"} · ${navigator.userAgent}\nPage : ${location.hash || "#home"}\n\n${bar.querySelector("#errTxt").textContent}`;
        navigator.clipboard?.writeText(txt).then(() => { bar.querySelector("#errCopy").textContent = "Copié ✓"; });
      };
    }
    const pre = bar.querySelector("#errTxt");
    pre.textContent = (pre.textContent ? pre.textContent + "\n\n" : "") + `${msg}${src ? "\n  → " + src : ""}`;
  }
  addEventListener("error", e => {
    if (e.target && e.target !== window) return; // ressources externes (images, cartes) : ignorées
    const file = (e.filename || "").split("/").pop();
    show(e.message || "Erreur inconnue", file ? `${file}, ligne ${e.lineno}` : "");
  }, true);
  addEventListener("unhandledrejection", e => {
    const r = e.reason;
    if (r && (r.name === "AbortError" || r.name === "NotAllowedError")) return; // annulations volontaires
    show(r?.message || String(r || "Promesse rejetée"), r?.stack?.split("\n")[1]?.trim() || "");
  });
  window.reportError = (msg, src) => show(msg, src || "");
})();

/* ---------- 2. INDEXEDDB (images des fiches, dossier de sauvegarde) ---------- */
const idb = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error("IndexedDB indisponible"));
    const r = indexedDB.open("osint-hub", 1);
    r.onupgradeneeded = () => { const db = r.result; db.createObjectStore("images"); db.createObjectStore("kv"); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode), s = t.objectStore(store), out = fn(s);
      t.oncomplete = () => res(out && "result" in out ? out.result : undefined);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (store, key) => tx(store, "readonly", s => s.get(key)),
    set: (store, key, val) => tx(store, "readwrite", s => s.put(val, key)),
    del: (store, key) => tx(store, "readwrite", s => s.delete(key)),
    keys: store => tx(store, "readonly", s => s.getAllKeys()),
    clear: store => tx(store, "readwrite", s => s.clear())
  };
})();

/* ---------- 3. ÉTAT DE LA CONNEXION ---------- */
const net = {
  online: () => navigator.onLine !== false,
  // Vrai si une bibliothèque externe (Leaflet, SunCalc, exifr) n'a pas pu être chargée
  missing: () => ["L", "SunCalc", "exifr"].filter(k => !window[k])
};
function refreshNetState() {
  const off = !net.online(), miss = net.missing();
  document.body.classList.toggle("is-offline", off);
  const badge = document.getElementById("netBadge");
  if (badge) {
    badge.hidden = !off && !miss.length;
    badge.textContent = off ? "⚠ HORS LIGNE" : "⚠ LIMITÉ";
    badge.title = off
      ? "Pas de connexion : la carte, les altitudes, la recherche de lieux et les exercices en ligne sont indisponibles. Tes données restent accessibles."
      : `Certaines bibliothèques n'ont pas pu être chargées (${miss.join(", ")}). Recharge la page une fois la connexion rétablie.`;
  }
  document.querySelectorAll("[data-needs-net]").forEach(el => el.hidden = !off && !miss.length);
}
addEventListener("online", () => { refreshNetState(); if (typeof toast === "function") toast("Connexion rétablie"); });
addEventListener("offline", () => { refreshNetState(); if (typeof toast === "function") toast("Connexion perdue : mode hors ligne"); });
