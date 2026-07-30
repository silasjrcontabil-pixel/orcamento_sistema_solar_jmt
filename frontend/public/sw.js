// Service worker simples: cache "app shell" (assets estáticos) com estratégia
// stale-while-revalidate, e network-first para navegação (documentos HTML).
// Nunca intercepta chamadas para /api/* — essas sempre vão direto para a rede.

const CACHE_VERSION = 'jmt-solar-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('jmt-solar-') && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca cachear chamadas de API — sempre precisam de dados frescos/autenticados.
  if (url.pathname.startsWith('/api')) return;

  // Navegação (troca de rota / refresh): network-first, cai para cache/app-shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then((res) => res || caches.match(request))),
    );
    return;
  }

  // Assets estáticos (mesmo domínio): stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          return cached || networkFetch;
        }),
      ),
    );
  }
});
