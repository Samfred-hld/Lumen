import React from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useQueryClient } from '@tanstack/react-query';
import { processQueue } from '@/lib/offlineQueue';
import { supabase } from '@/api/supabaseClient';

/**
 * OfflineBar - Shown at top of Layout when navigator.onLine is false.
 * Background color shifts from yellow (offline) to green briefly on reconnection.
 * Triggers offline queue sync on reconnect.
 */
export default function OfflineBar() {
  const { isOnline } = useOfflineStatus();
  const [showReconnected, setShowReconnected] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState(null);
  const queryClient = useQueryClient();
  const wasOffline = React.useRef(false);

  React.useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowReconnected(false);
      setSyncResult(null);
      return;
    }

    // Just came back online after being offline
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowReconnected(true);

      // Process offline queue
      (async () => {
        const result = await processQueue(supabase);
        if (result.processed > 0) {
          setSyncResult(result);
          // Invalidate all queries to refetch fresh data
          queryClient.invalidateQueries();
        }
      })();

      const timer = setTimeout(() => {
        setShowReconnected(false);
        setSyncResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queryClient]);

  if (isOnline && !showReconnected) return null;

  const bgColor = isOnline ? 'bg-green-500' : 'bg-yellow-500';
  const textColor = isOnline ? 'text-green-950' : 'text-yellow-950';
  const icon = isOnline ? 'wifi' : 'wifi_off';

  return (
    <div
      className={`flex items-center justify-center gap-2 ${bgColor} ${textColor} text-body-sm py-2 px-4 select-none`}
      role="status"
      aria-live="polite"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        {icon}
      </span>
      <span>
        {isOnline
          ? syncResult
            ? `${syncResult.processed} alterações sincronizadas`
            : 'Conexão restaurada'
          : 'Sem conexão — alterações serão salvas localmente'}
      </span>
    </div>
  );
}
