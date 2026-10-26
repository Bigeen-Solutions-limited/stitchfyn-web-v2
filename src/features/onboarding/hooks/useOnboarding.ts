import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../../query/keys';
import { onboardingApi, type BusinessDetails } from '../onboarding.api';

export function useOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: keys.onboarding.status,
    queryFn: onboardingApi.getStatus,
    enabled,
  });
}

// The server returns the new status, so the cache is updated in place
export function useSaveBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (details: BusinessDetails) => onboardingApi.saveBusiness(details),
    onSuccess: (status) => queryClient.setQueryData(keys.onboarding.status, status),
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.complete,
    onSuccess: (status) => queryClient.setQueryData(keys.onboarding.status, status),
  });
}

// Inviting staff and creating stages change readiness through other routes; refetch after them
export function useRefreshOnboarding() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keys.onboarding.status });
}
