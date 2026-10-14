import axios from 'axios';
import { apiClient } from '../../infrastructure/http/axios.client';
import type { Garment } from './orders.api';

// Quantity is recorded at intake, so confirming doesn't send it
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
  qrCodeDataUrl: string; // a data: URL of a PNG
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

// Staff only
export const sealApi = {
  getGarmentSeal: async (orderId: string, garmentId: string): Promise<GarmentSeal> => {
    const { data } = await apiClient.get<GarmentSeal>(
      `/orders/${orderId}/garments/${garmentId}/seal`,
    );
    return data;
  },

  // No channel sent: the server records in-person confirmation by default
  confirmFabric: async (garmentId: string, body: ConfirmFabricRequest = {}): Promise<Garment> => {
    const { data } = await apiClient.post<Garment>(
      `/garments/${garmentId}/confirm-fabric`,
      body,
    );
    return data;
  },
};

// No login token: anyone can verify a seal
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
