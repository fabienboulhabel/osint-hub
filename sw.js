// Service worker : l'application s'ouvre même hors ligne (cartes et bibliothèques nécessitent Internet)
const CACHE = "osint-hub-v4"; // ← incrémente ce numéro à chaque mise à jour publiée
const FILES = ["./", "index.html", "styles.css", "app.js", "manifest.json", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  // Réseau d'abord (toujours la dernière version), cache si hors ligne
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
