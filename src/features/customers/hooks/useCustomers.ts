import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type CreateCustomerRequest } from '../customers.api.ts';
import { keys } from '../../../query/keys.ts';

export function useCustomers(page = 1, limit = 10, search = '') {
  return useQuery({
    queryKey: keys.customers.list(page, limit, search),
    queryFn: () => customersApi.getCustomers(page, limit, search),
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData, // keep showing the old page while the next one loads
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => customersApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
