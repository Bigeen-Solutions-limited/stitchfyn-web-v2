import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from './inventory.api';
import { keys } from '../../query/keys';
import { useToastStore } from '../../components/feedback/Toast';

export const useInventory = () => {
  return useQuery({
    queryKey: keys.inventory.overview,
    queryFn: inventoryApi.getInventoryOverview,
    staleTime: 30000,
  });
};

export const useReceiveShipment = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ materialId, quantity, notes }: { materialId: string; quantity: number; notes: string }) =>
      inventoryApi.receiveShipment(materialId, quantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.inventory.overview });
      showToast('Shipment Recorded', 'Physical stock has been updated in the ledger.', 'success');
    },
    onError: (error: any) => {
      showToast('Error', error.message || 'Failed to record shipment', 'error');
    }
  });
};

export const useUpdateMaterialImage = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: ({ materialId, file }: { materialId: string; file: File }) =>
      inventoryApi.updateMaterialImage(materialId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.inventory.overview });
      showToast('Photo Updated', 'Material fabric reference has been replaced.', 'success');
    },
    onError: (error: any) => {
      showToast('Error', error.message || 'Failed to update material image', 'error');
    }
  });
};

export const useRegisterMaterial = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: FormData | { name: string; sku: string | null; canonicalUnit: string }) =>
      inventoryApi.registerMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.inventory.overview });
      showToast('Material Registered', 'New material master record has been created.', 'success');
    },
    onError: (error: any) => {
      showToast('Error', error.message || 'Failed to register material', 'error');
    }
  });
};
