import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';
import { keys } from '../../query/keys';

export const useAdminAnalytics = () => {
  return useQuery({
    queryKey: keys.analytics.admin,
    queryFn: analyticsApi.getAdminAnalytics,
    staleTime: 60000,
    refetchInterval: 300000, // refresh every 5 minutes
  });
};
