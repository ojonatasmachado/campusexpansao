/* CE.X Service · service worker
   Escopo: /service/**. Cuida de push notifications e do prompt de instalação.
   Não faz cache-first de rotas do Next (arriscaria servir HTML desatualizado);
   só existe pra viabilizar push + "adicionar à tela inicial". */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* Bíblia (public/bible/*.json) : texto estático, nunca muda depois de
   publicado, então é seguro cache-first — baixa uma vez e o membro lê
   offline depois disso, sem gastar dado nem esperar rede. */
const BIBLE_CACHE = "cex-service-bible-v1";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/bible/")) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "CE.X Service", body: "Você tem uma novidade." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    /* payload não é JSON, mantém o fallback */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      return existing ? existing.focus() : self.clients.openWindow("/service");
    }),
  );
});
