import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { capacityApi } from "../capacity.api";

export const CAPACITY_KEYS = {
  all: ["capacity"] as const,
  snapshot: () => [...CAPACITY_KEYS.all, "snapshot"] as const,
};

export function useCapacity() {
  const queryClient = useQueryClient();

  const snapshotQuery = useQuery({
    queryKey: CAPACITY_KEYS.snapshot(),
    queryFn: capacityApi.getSnapshot,
    refetchInterval: 30000,
  });

  const reserveMutation = useMutation({
    mutationFn: ({ orderId, tier }: { orderId: string; tier: string }) => 
      capacityApi.reserve(orderId, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAPACITY_KEYS.snapshot() });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (tokenId: string) => capacityApi.confirm(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAPACITY_KEYS.snapshot() });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (tokenId: string) => capacityApi.release(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAPACITY_KEYS.snapshot() });
    },
  });

  return {
    snapshot: snapshotQuery.data,
    isLoading: snapshotQuery.isLoading,
    isError: snapshotQuery.isError,
    reserve: reserveMutation,
    confirm: confirmMutation,
    release: releaseMutation,
  };
}
