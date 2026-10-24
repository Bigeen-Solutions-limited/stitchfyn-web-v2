import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '../../infrastructure/http/axios.client'
import { ordersApi } from './orders.api'

vi.mock('../../infrastructure/http/axios.client', () => ({ apiClient: { get: vi.fn() } }))

const get = apiClient.get as unknown as ReturnType<typeof vi.fn>

// GET /orders/:id sends the activation flags beside the order, in snake_case; the order page reads them from
// order.unverifiedFlags. Without this mapping the flag chips and the bypass prompt were never shown (US-9.4).
describe('ordersApi.getOrderDetail', () => {
  beforeEach(() => get.mockReset())

  it('moves the activation flags onto the order', async () => {
    get.mockResolvedValueOnce({ data: { order: { id: 'order-1' }, projection: {}, unverified_flags: ['payment', 'fabric'] } })

    const detail = await ordersApi.getOrderDetail('order-1')

    expect(get).toHaveBeenCalledWith('/orders/order-1')
    expect(detail.order.unverifiedFlags).toEqual(['payment', 'fabric'])
  })

  it('treats missing flags as none, so the chips show the order as clear', async () => {
    get.mockResolvedValueOnce({ data: { order: { id: 'order-1' }, projection: {} } })

    const detail = await ordersApi.getOrderDetail('order-1')

    expect(detail.order.unverifiedFlags).toEqual([])
  })
})
