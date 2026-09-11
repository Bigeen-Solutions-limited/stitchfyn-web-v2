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
  // Optional on the TYPE (not the real API response, which always includes
  // them, possibly as null) so pre-existing test fixtures/call sites that
  // predate offline capture & sync don't all need updating for fields they
  // don't care about.
  clientId?: string | null;
  deviceId?: string | null;
  deviceCapturedAt?: string | null;
}

// Offline capture & sync: present when the upload is (or may be) a retry —
// either the first attempt of a freshly-captured photo, or a queued item
// being flushed after reconnecting. Sent on every upload (not just queued
// ones) so a flaky-but-nominally-online capture is idempotent too, not
// just an explicitly-queued offline one.
export interface FabricEvidenceIdempotency {
  clientId: string;
  deviceId: string;
  /** ISO 8601 device capture time — untrusted, becomes the audit occurredAt. */
  deviceCapturedAt: string;
}

// A hung request (no server response at all) is what offline detection
// actually depends on being timely about — see fabric-evidence-sync-
// manager.ts. Scoped to this one call, not a global axios change.
const UPLOAD_TIMEOUT_MS = 15000;

/**
 * Maximum accepted fabric-evidence image size — 5 MiB, matching the
 * server's @fastify/multipart `fileSize` limit (stitchfyn-api/src/app/
 * app.ts, via infrastructure/config/upload-limits.ts). The two apps share
 * no runtime package, so this is a deliberately duplicated, documented
 * value rather than a cross-repo coupling — keep both in sync if this
 * value ever changes.
 *
 * The single source of truth WITHIN this app: every place in stitchfyn-web
 * that needs this limit (the capture panel's pre-upload check, the offline
 * queue's defense-in-depth guard) imports it from here rather than
 * redeclaring it.
 */
export const MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

// Authenticated — staff only. Uploads go through the StitchFYN API, never
// directly to Cloudinary: the backend derives companyId/uploadedBy/
// uploadedAt/cloudinaryPublicId from the request's auth context and the
// Cloudinary response, never from the client.
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
