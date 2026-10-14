import { apiClient } from "../../infrastructure/http/axios.client";

export type CapacityStatus = 'GRANTED' | 'DENIED' | 'CONFLICT';

export interface CapacitySnapshot {
  companyId: string;
  totalLimit: number;
  pendingSlots: number;
  committedSlots: number;
  usedSlots: number;
  utilizationPercentage: number;
}

export interface CapacityGrant {
  status: CapacityStatus;
  reservationToken: string;
  metrics: CapacitySnapshot;
  reason?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const capacityApi = {
  getSnapshot: async (): Promise<CapacityGrant> => {
    const { data } = await apiClient.get<CapacityGrant>("/capacity/snapshot");
    return data;
  },

  reserve: async (orderId: string, tier: string): Promise<CapacityGrant> => {
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        const { data } = await apiClient.post<CapacityGrant>("/capacity/reserve", {
          orderId,
          tier,
        });
        return data;
      } catch (error: any) {
        if (error.response?.status === 429 && retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries) * 500; // back off: 1s, 2s, 4s
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw new Error("Max retries exceeded");
  },

  confirm: async (tokenId: string): Promise<CapacityGrant> => {
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        const { data } = await apiClient.post<CapacityGrant>(`/capacity/confirm/${tokenId}`);
        return data;
      } catch (error: any) {
        if (error.response?.status === 429 && retries < maxRetries) {
          retries++;
          const delay = Math.pow(2, retries) * 500;
          await sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw new Error("Max retries exceeded");
  },

  release: async (tokenId: string): Promise<void> => {
    await apiClient.delete(`/capacity/release/${tokenId}`);
  }
};
