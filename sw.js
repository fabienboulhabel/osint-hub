// Service worker : l'application s'ouvre même hors ligne
// (la carte, les polices, les bibliothèques externes et les exercices en ligne nécessitent Internet)
const CACHE = "osint-hub-v11"; // ← incrémente ce numéro à chaque mise à jour publiée
const JS = ["00-base", "01-config", "02-navigation", "03-decor", "04-accueil", "05-chrono", "06-recherche", "07-carte", "08-photo",
  "09-entrainement", "10-enquetes", "11-sauvegarde", "12-tableau-de-bord", "13-parametres", "14-palette", "15-visite", "16-demarrage"].map(n => `js/${n}.js`);
const FILES = ["./", "index.html", "404.html", "styles.css", "data.js", "world.js", "land.js", "legal.js", "manifest.json",
  "CONDITIONS_UTILISATION.md", "CONFIDENTIALITE.md", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon.svg", ...JS];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // Réseau d'abord (toujours la dernière version), cache en secours hors ligne
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
