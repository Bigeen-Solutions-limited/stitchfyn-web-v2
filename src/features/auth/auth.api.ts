import { apiClient } from "../../infrastructure/http/axios.client"
import type { LoginDTO, AuthResponse } from "./auth.types"

// The server also sets the refresh cookie
export async function loginApi(dto: LoginDTO): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/login", dto)
  const raw = response.data

  return {
    accessToken: raw.accessToken,
    user: {
      id: raw.user.id ?? raw.user.userId,
      companyId: raw.user.companyId,
      email: raw.user.email,
      fullName: raw.user.fullName,
      role: raw.user.role,
      capabilities: raw.user.capabilities ?? raw.user.permissions ?? [],
      mustChangePassword: raw.user.mustChangePassword ?? false,
    },
  }
}

// Gets a new access token using the refresh cookie
export async function refreshApi(): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/refresh")
  const raw = response.data

  return {
    accessToken: raw.accessToken,
    user: {
      id: raw.user.id ?? raw.user.userId,
      companyId: raw.user.companyId,
      email: raw.user.email,
      fullName: raw.user.fullName,
      role: raw.user.role,
      capabilities: raw.user.capabilities ?? raw.user.permissions ?? [],
    },
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

// Switches store and returns new tokens
export async function switchTenantApi(storeId: string): Promise<AuthResponse> {
  const response = await apiClient.post("/auth/switch-tenant", { storeId })
  const raw = response.data
  return {
    accessToken: raw.accessToken,
    user: {
      id: raw.user.id ?? raw.user.userId,
      companyId: raw.user.companyId,
      email: raw.user.email,
      fullName: raw.user.fullName,
      role: raw.user.role,
      capabilities: raw.user.capabilities ?? raw.user.permissions ?? [],
    },
  }
}
