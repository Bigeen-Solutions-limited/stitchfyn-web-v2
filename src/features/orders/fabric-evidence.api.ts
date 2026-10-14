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
  // Optional here so older test fixtures don't need them; the server always sends them
  clientId?: string | null;
  deviceId?: string | null;
  deviceCapturedAt?: string | null;
}

// Sent with every upload so retries, online or offline, are never saved twice
export interface FabricEvidenceIdempotency {
  clientId: string;
  deviceId: string;
  // When the photo was taken, as reported by the device (not trusted)
  deviceCapturedAt: string;
}

// A hung upload must fail quickly so we can tell we're offline
const UPLOAD_TIMEOUT_MS = 15000;

// 5 MB, the same as the server's upload limit; keep the two in step
export const MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// Staff only; uploads go through the API, which fills in who and when from the login
export const fabricEvidenceApi = {
  uploadFabricEvidencePhoto: async (
    garmentId: string,
    file: File | Blob,
    idempotency?: FabricEvidenceIdempotency,
  ): Promise<FabricEvidencePhoto> => {
    const form = new FormData();
    form.append('image', file, file instanceof File ? file.name : 'fabric-photo.jpg');
    if (idempotency) {
      form.append('clientId', idempotency.clientId);
      form.append('deviceId', idempotency.deviceId);
      form.append('deviceCapturedAt', idempotency.deviceCapturedAt);
    }
    const { data } = await apiClient.post<FabricEvidencePhoto>(
      `/garments/${garmentId}/fabric-evidence-photos`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: UPLOAD_TIMEOUT_MS },
    );
    return data;
  },
};

// What customers see: no internal ids or uploader details
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

// For customers in the portal, using their portal link instead of a staff login
export const portalFabricEvidenceApi = {
  getEvidence: async (portalToken: string, garmentId: string): Promise<PortalFabricEvidencePhoto[]> => {
    const { data } = await apiClient.get<PortalFabricEvidencePhoto[]>(
      `/portal/orders/${portalToken}/garments/${garmentId}/fabric-evidence-photos`,
    );
    return data;
  },

  // The customer confirms the quantity already recorded, so no body is needed
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
