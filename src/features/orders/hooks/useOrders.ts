import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ordersApi } from '../orders.api.ts';
import { keys } from '../../../query/keys.ts';

export function useOrders(page = 1, limit = 10) {
  return useQuery({
    queryKey: keys.orders.list(page, limit),
    queryFn: () => ordersApi.getOrders(page, limit),
    staleTime: 1000 * 30, // deadlines change, so keep this fresh
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}
