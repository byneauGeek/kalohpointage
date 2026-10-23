/**
 * Service worker minimal pour l'installabilite PWA. Volontairement PRUDENT :
 * ne met jamais en cache /api/*, les requetes non-GET, ou les reponses
 * d'authentification - une donnee de pointage, de session ou d'administration
 * perimee servie depuis le cache serait pire que pas de hors-ligne du tout.
 * Seul le "shell" statique (pages HTML de navigation + assets _next/static
 * fingerprintes) beneficie d'une strategie de cache, pour que le poste de
 * pointage recharge vite et reste utilisable lors d'un reseau instable.
 */
const CACHE_VERSION = "kaloh-v2";
const SHELL_URLS = ["/", "/pointage", "/login", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Jamais intercepter : requetes non-GET, API, donnees d'authentification.
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }

  // Assets statiques Next (noms de fichiers fingerprintes, immuables) :
  // cache d'abord, reseau en secours.
  if (request.url.includes("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const enCache = await cache.match(request);
        if (enCache) return enCache;
        const reponse = await fetch(request);
        if (reponse.ok) cache.put(request, reponse.clone());
        return reponse;
      })
    );
    return;
  }

  // Navigation (pages) : reseau d'abord (toujours les donnees les plus
  // fraiches), cache en secours uniquement si le reseau est indisponible.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((reponse) => {
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, reponse.clone()));
          return reponse;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match("/offline.html")))
    );
  }
});
