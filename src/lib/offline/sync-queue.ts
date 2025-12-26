/**
 * Sync Queue for Offline Mutations
 *
 * This module manages a queue of API mutations that were made while offline.
 * When the user comes back online, these mutations are synced to the server.
 */

export interface QueuedMutation {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

const DB_NAME = 'stacklume-sync';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

/**
 * Open the IndexedDB database for sync queue
 */
export function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
  });
}

/**
 * Add a mutation to the sync queue
 */
export async function queueMutation(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null
): Promise<number> {
  const db = await openSyncDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const mutation: Omit<QueuedMutation, 'id'> = {
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
    };

    const request = store.add(mutation);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as number);
  });
}

/**
 * Get all pending mutations
 */
export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await openSyncDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as QueuedMutation[]);
  });
}

/**
 * Get the count of pending mutations
 */
export async function getPendingCount(): Promise<number> {
  const db = await openSyncDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Remove a mutation from the queue
 */
export async function removeMutation(id: number): Promise<void> {
  const db = await openSyncDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all pending mutations
 */
export async function clearMutations(): Promise<void> {
  const db = await openSyncDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Process all pending mutations
 * Returns the number of successfully synced mutations
 */
export async function processPendingMutations(): Promise<{
  synced: number;
  failed: number;
  total: number;
}> {
  const mutations = await getPendingMutations();
  let synced = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body || undefined,
      });

      if (response.ok && mutation.id !== undefined) {
        await removeMutation(mutation.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed, total: mutations.length };
}

/**
 * Register for background sync (when supported)
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('sync' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('sync' in registration) {
      // @ts-expect-error - sync API types not fully available
      await registration.sync.register('sync-mutations');
      return true;
    }
  } catch {
    console.warn('Background sync registration failed');
  }

  return false;
}

/**
 * Notify service worker that we're back online
 */
export function notifyOnline(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'ONLINE' });
  }
}
