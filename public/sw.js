// TC Work Zone Locator - Service Worker for Offline Support
const CACHE_NAME = 'tc-workzone-v1';
const OFFLINE_CACHE = 'tc-workzone-offline-v1';

// App shell - core files needed for app to work
const APP_SHELL = [
  '/',
  '/library',
  '/library/registry.json',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    }).then(() => {
      console.log('[SW] App shell cached successfully');
      return self.skipWaiting();
    })
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for fonts, etc.)
  if (url.origin !== location.origin) {
    return;
  }

  // For navigation requests (HTML pages) - network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }

  // For library files (PDFs) - check offline cache first
  if (url.pathname.startsWith('/library/')) {
    event.respondWith(
      caches.open(OFFLINE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from offline cache:', url.pathname);
            return cachedResponse;
          }
          // Not in offline cache, fetch from network
          return fetch(request);
        });
      })
    );
    return;
  }

  // For other requests - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok && url.pathname.startsWith('/_next/static/')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_DOCUMENT') {
    const { url, documentId } = event.data;
    cacheDocument(url, documentId);
  }
  
  if (event.data.type === 'UNCACHE_DOCUMENT') {
    const { url, documentId } = event.data;
    uncacheDocument(url, documentId);
  }
});

// Cache a document for offline use
async function cacheDocument(url, documentId) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log('[SW] Cached document:', documentId);
      // Notify all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'DOCUMENT_CACHED',
          documentId,
          success: true
        });
      });
    }
  } catch (error) {
    console.error('[SW] Failed to cache document:', documentId, error);
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DOCUMENT_CACHED',
        documentId,
        success: false,
        error: error.message
      });
    });
  }
}

// Remove a document from offline cache
async function uncacheDocument(url, documentId) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.delete(url);
    console.log('[SW] Removed document from cache:', documentId);
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DOCUMENT_UNCACHED',
        documentId,
        success: true
      });
    });
  } catch (error) {
    console.error('[SW] Failed to uncache document:', documentId, error);
  }
}
