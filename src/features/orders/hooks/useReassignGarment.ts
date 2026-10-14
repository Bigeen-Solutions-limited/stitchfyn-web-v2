import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../orders.api.ts';
import { useToastStore } from '../../../components/feedback/Toast.tsx';

interface ReassignVars {
  garmentId: string;
  targetOrderId: string;
  reason: string;
}

export function useReassignGarment(sourceOrderId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ garmentId, targetOrderId, reason }: ReassignVars) =>
      ordersApi.reassignGarment(garmentId, targetOrderId, reason),
    onSuccess: (_garment, { garmentId, targetOrderId }) => {
      // ['orders', id] covers both the order detail and its garment list
      queryClient.invalidateQueries({ queryKey: ['orders', sourceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['orders', targetOrderId] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['audit-trail', `context:${garmentId}`] });
      showToast('Fabric reassigned', 'The garment now belongs to the selected order.', 'success');
    },
    onError: (error: any) => {
      showToast('Could not reassign fabric', error.response?.data?.message || 'Please try again.', 'error');
    },
  });
}
