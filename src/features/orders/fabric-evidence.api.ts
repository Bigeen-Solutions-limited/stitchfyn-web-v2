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
