import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { disputeApi } from './dispute.api';
import type { RaiseDisputeDTO, SubmitEvidenceDTO, ResolveDisputeDTO } from './dispute.api';
export type { DisputeListItem, DisputesListResponse, DisputeStatus, DisputeCategory } from './dispute.api';
import { keys } from '../../query/keys';
import { useToastStore } from '../../components/feedback/Toast';

export function useDisputesList(page = 1, limit = 10) {
  return useQuery({
    queryKey: keys.disputes.list(page, limit),
    queryFn: () => disputeApi.listDisputes(page, limit),
  });
}

export function useDisputeProjection(orderId: string) {
  return useQuery({
    queryKey: keys.disputes.projection(orderId),
    queryFn: () => disputeApi.getProjection(orderId),
    enabled: !!orderId,
    retry: false
  });
}

export function useRaiseDispute() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (dto: RaiseDisputeDTO) => disputeApi.raiseDispute(dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.disputes.projection(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: keys.orders.detail(variables.orderId) });
      showToast("Dispute raised. Physical workflow frozen.", "warning");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to raise dispute";
      showToast(message, "error");
    }
  });
}

export function useSubmitEvidence(orderId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (dto: SubmitEvidenceDTO) => disputeApi.submitEvidence(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.disputes.projection(orderId) });
      showToast("Evidence submitted for review.", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Failed to submit evidence", "error");
    }
  });
}

// The tailor's side of the two-sided resolution sign-off
export function useTailorResolve(orderId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (disputeId: string) => disputeApi.tailorResolve(disputeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.disputes.list(1, 10) });
      queryClient.invalidateQueries({ queryKey: keys.disputes.projection(orderId) });
      showToast('Resolution confirmation recorded.', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to record confirmation', 'error');
    },
  });
}

export function useResolveDispute(orderId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (dto: ResolveDisputeDTO) => disputeApi.resolveDispute(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.disputes.projection(orderId) });
      queryClient.invalidateQueries({ queryKey: keys.orders.detail(orderId) });
      showToast("Dispute resolved. Production resumed.", "success");
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || "Resolution quorum failed", "error");
    }
  });
}
