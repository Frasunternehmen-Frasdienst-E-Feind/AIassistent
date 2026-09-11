/* Service Worker: App-Shell offline verfügbar, API-Daten network-first mit Cache-Fallback.
   Schreibende Anfragen (POST/PUT/DELETE) werden nie gecacht oder offline gepuffert. */
const CACHE_VERSION = "fm-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const API_CACHE = `${CACHE_VERSION}-api`;
const SHELL = [
  "/",
  "/static/style.css",
  "/static/app.js",
  "/manifest.webmanifest",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
  "/static/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const offlineResponse = () =>
  new Response(JSON.stringify({ detail: "Offline – keine Verbindung zum Server" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // Schreiben immer direkt zum Server
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API: Netz zuerst, bei Fehler letzter bekannter Stand, sonst Offline-Antwort
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/export/")) return; // Downloads nicht cachen
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(API_CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || offlineResponse()))
    );
    return;
  }

  // Navigation: Netz, Fallback auf die gecachte Startseite
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  // App-Shell und statische Dateien: Cache zuerst, im Hintergrund aktualisieren
  event.respondWith(
    caches.match(request).then((hit) => {
      const update = fetch(request)
        .then((res) => {
          if (res.ok) caches.open(SHELL_CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || update;
    })
  );
});
