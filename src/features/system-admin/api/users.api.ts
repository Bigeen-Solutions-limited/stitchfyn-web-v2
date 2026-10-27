import { apiClient } from '../../../infrastructure/http/axios.client'
import type { UserRecord } from '../types'

export interface ListUsersParams {
  search?: string
  page?: number
  limit?: number
}

export interface SystemAdminInvite {
  id: string
  email: string
  fullName: string
  inviteUrl: string
}

export const usersApi = {
  // A new system admin gets an email with a link to set their password; the link is returned too, to share another way
  inviteSystemAdmin: async (dto: { email: string; fullName: string }): Promise<SystemAdminInvite> => {
    const { data } = await apiClient.post<SystemAdminInvite>('/system-admin/admins', dto)
    return data
  },

  list: async (params?: ListUsersParams): Promise<UserRecord[]> => {
    const { data } = await apiClient.get<UserRecord[]>('/system-admin/users', { params })
    return data
  },

  get: async (id: string): Promise<UserRecord> => {
    const { data } = await apiClient.get<UserRecord>(`/system-admin/users/${id}`)
    return data
  },

  revokeAccess: async (userId: string, companyId: string, notes: string): Promise<void> => {
    await apiClient.delete(`/system-admin/users/${userId}/company-access`, {
      data: { companyId, notes },
    })
  },

  updateStatus: async (userId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<void> => {
    await apiClient.patch(`/system-admin/users/${userId}/status`, { status })
  },

  // acknowledgeOwnerDowngrade: confirms the current owner becomes a manager when someone else is made owner
  changeRole: async (userId: string, role: string, acknowledgeOwnerDowngrade = false): Promise<void> => {
    await apiClient.patch(`/system-admin/users/${userId}/role`, { role, acknowledgeOwnerDowngrade })
  },

  // Only for someone who was added but never joined
  resendInvite: async (userId: string): Promise<{ inviteUrl: string }> => {
    const { data } = await apiClient.post<{ inviteUrl: string }>(`/system-admin/users/${userId}/resend-invite`)
    return data
  },
}
