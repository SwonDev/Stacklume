"use client";

import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

/**
 * Indicator component that shows offline status and pending sync count
 */
export function OfflineIndicator({
  className,
  showWhenOnline = false,
}: OfflineIndicatorProps) {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    syncNow,
  } = useOfflineStatus();

  // Don't show anything if online with no pending items (unless showWhenOnline)
  if (isOnline && pendingCount === 0 && !showWhenOnline && !isSyncing) {
    return null;
  }

  const getStatusMessage = () => {
    if (!isOnline) {
      return pendingCount > 0
        ? `Sin conexión - ${pendingCount} cambios pendientes`
        : 'Sin conexión';
    }

    if (isSyncing) {
      return 'Sincronizando...';
    }

    if (pendingCount > 0) {
      return `${pendingCount} cambios pendientes`;
    }

    if (lastSyncResult && lastSyncResult.synced > 0) {
      return `${lastSyncResult.synced} cambios sincronizados`;
    }

    return 'Conectado';
  };

  const getIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-amber-500" />;
    }

    if (isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }

    if (pendingCount > 0) {
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }

    if (lastSyncResult && lastSyncResult.synced > 0) {
      return <Check className="h-4 w-4 text-green-500" />;
    }

    return null;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
            !isOnline && 'bg-amber-500/10 border border-amber-500/20',
            isOnline && pendingCount > 0 && 'bg-blue-500/10 border border-blue-500/20',
            isOnline && pendingCount === 0 && isSyncing && 'bg-blue-500/10 border border-blue-500/20',
            className
          )}
        >
          {getIcon()}
          <span className="text-muted-foreground">{getStatusMessage()}</span>

          {isOnline && pendingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-1"
              onClick={syncNow}
              disabled={isSyncing}
            >
              <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {!isOnline ? (
          <p>
            Los cambios se guardarán localmente y se sincronizarán cuando
            vuelvas a estar conectado.
          </p>
        ) : pendingCount > 0 ? (
          <p>
            Hay {pendingCount} cambios pendientes de sincronizar. Haz clic en
            el botón para sincronizar ahora.
          </p>
        ) : (
          <p>Todos los cambios están sincronizados.</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact offline badge for the header
 */
export function OfflineBadge({ className }: { className?: string }) {
  const { isOnline, pendingCount, isSyncing, isMounted } = useOfflineStatus();

  // Don't render on server or before hydration to prevent mismatch
  if (!isMounted) {
    return null;
  }

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-md',
            !isOnline && 'bg-amber-500/10',
            isOnline && pendingCount > 0 && 'bg-blue-500/10',
            isSyncing && 'bg-blue-500/10',
            className
          )}
        >
          {!isOnline && <WifiOff className="h-4 w-4 text-amber-500" />}
          {isOnline && isSyncing && (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          )}
          {isOnline && !isSyncing && pendingCount > 0 && (
            <span className="text-xs font-medium text-blue-500">
              {pendingCount}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {!isOnline ? (
          <p>Sin conexión - {pendingCount} cambios pendientes</p>
        ) : isSyncing ? (
          <p>Sincronizando cambios...</p>
        ) : (
          <p>{pendingCount} cambios pendientes</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
