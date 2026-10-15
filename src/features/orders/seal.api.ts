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

// The seal row as the server stores it
interface SealRow {
  id: string;
  order_id?: string;
  garment_id?: string;
  company_id?: string;
  verification_code?: string;
  fabric_photo_id?: string | null;
  quantity_confirmed?: string;
  generated_at?: string;
  qrCodeDataUrl: string;
}

// Staff only
export const sealApi = {
  getGarmentSeal: async (orderId: string, garmentId: string): Promise<GarmentSeal> => {
    // The server sends the seal row in snake_case (the public seal view uses the same shape)
    const { data } = await apiClient.get<Partial<GarmentSeal> & SealRow>(
      `/orders/${orderId}/garments/${garmentId}/seal`,
    );
    return {
      id: data.id,
      orderId: data.orderId ?? data.order_id ?? '',
      garmentId: data.garmentId ?? data.garment_id ?? '',
      companyId: data.companyId ?? data.company_id ?? '',
      verificationCode: data.verificationCode ?? data.verification_code ?? '',
      fabricPhotoId: data.fabricPhotoId ?? data.fabric_photo_id ?? null,
      quantityConfirmed: data.quantityConfirmed ?? data.quantity_confirmed ?? '',
      generatedAt: data.generatedAt ?? data.generated_at ?? '',
      qrCodeDataUrl: data.qrCodeDataUrl,
    };
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
