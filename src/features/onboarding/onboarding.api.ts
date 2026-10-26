import { apiClient } from '../../infrastructure/http/axios.client';

// What the server reports about first-time setup. It decides readiness; the web only shows it.
export type ReadinessStep = 'business' | 'workflow' | 'staff';

export interface OnboardingStatus {
  completedAt: string | null;
  companyName: string;
  steps: Record<ReadinessStep, boolean>;
  defaultStore: {
    id: string;
    name: string;
    locationAddress: string | null;
    maxGarmentCapacity: number;
    dailyCapacityHours: number;
  };
}

export interface BusinessDetails {
  companyName: string;
  storeName: string;
  storeAddress: string;
  maxGarmentCapacity: number;
  dailyCapacityHours: number;
}

export const onboardingApi = {
  getStatus: async (): Promise<OnboardingStatus> => {
    const { data } = await apiClient.get<OnboardingStatus>('/onboarding');
    return data;
  },

  saveBusiness: async (details: BusinessDetails): Promise<OnboardingStatus> => {
    const { data } = await apiClient.put<OnboardingStatus>('/onboarding/business', details);
    return data;
  },

  // 409 with metadata.missing when a step isn't done yet
  complete: async (): Promise<OnboardingStatus> => {
    const { data } = await apiClient.post<OnboardingStatus>('/onboarding/complete');
    return data;
  },
};
