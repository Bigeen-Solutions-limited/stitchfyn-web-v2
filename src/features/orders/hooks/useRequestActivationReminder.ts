import { useMutation } from '@tanstack/react-query';
import { ordersApi } from '../orders.api.ts';
import { useToastStore } from '../../../components/feedback/Toast.tsx';

// A reminder changes no server-rendered state (the activation flags are
// derived from fabric/design/payment), so there is nothing to invalidate.
export function useRequestActivationReminder() {
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (orderId: string) => ordersApi.requestActivationReminder(orderId),
    onSuccess: () => {
      showToast('Reminder queued', 'The customer will get a message with their portal link shortly.', 'success');
    },
    onError: (error: any) => {
      showToast('Could not send reminder', error.response?.data?.message || 'Please try again.', 'error');
    },
  });
}
