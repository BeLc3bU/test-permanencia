const CACHE_NAME = 'test-permanencia-v15'; // Nueva versión para forzar la actualización.
// Lista de archivos para cachear en la instalación.
const urlsToCache = [
  '.', // Representa la raíz del directorio actual
  'index.html',
  'style.css',
  'app.js',
  'state.js', // Añadido tras la refactorización
  'ui.js',    // Añadido tras la refactorización
  'manifest.json',
  'examen_2022.json',
  'examen_2024.json',
  'examen_2025ET.json',
  'simulacro_1.json',
  'simulacro_2.json',
  'simulacro_3.json',
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

  // Solo procesar peticiones GET y que sean HTTP/HTTPS.
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Estrategia Stale-While-Revalidate para todos los recursos cacheados.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Devolver desde la caché si está disponible.
      const cachedResponse = await cache.match(request);
      
      // 2. En paralelo, ir a la red para actualizar la caché.
      const fetchPromise = fetch(request).then(networkResponse => {
        // Solo cachear respuestas válidas y completas (status 200).
        // Esto evita errores con respuestas parciales (206) o de otro tipo.
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        // Si la red falla, no hacemos nada, el usuario seguirá viendo la versión en caché si existe.
        console.warn(`La petición a la red para ${request.url} ha fallado.`, err);
        // Si la red falla y no hay nada en caché, el error se propagará.
        // Si hay algo en caché, ya se ha devuelto, por lo que este error no afecta al usuario.
      });

      // Devolver la respuesta de caché si existe; si no, esperar a la respuesta de red.
      return cachedResponse || fetchPromise;
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
        // La estrategia Stale-While-Revalidate se encargará de actualizar la caché
        // si hay una nueva versión disponible en la red.
        return Promise.all([
          fetch(new Request('preguntas.json', { cache: 'no-store' })),
          fetch(new Request('examen_2022.json', { cache: 'no-store' })),
          fetch(new Request('examen_2024.json', { cache: 'no-store' })),
          fetch(new Request('examen_2025ET.json', { cache: 'no-store' })),
          fetch(new Request('simulacro_1.json', { cache: 'no-store' })),
          fetch(new Request('simulacro_2.json', { cache: 'no-store' })),
          fetch(new Request('simulacro_3.json', { cache: 'no-store' }))
        ]);
      })
    );
  }
});
