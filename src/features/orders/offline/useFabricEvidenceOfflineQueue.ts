import { useCallback, useEffect, useRef, useState } from 'react';
import type { FabricEvidencePhoto } from '../fabric-evidence.api';
import { getPendingForGarment, type PendingFabricEvidenceRecord } from './fabric-evidence-offline-db';
import { attemptFabricEvidenceSync, subscribeFabricEvidenceQueue } from './fabric-evidence-sync-manager';

// The saved-offline photos for one garment; re-reads on every change and tries to upload when the screen opens
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
