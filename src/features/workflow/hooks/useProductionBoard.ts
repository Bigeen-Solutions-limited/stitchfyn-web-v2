import { useQuery, useMutation } from '@tanstack/react-query';
import { workflowApi } from '../workflow.api';
import { keys } from '../../../query/keys';
import { queryClient } from '../../../query/queryClient';
import { useToastStore } from '../../../components/feedback/Toast';
import { useDomainError } from '../../../lib/errors';

// Every active stage on the floor; the server limits it to the stores the user can see
export function useActiveTasks() {
  return useQuery({
    queryKey: keys.workflow.activeTasks,
    queryFn: () => workflowApi.getActiveTasks(),
    refetchInterval: 30_000,
  });
}

// Completes a stage, then refreshes every view that shows it
export function useMarkStageComplete() {
  const showToast = useToastStore((state) => state.showToast);
  const { handleError } = useDomainError();

  return useMutation({
    mutationFn: (params: { garmentId: string; stageId: string }) =>
      workflowApi.reportStageCompletion(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.workflow.activeTasks });
      queryClient.invalidateQueries({
        queryKey: keys.workflow.garment(variables.garmentId),
      });
      queryClient.invalidateQueries({ queryKey: keys.orders.all });
      queryClient.invalidateQueries({ queryKey: keys.analytics.overview });

      showToast('Stage Complete', 'Task marked as done. Moving to next station.');
    },
    onError: (err: unknown) => {
      handleError(err);
    },
  });
}
