import { apiClient } from "../../infrastructure/http/axios.client"
import type { LoginDTO, AuthResponse, AuthUser } from "./auth.types"

// The one place the server's user shape becomes the app's; every auth response goes through here
// What the server sends; older responses used id/capabilities, current ones userId/permissions
interface RawAuthUser {
  id?: string
  userId?: string
  companyId?: string | null
  storeId?: string | null
  email: string
  fullName: string
  role: AuthUser["role"]
  capabilities?: AuthUser["capabilities"]
  permissions?: AuthUser["capabilities"]
  mustChangePassword?: boolean
}

export function mapAuthUser(raw: RawAuthUser): AuthUser {
  return {
    id: (raw.id ?? raw.userId) as string,
    companyId: raw.companyId ?? null,
    storeId: raw.storeId ?? undefined,
    email: raw.email,
    fullName: raw.fullName,
    role: raw.role,
    capabilities: raw.capabilities ?? raw.permissions ?? [],
    mustChangePassword: raw.mustChangePassword ?? false,
  }
}

// The server also sets the refresh cookie
export async function loginApi(dto: LoginDTO): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/login", dto)
  const raw = response.data

  return {
    accessToken: raw.accessToken,
    user: mapAuthUser(raw.user),
  }
}

// Gets a new access token using the refresh cookie
export async function refreshApi(): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/refresh")
  const raw = response.data

  return {
    accessToken: raw.accessToken,
    user: mapAuthUser(raw.user),
  }
}

export async function logoutApi(): Promise<void> {
  await apiClient.post("/auth/logout")
}

export async function forgotPasswordApi(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email })
}

export async function resetPasswordApi(token: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/reset-password", { token, newPassword })
}

export async function verifyEmailApi(token: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/verify-email", { token, newPassword })
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/change-password", { currentPassword, newPassword })
}

export interface TenantDTO {
  storeId: string;
  storeName: string;
  companyId: string;
  role: string;
}

// Every store the user can work in
export async function getTenantsApi(): Promise<TenantDTO[]> {
  const response = await apiClient.get("/auth/tenants")
  return response.data
}

// Switches store and returns new tokens; null takes an owner back to all stores
export async function switchTenantApi(storeId: string | null): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/switch-tenant", { storeId })
  const raw = response.data
  return {
    accessToken: raw.accessToken,
    user: mapAuthUser(raw.user),
  }
}
