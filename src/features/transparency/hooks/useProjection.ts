import { useQuery } from '@tanstack/react-query';
import { transparencyApi, type VisibilityBundle } from '../api/transparency.api';
import { useAuthStore } from '../../auth/auth.store';
import { useMemo } from 'react';

const STALENESS_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface ProjectionState {
  data: VisibilityBundle | null;
  isLoading: boolean;
  isError: boolean;
  isStale: boolean;
}

export const useProjection = (storeId?: string): ProjectionState => {
  const { user } = useAuthStore();
  const activeStoreId = storeId || user?.storeId;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transparency', activeStoreId],
    queryFn: () => transparencyApi.getStoreStatus(activeStoreId!),
    enabled: !!activeStoreId,
    refetchInterval: 30000,
  });

  const isStale = useMemo(() => {
    if (!data?.syncedAt) return false;
    const syncTime = new Date(data.syncedAt).getTime();
    const now = Date.now();
    return now - syncTime > STALENESS_THRESHOLD_MS;
  }, [data?.syncedAt]);

  return {
    data: data || null,
    isLoading,
    isError,
    isStale,
  };
};
