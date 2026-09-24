// Cache dell'app per l'uso offline. Aumenta VERSION a ogni aggiornamento dei file.
const VERSION = 'av-amb-v3';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'pdfgen.js',
  'js/core.js', 'js/capture.js', 'js/dda.js', 'js/radon.js', 'js/app.js',
  'vendor/preact.min.umd.js', 'vendor/hooks.umd.js', 'vendor/htm.umd.js', 'vendor/pdf-lib.min.js',
  'vendor/jszip.min.js', 'vendor/signature_pad.umd.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'README.md',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
