import { apiClient } from '../../infrastructure/http/axios.client';

// What the server reports about first-time setup. It decides readiness; the web only shows it.
export type ReadinessStep = 'workshop' | 'workflow' | 'staff';

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

// What the owner adds; the company and workshop names come from admin onboarding
export interface WorkshopDetails {
  storeAddress: string;
  maxGarmentCapacity: number;
  dailyCapacityHours: number;
}

export const onboardingApi = {
  getStatus: async (): Promise<OnboardingStatus> => {
    const { data } = await apiClient.get<OnboardingStatus>('/onboarding');
    return data;
  },

  saveWorkshop: async (details: WorkshopDetails): Promise<OnboardingStatus> => {
    const { data } = await apiClient.put<OnboardingStatus>('/onboarding/workshop', details);
    return data;
  },

  // 409 with metadata.missing when a step isn't done yet
  complete: async (): Promise<OnboardingStatus> => {
    const { data } = await apiClient.post<OnboardingStatus>('/onboarding/complete');
    return data;
  },
};
