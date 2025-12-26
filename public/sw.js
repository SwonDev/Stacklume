/**
 * Stacklume Service Worker
 *
 * Provides offline support with:
 * - Cache-first for static assets
 * - Network-first with fallback for API calls
 * - Background sync for pending mutations
 */

const _CACHE_NAME = 'stacklume-v3'; // Reserved for future cache versioning
const STATIC_CACHE_NAME = 'stacklume-static-v3';
const API_CACHE_NAME = 'stacklume-api-v3';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes that can be cached for offline reading
const CACHEABLE_API_ROUTES = [
  '/api/links',
  '/api/categories',
  '/api/tags',
  '/api/widgets',
  '/api/projects',
  '/api/settings',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('stacklume-') &&
                   name !== STATIC_CACHE_NAME &&
                   name !== API_CACHE_NAME;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP(S) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip cross-origin requests entirely - let the browser handle them directly
  // This prevents CSP issues with external images, favicons, and API calls
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests with network-first
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: network with cache fallback for same-origin requests
  event.respondWith(
    fetch(request)
      .then(response => response)
      .catch(() => {
        return caches.match(request).then(cached => {
          return cached || new Response('Not available offline', { status: 503 });
        });
      })
  );
});

/**
 * Check if a path is a static asset
 */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/sounds/') ||
    pathname.startsWith('/stickers/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
  );
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Only cache complete responses (status 200)
    // Do NOT cache partial responses (206) as Chrome doesn't support caching them
    if (networkResponse.ok && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (_error) {
    console.log('[SW] Static asset fetch failed:', request.url);
    return new Response('Asset not available offline', { status: 503 });
  }
}

/**
 * Handle API requests with network-first strategy
 * GET requests are cached for offline reading
 * Mutations are queued for sync when offline
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isReadRequest = request.method === 'GET';
  const isCacheableRoute = CACHEABLE_API_ROUTES.some(route =>
    url.pathname.startsWith(route)
  );

  // For GET requests, try network first, then cache
  if (isReadRequest) {
    try {
      const networkResponse = await fetch(request);

      // Cache successful GET responses for offline use
      // Only cache complete responses (status 200), NOT partial responses (206)
      if (networkResponse.ok && networkResponse.status === 200 && isCacheableRoute) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch (_error) {
      console.log('[SW] API request failed, trying cache:', url.pathname);

      // Try cache for GET requests
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        // Add header to indicate offline data
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Offline-Data', 'true');

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }

      // Return offline error
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'You are offline and this data is not cached',
          offline: true,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // For mutations, try network, queue if offline
  try {
    return await fetch(request);
  } catch (_error) {
    // Store mutation for later sync
    await queueMutation(request);

    return new Response(
      JSON.stringify({
        error: 'Queued',
        message: 'Your changes will be synced when you are back online',
        queued: true,
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle navigation requests with network-first strategy
 */
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache the HTML for offline access
    // Only cache complete responses (status 200), NOT partial responses (206)
    if (networkResponse.ok && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (_error) {
    console.log('[SW] Navigation failed, trying cache');

    // Try to serve cached page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try to serve the index page for SPA navigation
    const indexCache = await caches.match('/');
    if (indexCache) {
      return indexCache;
    }

    return new Response('Offline - Page not available', { status: 503 });
  }
}

/**
 * Queue a mutation request for later sync
 */
async function queueMutation(request) {
  const db = await openSyncDB();

  const mutation = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now(),
  };

  const tx = db.transaction('mutations', 'readwrite');
  const store = tx.objectStore('mutations');
  await store.add(mutation);
}

/**
 * Open IndexedDB for sync queue
 */
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('stacklume-sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', {
          keyPath: 'id',
          autoIncrement: true
        });
      }
    };
  });
}

/**
 * Process pending mutations when back online
 */
async function processPendingMutations() {
  const db = await openSyncDB();
  const tx = db.transaction('mutations', 'readwrite');
  const store = tx.objectStore('mutations');

  const mutations = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  console.log('[SW] Processing', mutations.length, 'pending mutations');

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body || undefined,
      });

      if (response.ok) {
        // Remove successful mutation from queue
        await new Promise((resolve, reject) => {
          const deleteRequest = store.delete(mutation.id);
          deleteRequest.onerror = () => reject(deleteRequest.error);
          deleteRequest.onsuccess = () => resolve();
        });

        console.log('[SW] Synced mutation:', mutation.url);
      }
    } catch (error) {
      console.error('[SW] Failed to sync mutation:', mutation.url, error);
    }
  }

  // Notify clients that sync is complete
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

// Listen for online events via message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ONLINE') {
    console.log('[SW] Back online, processing pending mutations');
    processPendingMutations();
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync (when supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processPendingMutations());
  }
});
