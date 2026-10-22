import { useQuery } from '@tanstack/react-query';
import { transparencyApi, type VisibilityBundle } from '../api/transparency.api';
import { useAuthStore } from '../../auth/auth.store';
import { useEffect, useMemo, useState } from 'react';

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

  // The clock is read in an effect, not during render, and ticks so the data turns stale even if nothing new arrives
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isStale = useMemo(() => {
    if (!data?.syncedAt) return false;
    return now - new Date(data.syncedAt).getTime() > STALENESS_THRESHOLD_MS;
  }, [data?.syncedAt, now]);

  return {
    data: data || null,
    isLoading,
    isError,
    isStale,
  };
};
