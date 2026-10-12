import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productionApi } from '../production.api';
import { v4 as uuidv4 } from 'uuid';
import { useDomainError } from '../../../lib/errors/use-domain-error';

export function useAvailableTransitions(garmentId: string) {
  return useQuery({
    queryKey: ['production', 'transitions', garmentId],
    queryFn: () => productionApi.getAvailableTransitions(garmentId),
    enabled: !!garmentId
  });
}

export function useAttemptTransition() {
  const queryClient = useQueryClient();
  const { handleError } = useDomainError();

  return useMutation({
    mutationFn: ({ garmentId, targetStatus, bypassReason }: { garmentId: string; targetStatus: string; bypassReason?: string }) => {
      const idempotencyKey = uuidv4();
      return productionApi.attemptTransition(garmentId, targetStatus, idempotencyKey, bypassReason);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', 'active-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'transitions', variables.garmentId] });
    },
    onError: (err) => handleError(err),
  });
}
