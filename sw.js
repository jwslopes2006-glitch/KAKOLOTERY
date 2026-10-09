const CACHE_NAME = "kakolottery-v3-20261009-alinhamento";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./kakolottery-resumo-template.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Instala e armazena os arquivos necessários para abrir o app.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Ativa a nova versão e limpa apenas caches antigos do KAKOLOTERY.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("kakolottery-") &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Busca a versão mais recente e usa o cache quando estiver offline.
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          await cache.put(request, response.clone());

          // Mantém o index.html disponível para abertura offline.
          if (request.mode === "navigate") {
            const indexURL = new URL(
              "./index.html",
              self.registration.scope
            ).href;

            await cache.put(indexURL, response.clone());
          }
        }

        return response;
      } catch (error) {
        const cached = await cache.match(request);

        if (cached) return cached;

        if (request.mode === "navigate") {
          const indexURL = new URL(
            "./index.html",
            self.registration.scope
          ).href;

          const offlinePage = await cache.match(indexURL);

          if (offlinePage) return offlinePage;
        }

        return Response.error();
      }
    })()
  );
});
