import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerLinkPanel } from './CustomerLinkPanel'
import { ordersApi } from '../orders.api'

vi.mock('../orders.api', () => ({
  ordersApi: { getCustomerLink: vi.fn() },
}))

const LINK = {
  trackingSlug: 'ST-ABCD1234',
  portalUrl: 'https://app.example/portal/orders/ST-ABCD1234',
  trackingUrl: 'https://app.example/track/ST-ABCD1234',
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CustomerLinkPanel orderId="order-1" />
    </QueryClientProvider>,
  )
}

describe('CustomerLinkPanel', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    vi.mocked(ordersApi.getCustomerLink).mockReset()
    writeText.mockReset().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })

  it('shows the portal link and copies it to the clipboard', async () => {
    vi.mocked(ordersApi.getCustomerLink).mockResolvedValue(LINK)
    renderPanel()

    expect(await screen.findByTestId('customer-portal-url')).toHaveTextContent(LINK.portalUrl)
    fireEvent.click(screen.getByRole('button', { name: /^copy link$/i }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(LINK.portalUrl))
    expect(ordersApi.getCustomerLink).toHaveBeenCalledWith('order-1')
  })

  it('falls back to the copy command when the clipboard API is refused', async () => {
    vi.mocked(ordersApi.getCustomerLink).mockResolvedValue(LINK)
    writeText.mockRejectedValue(new Error('denied'))
    let copied = ''
    const execCommand = vi.fn(() => {
      copied = document.querySelector('textarea')?.value ?? ''
      return true
    })
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true })
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: /^copy link$/i }))
    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'))
    expect(copied).toBe(LINK.portalUrl)
  })

  it('copies the tracking-only link when asked', async () => {
    vi.mocked(ordersApi.getCustomerLink).mockResolvedValue(LINK)
    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: /tracking link/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(LINK.trackingUrl))
  })

  it('says the link is being prepared, with no copy button, before the portal page exists', async () => {
    vi.mocked(ordersApi.getCustomerLink).mockResolvedValue({ trackingSlug: null, portalUrl: null, trackingUrl: null })
    renderPanel()

    expect(await screen.findByText(/being prepared/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument()
  })
})
