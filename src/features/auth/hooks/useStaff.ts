import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../staff.api";
import { apiClient } from "../../../infrastructure/http/axios.client";
import type { InviteStaffRequest, StaffRole } from "../staff.api";
import { keys } from "../../../query/keys";
import { useDomainError } from "../../../lib/errors";
import { useAuthStore } from "../auth.store";

export function useStaffList(options: { storeId?: string; enabled?: boolean } = {}) {
  const { storeId, ...rest } = options;
  return useQuery({
    queryKey: keys.staff.list(storeId),
    queryFn: () => staffApi.getStaff(storeId),
    ...rest
  });
}

export function useInviteStaff() {
  const queryClient = useQueryClient();
  const { handleError } = useDomainError();
  return useMutation({
    mutationFn: (data: InviteStaffRequest) => staffApi.inviteStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.staff.all });
    },
    onError: (err: any) => handleError(err),
  });
}

export function useResendInvite() {
  const { handleError } = useDomainError();
  return useMutation({
    mutationFn: (id: string) => staffApi.resendInvite(id),
    onError: (err: any) => handleError(err),
  });
}

export function useUpdateStaffStatus() {
  const queryClient = useQueryClient();
  const { handleError } = useDomainError();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      staffApi.updateStaffStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.staff.all });
    },
    onError: (err: any) => handleError(err),
  });
}

export function useRemoveStaff() {
  const queryClient = useQueryClient();
  const { handleError } = useDomainError();
  return useMutation({
    mutationFn: (id: string) => staffApi.removeStaff(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.staff.all }),
    onError: (err: any) => handleError(err),
  });
}

export function useChangeStaffRole() {
  const queryClient = useQueryClient();
  const { handleError } = useDomainError();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: StaffRole }) => staffApi.changeStaffRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.staff.all }),
    onError: (err: any) => handleError(err),
  });
}

export interface AccessLogEntry {
  id: string;
  action: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  witnessedAt: string;
}

const ACCESS_ACTIONS = ["STAFF_SUSPENDED", "STAFF_REINSTATED", "STAFF_REMOVED", "STAFF_ROLE_CHANGED"];

// Staff access decisions, newest first
export function useStaffAccessLog(enabled: boolean) {
  return useQuery({
    queryKey: [...keys.staff.all, "access-log"],
    queryFn: async () => {
      const { data } = await apiClient.get<AccessLogEntry[]>("/audit");
      return data
        .filter((r) => ACCESS_ACTIONS.includes(r.action))
        .sort((a, b) => b.witnessedAt.localeCompare(a.witnessedAt));
    },
    enabled,
  });
}

export function useStores() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => staffApi.getStores(),
    enabled: user?.role === 'OWNER',
  });
}
