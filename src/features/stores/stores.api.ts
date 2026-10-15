import { apiClient } from '../../infrastructure/http/axios.client';

export interface CapacityCheckResult {
  allowed: boolean;
  reason?: string;
  currentLoad: number;
  proposedTotal: number;
  maxCapacity: number;
}

export const storesApi = {
  checkCapacity: async (storeId: string, proposedGarmentCount: number): Promise<CapacityCheckResult> => {
    const { data } = await apiClient.post<CapacityCheckResult>(`/stores/${storeId}/capacity-check`, { proposedGarmentCount });
    return data;
  },
};
