import { apiClient } from '../../../infrastructure/http/axios.client'
import type {
  CompanyListRecord,
  CompanyRecord,
  CompanyProvisionResult,
  UserRecord,
  StoreRecord,
  CreateCompanyDTO,
  ChangeCompanyStatusDTO,
  AssignUserDTO,
  AssignUserResult,
  AddStoreDTO,
  CompanyStatus,
  SubscriptionTier,
} from '../types'

export interface ListCompaniesParams {
  status?: CompanyStatus
  tier?: SubscriptionTier
  search?: string
  page?: number
  limit?: number
}

export const companiesApi = {
  list: async (params?: ListCompaniesParams): Promise<CompanyListRecord[]> => {
    const { data } = await apiClient.get<CompanyListRecord[]>('/system-admin/companies', { params })
    return data
  },

  get: async (id: string): Promise<CompanyRecord> => {
    const { data } = await apiClient.get<CompanyRecord>(`/system-admin/companies/${id}`)
    return data
  },

  create: async (dto: CreateCompanyDTO): Promise<CompanyProvisionResult> => {
    const { data } = await apiClient.post<CompanyProvisionResult>('/system-admin/companies', dto)
    return data
  },

  changeStatus: async (id: string, dto: ChangeCompanyStatusDTO): Promise<void> => {
    await apiClient.patch(`/system-admin/companies/${id}/status`, dto)
  },

  listUsers: async (companyId: string): Promise<UserRecord[]> => {
    const { data } = await apiClient.get<UserRecord[]>(`/system-admin/companies/${companyId}/users`)
    return data
  },

  assignUser: async (
    companyId: string,
    dto: AssignUserDTO,
  ): Promise<AssignUserResult> => {
    const { data } = await apiClient.post<AssignUserResult>(
      `/system-admin/companies/${companyId}/users`,
      dto,
    )
    return data
  },

  listStores: async (companyId: string): Promise<StoreRecord[]> => {
    const { data } = await apiClient.get<StoreRecord[]>(`/system-admin/companies/${companyId}/stores`)
    return data
  },

  addStore: async (companyId: string, dto: AddStoreDTO): Promise<void> => {
    await apiClient.post(`/system-admin/companies/${companyId}/stores`, dto)
  },
}
