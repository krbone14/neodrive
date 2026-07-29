// ============================================================
//  sw.js — service worker : mise en cache pour jouer hors ligne
// ============================================================
const CACHE = 'neodrive-v2';
const ASSETS = [
  './',
  './index.html',
  './jeu.html',
  './style.css',
  './config.js',
  './manifest.webmanifest',
  './pwa.js',
  './js/main.js',
  './js/moteur.js',
  './js/rendu.js',
  './js/carte.js',
  './js/tours.js',
  './js/ennemis.js',
  './js/boss.js',
  './js/vagues.js',
  './js/ui.js',
  './js/etat.js',
  './js/musique.js',
  './js/intro.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

// Installation : on précharge tout
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Activation : on nettoie les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Requêtes : « stale-while-revalidate »
// → on sert vite depuis le cache ET on récupère la nouvelle version en fond
//   (mise à jour automatique au prochain lancement), avec repli hors ligne.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);
    const reseau = fetch(e.request).then(net => {
      if (net && net.status === 200) cache.put(e.request, net.clone());
      return net;
    }).catch(() => null);
    return cached || (await reseau) || cache.match('./index.html');
  })());
});
