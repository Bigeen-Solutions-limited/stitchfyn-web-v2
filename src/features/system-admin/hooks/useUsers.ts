import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../../query/keys'
import { usersApi, type ListUsersParams } from '../api/users.api'
import { useToastStore } from '../../../components/feedback/Toast'

export function useAllUsers(params?: ListUsersParams) {
  return useQuery({
    queryKey: keys.systemAdmin.users.list(params as Record<string, unknown>),
    queryFn: () => usersApi.list(params),
    staleTime: 1000 * 30,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: keys.systemAdmin.users.detail(id),
    queryFn: () => usersApi.get(id),
    enabled: !!id,
  })
}

export function useRevokeAccess() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: ({ userId, companyId, notes }: { userId: string; companyId: string; notes: string }) =>
      usersApi.revokeAccess(userId, companyId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.users.all })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.companies.all })
      showToast('Access Revoked', 'User has been removed from the company.', 'success')
    },
    onError: (error: any) => {
      showToast('Error', error.response?.data?.message || 'Failed to revoke access', 'error')
    },
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      usersApi.updateStatus(userId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.users.detail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.users.all })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.companies.all })
      const label = variables.status === 'ACTIVE' ? 'Reinstated' : 'Suspended'
      showToast(`User ${label}`, `Account has been ${label.toLowerCase()}.`, 'success')
    },
    onError: (error: any) => {
      showToast('Error', error.response?.data?.message || 'Failed to update user status', 'error')
    },
  })
}

export function useChangeUserRole() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: ({ userId, role, acknowledgeOwnerDowngrade }: { userId: string; role: string; acknowledgeOwnerDowngrade?: boolean }) =>
      usersApi.changeRole(userId, role, acknowledgeOwnerDowngrade),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.users.detail(variables.userId) })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.users.all })
      showToast('Role Updated', `Role changed to ${variables.role}.`, 'success')
    },
    onError: (error: any) => {
      if (error.response?.data?.code === 'OWNER_CONFLICT') return // the dialog asks to confirm instead
      showToast('Error', error.response?.data?.message || 'Failed to change role', 'error')
    },
  })
}

// Only works for someone who was added but never joined; the server says so otherwise
export function useResendInvite() {
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: (userId: string) => usersApi.resendInvite(userId),
    onError: (error: any) => {
      showToast('Error', error.response?.data?.message || 'Failed to resend the invite', 'error')
    },
  })
}
