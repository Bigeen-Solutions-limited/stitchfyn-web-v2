import { apiClient } from '../../infrastructure/http/axios.client';

export interface ChecklistItem {
  label: string;
  checkedByTailor: boolean;
  checkedByCustomer: boolean;
}

export interface CollectionChecklist {
  id: string;
  orderId: string;
  companyId: string;
  items: ChecklistItem[];
  tailorSignoffAt: string | null;
  tailorSignoffBy: string | null;
  customerSignoffAt: string | null;
  createdAt: string;
}

export const collectionApi = {
  getChecklist: async (orderId: string): Promise<CollectionChecklist> => {
    const { data } = await apiClient.get<CollectionChecklist>(
      `/orders/${orderId}/collection-checklist`,
    );
    return data;
  },

  // US-4.8's own readiness signal (backend-authoritative; the UI uses this
  // only to decide what to show, never to enforce anything itself).
  getReadiness: async (orderId: string): Promise<{ ready: boolean }> => {
    const { data } = await apiClient.get<{ ready: boolean }>(
      `/orders/${orderId}/collection-readiness`,
    );
    return data;
  },

  createChecklist: async (orderId: string): Promise<CollectionChecklist> => {
    const { data } = await apiClient.post<CollectionChecklist>(
      `/orders/${orderId}/collection-checklist`,
    );
    return data;
  },

  tailorSignoff: async (orderId: string): Promise<CollectionChecklist> => {
    const { data } = await apiClient.post<CollectionChecklist>(
      `/orders/${orderId}/collection-checklist/tailor-signoff`,
    );
    return data;
  },
};

export const portalCollectionApi = {
  getChecklist: async (portalToken: string): Promise<CollectionChecklist> => {
    const { data } = await apiClient.get<CollectionChecklist>(
      `/portal/orders/${portalToken}/collection-checklist`,
    );
    return data;
  },

  customerSignoff: async (portalToken: string): Promise<CollectionChecklist> => {
    const { data } = await apiClient.post<CollectionChecklist>(
      `/portal/orders/${portalToken}/collection-checklist/customer-signoff`,
    );
    return data;
  },
};
