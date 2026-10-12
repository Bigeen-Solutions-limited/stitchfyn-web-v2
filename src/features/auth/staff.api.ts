import { apiClient } from "../../infrastructure/http/axios.client";

export type StaffRole = "OWNER" | "MANAGER" | "TAILOR" | "FRONT_DESK";
/** Roles an owner can assign (D-5: never Owner). */
export const ASSIGNABLE_STAFF_ROLES: StaffRole[] = ["MANAGER", "TAILOR", "FRONT_DESK"];

export interface Staff {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  storeId: string | null;
  isActive: boolean;
  /** AC 8.1 */
  status: "ACTIVE" | "SUSPENDED" | "REMOVED";
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

  inviteStaff: async (data: InviteStaffRequest): Promise<Staff> => {
    const response = await apiClient.post<Staff>("/staff/invite", data);
    return response.data;
  },

  updateStaffStatus: async (id: string, isActive: boolean): Promise<void> => {
    await apiClient.put(`/staff/${id}/status`, { isActive });
  },

  /** AC 8.3: called only from the second (confirmation) step. */
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
