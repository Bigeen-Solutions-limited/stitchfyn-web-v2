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
  // Optional caption from staff
  note: string | null;
}

export interface ProgressPhotoIdempotency {
  clientId: string;
  deviceId: string;
  deviceCapturedAt: string;
}

// Fail a hung upload rather than block the screen
const UPLOAD_TIMEOUT_MS = 15000;

// 5 MB, the server's upload limit
export const MAX_PROGRESS_PHOTO_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

// Hides the capture button at 3 photos; the server enforces the limit
export const MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT = 3;

// Staff only; uploads go through the API, never straight to Cloudinary
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
