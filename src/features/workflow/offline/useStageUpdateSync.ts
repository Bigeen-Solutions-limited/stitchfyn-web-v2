import { useEffect } from 'react';
import { useToastStore } from '../../../components/feedback/Toast';
import { queryClient } from '../../../query/queryClient';
import { flushStageUpdates } from './stage-update-queue';

/**
 * LR-5: replays offline stage updates on app start and whenever the
 * browser comes back online. Mounted once, in AppShell.
 */
export function useStageUpdateSync() {
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    const sync = async () => {
      const result = await flushStageUpdates().catch(() => null);
      if (!result) return;
      if (result.synced.length > 0) {
        showToast('Offline updates synced', `${result.synced.length} stage update(s) saved.`);
      }
      for (const conflict of result.conflicts) {
        showToast('Offline update not applied', `Stage "${conflict.update.stageId}": ${conflict.message}`, 'error');
      }
      queryClient.invalidateQueries();
    };

    void sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [showToast]);
}
