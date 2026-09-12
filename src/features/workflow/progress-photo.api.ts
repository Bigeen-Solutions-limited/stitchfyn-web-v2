import { apiClient } from '../../infrastructure/http/axios.client';

export interface ProgressPhoto {
  id: string;
  garmentId: string;
  orderId: string;
  companyId: string;
  stageInstanceId: string;
  stageId: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  deviceCapturedAt: string | null;
  clientId: string | null;
  deviceId: string | null;
  /** Optional staff caption — never mandatory. */
  note: string | null;
}

export interface ProgressPhotoIdempotency {
  clientId: string;
  deviceId: string;
  deviceCapturedAt: string;
}

// A hung request (no server response at all) shouldn't block the UI
// indefinitely — same rationale and value as fabric-evidence.api.ts's own
// UPLOAD_TIMEOUT_MS, scoped to this one call.
const UPLOAD_TIMEOUT_MS = 15000;

/**
 * Maximum accepted progress-photo image size — 5 MiB, matching the
 * server's @fastify/multipart `fileSize` limit (stitchfyn-api's global
 * MAX_UPLOAD_FILE_SIZE_BYTES, which applies to every multipart route
 * including this one with no route-specific override). Deliberately its
 * own named constant, NOT a reuse of fabric-evidence.api.ts's
 * MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES — the two features must not share a
 * fabric-specific name, even though the underlying value is the same
 * app-wide limit.
 */
export const MAX_PROGRESS_PHOTO_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Maximum progress photos per stage — a BACKEND business rule
 * (ProgressPhotoService/Repository.createWithinLimit is the actual,
 * server-side, concurrency-safe enforcement). This frontend copy exists
 * only to hide the capture control once a stage visibly has 3 photos —
 * a UX optimization, never itself an enforcement mechanism. The backend
 * rejects a 4th submission (409) regardless of what this constant says.
 */
export const MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT = 3;

// Authenticated — staff only. Uploads go through the StitchFYN API, never
// directly to Cloudinary, matching every other evidence-upload endpoint in
// this app.
export const progressPhotoApi = {
  upload: async (
    garmentId: string,
    stageId: string,
    file: File,
    note?: string,
    idempotency?: ProgressPhotoIdempotency,
  ): Promise<ProgressPhoto> => {
    const form = new FormData();
    form.append('image', file, file.name);
    if (note) form.append('note', note);
    if (idempotency) {
      form.append('clientId', idempotency.clientId);
      form.append('deviceId', idempotency.deviceId);
      form.append('deviceCapturedAt', idempotency.deviceCapturedAt);
    }
    const { data } = await apiClient.post<ProgressPhoto>(
      `/garments/${garmentId}/stages/${stageId}/progress-photos`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: UPLOAD_TIMEOUT_MS },
    );
    return data;
  },

  getForGarment: async (garmentId: string): Promise<ProgressPhoto[]> => {
    const { data } = await apiClient.get<ProgressPhoto[]>(`/garments/${garmentId}/progress-photos`);
    return data;
  },
};
