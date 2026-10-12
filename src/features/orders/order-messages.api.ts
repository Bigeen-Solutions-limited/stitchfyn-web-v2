import { apiClient } from "../../infrastructure/http/axios.client"

/** LR-8: one message in the order's staff ↔ customer thread. */
export interface OrderThreadMessage {
  id: string
  senderType: "staff" | "customer"
  senderName: string
  body: string
  sentAt: string
  /** Customer message sent during the 7-day countdown. */
  isUrgent: boolean
}

export const orderMessagesApi = {
  getThread: async (orderId: string): Promise<OrderThreadMessage[]> => {
    const { data } = await apiClient.get<OrderThreadMessage[]>(`/orders/${orderId}/messages`)
    return data
  },

  reply: async (orderId: string, body: string): Promise<void> => {
    await apiClient.post(`/orders/${orderId}/messages`, { body })
  },
}
