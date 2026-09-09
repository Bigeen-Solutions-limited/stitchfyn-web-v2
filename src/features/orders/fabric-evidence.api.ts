import { apiClient } from '../../infrastructure/http/axios.client';

export interface FabricEvidencePhoto {
  id: string;
  garmentId: string;
  orderId: string;
  companyId: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Authenticated — staff only. Uploads go through the StitchFYN API, never
// directly to Cloudinary: the backend derives companyId/uploadedBy/
// uploadedAt/cloudinaryPublicId from the request's auth context and the
// Cloudinary response, never from the client.
export const fabricEvidenceApi = {
  uploadFabricEvidencePhoto: async (garmentId: string, file: File): Promise<FabricEvidencePhoto> => {
    const form = new FormData();
    form.append('image', file);
    const { data } = await apiClient.post<FabricEvidencePhoto>(
      `/garments/${garmentId}/fabric-evidence-photos`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};

// Thin, customer-safe shape — no cloudinaryPublicId, uploadedBy, or tenant
// identifiers (the backend's portal GET route already omits these; see
// fabric-evidence.controller.ts's registerPortalRoutes).
export interface PortalFabricEvidencePhoto {
  id: string;
  secureUrl: string;
  uploadedAt: string;
}

export interface PortalConfirmFabricResult {
  id: string;
  confirmedAt: string | null;
  confirmationChannel: string | null;
}

// Customer-facing surface — portal-token authenticated, no staff JWT. Same
// pattern as portalDesignBriefApi/portalDisputeApi.
export const portalFabricEvidenceApi = {
  getEvidence: async (portalToken: string, garmentId: string): Promise<PortalFabricEvidencePhoto[]> => {
    const { data } = await apiClient.get<PortalFabricEvidencePhoto[]>(
      `/portal/orders/${portalToken}/garments/${garmentId}/fabric-evidence-photos`,
    );
    return data;
  },

  // US-3.3: the customer confirms the tailor-logged quantity already on the
  // garment record — no request body is required.
  confirm: async (
    portalToken: string,
    garmentId: string,
  ): Promise<PortalConfirmFabricResult> => {
    const { data } = await apiClient.post<PortalConfirmFabricResult>(
      `/portal/orders/${portalToken}/garments/${garmentId}/confirm-fabric`,
      {},
    );
    return data;
  },
};
