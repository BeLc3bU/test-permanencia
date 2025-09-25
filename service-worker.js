const CACHE_NAME = 'test-permanencia-v2'; // Cambia la versión si actualizas los archivos
// Lista de archivos para cachear en la instalación.
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
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
    const url = new URL(event.request.url);

    // Estrategia "Network First" para preguntas.json
    if (url.pathname.endsWith('/preguntas.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request)
                    .then(networkResponse => {
                        // Si la petición a la red tiene éxito, actualizamos la caché
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    })
                    .catch(() => {
                        // Si la red falla, solo intentamos devolver desde la caché si es una petición GET.
                        if (event.request.method === 'GET') {
                            return cache.match(event.request);
                        }
                        // Para otros métodos (POST, etc.), simplemente dejamos que el fallo de red ocurra.
                    });
            })
        );
    } else {
        // Estrategia "Cache First" para el resto de los archivos
        event.respondWith(
            caches.match(event.request).then(response => {
                // Si está en caché, lo devolvemos. Si no, vamos a la red.
                return response || fetch(event.request).then(networkResponse => {
                    // Opcional: Cachear nuevos recursos que no estaban en la lista inicial
                    // Esto es útil si añades nuevas imágenes o archivos sin actualizar el SW
                    return caches.open(CACHE_NAME).then(cache => {
                        // Solo cacheamos respuestas válidas
                        if (networkResponse.status === 200) {
                           cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            }).catch(error => {
                // En caso de que falle la red y el recurso no esté en caché,
                // se puede devolver una página de fallback o simplemente dejar que el error ocurra.
                console.error('Fetch fallido; ni en caché ni en red:', error);
            })
        );
    }
});
