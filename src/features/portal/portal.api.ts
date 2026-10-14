import { apiClient } from "../../infrastructure/http/axios.client";

export interface Milestone {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INHIBITED';
  completedAt: string | null;
}

export interface PortalView {
  trackingSlug: string;
  customerDisplayName: string;
  currentStatus: string;
  dignifiedNarrative: string;
  progressMilestones: Milestone[];
  lastUpdated: string;
}

export const getTrackingInfo = async (slug: string): Promise<PortalView> => {
  const response = await apiClient.get(`/portal/track/${slug}`);
  return response.data;
};

export interface PortalMessage {
  id: string;
  senderRole: 'STAFF' | 'CUSTOMER';
  body: string;
  createdAt: string;
}

export interface PortalPaymentSummary {
  totalAgreed: number | null; // kobo
  totalPaid: number; // kobo
  outstandingBalance: number; // kobo
}

export const portalApi = {
  getPaymentSummary: async (portalToken: string): Promise<PortalPaymentSummary> => {
    const { data } = await apiClient.get<PortalPaymentSummary>(
      `/portal/orders/${portalToken}/payments/summary`,
    );
    return data;
  },

  getMessages: async (portalToken: string): Promise<PortalMessage[]> => {
    const { data } = await apiClient.get<PortalMessage[]>(
      `/portal/orders/${portalToken}/messages`,
    );
    return data;
  },

  sendMessage: async (portalToken: string, body: string): Promise<PortalMessage> => {
    const { data } = await apiClient.post<PortalMessage>(
      `/portal/orders/${portalToken}/messages`,
      { body },
    );
    return data;
  },
};
