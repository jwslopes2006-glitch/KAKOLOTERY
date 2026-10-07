const CACHE_NAME = "kakolottery-20261007";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  // Navegação: tenta buscar a versão nova na internet.
  // Sem internet, usa a versão armazenada no cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();

          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put("./index.html", copy))
          );

          return response;
        })
        .catch(() => caches.match("./index.html"))
    );

    return;
  }

  // Só trata arquivos do próprio KAKOLOTERY.
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();

            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy))
            );
          }

          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
