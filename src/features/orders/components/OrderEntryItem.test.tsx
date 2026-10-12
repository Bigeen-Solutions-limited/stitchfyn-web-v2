import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderEntryItem } from './OrderEntryItem'
import { ordersApi } from '../orders.api'
import { useAuthStore } from '../../auth/auth.store'
import { useToastStore } from '../../../components/feedback/Toast'

vi.mock('../orders.api', () => ({
  ordersApi: { requestActivationReminder: vi.fn() },
}))
vi.mock('./DeadlineBadge.tsx', () => ({ DeadlineBadge: () => null }))

type Flag = 'payment' | 'fabric' | 'design'

function renderCard(flags: Flag[], onClick = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <OrderEntryItem
        order={{
          id: 'order-1',
          orderNumber: 1,
          customerName: 'Ada',
          garmentName: 'Agbada',
          status: 'OPEN',
          eventDate: '2026-12-31T00:00:00.000Z',
          unverifiedFlags: flags,
        }}
        onClick={onClick}
      />
    </QueryClientProvider>,
  )
  return { onClick }
}

function loginAs(role: string) {
  useAuthStore.setState({ user: { id: 'u1', email: 'a@b.c', role } as any })
}

const REMIND = 'Remind customer'

describe('OrderEntryItem — Remind customer (US-9.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useToastStore.setState({ toast: null })
    loginAs('MANAGER')
  })

  it.each([
    [['fabric'] as Flag[]],
    [['design'] as Flag[]],
    [['payment', 'fabric', 'design'] as Flag[]],
  ])('shows the button when the customer still has a step pending (%j)', (flags) => {
    renderCard(flags)
    expect(screen.getByRole('button', { name: REMIND })).toBeTruthy()
  })

  it.each([[[] as Flag[]], [['payment'] as Flag[]]])(
    'hides the button when nothing customer-actionable is pending (%j)',
    (flags) => {
      renderCard(flags)
      expect(screen.queryByRole('button', { name: REMIND })).toBeNull()
    },
  )

  it.each(['OWNER', 'MANAGER', 'TAILOR'])('%s can see the button', (role) => {
    loginAs(role)
    renderCard(['fabric'])
    expect(screen.getByRole('button', { name: REMIND })).toBeTruthy()
  })

  it.each(['FRONT_DESK', 'CUSTOMER'])('%s does not get the button', (role) => {
    loginAs(role)
    renderCard(['fabric'])
    expect(screen.queryByRole('button', { name: REMIND })).toBeNull()
  })

  it('calls the reminder endpoint without triggering the card click, and toasts success', async () => {
    ;(ordersApi.requestActivationReminder as any).mockResolvedValue({ pending: ['fabric'] })
    const { onClick } = renderCard(['fabric'])

    fireEvent.click(screen.getByRole('button', { name: REMIND }))

    await waitFor(() => expect(ordersApi.requestActivationReminder).toHaveBeenCalledWith('order-1'))
    await waitFor(() => expect(useToastStore.getState().toast?.type).toBe('success'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('still navigates when the rest of the card is clicked', () => {
    const { onClick } = renderCard(['fabric'])
    fireEvent.click(screen.getByText('Ada'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables the button while the request is pending, then restores it', async () => {
    let resolve!: (v: unknown) => void
    ;(ordersApi.requestActivationReminder as any).mockReturnValue(new Promise((r) => { resolve = r }))
    renderCard(['fabric'])

    fireEvent.click(screen.getByRole('button', { name: REMIND }))
    const pending = await screen.findByRole('button', { name: 'Sending…' })
    expect((pending as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(pending)
    expect(ordersApi.requestActivationReminder).toHaveBeenCalledTimes(1)

    resolve({ pending: ['fabric'] })
    const restored = await screen.findByRole('button', { name: REMIND })
    expect((restored as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows the backend domain error in a toast and restores the button on failure', async () => {
    const err: any = new Error('conflict')
    err.response = { data: { message: 'This customer has no phone number on file, so a reminder cannot be sent.' } }
    ;(ordersApi.requestActivationReminder as any).mockRejectedValue(err)
    renderCard(['design'])

    fireEvent.click(screen.getByRole('button', { name: REMIND }))

    await waitFor(() => expect(useToastStore.getState().toast?.type).toBe('error'))
    expect(useToastStore.getState().toast?.detail).toContain('no phone number')
    const restored = await screen.findByRole('button', { name: REMIND })
    expect((restored as HTMLButtonElement).disabled).toBe(false)
  })
})
