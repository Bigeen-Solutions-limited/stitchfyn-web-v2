import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../orders.api.ts';

export function useUrgentGarments() {
  return useQuery({
    queryKey: ['orders', 'urgent-garments'],
    queryFn: () => ordersApi.getUrgentGarments(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60, // keep the production queue current
    refetchOnWindowFocus: true,
  });
}
