import { apiClient } from "../../infrastructure/http/axios.client"

export type ActivationFlag = 'payment' | 'fabric' | 'design'

export interface Order {
  id: string
  garmentId: string
  companyId: string
  customerId: string
  customerName: string
  eventDate: string
  lockedMeasurementVersionId: string | null
  orderNumber: number
  status: string
  garmentName: string
  deadline: string
  riskLevel: "ON_TRACK" | "AT_RISK" | "OVERDUE" | "UNKNOWN"
  isUrgent: boolean
  measurements?: Record<string, number>
  storeId?: string
  unverifiedFlags?: ActivationFlag[]
  garmentTier?: 'STANDARD' | 'COMPLEX' | 'BESPOKE'
  lockedAt?: string | null
}

export interface OrderDeadlineProjection {
  id: string
  orderId: string
  remainingDurationHours: number
  availableCapacityHours: number
  hoursUntilDeadline: number
  riskLevel: "ON_TRACK" | "AT_RISK" | "OVERDUE"
  calculatedAt: string
}

export interface OrderDetailResponse {
  order: Order
  projection: OrderDeadlineProjection
}

export interface Garment {
  id: string
  orderId: string
  storeId: string
  name: string
  status: string
  assignedTailorId?: string | null
  fabricImageBase64?: string | null
  fabricType?: string | null
  colorSwatch?: string | null
  designNotes?: string | null
  quantity?: number | null
  quantityUnit?: string | null
  requiredMeasurements?: string[]
  confirmedAt?: string | null
  confirmationChannel?: string | null
}

// GET /orders/:id/work: what someone making the garments needs, and nothing more
export interface OrderWorkView {
  id: string
  orderNumber: number
  eventDate: string
  createdAt: string
  customerFirstName: string
  measurements?: Record<string, number>
  garments?: Pick<Garment, 'id' | 'name' | 'status' | 'assignedTailorId' | 'fabricType' | 'colorSwatch' | 'designNotes' | 'quantity' | 'quantityUnit' | 'requiredMeasurements'>[]
}

export interface UrgentGarment {
  garmentId: string
  garmentName: string
  garmentStatus: string
  storeId: string
  orderId: string
  orderNumber: number
  customerName: string
  eventDate: string
  riskLevel: "ON_TRACK" | "AT_RISK" | "OVERDUE"
}

export interface OrdersResponse {
  items: Order[]
  total: number
  page: number
  totalPages: number
  capacityWarning: boolean
}

export const ordersApi = {
  getOrders: async (page = 1, limit = 10, search?: string) => {
    const { data } = await apiClient.get<OrdersResponse>("/orders", {
      params: { page, limit, ...(search ? { q: search } : {}) },
    })
    return data
  },

  getUrgentGarments: async () => {
    const { data } = await apiClient.get<UrgentGarment[]>("/orders/urgent-garments")
    return data
  },

  getOrderDetail: async (id: string) => {
    const { data } = await apiClient.get<OrderDetailResponse & { unverified_flags?: Order["unverifiedFlags"] }>(`/orders/${id}`)
    // The detail endpoint returns activation flags separately; attach them to the order like the list does
    return { ...data, order: { ...data.order, unverifiedFlags: data.unverified_flags ?? [] } }
  },

  getOrderWork: async (id: string) => {
    const { data } = await apiClient.get<OrderWorkView>(`/orders/${id}/work`)
    return data
  },

  getOrderGarments: async (id: string) => {
    const { data } = await apiClient.get<Garment[]>(`/orders/${id}/garments`)
    return data
  },

  createOrder: async (data: any) => {
    const { data: result } = await apiClient.post("/orders", data)
    return result
  },

  assignTailor: async (garmentId: string, tailorId: string | null) => {
    const { data } = await apiClient.patch(`/garments/${garmentId}/assign`, {
      tailorId,
    })
    return data
  },

  requestActivationReminder: async (orderId: string) => {
    const { data } = await apiClient.post<{ pending: Array<'fabric' | 'design'> }>(`/orders/${orderId}/activation-reminder`)
    return data
  },

  // Nulls until the customer's portal page has been created
  getCustomerLink: async (orderId: string) => {
    const { data } = await apiClient.get<{
      trackingSlug: string | null
      portalUrl: string | null
      trackingUrl: string | null
    }>(`/orders/${orderId}/customer-link`)
    return data
  },

  reassignGarment: async (garmentId: string, targetOrderId: string, reason: string) => {
    const { data } = await apiClient.post<Garment>(`/garments/${garmentId}/reassign`, {
      targetOrderId,
      reason,
    })
    return data
  },

  updateOrder: async (id: string, data: { eventDate?: string, lockedMeasurementVersionId?: string }) => {
    const { data: result } = await apiClient.patch(`/orders/${id}`, data)
    return result
  },

  exportEvidencePdf: async (orderId: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/orders/${orderId}/evidence-summary/pdf`, {
      responseType: 'blob',
    })
    return data
  },
}
