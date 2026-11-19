// Punktlandung – Service Worker: Offline-Start und Mitteilungen.
const CACHE = 'punktlandung-v14';
const SHELL = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './favicon.svg',
  './js/app.js',
  './js/lib.js',
  './js/ui.js',
  './js/views.js',
  './js/demo.js',
  './js/grades.js',
  './fonts/bricolagegrotesque.woff2',
  './fonts/geist.woff2',
  './fonts/geistmono.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/badge-96.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// App-Dateien: sofort aus dem Speicher, im Hintergrund aktualisieren. Server-Anfragen gehen direkt raus.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? './index.html' : req;
    const hit = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) {
      e.waitUntil(net);
      return hit;
    }
    return (await net) || new Response('Offline', { status: 503 });
  })());
});

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { title: 'Punktlandung', body: e.data ? e.data.text() : '' };
  }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'Punktlandung', {
      body: d.body || '',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      timestamp: d.ts || Date.now(),
      data: { url: d.url || './' },
      lang: 'de',
    });
    if (typeof d.badge === 'number' && self.navigator.setAppBadge) {
      try {
        if (d.badge > 0) await self.navigator.setAppBadge(d.badge);
        else await self.navigator.clearAppBadge();
      } catch { /* egal */ }
    }
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) w.postMessage({ type: 'push', kind: d.kind });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        w.postMessage({ type: 'open', url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
