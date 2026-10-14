import { apiClient } from "../../infrastructure/http/axios.client"

// One message in the order's thread between the customer and staff
export interface OrderThreadMessage {
  id: string
  senderType: "staff" | "customer"
  senderName: string
  body: string
  sentAt: string
  // Sent by the customer in the last 7 days before the event
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
