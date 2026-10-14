import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../../query/keys'
import { companiesApi, type ListCompaniesParams } from '../api/companies.api'
import type { AssignUserDTO, ChangeCompanyStatusDTO, CreateCompanyDTO, AddStoreDTO } from '../types'
import { useToastStore } from '../../../components/feedback/Toast'

export function useCompanies(filters?: ListCompaniesParams) {
  return useQuery({
    queryKey: keys.systemAdmin.companies.list(filters as Record<string, unknown>),
    queryFn: () => companiesApi.list(filters),
    staleTime: 1000 * 30,
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: keys.systemAdmin.companies.detail(id),
    queryFn: () => companiesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: (dto: CreateCompanyDTO) => companiesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.companies.all })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.stats })
    },
    onError: (error: any) => {
      showToast('Error', error.response?.data?.message || 'Failed to create company', 'error')
    },
  })
}

export function useChangeCompanyStatus(id: string) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: (dto: ChangeCompanyStatusDTO) => companiesApi.changeStatus(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.companies.detail(id) })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.companies.all })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.stats })
      showToast('Status Updated', 'Company status has been changed.', 'success')
    },
    onError: (error: any) => {
      showToast('Error', error.response?.data?.message || 'Failed to change status', 'error')
    },
  })
}

export function useCompanyUsers(companyId: string) {
  return useQuery({
    queryKey: keys.systemAdmin.companies.users(companyId),
    queryFn: () => companiesApi.listUsers(companyId),
    enabled: !!companyId,
  })
}

export function useAssignUser(companyId: string) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: (dto: AssignUserDTO) => companiesApi.assignUser(companyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.companies.users(companyId) })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.users.all })
      showToast('User Assigned', 'User has been assigned to the company.', 'success')
    },
    onError: (error: any) => {
      if (error.response?.status === 409) return // the form shows this one itself
      showToast('Error', error.response?.data?.message || 'Failed to assign user', 'error')
    },
  })
}

export function useCompanyStores(companyId: string) {
  return useQuery({
    queryKey: keys.systemAdmin.companies.stores(companyId),
    queryFn: () => companiesApi.listStores(companyId),
    enabled: !!companyId,
  })
}

export function useAddStore(companyId: string) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.showToast)

  return useMutation({
    mutationFn: (dto: AddStoreDTO) => companiesApi.addStore(companyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.companies.stores(companyId) })
      queryClient.invalidateQueries({ queryKey: keys.systemAdmin.stats })
      showToast('Store Added', 'New store has been created.', 'success')
    },
    onError: (error: any) => {
      showToast('Error', error.response?.data?.message || 'Failed to add store', 'error')
    },
  })
}
