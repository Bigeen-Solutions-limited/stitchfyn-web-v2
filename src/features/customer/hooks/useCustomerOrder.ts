import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../customer.api';

export function useCustomerOrder(orderId: string) {
  return useQuery({
    queryKey: ['customer', 'order', orderId],
    queryFn: () => customerApi.getCustomerOrder(orderId),
    enabled: !!orderId,
    retry: false,
  });
}

export function usePortalStageTimeline(portalToken: string) {
  return useQuery({
    queryKey: ['customer', 'order', portalToken, 'stage-timeline'],
    queryFn: () => customerApi.getStageTimeline(portalToken),
    enabled: !!portalToken,
    retry: false,
  });
}
