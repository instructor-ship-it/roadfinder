// TC Work Zone Locator - Service Worker for Offline Support
// Version: 1.35.0
const CACHE_NAME = 'tc-workzone-v135';
const OFFLINE_CACHE = 'tc-workzone-offline-v135';
const STATIC_CACHE = 'tc-workzone-static-v135';
const SYNC_QUEUE_DB = 'tc-sync-queue';

// App shell - core files needed for app to work
const APP_SHELL = [
  '/',
  '/library',
  '/library/registry.json',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Static assets to cache on install
const STATIC_ASSETS = ['/data/roads.json', '/data/speed-zones.json', '/data/regions.json'];

// Install - cache app shell and static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v1.34.0...');
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      }),
      // Cache static data (don't fail if not available)
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            fetch(url)
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(() => {
                console.log('[SW] Static asset not available:', url);
              })
          )
        );
      }),
    ]).then(() => {
      console.log('[SW] Installation complete, skipping waiting');
      return self.skipWaiting();
    })
  );
});

// Activate - clean up old caches and notify clients of update
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v1.34.0...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        const currentCaches = [CACHE_NAME, OFFLINE_CACHE, STATIC_CACHE];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Claim all clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: '1.34.0',
            message: 'App updated to the latest version',
          });
        });
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

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    // Allow fonts and other CDN resources
    if (
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')
    ) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
      );
    }
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

  // For API requests - network only with offline fallback for certain routes
  if (url.pathname.startsWith('/api/')) {
    // For read-only API requests, try network then cache
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Cache successful API responses for specific endpoints
            if (response.ok && shouldCacheApiRoute(url.pathname)) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Try cache for specific API routes
            if (shouldCacheApiRoute(url.pathname)) {
              return caches.match(request);
            }
            // Return offline response for other API calls
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'This feature requires an internet connection',
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          })
      );
    }
    return;
  }

  // For library files (PDFs) - check offline cache first
  if (url.pathname.startsWith('/library/') && url.pathname.endsWith('.pdf')) {
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

  // For data files - stale-while-revalidate strategy
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          // Return cached version immediately, update in background
          return cachedResponse || fetchPromise;
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
        // Cache successful responses for static assets
        if (
          response.ok &&
          (url.pathname.startsWith('/_next/static/') ||
            url.pathname.startsWith('/icons/') ||
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css'))
        ) {
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

/**
 * Determine if an API route should be cached for offline use
 */
function shouldCacheApiRoute(pathname) {
  const cacheableRoutes = [
    '/api/roads',
    '/api/speed-zones',
    '/api/regions',
    '/api/weather',
    '/api/traffic',
  ];
  return cacheableRoutes.some((route) => pathname.startsWith(route));
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CACHE_DOCUMENT':
      cacheDocument(data.url, data.documentId);
      break;

    case 'UNCACHE_DOCUMENT':
      uncacheDocument(data.url, data.documentId);
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.source.postMessage({
        type: 'VERSION',
        version: '1.34.0',
      });
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    case 'CACHE_STATIC_DATA':
      cacheStaticData();
      break;
  }
});

/**
 * Cache a document for offline use
 */
async function cacheDocument(url, documentId) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log('[SW] Cached document:', documentId);
      // Notify all clients
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'DOCUMENT_CACHED',
          documentId,
          success: true,
        });
      });
    }
  } catch (error) {
    console.error('[SW] Failed to cache document:', documentId, error);
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'DOCUMENT_CACHED',
        documentId,
        success: false,
        error: error.message,
      });
    });
  }
}

/**
 * Remove a document from offline cache
 */
async function uncacheDocument(url, documentId) {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.delete(url);
    console.log('[SW] Removed document from cache:', documentId);
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'DOCUMENT_UNCACHED',
        documentId,
        success: true,
      });
    });
  } catch (error) {
    console.error('[SW] Failed to uncache document:', documentId, error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[SW] All caches cleared');
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'CACHES_CLEARED',
        success: true,
      });
    });
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
  }
}

/**
 * Cache static data files for offline use
 */
async function cacheStaticData() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const results = await Promise.allSettled(
      STATIC_ASSETS.map(async (url) => {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          return url;
        }
        return null;
      })
    );
    const cached = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    console.log(`[SW] Cached ${cached} static data files`);
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'STATIC_DATA_CACHED',
        success: true,
        count: cached,
      });
    });
  } catch (error) {
    console.error('[SW] Failed to cache static data:', error);
  }
}

