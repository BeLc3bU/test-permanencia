const CACHE_NAME = 'test-permanencia-v2'; // Cambia la versión si actualizas los archivos
// Lista de archivos para cachear en la instalación.
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/preguntas.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Evento 'install': se dispara cuando el service worker se instala.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Fuerza al nuevo SW a activarse inmediatamente
  );
});

// Evento 'activate': se dispara cuando el nuevo service worker se activa.
// Es el lugar ideal para limpiar cachés antiguas.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si la caché no está en nuestra lista blanca, la eliminamos.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento 'fetch': se dispara cada vez que la página pide un recurso (CSS, JS, imagen, etc.).
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en la caché, lo devolvemos desde ahí.
        if (response) {
          return response;
        }
        // Si no, hacemos la petición a la red, la devolvemos y la guardamos en caché para la próxima vez.
        return fetch(event.request).then(
          networkResponse => {
            // Comprobamos si recibimos una respuesta válida
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});
