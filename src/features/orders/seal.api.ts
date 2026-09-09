import axios from 'axios';
import { apiClient } from '../../infrastructure/http/axios.client';
import type { Garment } from './orders.api';

// US-3.3: quantity is no longer submitted here — it was already recorded
// on the garment at intake; confirming acknowledges that existing value.
export interface ConfirmFabricRequest {
  fabric_photo_id?: string | null;
}

export interface GarmentSeal {
  id: string;
  orderId: string;
  garmentId: string;
  companyId: string;
  verificationCode: string;
  fabricPhotoId: string | null;
  quantityConfirmed: string;
  generatedAt: string;
  qrCodeDataUrl: string; // data:image/png;base64,...
}

export interface PublicSealView {
  tailor_name: string;
  business_name: string;
  fabric_photo_id: string | null;
  date_logged: string;
  quantity_confirmed: string;
  verification_code: string;
  qrCodeDataUrl: string;
}

// Authenticated — staff only
export const sealApi = {
  getGarmentSeal: async (orderId: string, garmentId: string): Promise<GarmentSeal> => {
    const { data } = await apiClient.get<GarmentSeal>(
      `/orders/${orderId}/garments/${garmentId}/seal`,
    );
    return data;
  },

  // channel is deliberately omitted — the backend defaults to 'in_person'
  // when it's not sent, which is exactly this action's purpose.
  confirmFabric: async (garmentId: string, body: ConfirmFabricRequest = {}): Promise<Garment> => {
    const { data } = await apiClient.post<Garment>(
      `/garments/${garmentId}/confirm-fabric`,
      body,
    );
    return data;
  },
};

// Unauthenticated — uses a bare axios instance, no Bearer token attached
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const publicSealApi = {
  getPublicSeal: async (verificationCode: string): Promise<PublicSealView> => {
    const { data } = await publicClient.get<PublicSealView>(
      `/public/seals/${verificationCode}`,
    );
    return data;
  },
};
