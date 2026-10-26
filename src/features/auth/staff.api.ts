import { apiClient } from "../../infrastructure/http/axios.client";

export type StaffRole = "OWNER" | "MANAGER" | "TAILOR" | "FRONT_DESK";
// Roles an owner can give; Owner is never one of them
export const ASSIGNABLE_STAFF_ROLES: StaffRole[] = ["MANAGER", "TAILOR", "FRONT_DESK"];

// How each role is named on screen
export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  TAILOR: "Tailor",
  FRONT_DESK: "Front Desk",
  CUSTOMER: "Customer",
  SYSTEM_ADMIN: "System Admin",
};

export interface Staff {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  storeId: string | null;
  isActive: boolean;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED"; // INVITED: hasn't set a password from their link yet
  lastLoginAt: string | null;
  removedAt: string | null;
  createdAt: string;
}

export interface InviteStaffRequest {
  email: string;
  fullName: string;
  role: string;
  storeId: string;
}

export interface Store {
  id: string;
  name: string;
}

export const staffApi = {
  getStaff: async (storeId?: string): Promise<Staff[]> => {
    const response = await apiClient.get<Staff[]>("/staff", {
      params: { storeId }
    });
    return response.data;
  },

  // Returns the invite link too, so it can be shared if the email doesn't arrive
  inviteStaff: async (data: InviteStaffRequest): Promise<Staff & { inviteUrl: string }> => {
    const response = await apiClient.post<Staff & { inviteUrl: string }>("/staff/invite", data);
    return response.data;
  },

  resendInvite: async (id: string): Promise<{ inviteUrl: string }> => {
    const response = await apiClient.post<{ inviteUrl: string }>(`/staff/${id}/resend-invite`);
    return response.data;
  },

  updateStaffStatus: async (id: string, isActive: boolean): Promise<void> => {
    await apiClient.put(`/staff/${id}/status`, { isActive });
  },

  // Only call from the confirmation step
  removeStaff: async (id: string): Promise<void> => {
    await apiClient.post(`/staff/${id}/remove`, { confirm: true });
  },

  changeStaffRole: async (id: string, role: StaffRole): Promise<void> => {
    await apiClient.put(`/staff/${id}/role`, { role });
  },

  getStores: async (): Promise<Store[]> => {
    const response = await apiClient.get<Store[]>("/stores");
    return response.data;
  },
};
