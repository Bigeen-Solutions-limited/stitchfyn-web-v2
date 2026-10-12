import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderMessageThread } from './OrderMessageThread'
import { orderMessagesApi } from '../order-messages.api'

vi.mock('../order-messages.api', () => ({
  orderMessagesApi: { getThread: vi.fn(), reply: vi.fn() },
}))

const getThread = orderMessagesApi.getThread as unknown as ReturnType<typeof vi.fn>
const reply = orderMessagesApi.reply as unknown as ReturnType<typeof vi.fn>

function renderThread() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <OrderMessageThread orderId="o1" />
    </QueryClientProvider>,
  )
}

describe('OrderMessageThread (LR-8)', () => {
  beforeEach(() => {
    getThread.mockReset()
    reply.mockReset()
  })

  it('shows each message with its sender and flags countdown messages as urgent', async () => {
    getThread.mockResolvedValue([
      { id: 'm1', senderType: 'customer', senderName: 'Bola', body: 'Is it ready?', sentAt: '2026-10-12T10:00:00Z', isUrgent: true },
      { id: 'm2', senderType: 'staff', senderName: 'Ada Owner', body: 'Friday.', sentAt: '2026-10-12T10:05:00Z', isUrgent: false },
    ])

    renderThread()

    expect(await screen.findByText('Is it ready?')).toBeInTheDocument()
    expect(screen.getByText('Bola')).toBeInTheDocument()
    expect(screen.getByText('Ada Owner')).toBeInTheDocument()
    expect(screen.getAllByText('URGENT · COUNTDOWN')).toHaveLength(1)
  })

  it('sends a staff reply and clears the box', async () => {
    getThread.mockResolvedValue([])
    reply.mockResolvedValue(undefined)

    renderThread()
    const box = await screen.findByPlaceholderText('Reply to the customer…')
    fireEvent.change(box, { target: { value: 'On its way' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(reply).toHaveBeenCalledWith('o1', 'On its way'))
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(''))
  })
})
