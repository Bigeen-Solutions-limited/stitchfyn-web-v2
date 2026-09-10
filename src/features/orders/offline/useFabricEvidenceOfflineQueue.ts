import { useCallback, useEffect, useRef, useState } from 'react';
import type { FabricEvidencePhoto } from '../fabric-evidence.api';
import { getPendingForGarment, type PendingFabricEvidenceRecord } from './fabric-evidence-offline-db';
import { attemptFabricEvidenceSync, subscribeFabricEvidenceQueue } from './fabric-evidence-sync-manager';

/**
 * Garment-scoped view of the offline fabric-evidence queue. Loads whatever
 * is already persisted (survives reload/restart, per the offline capture
 * requirement), re-reads on every queue change, and opportunistically
 * attempts a flush on mount — the cheapest possible "try to sync when the
 * user comes back to this screen" trigger, without a polling loop.
 */
export function useFabricEvidenceOfflineQueue(garmentId: string, onSynced?: (photo: FabricEvidencePhoto) => void) {
  const [items, setItems] = useState<PendingFabricEvidenceRecord[]>([]);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const refresh = useCallback(async () => {
    setItems(await getPendingForGarment(garmentId));
  }, [garmentId]);

  useEffect(() => {
    let mounted = true;
    void refresh();

    const unsubscribe = subscribeFabricEvidenceQueue((event) => {
      if (event.garmentId !== garmentId) return;
      if (event.type === 'synced') onSyncedRef.current?.(event.photo);
      if (mounted) void refresh();
    });

    void attemptFabricEvidenceSync();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [garmentId, refresh]);

  return items;
}
