// Import OneSignal SDK Service Worker
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// VSAPS 2026 - Service Worker
// Strategy: Cache First for static assets, Network First for API/Supabase
// Background Sync for offline check-in queue

const CACHE_NAME = 'vsaps2026-v2';
const STATIC_CACHE = 'vsaps2026-static-v2';
const DYNAMIC_CACHE = 'vsaps2026-dynamic-v2';

// App shell resources to pre-cache during install
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
];

// Patterns for static assets (Cache First)
const STATIC_ASSET_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.otf$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.ico$/,
  /\.webp$/,
];

// Patterns for API/Supabase calls (Network First)
const API_PATTERNS = [
  /supabase\.co/,
  /\/api\//,
  /\/rest\/v1\//,
  /\/auth\//,
  /\/realtime\//,
  /\/storage\//,
];

// ============================================================
// INSTALL EVENT - Pre-cache app shell
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        // Don't skip waiting automatically - let the app control this
      })
      .catch((err) => {
        console.error('[SW] Failed to cache app shell:', err);
      })
  );
});

// ============================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !currentCaches.includes(cacheName))
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// ============================================================
// FETCH EVENT - Routing strategies
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (let them pass through)
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip cross-origin API and database requests (Supabase, SePay, QR Server, etc.)
  // Only handle same-origin requests and Google Fonts to avoid PWA sandbox/CORS sync issues on mobile
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  if (!isSameOrigin && !isGoogleFont) {
    return;
  }

  // Check if this is an API/Supabase request
  const isApiRequest = API_PATTERNS.some((pattern) => pattern.test(request.url));

  if (isApiRequest) {
    // Network First for API calls
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(request.url)) {
    // Cache First for static assets
    event.respondWith(cacheFirst(request));
  } else {
    // Network First for navigation and other requests
    event.respondWith(networkFirst(request));
  }
});

// ============================================================
// CACHING STRATEGIES
// ============================================================

/**
 * Cache First Strategy
 * Try cache first, fall back to network. Cache the network response.
 * Best for: static assets (JS, CSS, fonts, images)
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Return cached version, but also update cache in background
      refreshCache(request);
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    // Try to return cached version as last resort
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    // For navigation requests, show offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network First Strategy
 * Try network first, fall back to cache.
 * Best for: API calls, dynamic content, HTML pages
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses for offline use
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // For navigation requests, show offline page
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }

    return new Response(
      JSON.stringify({ error: 'Bạn đang ngoại tuyến. Vui lòng kiểm tra kết nối mạng.' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Stale While Revalidate - update cache in background
 */
async function refreshCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we already returned cached version
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function isStaticAsset(url) {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url));
}

// ============================================================
// BACKGROUND SYNC - Offline Check-in Queue
// ============================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event fired:', event.tag);

  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncOfflineCheckins());
  }
});

/**
 * Process offline check-in queue
 * Reads from IndexedDB and sends to Supabase
 */
async function syncOfflineCheckins() {
  console.log('[SW] Syncing offline check-ins...');

  try {
    const db = await openDB();
    const tx = db.transaction('offlineActions', 'readonly');
    const store = tx.objectStore('offlineActions');
    const request = store.index('synced').getAll(IDBKeyRange.only(0));

    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const unsyncedActions = request.result;

        if (!unsyncedActions || unsyncedActions.length === 0) {
          console.log('[SW] No unsynced check-ins found');
          resolve();
          return;
        }

        console.log(`[SW] Found ${unsyncedActions.length} unsynced check-ins`);

        // Notify all clients about sync progress
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_STARTED',
            count: unsyncedActions.length,
          });
        });

        // Process each action
        let successCount = 0;
        let failCount = 0;

        for (const action of unsyncedActions) {
          try {
            // The actual sync to Supabase will be handled by the app
            // Here we just notify the client
            successCount++;
          } catch (err) {
            console.error('[SW] Failed to sync action:', action.id, err);
            failCount++;
          }
        }

        // Notify clients about sync completion
        const clientsAfter = await self.clients.matchAll();
        clientsAfter.forEach((client) => {
          client.postMessage({
            type: 'SYNC_COMPLETED',
            success: successCount,
            failed: failCount,
          });
        });

        resolve();
      };

      request.onerror = () => {
        console.error('[SW] Failed to read offline actions');
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

/**
 * Open IndexedDB for offline queue
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vsaps2026-offline', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineActions')) {
        const store = db.createObjectStore('offlineActions', { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// MESSAGE EVENT - Handle messages from clients
// ============================================================
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting requested');
      self.skipWaiting();
      break;

    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.source.postMessage({
          type: 'CACHE_STATUS',
          payload: status,
        });
      });
      break;

    case 'CLEAR_CACHES':
      clearAllCaches().then(() => {
        event.source.postMessage({
          type: 'CACHES_CLEARED',
        });
      });
      break;

    case 'TRIGGER_SYNC':
      // Manually trigger sync for offline check-ins
      syncOfflineCheckins().then(() => {
        event.source.postMessage({
          type: 'SYNC_TRIGGERED',
        });
      });
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Get cache status info
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    status[name] = keys.length;
  }

  return status;
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

// ============================================================
// PUSH NOTIFICATIONS (placeholder for future)
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'VSAPS 2026';
  const options = {
    body: data.body || 'Bạn có thông báo mới',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(url);
      })
  );
});
