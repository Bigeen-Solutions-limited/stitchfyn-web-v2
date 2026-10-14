import { apiClient } from '../../infrastructure/http/axios.client';

// Must match the server's request shapes
export interface RaiseDisputeDTO {
  orderId: string;
  category: 'MATERIAL' | 'MEASUREMENT' | 'FINANCIAL' | 'AESTHETIC';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  initiator: {
    userId: string;
    role: string;
  };
  evidenceArtifacts?: string[];
}

export interface SubmitEvidenceDTO {
  disputeId: string;
  evidenceType: 'PHOTO' | 'STATEMENT' | 'PAYMENT_PROOF';
  artifactUrl: string;
  metadata: Record<string, any>;
}

export interface ResolveDisputeDTO {
  disputeId: string;
  resolutionToken: string;
}

export interface DisputeStandoffDTO {
  disputeId: string;
  orderId: string;
  status: 'OPEN' | 'EVIDENCE_REQUIRED' | 'UNDER_REVIEW' | 'RESOLVED' | 'TERMINATED';
  category: string;
  daysInStandoff: number;
  lastActivityAt: string;
  blockingGarmentIds: string[];
  requiredAction: 'UPLOAD_PHOTO' | 'SIGN_AGREEMENT' | 'WAIT_FOR_REVIEW' | 'NONE';
}

export type DisputeStatus = 'OPEN' | 'EVIDENCE_REQUIRED' | 'UNDER_REVIEW' | 'RESOLVED' | 'TERMINATED';
export type DisputeCategory = 'MATERIAL' | 'MEASUREMENT' | 'FINANCIAL' | 'AESTHETIC';

export interface DisputeListItem {
  id: string;
  orderId: string;
  category: DisputeCategory;
  severity: 'CRITICAL' | 'WARNING';
  status: DisputeStatus;
  description: string;
  daysInStandoff: number;
  createdAt: string;
  updatedAt: string;
  referenceNumber?: string;
  raisedByRole?: string;
  resolutionMethod?: string | null;
  customerConfirmedResolvedAt?: string | null;
  tailorConfirmedResolvedAt?: string | null;
}

export interface DisputesListResponse {
  items: DisputeListItem[];
  total: number;
  page: number;
  totalPages: number;
}

const API_BASE = '/disputes';

export const disputeApi = {
  raiseDispute: async (dto: RaiseDisputeDTO) => {
    const response = await apiClient.post(`${API_BASE}`, dto);
    return response.data;
  },

  submitEvidence: async (dto: SubmitEvidenceDTO) => {
    await apiClient.post(`${API_BASE}/${dto.disputeId}/evidence`, dto);
  },

  resolveDispute: async (dto: ResolveDisputeDTO) => {
    const response = await apiClient.post(`${API_BASE}/${dto.disputeId}/resolve`, dto);
    return response.data;
  },

  getProjection: async (orderId: string): Promise<DisputeStandoffDTO> => {
    const response = await apiClient.get(`${API_BASE}/order/${orderId}/projection`);
    return response.data;
  },

  listDisputes: async (page = 1, limit = 10): Promise<DisputesListResponse> => {
    const response = await apiClient.get(`${API_BASE}`, { params: { page, limit } });
    return response.data;
  },

  tailorResolve: async (disputeId: string): Promise<void> => {
    await apiClient.post(`${API_BASE}/${disputeId}/resolve/tailor`);
  },
};

export interface PortalRaiseDisputeDTO {
  category: DisputeCategory;
  severity: 'CRITICAL' | 'WARNING';
  description: string;
}

export interface PortalSubmitEvidenceDTO {
  evidenceType: 'PHOTO' | 'STATEMENT' | 'PAYMENT_PROOF';
  artifactUrl: string;
  metadata?: Record<string, any>;
}

// For customers in the portal, using their portal link instead of a staff login
export const portalDisputeApi = {
  getProjection: async (portalToken: string): Promise<DisputeStandoffDTO | null> => {
    try {
      const response = await apiClient.get(`/portal/orders/${portalToken}/disputes`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  raiseDispute: async (portalToken: string, dto: PortalRaiseDisputeDTO) => {
    const response = await apiClient.post(`/portal/orders/${portalToken}/disputes`, dto);
    return response.data;
  },

  submitEvidence: async (portalToken: string, disputeId: string, dto: PortalSubmitEvidenceDTO): Promise<void> => {
    await apiClient.post(`/portal/orders/${portalToken}/disputes/${disputeId}/evidence`, dto);
  },

  resolveMySide: async (portalToken: string, disputeId: string) => {
    const response = await apiClient.post(`/portal/orders/${portalToken}/disputes/${disputeId}/resolve/customer`);
    return response.data;
  },
};
