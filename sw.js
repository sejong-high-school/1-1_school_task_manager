self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-shell-v1').then((cache) => cache.addAll([
      '/',
      '/index.html',
      '/app.css',
      '/app.js',
      '/manifest.webmanifest'
    ]))
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Network first for gateway calls; cache first for app shell
  if (req.url.includes('/?') || req.method === 'POST') {
    return; // let network handle
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open('app-shell-v1').then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});

