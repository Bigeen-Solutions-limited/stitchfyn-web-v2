import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "../customers.api";
import type { CreateCustomerRequest } from "../customers.api";
import { measurementApi } from "../../measurements/measurement.api";
import { keys } from "../../../query/keys";
import { useDomainError } from "../../../lib/errors";

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: keys.customers.search(query),
    queryFn: () => customersApi.searchCustomers(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCustomer() {
  const { handleError } = useDomainError();
  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => customersApi.createCustomer(data),
    onError: (err: any) => handleError(err),
  });
}

export function useCreateMeasurement() {
  const { handleError } = useDomainError();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { customerId: string; measurements: Record<string, number>; status?: 'draft' | 'complete' }) =>
      measurementApi.recordMeasurement(data.customerId, data.measurements, data.status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.customers.detail(variables.customerId) });
    },
    onError: (err: any) => handleError(err),
  });
}
