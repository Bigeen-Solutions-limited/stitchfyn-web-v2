import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReassignFabricDialog } from './ReassignFabricDialog'
import { ordersApi } from '../orders.api'
import { useToastStore } from '../../../components/feedback/Toast'

vi.mock('../orders.api', () => ({
  ordersApi: {
    getOrders: vi.fn(),
    reassignGarment: vi.fn(),
  },
}))

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  render(
    <QueryClientProvider client={queryClient}>
      <ReassignFabricDialog
        open
        onClose={onClose}
        garmentId="garment-1"
        garmentName="Agbada"
        currentOrderId="order-A"
      />
    </QueryClientProvider>,
  )
  return { onClose, invalidate }
}

async function pickTarget() {
  fireEvent.mouseDown(await screen.findByRole('combobox'))
  const listbox = await screen.findByRole('listbox')
  fireEvent.click(within(listbox).getByText(/#2 — Bola/))
}

describe('ReassignFabricDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useToastStore.setState({ toast: null })
    ;(ordersApi.getOrders as any).mockResolvedValue({
      items: [
        { id: 'order-A', orderNumber: 1, customerName: 'Ade' },
        { id: 'order-B', orderNumber: 2, customerName: 'Bola' },
      ],
      total: 2, page: 1, totalPages: 1, capacityWarning: false,
    })
  })

  it('excludes the current order from the selectable targets', async () => {
    renderDialog()
    fireEvent.mouseDown(await screen.findByRole('combobox'))
    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getByText(/#2 — Bola/)).toBeTruthy()
    expect(within(listbox).queryByText(/#1 — Ade/)).toBeNull()
  })

  it('lists a multi-garment order once even though the orders list has one row per garment', async () => {
    ;(ordersApi.getOrders as any).mockResolvedValue({
      items: [
        { id: 'order-A', orderNumber: 1, customerName: 'Ade' },
        { id: 'order-B', orderNumber: 2, customerName: 'Bola' },
        { id: 'order-B', orderNumber: 2, customerName: 'Bola' },
      ],
      total: 3, page: 1, totalPages: 1, capacityWarning: false,
    })
    renderDialog()
    fireEvent.mouseDown(await screen.findByRole('combobox'))
    const listbox = await screen.findByRole('listbox')
    expect(within(listbox).getAllByText(/#2 — Bola/)).toHaveLength(1)
  })

  it('keeps Reassign disabled until both a target order and a non-blank reason are given', async () => {
    renderDialog()
    const submit = await screen.findByRole('button', { name: 'Reassign' })
    expect((submit as HTMLButtonElement).disabled).toBe(true)

    await pickTarget()
    expect((submit as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: '   ' } })
    expect((submit as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Group order' } })
    expect((submit as HTMLButtonElement).disabled).toBe(false)
  })

  it('posts the target and trimmed reason, refetches source, target and audit data, toasts, and closes', async () => {
    ;(ordersApi.reassignGarment as any).mockResolvedValue({ id: 'garment-1', orderId: 'order-B' })
    const { onClose, invalidate } = renderDialog()

    await pickTarget()
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: '  Shared fabric  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reassign' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(ordersApi.reassignGarment).toHaveBeenCalledWith('garment-1', 'order-B', 'Shared fabric')

    const keys = invalidate.mock.calls.map((c) => JSON.stringify((c[0] as any).queryKey))
    expect(keys).toContain(JSON.stringify(['orders', 'order-A']))
    expect(keys).toContain(JSON.stringify(['orders', 'order-B']))
    expect(keys).toContain(JSON.stringify(['audit-trail', 'context:garment-1']))
    expect(useToastStore.getState().toast?.type).toBe('success')
  })

  it('shows the server error through the toast and stays open when the mutation fails', async () => {
    const err: any = new Error('nope')
    err.response = { data: { message: 'Target order not found' } }
    ;(ordersApi.reassignGarment as any).mockRejectedValue(err)
    const { onClose } = renderDialog()

    await pickTarget()
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Group order' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reassign' }))

    await waitFor(() => expect(useToastStore.getState().toast?.type).toBe('error'))
    expect(useToastStore.getState().toast?.detail).toBe('Target order not found')
    expect(onClose).not.toHaveBeenCalled()
  })
})
