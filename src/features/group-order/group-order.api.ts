import { apiClient } from "../../infrastructure/http/axios.client";

export type RiskLevel = "ON_TRACK" | "AT_RISK" | "OVERDUE";
export type ActivationFlag = "payment" | "fabric" | "design";

export interface GroupAggregation {
  collectiveRiskLevel: RiskLevel;
  collectiveProgressPercent: number;
  totalMemberCount: number;
  completedMemberCount: number;
  atRiskMemberCount: number;
}

// One garment in a group, as the coordinator sees it
export interface GroupGarmentStatus {
  garmentId: string;
  garmentName: string;
  orderId: string;
  orderNumber: number;
  memberFirstName: string;
  currentStage: string;
  progressPercent: number;
  riskLevel: RiskLevel;
  pendingFlags: ActivationFlag[];
  isReady: boolean;
}

export interface StaffGroupGarmentStatus extends GroupGarmentStatus {
  customerName: string;
  assignedTailorId: string | null;
  assignedTailorName: string | null;
  fabricConfirmed: boolean;
  quantity: number | null;
  quantityUnit: string | null;
}

export interface GroupOrderSummary {
  id: string;
  name: string;
  eventDate: string;
  groupToken: string;
  storeId: string | null;
  storeName: string | null;
  leadTailorId: string | null;
  leadTailorName: string | null;
  coordinatorCustomerId: string | null;
  coordinatorName: string | null;
  orderCount: number;
}

export interface GroupOrderDetail extends GroupOrderSummary {
  aggregatedHealth: GroupAggregation;
  garments: StaffGroupGarmentStatus[];
}

export interface GroupOrdersListResponse {
  items: GroupOrderSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GroupOrderInput {
  name?: string;
  eventDate?: string;
  storeId?: string | null;
  leadTailorId?: string | null;
  coordinatorCustomerId?: string | null;
}

// GET /public/group/:token, read without logging in
export interface GroupHealthProjection {
  metadata: {
    groupName: string;
    eventDate: string;
    coordinatorName: string | null;
    groupToken: string;
  };
  aggregatedHealth: GroupAggregation;
  memberDetails: GroupGarmentStatus[];
}

export const getGroupProjection = async (token: string): Promise<GroupHealthProjection> => {
  const response = await apiClient.get(`/public/group/${token}`);
  return response.data;
};

// The link the coordinator shares with the whole group
export const groupShareUrl = (token: string) => `${window.location.origin}/groups/${token}`;

export const groupOrderApi = {
  list: async (page = 1, limit = 20): Promise<GroupOrdersListResponse> => {
    const { data } = await apiClient.get("/group-orders", { params: { page, limit } });
    return data;
  },
  get: async (groupId: string): Promise<GroupOrderDetail> => {
    const { data } = await apiClient.get(`/group-orders/${groupId}`);
    return data;
  },
  create: async (input: GroupOrderInput): Promise<GroupOrderDetail> => {
    const { data } = await apiClient.post("/group-orders", input);
    return data;
  },
  update: async (groupId: string, input: GroupOrderInput): Promise<GroupOrderDetail> => {
    const { data } = await apiClient.patch(`/group-orders/${groupId}`, input);
    return data;
  },
  linkOrder: async (groupId: string, orderId: string): Promise<GroupOrderDetail> => {
    const { data } = await apiClient.post(`/group-orders/${groupId}/orders`, { orderId });
    return data;
  },
  unlinkOrder: async (groupId: string, orderId: string): Promise<GroupOrderDetail> => {
    const { data } = await apiClient.delete(`/group-orders/${groupId}/orders/${orderId}`);
    return data;
  },
};
