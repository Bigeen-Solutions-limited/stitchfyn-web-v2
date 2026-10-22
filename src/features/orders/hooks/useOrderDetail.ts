import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../orders.api.ts';
import { keys } from '../../../query/keys.ts';

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: keys.orders.detail(id),
    queryFn: () => ordersApi.getOrderDetail(id),
    enabled: !!id,
  });
}

export function useMaterials(orderId: string) {
  // Deprecated: use materials/hooks/useMaterialMutation
  return useQuery({
    queryKey: ['DEPRECATED_materials', orderId],
    queryFn: async () => [],
    enabled: false
  });
}

export function useMeasurements(orderId: string) {
  // Deprecated: use measurement/hooks/useMeasurementMutation
  return useQuery({
    queryKey: ['DEPRECATED_measurements', orderId],
    queryFn: async () => [],
    enabled: false
  });
}
export function useOrderWork(id: string) {
  return useQuery({
    queryKey: keys.orders.work(id),
    queryFn: () => ordersApi.getOrderWork(id),
    enabled: !!id,
  });
}

export function useOrderGarments(orderId: string) {
  return useQuery({
    queryKey: keys.orders.garments(orderId),
    queryFn: () => ordersApi.getOrderGarments(orderId),
    enabled: !!orderId,
  });
}
