import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../customers.api.ts';
import { keys } from '../../../query/keys.ts';

export function useCustomerProfile(id: string, garmentTemplateId?: string) {
  return useQuery({
    queryKey: garmentTemplateId ? [...keys.customers.detail(id), { garmentTemplateId }] : keys.customers.detail(id),
    queryFn: () => customersApi.getCustomerProfile(id, garmentTemplateId),
    enabled: !!id,
  });
}

export function useUpdateMeasurements(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (measurements: Record<string, number>) => 
      customersApi.updateMeasurements(id, measurements),
    onSuccess: () => {
      // Refresh the profile and every customer list, so "last active" is current
      queryClient.invalidateQueries({ queryKey: keys.customers.detail(id) });
      queryClient.invalidateQueries({ queryKey: keys.customers.list(1, 10, '') }); // Invalidate general list to refresh "last active" data
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });
}
