import { apiClient } from '../../infrastructure/http/axios.client';

export interface StockPosition {
  materialId: string;
  name: string;
  sku: string | null;
  unit: string;
  imageUrl?: string;
  totalLedger: number;
  activeReservations: number;
  quantityAvailable: number;
}

export const inventoryApi = {
  getInventoryOverview: async () => {
    const { data } = await apiClient.get<StockPosition[]>('/inventory');
    return data;
  },

  receiveShipment: async (materialId: string, quantity: number, notes: string) => {
    const { data } = await apiClient.post(`/inventory/${materialId}/receive`, {
      quantity,
      notes
    });
    return data;
  },

  registerMaterial: async (data: FormData | { name: string; sku: string | null; canonicalUnit: string }) => {
    // The client defaults to JSON, which would serialise the FormData and drop the photo
    const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
    const { data: result } = await apiClient.post('/inventory/materials', data, config);
    return result;
  },

  updateMaterialImage: async (materialId: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    const { data } = await apiClient.patch(`/inventory/materials/${materialId}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
