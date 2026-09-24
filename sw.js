// Service worker: sparar alla appens filer på enheten, så MiniSchack fungerar utan internet.
//
// VERSION byts automatiskt mot commitens id när appen publiceras (se deploy.yml).
// När den ändras hämtar iPhonen/iPaden alla filer på nytt, på en gång.
const VERSION = 'v1';
const CACHE = `minischack-${VERSION}`;

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/storage.js',
  'js/chess/rules.js',
  'js/chess/ai.js',
  'js/chess/ai-worker.js',
  'js/ui/board.js',
  'js/ui/computer.js',
  'js/ui/game.js',
  'js/ui/icons.js',
  'js/ui/learn.js',
  'js/ui/lesson-data.js',
  'js/ui/lessons.js',
  'js/ui/pieces.js',
  'js/ui/popup.js',
  'js/ui/settings.js',
  'js/ui/sound.js',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // cache: 'reload' hoppar över webbläsarens vanliga cache, så vi garanterat får de nya filerna
    await cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('minischack-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

// På datorn (localhost) vill vi se ändringar direkt: hämta från nätet först.
const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Svara från den sparade kopian först; bara det som saknas hämtas från nätet
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    if (DEV) {
      // 'reload' = hämta alltid från servern och skriv över webbläsarens gamla kopia
      try { return await fetch(event.request, { cache: 'reload' }); } catch { /* servern nere – ta kopian */ }
    }
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch {
      // Offline och filen finns inte sparad: visa startsidan om det var en sidladdning
      if (event.request.mode === 'navigate') return caches.match('index.html');
      throw new Error('offline');
    }
  })());
});
