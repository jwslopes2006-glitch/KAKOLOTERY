const CACHE_NAME = "kakolottery-v20-stable";

const CORE_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

const OPTIONAL_ASSETS = [
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/kakolottery-resumo-volei.png",
  "./assets/kakolottery-resumo-futebol.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A missing optional image/icon must not break installation of the app shell.
    await cache.addAll(CORE_SHELL);
    await Promise.allSettled(OPTIONAL_ASSETS.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("kakolottery-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy)).catch(() => {});
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match("./index.html");
        if (cached) return cached;
        return new Response("KAKOLOTERY offline: abra o aplicativo uma vez conectado à internet.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      })
    );
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    } catch (error) {
      return new Response("Recurso indisponível offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
