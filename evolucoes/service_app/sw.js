/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · SERVICE WORKER (shell offline)
   Protótipo: cache-first do app-shell. O backend real de push e
   sincronização fica para o Claude Code.
   ════════════════════════════════════════════════════════════════ */
const CACHE = 'cex-service-v2';
const SHELL = [
  './index.html', './service.css',
  './data.js', './data-jornada.js',
  './shell.jsx', './screens.jsx', './times.jsx', './escalas.jsx',
  './visitantes.jsx', './membros.jsx', './jornada.jsx', './cursos.jsx',
  './relatorios.jsx', './config.jsx', './mobile.jsx', './app.jsx',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  /* rede primeiro: protótipo vivo sempre atualizado; cache é só o fallback offline */
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});

/* push real exige backend (Claude Code). Mock do handler já no lugar: */
self.addEventListener('push', (e) => {
  let data = { title: 'CE.X Service', body: 'Você tem uma novidade.' };
  try { if (e.data) data = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png',
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => {
    const c = cs.find((x) => 'focus' in x); return c ? c.focus() : self.clients.openWindow('./index.html');
  }));
});
