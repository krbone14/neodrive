// ============================================================
//  sw.js — service worker : mise en cache pour jouer hors ligne
// ============================================================
const CACHE = 'neodrive-v1';
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

// Requêtes : cache d'abord, puis réseau (et on met en cache au passage)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(rep => rep || fetch(e.request).then(net => {
      const copie = net.clone();
      caches.open(CACHE).then(c => c.put(e.request, copie)).catch(() => {});
      return net;
    }).catch(() => caches.match('./index.html')))
  );
});
