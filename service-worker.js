const CACHE_NAME = 'test-permanencia-v10'; // Nueva versión para forzar la actualización.
// Lista de archivos para cachear en la instalación.
const urlsToCache = [
  '.', // Representa la raíz del directorio actual
  'index.html',
  'style.css',
  'app.js',
  'state.js', // Añadido tras la refactorización
  'ui.js',    // Añadido tras la refactorización
  'preguntas.json', // Añadir para asegurar que el primer test normal funcione offline
  'examen_2024.json',
  'examen_2022.json',
  'manifest.json',
  'preguntas_imprescindibles.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Evento 'install': se dispara cuando el service worker se instala.
self.addEventListener('install', event => {
  console.log('Instalando nuevo Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché abierta. Cacheando archivos de la aplicación...');
        // Estrategia de actualización proactiva para los archivos de preguntas.
        // Se intentan obtener de la red y si falla, no se cachean en la instalación.
        const questionFiles = [
          'preguntas.json',
          'preguntas_imprescindibles.json',
          'examen_2022.json',
          'examen_2024.json'
        ].map(url => fetch(new Request(url, { cache: 'reload' }))); // 'reload' para asegurar que se va a la red.
        return Promise.all([...urlsToCache.map(url => cache.add(url)), ...questionFiles.map(req => req.then(res => cache.put(res.url, res)))]);
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
  // Estrategia "Cache First" para todos los recursos.
  // La actualización de los archivos de preguntas se maneja en 'install' y 'periodicsync'.
  // Esto hace que la carga de la app sea instantánea cuando está offline.
  event.respondWith(
    caches.match(event.request).then(response => {
      // Si está en caché, lo devolvemos. Si no, vamos a la red.
      return response || fetch(event.request).then(networkResponse => {
        // Opcional: Cachear nuevos recursos que no estaban en la lista inicial
        return caches.open(CACHE_NAME).then(cache => {
          const url = new URL(event.request.url);
          // Solo cacheamos peticiones GET exitosas y válidas con protocolo http/https
          if (event.request.method === 'GET' && networkResponse.status === 200 && url.protocol.startsWith('http')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      });
    }).catch(error => {
      console.error('Fetch fallido; ni en caché ni en red:', error);
      // Aquí se podría devolver una página de fallback si se desea.
    })
  );
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
          fetch('preguntas_imprescindibles.json'),
          fetch('examen_2022.json'),
          fetch('examen_2024.json')
        ]);
      })
    );
  }
});
