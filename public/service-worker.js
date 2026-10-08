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
      data: { url: data.url || "/service" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

/* o toque abre o endereço que veio no aviso (com ?aviso=<categoria>, que o
   app usa para medir notification_opened); sem endereço, o app */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/service";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing && "navigate" in existing) return existing.navigate(url).then((c) => (c || existing).focus());
      return existing ? existing.focus() : self.clients.openWindow(url);
    }),
  );
});
