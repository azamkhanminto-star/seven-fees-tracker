/* Offline cache for Seven Fees Tracker.
   Bump CACHE when any shell file changes. */
var CACHE = 'seven-fees-v1';
var SHELL = [
  './',
  './index.html',
  './assets/styles.css',
  './assets/app.js',
  './assets/icon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

/* Network first, so an updated app is picked up as soon as the
   device is online; the cache is the offline fallback. */
self.addEventListener('fetch', function (ev) {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    fetch(ev.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(ev.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(ev.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
