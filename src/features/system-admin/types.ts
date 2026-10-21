// Mirrors the system-admin types on the server

export type SubscriptionTier = 'TRIAL' | 'STARTER' | 'PROFESSIONAL'
export type CompanyStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

export interface CompanyRecord {
  id: string
  companyName: string
  subscriptionTier: SubscriptionTier
  subscriptionStatus: CompanyStatus
  trialEndsAt: string | null
  country: string
  internalNotes: string | null
  deactivatedAt: string | null
  createdAt: string
}

export interface CompanyListRecord extends CompanyRecord {
  ownerEmail: string | null
  storeCount: number
  userCount: number
}

export interface CompanyProvisionResult {
  company: CompanyRecord
  ownerUser: {
    id: string
    email: string
    fullName: string
  }
  defaultStore: {
    id: string
    storeName: string
  }
}

export interface UserRecord {
  id: string
  email: string
  fullName: string
  role: string
  companyId: string | null
  companyName: string | null
  isActive: boolean
  createdAt: string
}

export interface StoreRecord {
  id: string
  name: string
  createdAt: string
}

export interface OverviewStats {
  totalCompanies: number
  byStatus: Record<CompanyStatus, number>
  totalUsers: number
  totalStores: number
  expiringTrials: Array<{
    companyId: string
    companyName: string
    trialEndsAt: string
    daysRemaining: number
  }>
}

export interface CreateCompanyDTO {
  companyName: string
  ownerEmail: string
  ownerFullName: string
  subscriptionTier: SubscriptionTier
  trialEndsAt?: string
  country?: string
  notes?: string
}

export interface ChangeCompanyStatusDTO {
  status: CompanyStatus
  notes?: string
}

export type AssignableRole = 'OWNER' | 'MANAGER' | 'TAILOR' | 'FRONT_DESK'

export interface AssignUserResult {
  temporaryPassword?: string
  existingUser: boolean
}

export interface AssignUserDTO {
  email: string
  fullName?: string
  role: AssignableRole
  acknowledgeOwnerDowngrade?: boolean
}

export interface AddStoreDTO {
  storeName: string
  isDefault?: boolean
  address?: string
}

export interface AdminAuditEntry {
  id: string
  actorId: string
  action: string
  targetType: string
  targetId: string
  previousState: Record<string, unknown> | null
  nextState: Record<string, unknown> | null
  notes: string | null
  createdAt: string
}
