const CACHE_NAME = 'test-permanencia-v5'; // Cambia la versión si actualizas los archivos
// Lista de archivos para cachear en la instalación.
const urlsToCache = [
  '.', // Representa la raíz del directorio actual
  'index.html',
  'style.css',
  'app.js',
  'preguntas.json', // Añadir para asegurar que el primer test normal funcione offline
  'manifest.json',
  'preguntas_imprescindibles.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Evento 'install': se dispara cuando el service worker se instala.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      // Ya no llamamos a self.skipWaiting() aquí para dar control al usuario.
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
    const url = new URL(event.request.url);

    // Estrategia "Network First" para preguntas.json
    if (url.pathname.endsWith('.json')) {
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
                    // Solo cacheamos peticiones GET exitosas y válidas
                    if (event.request.method === 'GET' && networkResponse.status === 200) {
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
        // Intentamos descargar los archivos de preguntas más recientes.
        // La estrategia Network-First de nuestro 'fetch' se encargará de actualizar la caché.
        return Promise.all([
          fetch('preguntas.json'),
          fetch('preguntas_imprescindibles.json')
        ]);
      })
    );
  }
});
