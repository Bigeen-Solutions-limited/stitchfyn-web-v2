import { useQuery } from '@tanstack/react-query';
import { stitchScoreApi } from './stitchScore.api';
import { useAuthStore } from '../auth/auth.store';
export const useStitchScore = () => {
  const user = useAuthStore((state: any) => state.user);
  const companyId = user?.companyId;

  return useQuery({
    queryKey: ['stitchScore', companyId],
    queryFn: () => stitchScoreApi.getScore(companyId!),
    enabled: !!companyId,
    staleTime: 60000,
    refetchInterval: 300000, // refresh every 5 minutes
  });
};
