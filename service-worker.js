const CACHE_NAME = 'test-permanencia-v12'; // Nueva versión para forzar la actualización.
// Lista de archivos para cachear en la instalación.
const urlsToCache = [
  '.', // Representa la raíz del directorio actual
  'index.html',
  'style.css',
  'app.js',
  'state.js', // Añadido tras la refactorización
  'ui.js',    // Añadido tras la refactorización
  'manifest.json',
  'preguntas_imprescindibles.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'sounds/correct.mp3',
  'sounds/incorrect.mp3'
];

// Evento 'install': se dispara cuando el service worker se instala.
self.addEventListener('install', event => {
  console.log('Instalando nuevo Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché abierta. Cacheando archivos de la aplicación...');
        return cache.addAll(urlsToCache);
      })
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
      )
      // Tomar control de los clientes (páginas) abiertos inmediatamente.
      .then(() => self.clients.claim())
    })
  );
});

// Evento 'fetch': se dispara cada vez que la página pide un recurso (CSS, JS, imagen, etc.).
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Estrategia "Stale-While-Revalidate" para el HTML, CSS, JS y los JSON de preguntas.
  // Sirve desde la caché para velocidad, pero actualiza en segundo plano.
  if (url.origin === self.location.origin && (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.json'))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            // Si la petición a la red tiene éxito, actualizamos la caché.
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });

          // Devolvemos la respuesta de la caché si existe, si no, esperamos a la red.
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    // Estrategia "Cache First" para otros recursos (imágenes, fuentes, etc.).
    // Si está en caché, se sirve. Si no, se busca en la red y se cachea para la próxima vez.
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
});

// Evento 'message': escucha mensajes desde el cliente (la página web).
self.addEventListener('message', event => {
  // Si el mensaje es para saltar la espera, el nuevo SW se activa inmediatamente.
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Evento 'periodicsync': para actualizaciones periódicas en segundo plano.
self.addEventListener('periodicsync', event => {
  // Comprueba si la etiqueta de sincronización es la que nos interesa.
  if (event.tag === 'get-latest-questions') {
    console.log('Ejecutando sincronización periódica de preguntas...');
    // waitUntil para asegurar que el SW no se termine antes de que acabe el fetch.
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        // La estrategia Stale-While-Revalidate se encargará de actualizar la caché
        // si hay una nueva versión disponible en la red.
        return Promise.all([
          fetch(new Request('preguntas.json', { cache: 'no-store' })),
          fetch(new Request('preguntas_imprescindibles.json', { cache: 'no-store' })),
          fetch(new Request('examen_2022.json', { cache: 'no-store' })),
          fetch(new Request('examen_2024.json', { cache: 'no-store' }))
        ]);
      })
    );
  }
});
