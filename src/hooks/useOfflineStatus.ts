"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getPendingCount,
  processPendingMutations,
  notifyOnline,
} from '@/lib/offline/sync-queue';

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: { synced: number; failed: number } | null;
  isMounted: boolean;
}

/**
 * Hook to track offline status and manage sync queue
 */
export function useOfflineStatus(): OfflineStatus & {
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
} {
  // Use safe defaults for SSR - online with no pending items
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    failed: number;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set actual online status after mount
  useEffect(() => {
    setIsMounted(true);
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  // Refresh pending mutation count
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.warn('Failed to get pending count:', error);
    }
  }, []);

  // Sync pending mutations
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await processPendingMutations();
      setLastSyncResult({ synced: result.synced, failed: result.failed });
      await refreshPendingCount();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshPendingCount]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notifyOnline();
      // Auto-sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending count
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, refreshPendingCount]);

  // Listen for service worker sync complete message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        refreshPendingCount();
        setLastSyncResult({ synced: -1, failed: 0 }); // -1 indicates background sync
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    isMounted,
    syncNow,
    refreshPendingCount,
  };
}