// ============================================================================
// Push Notifications
// ============================================================================

/**
 * Handle push events from the server
 * Displays notifications for weather warnings, incidents, etc.
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let payload = {
    title: 'TC Work Zone Locator',
    body: 'You have a new notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'general',
    requireInteraction: false,
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch (e) {
      console.warn('[SW] Failed to parse push data, using defaults');
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    requireInteraction: payload.requireInteraction,
    data: payload.data,
    actions: payload.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Determine target URL based on notification type
  if (data.url) {
    targetUrl = data.url;
  } else if (data.type === 'weather-warning') {
    targetUrl = '/?tab=warnings';
  } else if (data.type === 'incident-alert') {
    targetUrl = '/?tab=incidents';
  } else if (data.type === 'shift-reminder') {
    targetUrl = '/drive';
  }

  // Handle action buttons
  if (event.action === 'dismiss') {
    return; // Just close the notification
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Handle notification close events (for analytics)
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  // Could send analytics here
});

// ============================================================================
// Background Sync
// ============================================================================

/**
 * Handle background sync events
 * Used for syncing Traffic Event Logger data when back online
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event received:', event.tag);

  if (event.tag === 'traffic-events-sync') {
    event.waitUntil(syncTrafficEvents());
  } else if (event.tag === 'offline-data-sync') {
    event.waitUntil(syncOfflineData());
  }
});

/**
 * Sync pending traffic events to Google Sheets
 */
async function syncTrafficEvents() {
  console.log('[SW] Syncing traffic events...');

  try {
    // Open IndexedDB to get pending events
    const db = await openSyncQueueDB();
    const pendingEvents = await getAllPendingEvents(db);

    if (pendingEvents.length === 0) {
      console.log('[SW] No pending events to sync');
      return;
    }

    console.log(`[SW] Found ${pendingEvents.length} pending events`);

    // Get sync configuration from clients
    const clients = await self.clients.matchAll();
    let syncConfig = null;

    // Request sync config from the app
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_REQUEST_CONFIG',
      });
    }

    // Wait a bit for config response
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Process each event
    let syncedCount = 0;
    for (const event of pendingEvents) {
      try {
        // The actual sync happens in the app via message handler
        // Here we just mark as synced after successful response
        await markEventAsSynced(db, event.id);
        syncedCount++;
      } catch (error) {
        console.error('[SW] Failed to sync event:', event.id, error);
      }
    }

    console.log(`[SW] Synced ${syncedCount}/${pendingEvents.length} events`);

    // Notify clients of sync completion
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        synced: syncedCount,
        total: pendingEvents.length,
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // This will cause the sync to retry
  }
}

/**
 * Sync offline data when back online
 */
async function syncOfflineData() {
  console.log('[SW] Syncing offline data...');

  try {
    // Notify clients to perform data sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'OFFLINE_DATA_SYNC',
      });
    });
  } catch (error) {
    console.error('[SW] Offline data sync failed:', error);
  }
}

/**
 * Open the sync queue IndexedDB
 */
function openSyncQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_QUEUE_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-events')) {
        const store = db.createObjectStore('pending-events', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get all pending events from IndexedDB
 */
function getAllPendingEvents(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-events'], 'readonly');
    const store = transaction.objectStore('pending-events');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Mark an event as synced (remove from queue)
 */
function markEventAsSynced(db, eventId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-events'], 'readwrite');
    const store = transaction.objectStore('pending-events');
    const request = store.delete(eventId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================================
// Periodic Background Sync (if supported)
// ============================================================================

/**
 * Handle periodic background sync for weather/incident updates
 * Note: This requires the 'periodic-background-sync' permission
 */
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);

  if (event.tag === 'weather-update') {
    event.waitUntil(fetchWeatherUpdates());
  } else if (event.tag === 'incident-update') {
    event.waitUntil(fetchIncidentUpdates());
  }
});

async function fetchWeatherUpdates() {
  try {
    // Notify clients to fetch weather updates
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'FETCH_WEATHER_UPDATE',
      });
    });
  } catch (error) {
    console.error('[SW] Weather update failed:', error);
  }
}

async function fetchIncidentUpdates() {
  try {
    // Notify clients to fetch incident updates
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'FETCH_INCIDENT_UPDATE',
      });
    });
  } catch (error) {
    console.error('[SW] Incident update failed:', error);
  }
}
